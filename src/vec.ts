import type { Vec2 } from './types';

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 below the edge, 1 above it, smooth in between. */
export const smoothstep = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/** Wrap an angle into (-PI, PI]. */
export const wrapAngle = (a: number): number => {
  const twoPi = Math.PI * 2;
  const m = a - twoPi * Math.floor((a + Math.PI) / twoPi);
  return m === -Math.PI ? Math.PI : m;
};

export const v2 = (x: number, z: number): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const length = (a: Vec2): number => Math.hypot(a.x, a.z);
export const dist = (a: Vec2, b: Vec2): number => length(sub(a, b));

export const normalize = (a: Vec2): Vec2 => {
  const l = length(a);
  return l === 0 ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l };
};

/** Distance from point p to segment a-b. */
export const distToSegment = (p: Vec2, a: Vec2, b: Vec2): number => {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  const t = len2 === 0 ? 0 : clamp(dot(sub(p, a), ab) / len2, 0, 1);
  return dist(p, add(a, scale(ab, t)));
};
