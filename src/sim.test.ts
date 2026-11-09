import { describe, expect, it } from 'vitest';
import { generateCourse } from './course';
import { initialCraft } from './craft';
import { applyEnvironment, resolveObstacles, startSim, stepSim, type World } from './sim';
import { TUNING } from './tuning';
import type { Obstacle } from './types';
import { makeWaves, windDirection } from './waves';

const calm = makeWaves(3, 0);
const course = generateCourse(3);
const rock: Obstacle = { kind: 'rock', pos: { x: 0, z: 10 }, radius: 2 };
const world = (obstacles: readonly Obstacle[], waves = calm): World => ({
  waves,
  course,
  obstacles,
});
const coast = { throttle: 0, steer: 0, trim: 0 };

describe('resolveObstacles', () => {
  it('leaves a clear craft alone', () => {
    const c = initialCraft(0, 0, 0, calm);
    expect(resolveObstacles(c, [rock])).toEqual({ craft: c, hit: false });
  });

  it('pushes an overlapping craft clear, bounces it and wipes it out', () => {
    const c = { ...initialCraft(0, 9, 0, calm), vel: { x: 0, y: 0, z: 10 } };
    const r = resolveObstacles(c, [rock]);
    expect(r.hit).toBe(true);
    expect(r.craft.pos.z).toBeLessThan(rock.pos.z - rock.radius - TUNING.craftRadius + 0.1);
    expect(r.craft.vel.z).toBeCloseTo(-10 * TUNING.collisionRestitution);
    expect(r.craft.wipeout).toBe(TUNING.wipeoutDuration);
  });

  it('handles a craft exactly at the obstacle centre', () => {
    const c = initialCraft(0, 10, 0, calm);
    const r = resolveObstacles(c, [rock]);
    expect(r.hit).toBe(true);
    expect(Number.isFinite(r.craft.pos.x)).toBe(true);
  });
});

describe('applyEnvironment', () => {
  const windy = makeWaves(5, 1);

  it('pushes a floating craft, and the wind component points downwind', () => {
    const wd = windDirection(windy);
    expect(Math.hypot(wd.x, wd.z)).toBeCloseTo(1);
    const c = initialCraft(0, 0, 0, windy);
    const v = applyEnvironment(c, windy, 0, 1);
    expect(v.vel.x !== 0 || v.vel.z !== 0).toBe(true);
  });

  it('does nothing while airborne', () => {
    const c = { ...initialCraft(0, 0, 0, windy), airborne: true };
    expect(applyEnvironment(c, windy, 0, 1)).toBe(c);
  });

  it('windDirection of an empty field is zero', () => {
    expect(windDirection({ seed: 0, wind: 0, components: [] })).toEqual({ x: 0, z: 0 });
  });
});

describe('stepSim', () => {
  it('advances time, moves under throttle and is deterministic', () => {
    const w = world([]);
    const s0 = startSim(initialCraft(0, 0, 0, calm));
    const run = () =>
      Array.from({ length: 100 }).reduce<ReturnType<typeof startSim>>(
        (s) => stepSim(s, { throttle: 1, steer: 0, trim: 0.3 }, w),
        s0,
      );
    const a = run();
    expect(a.t).toBeCloseTo(100 * TUNING.dt);
    expect(a.race.time).toBeCloseTo(100 * TUNING.dt);
    expect(a.craft.pos.z).toBeGreaterThan(0);
    expect(run()).toEqual(a);
  });

  it('counts a collision once and wipes the craft out', () => {
    const w = world([rock]);
    const s0 = startSim({ ...initialCraft(0, 5, 0, calm), vel: { x: 0, y: 0, z: 12 } });
    const end = Array.from({ length: 240 }).reduce<ReturnType<typeof startSim>>(
      (s) => stepSim(s, coast, w),
      s0,
    );
    expect(end.hits).toBe(1);
  });

  it('environment moves an idle craft on rough water over time', () => {
    const windy = makeWaves(5, 1);
    const w = world([], windy);
    const s0 = startSim(initialCraft(0, 0, 0, windy));
    const end = Array.from({ length: 1200 }).reduce<ReturnType<typeof startSim>>(
      (s) => stepSim(s, coast, w),
      s0,
    );
    expect(Math.hypot(end.craft.pos.x, end.craft.pos.z)).toBeGreaterThan(0.5);
  });
});
