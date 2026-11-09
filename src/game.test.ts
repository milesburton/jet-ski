import { describe, expect, it } from 'vitest';
import {
  COUNTDOWN_SECONDS,
  MAX_FRAME,
  applyActions,
  newGame,
  parseSeed,
  restart,
  tick,
  update,
  type FrameInput,
  type GameState,
} from './game';
import { EMPTY_KEYS, keyDown } from './input';
import { TUNING } from './tuning';

const idle: FrameInput = { keys: EMPTY_KEYS, start: false, restart: false };
const gas: FrameInput = { ...idle, keys: keyDown(EMPTY_KEYS, 'KeyW') };

const run = (g: GameState, frame: FrameInput, frames: number, dt = 1 / 60): GameState =>
  Array.from({ length: frames }).reduce<GameState>((s) => update(s, frame, dt), g);

describe('parseSeed', () => {
  it('reads integers and falls back otherwise', () => {
    expect(parseSeed('?seed=42')).toBe(42);
    expect(parseSeed('?a=1&seed=-7')).toBe(-7);
    expect(parseSeed('')).toBe(1);
    expect(parseSeed('?seed=abc', 9)).toBe(9);
    expect(parseSeed('?seed=1.5', 9)).toBe(9);
    expect(parseSeed('?seed=99999999999999999999', 9)).toBe(9);
  });
});

describe('game state machine', () => {
  it('starts in the menu, which does not advance the race', () => {
    const g = run(newGame(3), idle, 30);
    expect(g.phase).toBe('menu');
    expect(g.sim.race.time).toBe(0);
    expect(g.sim.t).toBeGreaterThan(0.4);
  });

  it('menu -> countdown -> running', () => {
    const g0 = update(newGame(3), { ...idle, start: true }, 1 / 60);
    expect(g0.phase).toBe('countdown');
    const mid = run(g0, idle, 60);
    expect(mid.phase).toBe('countdown');
    expect(mid.sim.race.time).toBe(0);
    const go = run(mid, idle, 150);
    expect(go.phase).toBe('running');
    expect(go.sim.race.time).toBeGreaterThan(0);
  });

  it('applyActions: start from menu, restart anywhere, start ignored while running', () => {
    const g = newGame(3);
    expect(applyActions(g, true, false).phase).toBe('countdown');
    expect(applyActions(g, false, true).phase).toBe('countdown');
    expect(applyActions(g, false, false)).toBe(g);
    const running: GameState = { ...g, phase: 'running' };
    expect(applyActions(running, true, false)).toBe(running);
    expect(applyActions(running, false, true).phase).toBe('countdown');
    expect(applyActions({ ...g, phase: 'finished' }, true, false).phase).toBe('countdown');
  });

  it('restart resets the sim and keeps the seed', () => {
    const g = run(update(newGame(5), { ...idle, start: true }, 0.01), gas, 400);
    expect(g.sim.t).toBeGreaterThan(3);
    const r = restart(g);
    expect(r.seed).toBe(5);
    expect(r.phase).toBe('countdown');
    expect(r.sim.t).toBe(0);
    expect(r.countdown).toBe(COUNTDOWN_SECONDS);
  });

  it('enters wipeout on a collision and recovers to running', () => {
    const g = newGame(3);
    const rock = {
      kind: 'rock' as const,
      pos: { x: g.sim.craft.pos.x, z: g.sim.craft.pos.z },
      radius: 1,
    };
    const hit: GameState = {
      ...g,
      phase: 'running',
      world: { ...g.world, obstacles: [rock] },
    };
    const w = tick(hit, { throttle: 0, steer: 0, trim: 0 });
    expect(w.phase).toBe('wipeout');
    const after = Array.from({
      length: Math.ceil(TUNING.wipeoutDuration / TUNING.dt) + 5,
    }).reduce<GameState>((s) => tick(s, { throttle: 0, steer: 0, trim: 0 }), w);
    expect(after.phase).toBe('running');
  });

  it('finishes when the race finishes and keeps coasting', () => {
    const g = newGame(3);
    const done: GameState = {
      ...g,
      phase: 'running',
      sim: {
        ...g.sim,
        race: { ...g.sim.race, next: g.world.course.gates.length, status: 'running' },
      },
    };
    // force finish by placing race state as finished after a tick
    const fin: GameState = {
      ...done,
      phase: 'running',
      sim: { ...done.sim, race: { ...done.sim.race, status: 'finished' } },
    };
    const t = tick(fin, { throttle: 1, steer: 0, trim: 0 });
    expect(t.phase).toBe('finished');
    expect(tick(t, { throttle: 1, steer: 0, trim: 0 }).phase).toBe('finished');
  });

  it('uses a fixed-step accumulator: steps independent of frame rate, stalls clipped', () => {
    const start = update(newGame(3), { ...idle, start: true }, 0);
    const a = run(start, gas, 120, 1 / 60);
    const b = run(start, gas, 240, 1 / 120);
    expect(a.sim.t).toBeCloseTo(b.sim.t, 1);
    const stall = update(start, gas, 5);
    expect(stall.sim.t).toBeLessThanOrEqual(MAX_FRAME + 1e-9);
    expect(stall.accumulator).toBeLessThan(TUNING.dt);
    expect(stall.accumulator).toBeGreaterThanOrEqual(0);
    expect(update(start, gas, -1).sim.t).toBe(0);
  });

  it('is deterministic', () => {
    const s = update(newGame(8), { ...idle, start: true }, 0);
    expect(run(s, gas, 300)).toEqual(run(s, gas, 300));
  });
});
