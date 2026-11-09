import { draws } from './rng';
import { TUNING, type Tuning } from './tuning';
import type { Vec3, WaveComponent, WaveField } from './types';
import { clamp, lerp } from './vec';

/**
 * Build an analytic wave field: a few directional sine waves with seeded wavelengths,
 * steepness, directions (clustered around a seeded wind direction) and phases.
 * Deep-water dispersion: omega = sqrt(g * k). `wind` in [0, 1] scales every amplitude.
 */
export const makeWaves = (seed: number, wind: number, T: Tuning = TUNING): WaveField => {
  const w = clamp(wind, 0, 1);
  const [u] = draws(seed, 1 + T.waveCount * 4);
  const windDir = (u[0] ?? 0) * Math.PI * 2;
  const scaleByWind = lerp(T.waveCalmFactor, 1, w);
  const components = Array.from({ length: T.waveCount }, (_, i): WaveComponent => {
    const [a, b, c, d] = u.slice(1 + i * 4, 5 + i * 4) as [number, number, number, number];
    const wavelength = lerp(T.waveLengthMin, T.waveLengthMax, a);
    const steepness = lerp(T.waveSteepnessMin, T.waveSteepnessMax, b);
    const angle = windDir + (c * 2 - 1) * T.waveSpread;
    const k = (Math.PI * 2) / wavelength;
    return {
      amp: wavelength * steepness * scaleByWind,
      k,
      omega: Math.sqrt(T.gravity * k),
      dirX: Math.sin(angle),
      dirZ: Math.cos(angle),
      phase: d * Math.PI * 2,
    };
  });
  return { seed, wind: w, components };
};

const phaseAt = (c: WaveComponent, x: number, z: number, t: number): number =>
  c.k * (c.dirX * x + c.dirZ * z) - c.omega * t + c.phase;

/** Water surface height at (x, z) and time t. */
export const heightAt = (waves: WaveField, x: number, z: number, t: number): number =>
  waves.components.reduce((h, c) => h + c.amp * Math.sin(phaseAt(c, x, z, t)), 0);

/** Upper bound on |heightAt|: the sum of amplitudes. */
export const maxHeight = (waves: WaveField): number =>
  waves.components.reduce((sum, c) => sum + c.amp, 0);

/** Unit surface normal from the analytic gradient. */
export const normalAt = (waves: WaveField, x: number, z: number, t: number): Vec3 => {
  const [gx, gz] = waves.components.reduce<readonly [number, number]>(
    ([ax, az], c) => {
      const d = c.amp * c.k * Math.cos(phaseAt(c, x, z, t));
      return [ax + d * c.dirX, az + d * c.dirZ];
    },
    [0, 0],
  );
  const l = Math.hypot(gx, gz, 1);
  return { x: -gx / l, y: 1 / l, z: -gz / l };
};
