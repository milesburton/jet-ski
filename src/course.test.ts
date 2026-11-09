import { describe, expect, it } from 'vitest';
import { courseProblems, crossesGate, defaultCourseOptions, generateCourse } from './course';
import { TUNING } from './tuning';
import type { Gate } from './types';
import { dist } from './vec';

const seeds = Array.from({ length: 20 }, (_, i) => i * 31 + 1);

describe('course generation', () => {
  it('is deterministic per seed', () => {
    expect(generateCourse(5)).toEqual(generateCourse(5));
    expect(generateCourse(5)).not.toEqual(generateCourse(6));
  });

  it('satisfies spacing and turn limits over many seeds', () => {
    for (const seed of seeds) {
      const c = generateCourse(seed);
      expect(c.gates).toHaveLength(TUNING.gateCount);
      expect(courseProblems(c, defaultCourseOptions())).toEqual([]);
    }
  });

  it('gates are perpendicular to their direction and of the right width', () => {
    for (const seed of seeds.slice(0, 5)) {
      for (const g of generateCourse(seed).gates) {
        expect(dist(g.left, g.right)).toBeCloseTo(g.width);
        expect(Math.hypot(g.dir.x, g.dir.z)).toBeCloseTo(1);
        const lr = { x: g.right.x - g.left.x, z: g.right.z - g.left.z };
        expect(lr.x * g.dir.x + lr.z * g.dir.z).toBeCloseTo(0);
      }
    }
  });

  it('loops in angular order around the origin without self-crossing', () => {
    for (const seed of seeds) {
      const angles = generateCourse(seed).gates.map((g) => Math.atan2(g.centre.z, g.centre.x));
      const unwrapped = angles.map((a) => (a < 0 ? a + Math.PI * 2 : a));
      // Jitter is under half a step, so angles stay increasing (gate 0 may be just below 0).
      const rises = unwrapped.slice(1).filter((a, i) => a > (unwrapped[i] as number)).length;
      expect(rises).toBeGreaterThanOrEqual(unwrapped.length - 2);
    }
  });

  it('falls back to the regular polygon when jitter cannot satisfy limits', () => {
    const c = generateCourse(3, { maxTurn: 0.8, radialJitter: 0.9, angularJitter: 0.9 });
    expect(courseProblems(c, { ...defaultCourseOptions(), maxTurn: 0.8 })).toEqual([]);
    expect(c.gates[0]?.centre.z).toBeCloseTo(0);
  });

  it('reports problems for an invalid course', () => {
    const c = generateCourse(3);
    const bad = courseProblems(c, { ...defaultCourseOptions(), minSpacing: 1e6, maxTurn: 0.01 });
    expect(bad.length).toBeGreaterThan(0);
  });
});

describe('crossesGate', () => {
  const gate: Gate = {
    centre: { x: 0, z: 0 },
    dir: { x: 0, z: 1 },
    width: 10,
    left: { x: -5, z: 0 },
    right: { x: 5, z: 0 },
  };
  const p = (x: number, z: number) => ({ x, z });

  it('counts a forward crossing between the buoys', () => {
    expect(crossesGate(gate, p(0, -1), p(0, 1))).toBe(true);
    expect(crossesGate(gate, p(-3, -2), p(4, 2))).toBe(true);
  });

  it('ignores backwards crossings', () => {
    expect(crossesGate(gate, p(0, 1), p(0, -1))).toBe(false);
  });

  it('ignores passing outside the buoys', () => {
    expect(crossesGate(gate, p(6, -1), p(6, 1))).toBe(false);
    expect(crossesGate(gate, p(-5.5, -1), p(-5.5, 1))).toBe(false);
  });

  it('includes the buoys themselves', () => {
    expect(crossesGate(gate, p(5, -1), p(5, 1))).toBe(true);
    expect(crossesGate(gate, p(-5, -1), p(-5, 1))).toBe(true);
  });

  it('counts landing exactly on the line once (half-open)', () => {
    expect(crossesGate(gate, p(0, -1), p(0, 0))).toBe(true);
    expect(crossesGate(gate, p(0, 0), p(0, 1))).toBe(false);
  });

  it('ignores zero movement, parallel movement and short moves', () => {
    expect(crossesGate(gate, p(0, 0), p(0, 0))).toBe(false);
    expect(crossesGate(gate, p(-3, -1), p(3, -1))).toBe(false);
    expect(crossesGate(gate, p(0, -2), p(0, -1))).toBe(false);
  });

  it('catches a high-speed step that jumps well past the line', () => {
    expect(crossesGate(gate, p(1, -30), p(1, 30))).toBe(true);
  });
});
