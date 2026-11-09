import { TUNING, type Tuning } from './tuning';
import type { CraftState } from './types';

export const isCapsized = (roll: number, T: Tuning = TUNING): boolean =>
  Math.abs(roll) > T.capsizeRoll;

/** A landing is hard if it comes in too fast, or too far from level. */
export const isHardLanding = (
  impactSpeed: number,
  pitch: number,
  roll: number,
  T: Tuning = TUNING,
): boolean =>
  impactSpeed > T.hardLandingSpeed || Math.max(Math.abs(pitch), Math.abs(roll)) > T.hardLandingTilt;

export const beginWipeout = (T: Tuning = TUNING): number => T.wipeoutDuration;

/** Count the wipe-out timer down towards zero (recovery). */
export const tickWipeout = (remaining: number, dt: number): number => Math.max(0, remaining - dt);

/** Roll shown while wiped out: upside-down-ish, on whichever side it was already leaning. */
export const wipeoutRoll = (roll: number, T: Tuning = TUNING): number =>
  (roll < 0 ? -1 : 1) * T.capsizeRoll * 1.4;

/** Collision with an obstacle: lose most of the speed and wipe out. */
export const applyCollision = (state: CraftState, T: Tuning = TUNING): CraftState => ({
  ...state,
  vel: {
    x: state.vel.x * -T.collisionRestitution,
    y: state.vel.y,
    z: state.vel.z * -T.collisionRestitution,
  },
  wipeout: state.wipeout > 0 ? state.wipeout : beginWipeout(T),
});
