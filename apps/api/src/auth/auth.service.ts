import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { type AuthenticatedUser, type UserRecord } from '../common/store.js';
import {
  publicRegisterRoles,
  userRoles,
  type PublicRegisterRole,
  type UserRole,
} from '../common/roles.js';
import {
  AUDIT_REPOSITORY,
  USER_REPOSITORY,
  type AuditRepository,
  type UserRepository,
} from '../repositories/repository.types.js';
import { PasswordService } from './password.service.js';
import { SessionService, type AuthRequestContext } from './session.service.js';
import { TokenService } from './token.service.js';

type RegisterInput = {
  email: string;
  password: string;
  role: PublicRegisterRole;
};

type LoginInput = {
  email: string;
  password: string;
};

type ImpersonationInput = {
  targetUserId?: string;
  role?: UserRole;
  reason?: string;
};

type ProvisionUserInput = {
  email?: string;
  password?: unknown;
  roles?: unknown;
  schoolIds?: unknown;
};

export type AuthResult = {
  user: Omit<UserRecord, 'password'>;
  accessToken?: string;
  refreshToken?: string;
  refreshMaxAgeSeconds?: number;
  impersonatedBy?: string;
};

export type ProvisionUserResult = {
  user: Omit<UserRecord, 'password'>;
  temporaryPassword?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_REPOSITORY) private readonly audit: AuditRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    if (!input.email || !input.password) {
      throw new BadRequestException('email and password are required');
    }

    const trimmedEmail = input.email.trim().toLowerCase();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      throw new BadRequestException('invalid email');
    }

    if (!input.password || input.password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    if (!publicRegisterRoles.includes(input.role)) {
      throw new ForbiddenException('role cannot be assigned through signup');
    }

    if (!userRoles.includes(input.role)) {
      throw new BadRequestException('Invalid role');
    }

    const passwordHash = await this.passwords.hashPassword(input.password);
    const user = await this.users.create({
      email: trimmedEmail,
      passwordHash,
      roles: [input.role],
    });

    return { user: this.toPublicUser(user) };
  }

  async login(input: LoginInput, context: AuthRequestContext = {}): Promise<AuthResult> {
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.users.findByEmail(email);
    if (!user || !(await this.passwords.verifyPassword(user.password, input.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const normalizedUser = this.passwords.requiresLegacyMigration(user.password)
      ? await this.users.updatePassword(user.id, await this.passwords.hashPassword(input.password))
      : user;
    const publicUser = this.toPublicUser(normalizedUser);
    const refreshSession = await this.sessions.issue(normalizedUser, context);

    return {
      user: publicUser,
      accessToken: await this.tokens.signAccessToken(publicUser),
      refreshToken: refreshSession.refreshToken,
      refreshMaxAgeSeconds: refreshSession.maxAgeSeconds,
    };
  }

  async refresh(refreshToken: string, context: AuthRequestContext = {}): Promise<AuthResult> {
    const refreshSession = await this.sessions.rotate(refreshToken, context);
    const user = await this.users.findById(refreshSession.session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const publicUser = this.toPublicUser(user);
    return {
      user: publicUser,
      accessToken: await this.tokens.signAccessToken(publicUser),
      refreshToken: refreshSession.refreshToken,
      refreshMaxAgeSeconds: refreshSession.maxAgeSeconds,
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.sessions.revoke(refreshToken);
    }
    return { ok: true };
  }

  async listUsers(actor: AuthenticatedUser) {
    this.assertCanManageUsers(actor);
    const users = await this.users.list();
    return users.map((user) => this.toPublicUser(user));
  }

  async provisionUser(
    actor: AuthenticatedUser,
    input: ProvisionUserInput,
  ): Promise<ProvisionUserResult> {
    this.assertCanManageUsers(actor);

    const email = input.email?.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('invalid email');
    }

    const roles = this.normalizeProvisionedRoles(input.roles);
    const providedPassword = this.normalizeOptionalPassword(input.password);
    const generatedPassword = !providedPassword;
    const password = providedPassword || this.generateTemporaryPassword();
    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    const schoolIds = this.normalizeSchoolIds(input.schoolIds);
    const user = await this.users.create({
      email,
      passwordHash: await this.passwords.hashPassword(password),
      roles,
      schoolIds,
    });

    await this.audit.record({
      tenantId: schoolIds[0] ?? 'platform',
      actorUserId: actor.id,
      action: 'auth.user_provisioned',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
        roles: roles.join(','),
        schoolIds: schoolIds.join(','),
      },
    });

    return {
      user: this.toPublicUser(user),
      ...(generatedPassword ? { temporaryPassword: password } : {}),
    };
  }

  async impersonate(
    actor: { id: string; role: UserRole },
    input: ImpersonationInput,
  ): Promise<AuthResult> {
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can impersonate users');
    }

    const targetUserId = input.targetUserId?.trim();
    const reason = input.reason?.trim();
    if (!targetUserId || !reason) {
      throw new BadRequestException('targetUserId and reason are required');
    }

    const target = await this.users.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    const targetRole = input.role ?? target.roles[0];
    if (!targetRole || !target.roles.includes(targetRole)) {
      throw new BadRequestException('target role is not assigned to this user');
    }

    const publicUser = this.toPublicUser(target);
    const startedAt = new Date().toISOString();
    await this.audit.record({
      tenantId: target.schoolIds[0] ?? 'platform',
      actorUserId: actor.id,
      action: 'auth.impersonation_started',
      resource: 'user',
      resourceId: target.id,
      metadata: {
        targetUserId: target.id,
        targetRole,
        reason,
        startedAt,
      },
    });

    return {
      user: publicUser,
      accessToken: await this.tokens.signAccessToken(publicUser, targetRole, actor.id),
      impersonatedBy: actor.id,
    };
  }

  private assertCanManageUsers(actor: AuthenticatedUser) {
    if (actor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage users');
    }
  }

  private normalizeProvisionedRoles(roles: unknown) {
    if (!Array.isArray(roles)) {
      throw new BadRequestException('roles must be an array');
    }

    const normalized = [
      ...new Set(
        roles
          .filter((role): role is string => typeof role === 'string')
          .map((role) => role.trim() as UserRole),
      ),
    ];
    if (normalized.length === 0) {
      throw new BadRequestException('at least one role is required');
    }

    const invalidRole = normalized.find((role) => !userRoles.includes(role));
    if (invalidRole) {
      throw new BadRequestException(`Invalid role: ${invalidRole}`);
    }

    return normalized;
  }

  private normalizeSchoolIds(schoolIds: unknown) {
    if (schoolIds === undefined) {
      return [];
    }
    if (!Array.isArray(schoolIds)) {
      throw new BadRequestException('schoolIds must be an array');
    }

    return [
      ...new Set(
        schoolIds
          .filter((schoolId): schoolId is string => typeof schoolId === 'string')
          .map((schoolId) => schoolId.trim())
          .filter(Boolean),
      ),
    ];
  }

  private normalizeOptionalPassword(password: unknown) {
    if (password === undefined) {
      return undefined;
    }
    if (typeof password !== 'string') {
      throw new BadRequestException('password must be a string');
    }
    return password.trim() || undefined;
  }

  private generateTemporaryPassword() {
    return `ATQ-${randomBytes(9).toString('hex')}`;
  }

  private toPublicUser(user: UserRecord): Omit<UserRecord, 'password'> {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      schoolIds: user.schoolIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
