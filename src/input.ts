import { TUNING } from './tuning';
import type { CraftInput } from './types';

/** The set of `KeyboardEvent.code` values currently held. */
export type KeySnapshot = ReadonlySet<string>;

export const EMPTY_KEYS: KeySnapshot = new Set<string>();

export const KEYS = {
  throttle: ['KeyW', 'ArrowUp'],
  port: ['KeyA', 'ArrowLeft'],
  starboard: ['KeyD', 'ArrowRight'],
  trimUp: ['KeyE'],
  trimDown: ['KeyQ'],
  start: ['Space', 'Enter'],
  restart: ['KeyR'],
} as const;

export const keyDown = (keys: KeySnapshot, code: string): KeySnapshot => new Set([...keys, code]);

export const keyUp = (keys: KeySnapshot, code: string): KeySnapshot =>
  new Set([...keys].filter((k) => k !== code));

const held = (keys: KeySnapshot, codes: readonly string[]): boolean =>
  codes.some((c) => keys.has(c));

/**
 * Held keys -> craft input. W/Up is full throttle, D/Right steers starboard (positive), A/Left to
 * port. Trim rests at the planing optimum; E raises the bow, Q lowers it.
 */
export const toCraftInput = (keys: KeySnapshot): CraftInput => ({
  throttle: held(keys, KEYS.throttle) ? 1 : 0,
  steer: (held(keys, KEYS.starboard) ? 1 : 0) - (held(keys, KEYS.port) ? 1 : 0),
  trim: held(keys, KEYS.trimUp) ? 1 : held(keys, KEYS.trimDown) ? -1 : TUNING.trimOptimum,
});

export interface Actions {
  readonly start: boolean;
  readonly restart: boolean;
}

/** One-shot actions from the keys pressed since the last frame. */
export const toActions = (pressed: KeySnapshot): Actions => ({
  start: held(pressed, KEYS.start),
  restart: held(pressed, KEYS.restart),
});
