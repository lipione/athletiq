import {
  type CanActivate,
  ForbiddenException,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthenticatedUser } from './store.js';
import { ROLES_KEY } from './roles.decorator.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { roleHasPermission, type Permission } from './permissions.js';
import { USER_REPOSITORY, type UserRepository } from '../repositories/repository.types.js';
import { TokenService } from '../auth/token.service.js';
import 'reflect-metadata';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.getMetadata<boolean>(IS_PUBLIC_KEY, context);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const actor = await this.resolveActor(request.headers);
    request.user = actor;

    const requiredRoles = this.getMetadata<string[]>(ROLES_KEY, context);

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(actor.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const requiredPermissions = this.getMetadata<Permission[]>(PERMISSIONS_KEY, context);
    if (
      requiredPermissions &&
      requiredPermissions.length > 0 &&
      !requiredPermissions.every((permission) => roleHasPermission(actor.role, permission))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async resolveActor(headers: Record<string, string | string[] | undefined>) {
    const bearerToken = this.parseBearerToken(this.parseHeaderValue(headers.authorization));
    if (bearerToken) {
      const claims = await this.tokens.verifyAccessToken(bearerToken);
      const storeUser = await this.users.findById(claims.sub);
      if (!storeUser) {
        throw new UnauthorizedException('Unknown user');
      }

      const resolvedRole = this.resolveRole(claims.role, storeUser.roles);
      if (!resolvedRole) {
        throw new UnauthorizedException('Invalid role');
      }

      return {
        id: storeUser.id,
        email: storeUser.email,
        role: resolvedRole,
        schoolIds: [...storeUser.schoolIds],
        ...(claims.impersonatedBy ? { impersonatedBy: claims.impersonatedBy } : {}),
      } as AuthenticatedUser;
    }

    if (!this.testHeadersAllowed()) {
      throw new UnauthorizedException('Missing bearer access token');
    }

    const userId = this.parseHeaderValue(headers['x-athletiq-user-id']);
    const roleHeader = this.parseHeaderValue(headers['x-athletiq-user-role']);

    if (!userId) {
      throw new UnauthorizedException('Missing x-athletiq-user-id header');
    }

    const storeUser = await this.users.findById(userId);
    if (!storeUser) {
      throw new UnauthorizedException('Unknown user');
    }

    const roles = storeUser.roles;
    if (roles.length === 0) {
      throw new UnauthorizedException('User has no role');
    }

    const resolvedRole = roleHeader ? this.resolveRole(roleHeader, roles) : roles[0];
    if (!resolvedRole) {
      throw new UnauthorizedException('Invalid role');
    }
    const actorRole = resolvedRole;

    return {
      id: storeUser.id,
      email: storeUser.email,
      role: actorRole,
      schoolIds: [...storeUser.schoolIds],
    } as AuthenticatedUser;
  }

  private parseHeaderValue(rawValue: string | string[] | undefined): string {
    if (!rawValue) {
      return '';
    }
    return Array.isArray(rawValue) ? (rawValue[0] ?? '') : rawValue;
  }

  private resolveRole(roleHeader: string, roles: string[]) {
    const normalized = roleHeader.trim().toLowerCase();
    return roles.find((role) => role.toLowerCase() === normalized);
  }

  private parseBearerToken(authorizationHeader: string) {
    const [scheme, token] = authorizationHeader.split(/\s+/, 2);
    return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : '';
  }

  private testHeadersAllowed() {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    return process.env.NODE_ENV === 'test' || process.env.ATHLETIQ_ALLOW_TEST_HEADERS === '1';
  }

  private getMetadata<T>(key: string, context: ExecutionContext): T | undefined {
    const handler = context.getHandler();
    const controller = context.getClass();

    return (
      (globalThis.Reflect.getMetadata?.(key, handler) as T | undefined) ??
      (globalThis.Reflect.getMetadata?.(key, controller) as T | undefined)
    );
  }
}
