import { next } from './rng';

/** Generated engine and wave noise via Web Audio. No files, no fetch. Not unit tested. */
export interface Audio {
  /** Must be called from a user gesture the first time. */
  readonly resume: () => void;
  readonly update: (speed: number, throttle: number, airborne: boolean) => void;
  readonly toggleMute: () => boolean;
}

export const createAudio = (): Audio | undefined => {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return undefined;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  const engine = ctx.createOscillator();
  engine.type = 'sawtooth';
  engine.frequency.value = 55;
  const engineLow = ctx.createBiquadFilter();
  engineLow.type = 'lowpass';
  engineLow.frequency.value = 400;
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engine.connect(engineLow).connect(engineGain).connect(master);
  engine.start();

  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  data.reduce<number>((s, _, i) => {
    const [u, s2] = next(s);
    data[i] = u * 2 - 1;
    return s2;
  }, 99);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 600;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start();

  const resume = (): void => {
    if (ctx.state === 'suspended') void ctx.resume();
  };
  const update = (speed: number, throttle: number, airborne: boolean): void => {
    const now = ctx.currentTime;
    const rev = airborne ? 1.5 : 1;
    engine.frequency.setTargetAtTime((50 + speed * 4 + throttle * 40) * rev, now, 0.08);
    engineGain.gain.setTargetAtTime(0.12 + throttle * 0.16, now, 0.1);
    noiseGain.gain.setTargetAtTime(airborne ? 0.01 : 0.04 + Math.min(speed, 25) * 0.006, now, 0.1);
    noiseFilter.frequency.setTargetAtTime(400 + speed * 40, now, 0.1);
  };
  const toggleMute = (): boolean => {
    const muted = master.gain.value === 0;
    master.gain.value = muted ? 0.35 : 0;
    return !muted;
  };
  return { resume, update, toggleMute };
};
