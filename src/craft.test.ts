import { describe, expect, it } from 'vitest';
import { applyCollision, isCapsized, isHardLanding, tickWipeout, wipeoutRoll } from './crash';
import { NO_INPUT, horizontalSpeed, initialCraft, planingFactor, step } from './craft';
import { TUNING, type Tuning } from './tuning';
import type { CraftInput, CraftState, WaveField } from './types';
import { makeWaves } from './waves';

const dt = TUNING.dt;
const calm: WaveField = { seed: 0, wind: 0, components: [] };

const run = (
  s0: CraftState,
  input: CraftInput | ((i: number, s: CraftState) => CraftInput),
  waves: WaveField,
  steps: number,
  T: Tuning = TUNING,
): CraftState => {
  let s = s0;
  for (let i = 0; i < steps; i++) {
    s = step(s, typeof input === 'function' ? input(i, s) : input, waves, i * dt, dt, T);
  }
  return s;
};

describe('buoyancy', () => {
  it('settles at equilibrium height in calm water', () => {
    const s0 = { ...initialCraft(0, 0, 0, calm), pos: { x: 0, y: 0.2, z: 0 } };
    const s = run(s0, NO_INPUT, calm, 1000);
    expect(s.pos.y).toBeCloseTo(-TUNING.equilibriumDepth, 2);
    expect(Math.abs(s.vel.y)).toBeLessThan(0.01);
    expect(s.airborne).toBe(false);
    expect(s.wipeout).toBe(0);
  });

  it('rides the wave height on average', () => {
    const waves = makeWaves(11, 0.7);
    let s = initialCraft(0, 0, 0.3, waves);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < 1800; i++) {
      s = step(s, { throttle: 0.4, steer: 0, trim: 0 }, waves, i * dt, dt);
      if (i >= 600) {
        sum += s.pos.y;
        n++;
      }
    }
    // Average hull height sits at about mean water level (0) minus the draught.
    expect(sum / n).toBeLessThan(0.1);
    expect(sum / n).toBeGreaterThan(-TUNING.equilibriumDepth - 0.3);
  });

  it('tilts with the wave slope', () => {
    const waves = makeWaves(4, 1);
    const s = run(initialCraft(0, 0, 0, waves), NO_INPUT, waves, 400);
    expect(Math.abs(s.pitch) + Math.abs(s.roll)).toBeGreaterThan(0);
  });
});

describe('propulsion', () => {
  it('planing reaches a higher speed than displacement at the same throttle', () => {
    const full = { throttle: 1, steer: 0, trim: TUNING.trimOptimum };
    const planing = run(initialCraft(0, 0, 0, calm), full, calm, 1800);
    const displacing = run(initialCraft(0, 0, 0, calm), full, calm, 1800, {
      ...TUNING,
      planeSpeed: 1e9,
    });
    expect(horizontalSpeed(planing)).toBeGreaterThan(horizontalSpeed(displacing) * 1.2);
    expect(planingFactor(horizontalSpeed(planing))).toBeGreaterThan(0.9);
    expect(planingFactor(0)).toBe(0);
  });

  it('planing lifts the hull higher than at rest', () => {
    const s = run(initialCraft(0, 0, 0, calm), { throttle: 1, steer: 0, trim: 0.3 }, calm, 1500);
    expect(s.pos.y).toBeGreaterThan(-TUNING.equilibriumDepth + 0.05);
  });

  it('cannot steer without throttle', () => {
    const moving = { ...initialCraft(0, 0, 0, calm), vel: { x: 0, y: 0, z: 15 } };
    const s = run(moving, { throttle: 0, steer: 1, trim: 0 }, calm, 300);
    expect(s.heading).toBe(0);
    expect(s.yawRate).toBe(0);
  });

  it('steers in proportion to throttle', () => {
    const turn = (throttle: number): number =>
      run(initialCraft(0, 0, 0, calm), { throttle, steer: 1, trim: 0 }, calm, 200).heading;
    expect(turn(1)).toBeGreaterThan(turn(0.3));
    expect(turn(0.3)).toBeGreaterThan(0);
    expect(
      run(initialCraft(0, 0, 0, calm), { throttle: 1, steer: -1, trim: 0 }, calm, 100).heading,
    ).toBeLessThan(0);
  });

  it('skids: lateral velocity persists on the plane and decays', () => {
    const moving = { ...initialCraft(0, 0, 0, calm), vel: { x: 0, y: 0, z: 20 } };
    const turned = run(moving, { throttle: 1, steer: 1, trim: 0.3 }, calm, 60);
    const lateral =
      turned.vel.x * Math.cos(turned.heading) - turned.vel.z * Math.sin(turned.heading);
    expect(Math.abs(lateral)).toBeGreaterThan(0.1);
    const gripped = run(turned, { throttle: 1, steer: 0, trim: 0.3 }, calm, 600);
    const lat2 =
      gripped.vel.x * Math.cos(gripped.heading) - gripped.vel.z * Math.sin(gripped.heading);
    expect(Math.abs(lat2)).toBeLessThan(Math.abs(lateral));
  });

  it('clamps out-of-range inputs', () => {
    const a = step(initialCraft(0, 0, 0, calm), { throttle: 9, steer: 9, trim: 9 }, calm, 0, dt);
    const b = step(initialCraft(0, 0, 0, calm), { throttle: 1, steer: 1, trim: 1 }, calm, 0, dt);
    expect(a).toEqual(b);
  });
});

