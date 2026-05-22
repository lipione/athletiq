import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator.js';
import type { AuthenticatedUser } from './store.js';
import 'reflect-metadata';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext) {
    const options = this.getMetadata<RateLimitOptions>(RATE_LIMIT_KEY, context);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      user?: AuthenticatedUser;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const now = Date.now();
    const key = `${options.key}:${request.user?.id ?? this.clientIp(request)}`;
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + options.windowSeconds * 1000,
      });
      return true;
    }

    if (bucket.count >= options.limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }

  private clientIp(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return raw?.split(',')[0]?.trim() || request.ip || 'unknown';
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
