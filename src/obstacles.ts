import { next } from './rng';
import { TUNING, type Tuning } from './tuning';
import type { Course, Obstacle, Vec2 } from './types';
import { dist, distToSegment } from './vec';

/** Distance from p to the closed racing line through the gate centres. */
export const distToRacingLine = (course: Course, p: Vec2): number => {
  const pts = course.gates.map((g) => g.centre);
  return Math.min(...pts.map((a, i) => distToSegment(p, a, pts[(i + 1) % pts.length] as Vec2)));
};

/** Rocks and markers scattered around the loop, rejection-sampled to stay clear of the line. */
export const generateObstacles = (
  seed: number,
  course: Course,
  count: number = TUNING.obstacleCount,
  T: Tuning = TUNING,
): readonly Obstacle[] => {
  const extent = Math.max(...course.gates.map((g) => Math.hypot(g.centre.x, g.centre.z))) * 1.5;
  const maxTries = count * 30;
  const result = Array.from({ length: maxTries }).reduce<{
    readonly list: readonly Obstacle[];
    readonly s: number;
  }>(
    (acc) => {
      if (acc.list.length >= count) return acc;
      const [a, s1] = next(acc.s);
      const [b, s2] = next(s1);
      const [c, s3] = next(s2);
      const [d, s4] = next(s3);
      const r = Math.sqrt(a) * extent;
      const pos = { x: Math.cos(b * Math.PI * 2) * r, z: Math.sin(b * Math.PI * 2) * r };
      const radius = T.obstacleRadiusMin + c * (T.obstacleRadiusMax - T.obstacleRadiusMin);
      const clear = distToRacingLine(course, pos) >= T.obstacleClearance + radius;
      const apart = acc.list.every((o) => dist(o.pos, pos) > o.radius + radius + 2);
      const kind: Obstacle['kind'] = d < 0.6 ? 'rock' : 'marker';
      return { list: clear && apart ? [...acc.list, { kind, pos, radius }] : acc.list, s: s4 };
    },
    { list: [], s: seed },
  );
  return result.list;
};

/** First obstacle overlapping a craft of the given radius at p, if any. */
export const hitObstacle = (
  obstacles: readonly Obstacle[],
  p: Vec2,
  craftRadius: number = TUNING.craftRadius,
): Obstacle | undefined => obstacles.find((o) => dist(o.pos, p) < o.radius + craftRadius);
