import { describe, expect, it } from 'vitest';
import { athletiqColors, athletiqRadii } from './tokens.js';

describe('ATHLETIQ design tokens', () => {
  it('exposes the core brand colors', () => {
    expect(athletiqColors.navy).toBe('#0B1F3A');
    expect(athletiqColors.green).toBe('#18A058');
  });

  it('keeps default card radius at 8px', () => {
    expect(athletiqRadii.md).toBe(8);
  });
});
