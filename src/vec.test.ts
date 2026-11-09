import { describe, expect, it } from 'vitest';
import { range, draws } from './rng';
import { clamp, distToSegment, normalize, smoothstep, v2, wrapAngle } from './vec';

describe('vec', () => {
  it('clamps, smoothsteps and wraps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(2)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5);
  });

  it('normalises and measures segments', () => {
    expect(normalize(v2(0, 0))).toEqual({ x: 0, z: 0 });
    expect(normalize(v2(3, 4)).x).toBeCloseTo(0.6);
    expect(distToSegment(v2(5, 3), v2(0, 0), v2(10, 0))).toBeCloseTo(3);
    expect(distToSegment(v2(-4, 3), v2(0, 0), v2(10, 0))).toBeCloseTo(5);
    expect(distToSegment(v2(3, 4), v2(0, 0), v2(0, 0))).toBeCloseTo(5);
  });
});

describe('rng helpers', () => {
  it('range stays within bounds and draws are reproducible', () => {
    const [v] = range(1, 10, 20);
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThan(20);
    const [a, s] = draws(7, 3);
    expect(a).toHaveLength(3);
    expect(draws(7, 3)[0]).toEqual(a);
    expect(s).not.toBe(7);
  });
});
