// Entry point. Wiring only; game logic lives in pure modules.
import { createAudio } from './audio';
import { horizontalSpeed } from './craft';
import { newGame, parseSeed, update, type GameState } from './game';
import { hudModel, overlayFor } from './hud';
import { EMPTY_KEYS, keyDown, keyUp, toActions, toCraftInput, type KeySnapshot } from './input';
import { createRenderer } from './render';

document.title = 'Jet Ski';

const el = <T extends HTMLElement>(tag: string, id: string, parent: HTMLElement): T => {
  const e = document.createElement(tag) as T;
  e.id = id;
  parent.appendChild(e);
  return e;
};

const canvas = el<HTMLCanvasElement>('canvas', 'view', document.body);
const hud = el<HTMLDivElement>('div', 'hud', document.body);
const timeEl = el<HTMLDivElement>('div', 'hud-time', hud);
const speedEl = el<HTMLDivElement>('div', 'hud-speed', hud);
const gatesEl = el<HTMLDivElement>('div', 'hud-gates', hud);
const penEl = el<HTMLDivElement>('div', 'hud-pen', hud);
const overlay = el<HTMLDivElement>('div', 'overlay', document.body);
const titleEl = el<HTMLDivElement>('div', 'overlay-title', overlay);
const subEl = el<HTMLDivElement>('div', 'overlay-sub', overlay);

const set = (node: HTMLElement, text: string): void => {
  if (node.textContent !== text) node.textContent = text;
};

const seed = parseSeed(window.location.search);
const state = {
  game: newGame(seed) as GameState,
  keys: EMPTY_KEYS as KeySnapshot,
  pressed: EMPTY_KEYS as KeySnapshot,
};
const renderer = createRenderer(canvas, state.game);
const audio = createAudio();

const CAPTURED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (e) => {
  if (CAPTURED.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyM') audio?.toggleMute();
  audio?.resume();
  state.keys = keyDown(state.keys, e.code);
  state.pressed = keyDown(state.pressed, e.code);
});
window.addEventListener('keyup', (e) => {
  state.keys = keyUp(state.keys, e.code);
});
window.addEventListener('blur', () => {
  state.keys = EMPTY_KEYS;
});
window.addEventListener('resize', renderer.resize);

const frame = (last: number) => (now: number) => {
  const dt = Math.min((now - last) / 1000, 0.25);
  const actions = toActions(state.pressed);
  state.pressed = EMPTY_KEYS;
  state.game = update(state.game, { keys: state.keys, ...actions }, dt);
  const { sim, world, phase, countdown } = state.game;
  const speed = horizontalSpeed(sim.craft);
  const h = hudModel(sim.race, world.course, speed);
  set(timeEl, h.time);
  set(speedEl, h.speed);
  set(gatesEl, `Gates ${h.checkpoints}`);
  set(penEl, h.penalties);
  const o = overlayFor(phase, countdown, sim.race);
  set(titleEl, o.title);
  set(subEl, o.subtitle);
  overlay.style.display = o.title === '' ? 'none' : 'flex';
  audio?.update(speed, toCraftInput(state.keys).throttle, sim.craft.airborne);
  renderer.render(state.game, dt);
  requestAnimationFrame(frame(now));
};
requestAnimationFrame((now) => frame(now)(now));
