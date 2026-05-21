import { describe, expect, it } from 'vitest';
import { athletiqColors } from '@athletiq/ui';

describe('mobile app foundation', () => {
  it('uses ATHLETIQ brand tokens', () => {
    expect(athletiqColors.green).toBe('#18A058');
  });
});
