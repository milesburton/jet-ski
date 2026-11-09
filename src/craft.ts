import { beginWipeout, isCapsized, isHardLanding, tickWipeout, wipeoutRoll } from './crash';
import { TUNING, type Tuning } from './tuning';
import type { CraftInput, CraftState, Vec2, WaveField } from './types';
import { add, clamp, dot, lerp, scale, smoothstep, wrapAngle } from './vec';
import { heightAt } from './waves';

export { applyCollision } from './crash';

export const NO_INPUT: CraftInput = { throttle: 0, steer: 0, trim: 0 };

/** A craft at rest on the water, floating at equilibrium height. */
export const initialCraft = (
  x: number,
  z: number,
  heading: number,
  waves: WaveField,
  t = 0,
  T: Tuning = TUNING,
): CraftState => ({
  pos: { x, y: heightAt(waves, x, z, t) - T.equilibriumDepth, z },
  vel: { x: 0, y: 0, z: 0 },
  heading,
  yawRate: 0,
  pitch: 0,
  roll: 0,
  airborne: false,
  wipeout: 0,
});

export const horizontalSpeed = (s: CraftState): number => Math.hypot(s.vel.x, s.vel.z);

/** 0 = displacement hull, 1 = fully on the plane. */
export const planingFactor = (speed: number, T: Tuning = TUNING): number =>
  smoothstep((speed - T.planeSpeed) / T.planeBand);

export const forwardOf = (heading: number): Vec2 => ({
  x: Math.sin(heading),
  z: Math.cos(heading),
});
export const starboardOf = (heading: number): Vec2 => ({
  x: Math.cos(heading),
  z: -Math.sin(heading),
});

/** Advance the craft by dt seconds. `t` is the wave time at the start of the step. */
export const step = (
  state: CraftState,
  input: CraftInput,
  waves: WaveField,
  t: number,
  dt: number,
  T: Tuning = TUNING,
): CraftState => {
  const throttle = clamp(input.throttle, 0, 1);
  const steer = clamp(input.steer, -1, 1);
  const trim = clamp(input.trim, -1, 1);
  const { pos, vel } = state;

  // --- sample the water under the hull
  const fwd = forwardOf(state.heading);
  const stbd = starboardOf(state.heading);
  const at = (o: Vec2): number => heightAt(waves, pos.x + o.x, pos.z + o.z, t);
  const halfL = T.hullLength / 2;
  const halfW = T.hullWidth / 2;
  const hC = at({ x: 0, z: 0 });
  const hBow = at(scale(fwd, halfL));
  const hStern = at(scale(fwd, -halfL));
  const hPort = at(scale(stbd, -halfW));
  const hStbd = at(scale(stbd, halfW));
  const waterH = (hBow + hStern + hC) / 3;
  const waterVy = (heightAt(waves, pos.x + vel.x * dt, pos.z + vel.z * dt, t + dt) - hC) / dt;
  const submersion = waterH - pos.y;

  // --- airborne / landing / wipe-out bookkeeping
  const airborne = submersion < -T.airMargin;
  const landing = state.airborne && !airborne;
  const impact = landing ? -(vel.y - waterVy) : 0;
  const wasWiping = state.wipeout > 0;
  const newWipeout =
    !wasWiping &&
    ((landing && isHardLanding(impact, state.pitch, state.roll, T)) || isCapsized(state.roll, T));
  const wipeout = newWipeout ? beginWipeout(T) : tickWipeout(state.wipeout, dt);
  const recovered = wasWiping && wipeout === 0;
  const wiping = wipeout > 0;

  // --- vertical: buoyancy spring (lifted by planing), damping relative to the moving surface
  const speed = Math.hypot(vel.x, vel.z);
  const plane = planingFactor(speed, T);
  const eqDepth = T.equilibriumDepth * (1 - T.planeLift * plane);
  const wet = clamp(submersion, 0, T.maxSubmersion);
  const buoyancy = airborne ? 0 : (T.gravity * wet) / eqDepth;
  const heave = airborne || wet === 0 ? 0 : -T.heaveDamping * (vel.y - waterVy);
  const vy = vel.y + (buoyancy + heave - T.gravity) * dt;
  const y = pos.y + vy * dt;

  // --- heading: water-jet steering authority is proportional to thrust
  const inWater = !airborne && !wiping;
  const power = inWater ? throttle : 0;
  const yawTarget = steer * T.maxYawRate * power;
  const yawRate = state.yawRate + (yawTarget - state.yawRate) * Math.min(1, T.yawResponse * dt);
  const heading = wrapAngle(state.heading + yawRate * dt);

  // --- horizontal: thrust, drag, lateral grip (skid emerges from the heading change)
  const nf = forwardOf(heading);
  const ns = starboardOf(heading);
  const v2: Vec2 = { x: vel.x, z: vel.z };
  const vf = dot(v2, nf);
  const vl = dot(v2, ns);
  const trimErr = trim - T.trimOptimum;
  const dragCoef =
    T.dragDisplacement *
    (1 - (1 - T.planeDragFactor) * plane) *
    (1 + plane * T.trimDragK * trimErr ** 2);
  const water = !airborne;
  const drag = water ? (dragCoef * Math.abs(vf) + T.dragLinear) * vf : 0;
  const wipeDamp = wiping ? Math.exp(-T.wipeoutDrag * dt) : 1;
  const grip = water ? Math.exp(-lerp(T.gripDisplacement, T.gripPlaning, plane) * dt) : 1;
  const vf2 = (vf + (T.thrust * power - drag) * dt) * wipeDamp;
  const vl2 = vl * grip * wipeDamp;
  const v = add(scale(nf, vf2), scale(ns, vl2));

  // --- attitude from sampled heights, trim and lean
  const slopePitch = airborne ? 0 : Math.atan2(hBow - hStern, T.hullLength);
  const slopeRoll = airborne ? 0 : Math.atan2(hPort - hStbd, T.hullWidth);
  const pitchTarget = slopePitch + trim * T.trimPitch;
  const rollTarget = wiping
    ? wipeoutRoll(state.roll, T)
    : slopeRoll + yawRate * Math.hypot(v.x, v.z) * T.leanFactor;
  const a = Math.min(1, T.attitudeResponse * dt);

  return {
    pos: { x: pos.x + v.x * dt, y, z: pos.z + v.z * dt },
    vel: { x: v.x, y: vy, z: v.z },
    heading,
    yawRate,
    pitch: recovered ? 0 : state.pitch + (pitchTarget - state.pitch) * a,
    roll: recovered ? 0 : state.roll + (rollTarget - state.roll) * a,
    airborne,
    wipeout,
  };
};
