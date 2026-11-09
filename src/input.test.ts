import { describe, expect, it } from 'vitest';
import { EMPTY_KEYS, keyDown, keyUp, toActions, toCraftInput } from './input';
import { TUNING } from './tuning';

const held = (...codes: string[]) => codes.reduce(keyDown, EMPTY_KEYS);

describe('input', () => {
  it('maps no keys to idle throttle and the optimum trim', () => {
    expect(toCraftInput(EMPTY_KEYS)).toEqual({ throttle: 0, steer: 0, trim: TUNING.trimOptimum });
  });

  it('maps W and Up to throttle', () => {
    expect(toCraftInput(held('KeyW')).throttle).toBe(1);
    expect(toCraftInput(held('ArrowUp')).throttle).toBe(1);
  });

  it('steers starboard with D/Right and port with A/Left, cancelling when both held', () => {
    expect(toCraftInput(held('KeyD')).steer).toBe(1);
    expect(toCraftInput(held('ArrowRight')).steer).toBe(1);
    expect(toCraftInput(held('KeyA')).steer).toBe(-1);
    expect(toCraftInput(held('ArrowLeft')).steer).toBe(-1);
    expect(toCraftInput(held('KeyA', 'KeyD')).steer).toBe(0);
  });

  it('trims with E (bow up) and Q (bow down)', () => {
    expect(toCraftInput(held('KeyE')).trim).toBe(1);
    expect(toCraftInput(held('KeyQ')).trim).toBe(-1);
  });

  it('keyDown/keyUp are immutable', () => {
    const a = held('KeyW');
    const b = keyUp(a, 'KeyW');
    expect(a.has('KeyW')).toBe(true);
    expect(b.has('KeyW')).toBe(false);
  });

  it('reads one-shot actions', () => {
    expect(toActions(held('Space'))).toEqual({ start: true, restart: false });
    expect(toActions(held('KeyR'))).toEqual({ start: false, restart: true });
    expect(toActions(EMPTY_KEYS)).toEqual({ start: false, restart: false });
  });
});