describe('air and crash', () => {
  const airborneAt = (vy: number, y: number): CraftState => ({
    ...initialCraft(0, 0, 0, calm),
    pos: { x: 0, y, z: 0 },
    vel: { x: 0, y: vy, z: 5 },
    airborne: true,
  });

  it('is ballistic when launched clear of the water', () => {
    const s0 = airborneAt(5, 1);
    const s = run(s0, { throttle: 1, steer: 1, trim: 0 }, calm, 20);
    expect(s.airborne).toBe(true);
    expect(s.vel.y).toBeCloseTo(5 - TUNING.gravity * 20 * dt, 2);
    expect(s.vel.z).toBeCloseTo(5, 5);
    expect(s.yawRate).toBe(0);
  });

  it('wipes out on a hard landing and recovers', () => {
    let s = run(airborneAt(-5, 3), NO_INPUT, calm, 80);
    expect(s.wipeout).toBeGreaterThan(0);
    expect(Math.abs(s.roll)).toBeGreaterThan(0);
    const power = step(s, { throttle: 1, steer: 1, trim: 0 }, calm, 0, dt);
    expect(power.yawRate).toBe(s.yawRate * (1 - TUNING.yawResponse * dt));
    s = run(s, NO_INPUT, calm, Math.ceil(TUNING.wipeoutDuration / dt) + 5);
    expect(s.wipeout).toBe(0);
    expect(s.roll).toBeLessThan(0.5);
  });

  it('survives a gentle landing', () => {
    const s = run(airborneAt(-1, 0.2), NO_INPUT, calm, 120);
    expect(s.wipeout).toBe(0);
  });

  it('capsizing triggers a wipe-out', () => {
    const s = step({ ...initialCraft(0, 0, 0, calm), roll: 1.5 }, NO_INPUT, calm, 0, dt);
    expect(s.wipeout).toBeGreaterThan(0);
  });

  it('crash helpers', () => {
    expect(isCapsized(-1.3)).toBe(true);
    expect(isCapsized(0.2)).toBe(false);
    expect(isHardLanding(1, 0.9, 0)).toBe(true);
    expect(isHardLanding(1, 0, 0)).toBe(false);
    expect(tickWipeout(0.001, 1)).toBe(0);
    expect(wipeoutRoll(-0.1)).toBeLessThan(0);
    expect(wipeoutRoll(0.1)).toBeGreaterThan(0);
  });

  it('collision bounces back and wipes out without resetting an active wipe-out', () => {
    const s = { ...initialCraft(0, 0, 0, calm), vel: { x: 0, y: 0, z: 10 } };
    const hit = applyCollision(s);
    expect(hit.vel.z).toBeLessThan(0);
    expect(hit.wipeout).toBeGreaterThan(0);
    expect(applyCollision({ ...hit, wipeout: 1 }).wipeout).toBe(1);
  });
});

describe('determinism', () => {
  it('same seed and inputs give identical results', () => {
    const go = (): CraftState => {
      const waves = makeWaves(99, 0.8);
      return run(
        initialCraft(0, 0, 0, waves),
        (i) => ({ throttle: 1, steer: Math.sin(i / 50), trim: 0.2 }),
        waves,
        1500,
      );
    };
    expect(go()).toEqual(go());
  });

  it('does not mutate its input', () => {
    const s = Object.freeze(initialCraft(0, 0, 0, calm));
    expect(() => step(s, NO_INPUT, calm, 0, dt)).not.toThrow();
  });
});

describe('launch', () => {
  it('leaves the water off crests at speed in rough water', () => {
    let launched = 0;
    for (const seed of [1, 2, 3]) {
      const waves = makeWaves(seed, 1);
      let s = initialCraft(0, 0, 0, waves);
      for (let i = 0; i < 1500; i++) {
        s = step(s, { throttle: 1, steer: 0, trim: 0.3 }, waves, i * dt, dt);
        if (s.airborne) launched++;
      }
    }
    expect(launched).toBeGreaterThan(0);
  });
});
