import { TUNING, type Tuning } from './tuning';
import { finalTime, gatesPassed } from './race';
import type { Course, RaceState } from './types';

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Seconds -> m:ss.cc (centiseconds, rounded down). Negative or non-finite shows as zero. */
export const formatLapTime = (seconds: number): string => {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const cs = Math.floor(s * 100 + 1e-6);
  const m = Math.floor(cs / 6000);
  return `${m}:${pad(Math.floor((cs % 6000) / 100), 2)}.${pad(cs % 100, 2)}`;
};

/** Speed in m/s -> whole km/h. */
export const formatSpeed = (metresPerSecond: number): string =>
  `${Math.round(Math.max(0, metresPerSecond) * 3.6)} km/h`;

/** Gates cleanly passed out of the total (including the finish line). */
export const formatCheckpoints = (race: RaceState, course: Course): string =>
  `${Math.max(0, gatesPassed(race))}/${course.gates.length}`;

/** Empty when clean; otherwise e.g. "+10.0s (2 missed)". */
export const formatPenalties = (race: RaceState, T: Tuning = TUNING): string =>
  race.missed === 0
    ? ''
    : `+${(race.missed * T.missedPenalty).toFixed(1)}s (${race.missed} missed)`;

export interface HudModel {
  readonly time: string;
  readonly speed: string;
  readonly checkpoints: string;
  readonly penalties: string;
}

export const hudModel = (
  race: RaceState,
  course: Course,
  speed: number,
  T: Tuning = TUNING,
): HudModel => ({
  time: formatLapTime(race.status === 'finished' ? finalTime(race, T) : race.time),
  speed: formatSpeed(speed),
  checkpoints: formatCheckpoints(race, course),
  penalties: formatPenalties(race, T),
});

export interface Overlay {
  readonly title: string;
  readonly subtitle: string;
}

/** Centre-screen message for each game phase; an empty title means show nothing. */
export const overlayFor = (
  phase: 'menu' | 'countdown' | 'running' | 'wipeout' | 'finished',
  countdown: number,
  race: RaceState,
  T: Tuning = TUNING,
): Overlay => {
  switch (phase) {
    case 'menu':
      return {
        title: 'Jet Ski',
        subtitle: 'W/Up throttle, A/D or arrows steer, Q/E trim. Space to start, R to restart.',
      };
    case 'countdown':
      return { title: String(Math.max(1, Math.ceil(countdown))), subtitle: 'Get ready' };
    case 'running':
      return { title: '', subtitle: '' };
    case 'wipeout':
      return { title: 'Wipe-out!', subtitle: 'Recovering...' };
    case 'finished':
      return {
        title: `Finished: ${formatLapTime(finalTime(race, T))}`,
        subtitle: 'Press R to race again',
      };
  }
};
