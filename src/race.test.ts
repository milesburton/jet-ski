import { describe, expect, it } from 'vitest';
import { generateCourse } from './course';
import { finalTime, gatesPassed, raceStep, startRace } from './race';
import { TUNING } from './tuning';
import type { Course, RaceState } from './types';

const course: Course = generateCourse(1, { gateCount: 4, radius: 50, minSpacing: 20 });
const c = (i: number) => course.gates[i % 4]!;
/** Move from just behind gate i to just ahead of it. */
const cross = (race: RaceState, i: number): RaceState => {
  const g = c(i);
  const back = { x: g.centre.x - g.dir.x * 2, z: g.centre.z - g.dir.z * 2 };
  const fwd = { x: g.centre.x + g.dir.x * 2, z: g.centre.z + g.dir.z * 2 };
  return raceStep(race, course, back, fwd, 0.1);
};
const idle = (race: RaceState): RaceState =>
  raceStep(race, course, { x: 1e5, z: 1e5 }, { x: 1e5, z: 1e5 }, 0.5);

describe('race', () => {
  it('times a clean lap in order', () => {
    let r = startRace();
    for (const i of [1, 2, 3]) r = cross(r, i);
    expect(r.status).toBe('running');
    expect(r.next).toBe(4);
    r = cross(r, 0);
    expect(r.status).toBe('finished');
    expect(r.missed).toBe(0);
    expect(gatesPassed(r)).toBe(4);
    expect(finalTime(r)).toBeCloseTo(0.4);
  });

  it('accumulates time while running and freezes once finished', () => {
    const r = idle(idle(startRace()));
    expect(r.time).toBeCloseTo(1);
    const done = [1, 2, 3, 0].reduce(cross, startRace());
    expect(idle(done)).toBe(done);
  });

  it('does not count the start line or out-of-order gates far ahead', () => {
    const start = startRace();
    expect(cross(start, 0).next).toBe(1);
    const far = { ...start, next: 1 };
    expect(cross(far, 0).status).toBe('running');
  });

  it('penalises a skipped gate', () => {
    const r = cross(startRace(), 2);
    expect(r.missed).toBe(1);
    expect(r.next).toBe(3);
    expect(finalTime(r)).toBeCloseTo(0.1 + TUNING.missedPenalty);
    expect(gatesPassed(r)).toBe(1);
  });

  it('can finish with skipped gates, up to the limit', () => {
    const r = cross(cross({ ...startRace(), next: 2 }, 0), 0);
    expect(r.status).toBe('finished');
    expect(r.missed).toBe(2);
    expect(finalTime(r)).toBeGreaterThan(2 * TUNING.missedPenalty);
  });

  it('ignores backwards crossings', () => {
    const g = c(1);
    const back = { x: g.centre.x - g.dir.x * 2, z: g.centre.z - g.dir.z * 2 };
    const fwd = { x: g.centre.x + g.dir.x * 2, z: g.centre.z + g.dir.z * 2 };
    expect(raceStep(startRace(), course, fwd, back, 0.1).next).toBe(1);
  });
});
