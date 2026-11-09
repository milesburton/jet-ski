import { describe, expect, it } from 'vitest';
import { generateCourse } from './course';
import { initialCraft, step } from './craft';
import { generateObstacles, hitObstacle } from './obstacles';
import { finalTime, raceStep, startRace } from './race';
import { TUNING } from './tuning';
import type { Course, CraftInput, CraftState, RaceState } from './types';
import { clamp, wrapAngle } from './vec';
import { makeWaves } from './waves';

/** Scripted bot: steer at the next gate's centre, ease off in sharp turns. */
const bot = (s: CraftState, course: Course, race: RaceState): CraftInput => {
  const g = course.gates[race.next % course.gates.length]!;
  const err = wrapAngle(Math.atan2(g.centre.x - s.pos.x, g.centre.z - s.pos.z) - s.heading);
  return {
    throttle: Math.abs(err) > 1 ? 0.7 : 1,
    steer: clamp(err * 2, -1, 1),
    trim: TUNING.trimOptimum,
  };
};

describe('scripted bot', () => {
  it('completes a short course on mild water, deterministically', () => {
    const course = generateCourse(1, {
      gateCount: 4,
      radius: 32,
      radialJitter: 0,
      angularJitter: 0,
      minSpacing: 20,
      gateWidth: 20,
    });
    const waves = makeWaves(1, 0.2);
    const obstacles = generateObstacles(1, course, 4);
    const g0 = course.gates[0]!;
    const run = (): { race: RaceState; steps: number; hits: number } => {
      let s = initialCraft(g0.centre.x - g0.dir.x * 6, g0.centre.z - g0.dir.z * 6, 0, waves);
      let race = startRace();
      let steps = 0;
      let hits = 0;
      while (race.status === 'running' && steps < 2000) {
        const next = step(s, bot(s, course, race), waves, steps * TUNING.dt, TUNING.dt);
        race = raceStep(
          race,
          course,
          { x: s.pos.x, z: s.pos.z },
          { x: next.pos.x, z: next.pos.z },
          TUNING.dt,
        );
        if (hitObstacle(obstacles, { x: next.pos.x, z: next.pos.z })) hits++;
        s = next;
        steps++;
      }
      return { race, steps, hits };
    };
    const a = run();
    expect(a.race.status).toBe('finished');
    expect(a.race.missed).toBe(0);
    expect(a.hits).toBe(0);
    expect(finalTime(a.race)).toBeGreaterThan(5);
    expect(run()).toEqual(a);
  });
});
