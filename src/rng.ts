/** Seeded mulberry32. Pure: returns the value and the next state. */
export const next = (state: number): readonly [number, number] => {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
};

/** Uniform value in [lo, hi) plus the next state. */
export const range = (state: number, lo: number, hi: number): readonly [number, number] => {
  const [u, s] = next(state);
  return [lo + (hi - lo) * u, s];
};

/** n uniform values in [0, 1) plus the next state. */
export const draws = (state: number, n: number): readonly [readonly number[], number] =>
  Array.from({ length: n }).reduce<readonly [readonly number[], number]>(
    ([acc, s]) => {
      const [u, s2] = next(s);
      return [[...acc, u], s2];
    },
    [[], state],
  );
