import { describe, expect, it } from 'vitest';
import { generateCourse } from './course';
import { distToRacingLine, generateObstacles, hitObstacle } from './obstacles';
import { TUNING } from './tuning';

describe('obstacles', () => {
  it('is deterministic and kept clear of the racing line and each other', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const course = generateCourse(seed);
      const obs = generateObstacles(seed, course);
      expect(generateObstacles(seed, course)).toEqual(obs);
      expect(obs.length).toBeGreaterThan(0);
      expect(obs.length).toBeLessThanOrEqual(TUNING.obstacleCount);
      for (const o of obs) {
        expect(distToRacingLine(course, o.pos)).toBeGreaterThanOrEqual(
          TUNING.obstacleClearance + o.radius,
        );
      }
    }
  });

  it('keeps every gate buoy clear', () => {
    const course = generateCourse(9);
    const obs = generateObstacles(9, course, 30);
    for (const g of course.gates) {
      expect(hitObstacle(obs, g.left)).toBeUndefined();
      expect(hitObstacle(obs, g.right)).toBeUndefined();
    }
  });

  it('hit test uses radius sum', () => {
    const obs = [{ kind: 'rock' as const, pos: { x: 10, z: 0 }, radius: 2 }];
    expect(hitObstacle(obs, { x: 7, z: 0 }, 1)).toBeUndefined();
    expect(hitObstacle(obs, { x: 7.5, z: 0 }, 1)).toBe(obs[0]);
    expect(hitObstacle([], { x: 0, z: 0 })).toBeUndefined();
  });

  it('may return fewer obstacles when there is no room', () => {
    const course = generateCourse(2);
    expect(generateObstacles(2, course, 0)).toEqual([]);
  });
});
