import { describe, expect, it } from 'vitest';
import { generateCourse } from './course';
import { formatCheckpoints, formatLapTime, formatPenalties, formatSpeed, hudModel } from './hud';
import { TUNING } from './tuning';
import type { RaceState } from './types';

const course = generateCourse(1);
const race = (o: Partial<RaceState> = {}): RaceState => ({
  time: 0,
  next: 1,
  missed: 0,
  status: 'running',
  ...o,
});

describe('hud', () => {
  it('formats lap time as m:ss.cc', () => {
    expect(formatLapTime(0)).toBe('0:00.00');
    expect(formatLapTime(65.43)).toBe('1:05.43');
    expect(formatLapTime(600.009)).toBe('10:00.00');
    expect(formatLapTime(-3)).toBe('0:00.00');
    expect(formatLapTime(Number.NaN)).toBe('0:00.00');
  });

  it('formats speed in km/h', () => {
    expect(formatSpeed(10)).toBe('36 km/h');
    expect(formatSpeed(-1)).toBe('0 km/h');
  });

  it('formats checkpoints passed over total', () => {
    const n = course.gates.length;
    expect(formatCheckpoints(race(), course)).toBe(`0/${n}`);
    expect(formatCheckpoints(race({ next: 4, missed: 1 }), course)).toBe(`2/${n}`);
  });

  it('formats penalties', () => {
    expect(formatPenalties(race())).toBe('');
    expect(formatPenalties(race({ missed: 2 }))).toBe(`+${2 * TUNING.missedPenalty}.0s (2 missed)`);
  });

  it('builds a model, adding penalties to the final time once finished', () => {
    const running = hudModel(race({ time: 12.5 }), course, 5);
    expect(running.time).toBe('0:12.50');
    expect(running.speed).toBe('18 km/h');
    const done = hudModel(race({ time: 20, missed: 1, status: 'finished' }), course, 0);
    expect(done.time).toBe(formatLapTime(20 + TUNING.missedPenalty));
    expect(done.penalties).not.toBe('');
  });
});
