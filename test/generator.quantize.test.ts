import { describe, expect, it } from 'vitest';
import { quantizeDown } from '../src/index.js';

describe('quantizeDown', () => {
  it('returns the largest allowed speed less than or equal to target', () => {
    expect(quantizeDown([1, 1.5, 2, 2.5], 2.2)).toBe(2);
  });

  it('falls back to the smallest allowed speed when target is below range', () => {
    expect(quantizeDown([1, 1.5, 2], 0.5)).toBe(1);
  });

  it('returns exact matches when available', () => {
    expect(quantizeDown([0.8, 1, 1.2], 1)).toBe(1);
  });
});
