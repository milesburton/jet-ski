import { crossesGate } from './course';
import { TUNING, type Tuning } from './tuning';
import type { Course, Gate, RaceState, Vec2 } from './types';

/**
 * One lap: gates 1..n-1 in order, then gate 0 again as the finish. Gate indices in
 * `RaceState.next` run 1..n (n maps to gate 0). Crossing a gate a little further ahead than
 * expected counts the skipped ones as missed (time penalty); further than that is ignored.
 */
export const startRace = (): RaceState => ({ time: 0, next: 1, missed: 0, status: 'running' });

export const raceStep = (
  race: RaceState,
  course: Course,
  from: Vec2,
  to: Vec2,
  dt: number,
  T: Tuning = TUNING,
): RaceState => {
  if (race.status === 'finished') return race;
  const n = course.gates.length;
  const time = race.time + dt;
  const last = Math.min(n, race.next + T.maxSkippedGates);
  const hit = Array.from({ length: last - race.next + 1 }, (_, i) => race.next + i).find((idx) =>
    crossesGate(course.gates[idx % n] as Gate, from, to),
  );
  if (hit === undefined) return { ...race, time };
  return {
    time,
    next: hit + 1,
    missed: race.missed + (hit - race.next),
    status: hit === n ? 'finished' : 'running',
  };
};

/** Elapsed time plus penalties for missed checkpoints. */
export const finalTime = (race: RaceState, T: Tuning = TUNING): number =>
  race.time + race.missed * T.missedPenalty;

export const gatesPassed = (race: RaceState): number => race.next - 1 - race.missed;
