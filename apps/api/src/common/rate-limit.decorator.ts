import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export const RateLimit = (key: string, limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { key, limit, windowSeconds } satisfies RateLimitOptions);
