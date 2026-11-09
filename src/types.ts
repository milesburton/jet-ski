/** Shared plain-data types. Everything is readonly: the simulation never mutates. */

/** Horizontal position / direction. +y is up, so the horizontal plane is (x, z). */
export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One directional sine wave: h = amp * sin(k * (dir . p) - omega * t + phase). */
export interface WaveComponent {
  readonly amp: number;
  readonly k: number;
  readonly omega: number;
  readonly dirX: number;
  readonly dirZ: number;
  readonly phase: number;
}

export interface WaveField {
  readonly seed: number;
  /** Wind strength in [0, 1]; scales amplitudes. */
  readonly wind: number;
  readonly components: readonly WaveComponent[];
}

export interface CraftInput {
  /** 0..1 */
  readonly throttle: number;
  /** -1 (port) .. 1 (starboard); positive increases heading. */
  readonly steer: number;
  /** -1 (bow down) .. 1 (bow up). */
  readonly trim: number;
}

/**
 * Heading convention: forward = (sin h, cos h) in (x, z); starboard = (cos h, -sin h).
 * Roll is positive when the starboard side is down; pitch is positive bow-up.
 */
export interface CraftState {
  /** y is the hull reference height (rests at water height minus equilibrium depth). */
  readonly pos: Vec3;
  readonly vel: Vec3;
  readonly heading: number;
  readonly yawRate: number;
  readonly pitch: number;
  readonly roll: number;
  readonly airborne: boolean;
  /** Seconds of wipe-out remaining; 0 means under control. */
  readonly wipeout: number;
}

/** A pair of buoys with a forward direction; crossed by travelling along `dir`. */
export interface Gate {
  readonly centre: Vec2;
  readonly left: Vec2;
  readonly right: Vec2;
  /** Unit vector of the required crossing direction. */
  readonly dir: Vec2;
  readonly width: number;
}

export interface Course {
  readonly seed: number;
  /** gates[0] is the start/finish line. */
  readonly gates: readonly Gate[];
}

export interface Obstacle {
  readonly kind: 'rock' | 'marker';
  readonly pos: Vec2;
  readonly radius: number;
}

export interface RaceState {
  readonly time: number;
  /** Index (1..gates.length) of the next expected gate; gates.length means the finish. */
  readonly next: number;
  readonly missed: number;
  readonly status: 'running' | 'finished';
}
