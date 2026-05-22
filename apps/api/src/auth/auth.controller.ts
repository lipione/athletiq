import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../common/public.decorator.js';
import { Permissions } from '../common/permissions.decorator.js';
import { RateLimit } from '../common/rate-limit.decorator.js';
import { AuthService } from './auth.service.js';
import { Roles } from '../common/roles.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { type AuthenticatedUser } from '../common/store.js';
import { type PublicRegisterRole, type UserRole } from '../common/roles.js';

const refreshCookieName = 'athletiq_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  @RateLimit('auth.register', 10, 60)
  @HttpCode(201)
  register(@Body() body: { email: string; password: string; role?: PublicRegisterRole }) {
    return this.authService.register({
      email: body.email,
      password: body.password,
      role: body.role ?? 'school_admin',
    });
  }

  @Public()
  @Post('login')
  @RateLimit('auth.login', 5, 60)
  @HttpCode(201)
  async login(
    @Body() body: { email: string; password: string },
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(body, this.requestContext(request));
    this.setRefreshCookie(reply, result.refreshToken, result.refreshMaxAgeSeconds);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post('refresh')
  @RateLimit('auth.refresh', 30, 60)
  @HttpCode(201)
  async refresh(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.refresh(
      this.refreshTokenFromCookie(request),
      this.requestContext(request),
    );
    this.setRefreshCookie(reply, result.refreshToken, result.refreshMaxAgeSeconds);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(201)
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.logout(this.refreshTokenFromCookie(request));
    this.clearRefreshCookie(reply);
    return { ok: true };
  }

  @Get('me')
  @Roles('super_admin', 'school_admin', 'coach', 'referee', 'federation_admin', 'government_viewer')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post('impersonation')
  @Roles('super_admin')
  @Permissions('support.impersonate')
  @RateLimit('auth.impersonation', 10, 60)
  @HttpCode(201)
  impersonate(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { targetUserId?: string; role?: UserRole; reason?: string },
  ) {
    return this.authService.impersonate(actor, body);
  }

  private requestContext(request: FastifyRequest) {
    return {
      userAgent: this.headerValue(request.headers['user-agent']),
      ipAddress: request.ip,
    };
  }

  private setRefreshCookie(
    reply: FastifyReply,
    refreshToken: string | undefined,
    maxAgeSeconds: number | undefined,
  ) {
    if (!refreshToken || !maxAgeSeconds) {
      return;
    }

    reply.header(
      'Set-Cookie',
      [
        `${refreshCookieName}=${encodeURIComponent(refreshToken)}`,
        'HttpOnly',
        'Path=/api/auth',
        'SameSite=Lax',
        `Max-Age=${maxAgeSeconds}`,
        ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
      ].join('; '),
    );
  }

  private clearRefreshCookie(reply: FastifyReply) {
    reply.header(
      'Set-Cookie',
      [
        `${refreshCookieName}=`,
        'HttpOnly',
        'Path=/api/auth',
        'SameSite=Lax',
        'Max-Age=0',
        ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
      ].join('; '),
    );
  }

  private refreshTokenFromCookie(request: FastifyRequest) {
    const cookieHeader = this.headerValue(request.headers.cookie);
    if (!cookieHeader) {
      return '';
    }

    const pair = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${refreshCookieName}=`));

    return pair ? decodeURIComponent(pair.slice(refreshCookieName.length + 1)) : '';
  }

  private headerValue(rawValue: string | string[] | undefined) {
    return Array.isArray(rawValue) ? (rawValue[0] ?? '') : (rawValue ?? '');
  }
}
