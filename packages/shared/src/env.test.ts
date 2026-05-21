import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('parses a valid environment object', () => {
    const env = parseEnv(
      {
        API_PORT: z.coerce.number().int().positive(),
      },
      {
        API_PORT: '4000',
      },
    );

    expect(env.API_PORT).toBe(4000);
  });

  it('throws for invalid environment values', () => {
    expect(() =>
      parseEnv(
        {
          API_PORT: z.coerce.number().int().positive(),
        },
        {
          API_PORT: 'invalid',
        },
      ),
    ).toThrow();
  });
});
