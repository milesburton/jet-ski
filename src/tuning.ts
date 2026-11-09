/** Every tunable constant lives here. Units: metres, seconds, radians. */
export const TUNING = {
  // --- simulation
  stepHz: 120,
  dt: 1 / 120,
  gravity: 9.81,

  // --- waves
  waveCount: 4,
  waveLengthMin: 6,
  waveLengthMax: 30,
  waveSteepnessMin: 0.01,
  waveSteepnessMax: 0.03,
  /** Amplitude scale at wind 0; wind 1 gives scale 1. */
  waveCalmFactor: 0.2,
  /** Max angle (rad) a wave direction may deviate from the wind direction. */
  waveSpread: 0.9,

  // --- hull and buoyancy
  hullLength: 2.6,
  hullWidth: 1,
  equilibriumDepth: 0.3,
  maxSubmersion: 0.9,
  heaveDamping: 8,
  /** Hull is airborne when clear of the water by more than this. */
  airMargin: 0.08,
  attitudeResponse: 10,
  trimPitch: 0.12,
  /** Roll (rad) per unit of yawRate * speed when leaning into a turn. */
  leanFactor: 0.015,

  // --- propulsion and planing
  thrust: 10,
  dragDisplacement: 0.04,
  dragLinear: 0.05,
  planeDragFactor: 0.4,
  planeLift: 0.5,
  planeSpeed: 10,
  planeBand: 4,
  trimOptimum: 0.3,
  trimDragK: 0.4,

  // --- steering and grip
  maxYawRate: 1.3,
  yawResponse: 6,
  gripDisplacement: 3,
  gripPlaning: 1.2,

  // --- crash
  capsizeRoll: 1.2,
  hardLandingSpeed: 6,
  hardLandingTilt: 0.7,
  wipeoutDuration: 2.5,
  wipeoutDrag: 2,
  collisionRestitution: 0.3,

  // --- course
  gateCount: 8,
  courseRadius: 120,
  radialJitter: 0.2,
  angularJitter: 0.25,
  gateWidth: 14,
  minGateSpacing: 40,
  maxTurn: 1.75,
  courseAttempts: 20,

  // --- obstacles
  obstacleCount: 12,
  obstacleClearance: 20,
  obstacleRadiusMin: 1.5,
  obstacleRadiusMax: 3,
  craftRadius: 1.2,

  // --- environment forces
  /** Horizontal acceleration (m/s^2) along the wind at wind 1. */
  windDrift: 0.4,
  /** Fraction of g * surface slope that pushes the hull downhill. */
  wavePush: 0.5,

  // --- race
  missedPenalty: 5,
  maxSkippedGates: 2,
} as const;

export type Tuning = { readonly [K in keyof typeof TUNING]: number };
