import { applyCollision } from './crash';
import { step } from './craft';
import { hitObstacle } from './obstacles';
import { raceStep, startRace } from './race';
import { TUNING, type Tuning } from './tuning';
import type { Course, CraftInput, CraftState, Obstacle, RaceState, WaveField } from './types';
import { dist } from './vec';
import { normalAt, windDirection } from './waves';

/** Everything fixed for the duration of a run. */
export interface World {
  readonly waves: WaveField;
  readonly course: Course;
  readonly obstacles: readonly Obstacle[];
}

export interface SimState {
  readonly craft: CraftState;
  readonly race: RaceState;
  /** Simulation time in seconds; also the wave time. */
  readonly t: number;
  /** Obstacle collisions so far. */
  readonly hits: number;
}

export const startSim = (craft: CraftState, t = 0): SimState => ({
  craft,
  race: startRace(),
  t,
  hits: 0,
});

/** Wind drift plus downhill push from the local wave slope, applied to a craft in the water. */
export const applyEnvironment = (
  craft: CraftState,
  waves: WaveField,
  t: number,
  dt: number,
  T: Tuning = TUNING,
): CraftState => {
  if (craft.airborne) return craft;
  const wind = windDirection(waves);
  const n = normalAt(waves, craft.pos.x, craft.pos.z, t);
  const ax = wind.x * waves.wind * T.windDrift + n.x * T.gravity * T.wavePush;
  const az = wind.z * waves.wind * T.windDrift + n.z * T.gravity * T.wavePush;
  return { ...craft, vel: { x: craft.vel.x + ax * dt, y: craft.vel.y, z: craft.vel.z + az * dt } };
};

/** If the craft overlaps an obstacle, push it clear along the contact normal and wipe it out. */
export const resolveObstacles = (
  craft: CraftState,
  obstacles: readonly Obstacle[],
  T: Tuning = TUNING,
): { readonly craft: CraftState; readonly hit: boolean } => {
  const o = hitObstacle(obstacles, { x: craft.pos.x, z: craft.pos.z }, T.craftRadius);
  if (!o) return { craft, hit: false };
  const d = dist(o.pos, { x: craft.pos.x, z: craft.pos.z });
  const nx = d === 0 ? 1 : (craft.pos.x - o.pos.x) / d;
  const nz = d === 0 ? 0 : (craft.pos.z - o.pos.z) / d;
  const r = o.radius + T.craftRadius + 0.01;
  const moved: CraftState = {
    ...craft,
    pos: { x: o.pos.x + nx * r, y: craft.pos.y, z: o.pos.z + nz * r },
  };
  return { craft: applyCollision(moved, T), hit: true };
};

/** One fixed step of craft physics, environment forces, obstacle collisions and the race. */
export const stepSim = (
  s: SimState,
  input: CraftInput,
  world: World,
  dt: number = TUNING.dt,
  T: Tuning = TUNING,
): SimState => {
  const stepped = applyEnvironment(
    step(s.craft, input, world.waves, s.t, dt, T),
    world.waves,
    s.t,
    dt,
    T,
  );
  const { craft, hit } = resolveObstacles(stepped, world.obstacles, T);
  const race = raceStep(
    s.race,
    world.course,
    { x: s.craft.pos.x, z: s.craft.pos.z },
    { x: craft.pos.x, z: craft.pos.z },
    dt,
    T,
  );
  return { craft, race, t: s.t + dt, hits: s.hits + (hit ? 1 : 0) };
};
