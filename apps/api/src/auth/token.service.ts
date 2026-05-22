import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserRecord } from '../common/store.js';
import type { UserRole } from '../common/roles.js';

export type AccessTokenClaims = {
  sub: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  schoolIds: string[];
  typ: 'access';
  impersonatedBy?: string;
};

@Injectable()
export class TokenService {
  async signAccessToken(
    user: Omit<UserRecord, 'password'>,
    role?: UserRole,
    impersonatedBy?: string,
  ) {
    const resolvedRole = role ?? user.roles[0];
    if (!resolvedRole) {
      throw new UnauthorizedException('User has no role');
    }

    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = this.accessTokenTtlSeconds();

    return new SignJWT({
      email: user.email,
      role: resolvedRole,
      roles: user.roles,
      schoolIds: user.schoolIds,
      typ: 'access',
      ...(impersonatedBy ? { impersonatedBy } : {}),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuedAt(now)
      .setExpirationTime(now + ttlSeconds)
      .sign(this.jwtSecret());
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret());
      return this.parseAccessPayload(payload);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  generateRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  accessTokenTtlSeconds() {
    return this.readPositiveIntegerEnv('ATHLETIQ_ACCESS_TOKEN_TTL_SECONDS', 900);
  }

  refreshTokenTtlSeconds() {
    return this.readPositiveIntegerEnv('ATHLETIQ_REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30);
  }

  private parseAccessPayload(payload: JWTPayload): AccessTokenClaims {
    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      !Array.isArray(payload.roles) ||
      !Array.isArray(payload.schoolIds)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      roles: payload.roles as UserRole[],
      schoolIds: payload.schoolIds as string[],
      typ: 'access',
      ...(typeof payload.impersonatedBy === 'string'
        ? { impersonatedBy: payload.impersonatedBy }
        : {}),
    };
  }

  private jwtSecret() {
    const secret = process.env.ATHLETIQ_JWT_SECRET;
    if (!secret && !this.insecureDevelopmentSecretAllowed()) {
      throw new Error('ATHLETIQ_JWT_SECRET is required outside explicit test/local mode');
    }

    const value = secret ?? 'development-secret-minimum-32-characters';
    if (value.length < 32) {
      throw new Error('ATHLETIQ_JWT_SECRET must be at least 32 characters');
    }

    return new TextEncoder().encode(value);
  }

  private insecureDevelopmentSecretAllowed() {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    return (
      process.env.NODE_ENV === 'development' &&
      process.env.ATHLETIQ_ALLOW_INSECURE_DEV_JWT_SECRET === '1'
    );
  }

  private readPositiveIntegerEnv(name: string, fallback: number) {
    const raw = process.env[name];
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
