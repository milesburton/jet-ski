import { describe, expect, it } from 'vitest';
import { heightAt, makeWaves, maxHeight, normalAt } from './waves';

describe('waves', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = makeWaves(5, 0.6);
    expect(makeWaves(5, 0.6)).toEqual(a);
    expect(heightAt(a, 3, 4, 1.5)).toBe(heightAt(makeWaves(5, 0.6), 3, 4, 1.5));
    expect(makeWaves(6, 0.6)).not.toEqual(a);
  });

  it('is bounded by the summed amplitudes across many seeds and points', () => {
    for (let seed = 0; seed < 20; seed++) {
      const w = makeWaves(seed, (seed % 5) / 4);
      const bound = maxHeight(w) + 1e-9;
      for (let i = 0; i < 50; i++) {
        expect(Math.abs(heightAt(w, i * 7.3, i * -3.1, i * 0.37))).toBeLessThanOrEqual(bound);
      }
    }
  });

  it('wind scales amplitude and is clamped', () => {
    expect(maxHeight(makeWaves(1, 1))).toBeGreaterThan(maxHeight(makeWaves(1, 0)));
    expect(makeWaves(1, 5).wind).toBe(1);
    expect(makeWaves(1, -2).wind).toBe(0);
  });

  it('moves with time', () => {
    const w = makeWaves(2, 1);
    expect(heightAt(w, 0, 0, 0)).not.toBeCloseTo(heightAt(w, 0, 0, 1));
  });

  it('normal is unit length, points up and matches finite differences', () => {
    const w = makeWaves(3, 0.8);
    const n = normalAt(w, 10, -5, 2);
    expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1);
    expect(n.y).toBeGreaterThan(0);
    const e = 1e-4;
    const dhdx = (heightAt(w, 10 + e, -5, 2) - heightAt(w, 10 - e, -5, 2)) / (2 * e);
    expect(n.x / n.y).toBeCloseTo(-dhdx, 4);
  });
});
