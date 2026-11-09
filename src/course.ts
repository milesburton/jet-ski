import { next } from './rng';
import { TUNING, type Tuning } from './tuning';
import type { Course, Gate, Vec2 } from './types';
import { add, dist, dot, normalize, scale, sub, wrapAngle } from './vec';

export interface CourseOptions {
  readonly gateCount: number;
  readonly radius: number;
  readonly radialJitter: number;
  readonly angularJitter: number;
  readonly gateWidth: number;
  readonly minSpacing: number;
  readonly maxTurn: number;
}

export const defaultCourseOptions = (T: Tuning = TUNING): CourseOptions => ({
  gateCount: T.gateCount,
  radius: T.courseRadius,
  radialJitter: T.radialJitter,
  angularJitter: T.angularJitter,
  gateWidth: T.gateWidth,
  minSpacing: T.minGateSpacing,
  maxTurn: T.maxTurn,
});

/** Build gates from loop points; each gate faces along the tangent (next - previous). */
export const gatesFromPoints = (points: readonly Vec2[], width: number): readonly Gate[] =>
  points.map((centre, i) => {
    const prev = points[(i + points.length - 1) % points.length] as Vec2;
    const nxt = points[(i + 1) % points.length] as Vec2;
    const dir = normalize(sub(nxt, prev));
    const side = scale({ x: dir.z, z: -dir.x }, width / 2);
    return { centre, dir, width, left: sub(centre, side), right: add(centre, side) };
  });

/** Problems found with a course; empty means valid. */
export const courseProblems = (course: Course, o: CourseOptions): readonly string[] => {
  const pts = course.gates.map((g) => g.centre);
  const n = pts.length;
  return pts.flatMap((p, i) => {
    const a = pts[(i + n - 1) % n] as Vec2;
    const b = pts[(i + 1) % n] as Vec2;
    const turn = Math.abs(
      wrapAngle(Math.atan2(b.x - p.x, b.z - p.z) - Math.atan2(p.x - a.x, p.z - a.z)),
    );
    return [
      ...(dist(p, b) < o.minSpacing
        ? [`gate ${i}: spacing ${dist(p, b).toFixed(1)} too small`]
        : []),
      ...(turn > o.maxTurn ? [`gate ${i}: turn ${turn.toFixed(2)} too sharp`] : []),
    ];
  });
};

const attempt = (seed: number, o: CourseOptions, jitter: boolean): Course => {
  const step = (Math.PI * 2) / o.gateCount;
  const [pts] = Array.from({ length: o.gateCount }).reduce<readonly [readonly Vec2[], number]>(
    ([acc, s], _, i) => {
      const [u1, s1] = next(s);
      const [u2, s2] = next(s1);
      const angle = i * step + (jitter ? (u1 * 2 - 1) * o.angularJitter * step : 0);
      const r = o.radius * (1 + (jitter ? (u2 * 2 - 1) * o.radialJitter : 0));
      return [[...acc, { x: Math.cos(angle) * r, z: Math.sin(angle) * r }], s2];
    },
    [[], seed],
  );
  return { seed, gates: gatesFromPoints(pts, o.gateWidth) };
};

/**
 * A closed loop of gates around the origin, in angular order (so it never self-crosses).
 * Jittered attempts are rejection-sampled against spacing/turn limits; if none pass we fall
 * back to the regular polygon.
 */
export const generateCourse = (
  seed: number,
  overrides: Partial<CourseOptions> = {},
  T: Tuning = TUNING,
): Course => {
  const o = { ...defaultCourseOptions(T), ...overrides };
  const tries = Array.from({ length: T.courseAttempts }, (_, i) =>
    attempt(seed + i * 7919, o, true),
  );
  const good = tries.find((c) => courseProblems(c, o).length === 0);
  return good ? { ...good, seed } : { ...attempt(seed, o, false), seed };
};

/**
 * Did the movement p0 -> p1 cross the gate line between its buoys in the gate direction?
 * Half-open on the line (start strictly behind, end on or past it) so a crossing is counted once;
 * the buoy endpoints are inclusive.
 */
export const crossesGate = (gate: Gate, p0: Vec2, p1: Vec2): boolean => {
  const s0 = dot(sub(p0, gate.centre), gate.dir);
  const s1 = dot(sub(p1, gate.centre), gate.dir);
  if (!(s0 < 0 && s1 >= 0)) return false;
  const hit = add(p0, scale(sub(p1, p0), -s0 / (s1 - s0)));
  const lateral = dot(sub(hit, gate.centre), { x: gate.dir.z, z: -gate.dir.x });
  return Math.abs(lateral) <= gate.width / 2 + 1e-9;
};
