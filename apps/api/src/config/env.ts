import { z } from 'zod';
import { parseEnv } from '@athletiq/shared';

export const apiEnv = parseEnv(
  {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
  },
  process.env,
);
