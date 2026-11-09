import { generateCourse } from './course';
import { initialCraft } from './craft';
import { toCraftInput, type KeySnapshot } from './input';
import { generateObstacles } from './obstacles';
import { next, range } from './rng';
import { startSim, stepSim, type SimState, type World } from './sim';
import { TUNING } from './tuning';
import type { CraftInput } from './types';
import { makeWaves } from './waves';

export type Phase = 'menu' | 'countdown' | 'running' | 'wipeout' | 'finished';

export const COUNTDOWN_SECONDS = 3;
/** Longest frame we simulate; longer stalls (tab in background) are clipped. */
export const MAX_FRAME = 0.1;
export const DEFAULT_SEED = 1;
const COAST: CraftInput = { throttle: 0, steer: 0, trim: 0 };

export interface GameState {
  readonly phase: Phase;
  readonly seed: number;
  readonly world: World;
  readonly sim: SimState;
  /** Seconds left in the countdown (only meaningful in that phase). */
  readonly countdown: number;
  /** Unconsumed frame time, always below one fixed step after `update`. */
  readonly accumulator: number;
}

/** Parse `?seed=N` from a location search string; falls back on anything not a safe integer. */
export const parseSeed = (search: string, fallback: number = DEFAULT_SEED): number => {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^-?\d+$/.test(raw.trim())) return fallback;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : fallback;
};

export const buildWorld = (seed: number): World => {
  const [wind] = range(next(seed)[1], 0.25, 0.85);
  const course = generateCourse(seed);
  return { waves: makeWaves(seed, wind), course, obstacles: generateObstacles(seed, course) };
};

/** A fresh game in the menu, craft floating just behind the start line. */
export const newGame = (seed: number): GameState => {
  const world = buildWorld(seed);
  const g = world.course.gates[0];
  if (!g) throw new Error('course has no gates');
  const heading = Math.atan2(g.dir.x, g.dir.z);
  const craft = initialCraft(
    g.centre.x - g.dir.x * 6,
    g.centre.z - g.dir.z * 6,
    heading,
    world.waves,
  );
  return {
    phase: 'menu',
    seed,
    world,
    sim: startSim(craft),
    countdown: COUNTDOWN_SECONDS,
    accumulator: 0,
  };
};

/** Restart the same course straight into the countdown. */
export const restart = (g: GameState): GameState => ({
  ...newGame(g.seed),
  phase: 'countdown',
});

/** Advance one fixed step according to the phase. */
export const tick = (g: GameState, control: CraftInput, dt: number = TUNING.dt): GameState => {
  switch (g.phase) {
    case 'menu':
      return { ...g, sim: { ...stepSim(g.sim, COAST, g.world, dt), race: g.sim.race } };
    case 'countdown': {
      const left = g.countdown - dt;
      const sim = { ...stepSim(g.sim, COAST, g.world, dt), race: g.sim.race };
      return left <= 0
        ? { ...g, sim, countdown: 0, phase: 'running' }
        : { ...g, sim, countdown: left };
    }
    case 'running':
    case 'wipeout': {
      const sim = stepSim(g.sim, control, g.world, dt);
      const phase: Phase =
        sim.race.status === 'finished' ? 'finished' : sim.craft.wipeout > 0 ? 'wipeout' : 'running';
      return { ...g, sim, phase };
    }
    case 'finished':
      return { ...g, sim: stepSim(g.sim, COAST, g.world, dt) };
  }
};

export interface FrameInput {
  readonly keys: KeySnapshot;
  /** Start key pressed this frame. */
  readonly start: boolean;
  /** Restart key pressed this frame. */
  readonly restart: boolean;
}

/** Apply one-shot actions: start leaves the menu, restart re-enters the countdown. */
export const applyActions = (g: GameState, start: boolean, wantsRestart: boolean): GameState =>
  g.phase === 'menu' && (start || wantsRestart)
    ? { ...g, phase: 'countdown', countdown: COUNTDOWN_SECONDS }
    : wantsRestart || (start && g.phase === 'finished')
      ? restart(g)
      : g;

/** Frame update: handle actions, then run as many fixed steps as the elapsed time affords. */
export const update = (g: GameState, frame: FrameInput, frameDt: number): GameState => {
  const acted = applyActions(g, frame.start, frame.restart);
  const control = toCraftInput(frame.keys);
  const total = acted.accumulator + Math.min(Math.max(frameDt, 0), MAX_FRAME);
  const steps = Math.floor(total / TUNING.dt + 1e-9);
  const stepped = Array.from({ length: steps }).reduce<GameState>((s) => tick(s, control), acted);
  return { ...stepped, accumulator: Math.max(0, total - steps * TUNING.dt) };
};
