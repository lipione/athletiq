import { z } from 'zod';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

export function parseEnv<TShape extends z.ZodRawShape>(
  shape: TShape,
  source: Record<string, string | undefined>,
) {
  return z.object(shape).parse(source);
}
