import { describe, expect, it } from 'vitest';
import { next } from './rng';

describe('rng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const [a, s1] = next(42);
    const [b] = next(42);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(next(s1)[0]).not.toBe(a);
  });
});
