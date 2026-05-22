import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { UserRecord } from '../common/store.js';
import {
  AUTH_SESSION_REPOSITORY,
  type AuthSessionRepository,
  type RefreshSessionRecord,
} from '../repositories/repository.types.js';
import { TokenService } from './token.service.js';

export type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

export type IssuedRefreshSession = {
  session: RefreshSessionRecord;
  refreshToken: string;
  maxAgeSeconds: number;
};

@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  issue(user: UserRecord | Omit<UserRecord, 'password'>, context: AuthRequestContext = {}) {
    const refreshToken = this.tokens.generateRefreshToken();
    const maxAgeSeconds = this.tokens.refreshTokenTtlSeconds();
    const tenantId = user.schoolIds[0] ?? 'platform';

    return this.sessions
      .createRefreshSession({
        userId: user.id,
        tenantId,
        tokenHash: this.tokens.hashRefreshToken(refreshToken),
        familyId: this.nextFamilyId(),
        expiresAt: this.expiresAt(maxAgeSeconds),
        ...(context.userAgent ? { userAgent: context.userAgent } : {}),
        ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      })
      .then((session) => ({ session, refreshToken, maxAgeSeconds }));
  }

  async rotate(
    refreshToken: string,
    context: AuthRequestContext = {},
  ): Promise<IssuedRefreshSession> {
    const current = await this.getActiveSession(refreshToken);
    const nextRefreshToken = this.tokens.generateRefreshToken();
    const maxAgeSeconds = this.tokens.refreshTokenTtlSeconds();

    const session = await this.sessions.rotateRefreshSession({
      currentSessionId: current.id,
      userId: current.userId,
      tenantId: current.tenantId,
      tokenHash: this.tokens.hashRefreshToken(nextRefreshToken),
      familyId: current.familyId,
      expiresAt: this.expiresAt(maxAgeSeconds),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
    });

    return { session, refreshToken: nextRefreshToken, maxAgeSeconds };
  }

  async revoke(refreshToken: string, actorUserId?: string) {
    const session = await this.getActiveSession(refreshToken);
    return this.sessions.revokeRefreshSession(session.id, actorUserId);
  }

  private async getActiveSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const session = await this.sessions.findRefreshSessionByTokenHash(
      this.tokens.hashRefreshToken(refreshToken),
    );
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return session;
  }

  private expiresAt(ttlSeconds: number) {
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  private nextFamilyId() {
    return `fam_${this.tokens.generateRefreshToken().slice(0, 32)}`;
  }
}
