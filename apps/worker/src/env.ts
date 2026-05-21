import { z } from 'zod';
import { parseEnv } from '@athletiq/shared';

export const workerEnv = parseEnv(
  {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().url().default('redis://localhost:16379'),
  },
  process.env,
);
