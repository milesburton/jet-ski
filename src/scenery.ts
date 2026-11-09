import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  type Object3D,
} from 'three';
import { next } from './rng';
import type { Course, CraftState, Obstacle, RaceState, WaveField } from './types';
import { heightAt } from './waves';

/** Thin three.js scenery. Not unit tested: verified by eye in the browser. */

export const HORIZON = new Color(0xcfe3f2);
const ZENITH = new Color(0x3f7fc4);

/** Gradient sky dome (vertex colours), sun disc and a few canvas-drawn clouds. */
export const makeSky = (): Group => {
  const group = new Group();
  const geo = new SphereGeometry(450, 24, 16);
  const pos = geo.getAttribute('position');
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, pos.getY(i) / 450));
    const c = HORIZON.clone().lerp(ZENITH, Math.pow(t, 0.6));
    colours.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new BufferAttribute(colours, 3));
  group.add(
    new Mesh(
      geo,
      new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }),
    ),
  );

  const sun = new Mesh(
    new SphereGeometry(18, 16, 12),
    new MeshBasicMaterial({ color: 0xfff4c8, fog: false }),
  );
  sun.position.set(-220, 220, 260);
  group.add(sun);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new CanvasTexture(canvas);
  const [clouds] = Array.from({ length: 14 }).reduce<readonly [readonly Sprite[], number]>(
    ([acc, s], _, i) => {
      const [a, s1] = next(s);
      const [b, s2] = next(s1);
      const [c, s3] = next(s2);
      const angle = (i / 14) * Math.PI * 2 + a * 0.4;
      const sprite = new Sprite(
        new SpriteMaterial({ map: tex, fog: false, transparent: true, depthWrite: false }),
      );
      sprite.position.set(Math.cos(angle) * 380, 60 + b * 90, Math.sin(angle) * 380);
      sprite.scale.set(120 + c * 120, 40 + c * 30, 1);
      return [[...acc, sprite], s3];
    },
    [[], 7],
  );
  clouds.forEach((c) => group.add(c));
  return group;
};

const mat = (color: number, extra: Record<string, unknown> = {}): MeshStandardMaterial =>
  new MeshStandardMaterial({ color, roughness: 0.5, ...extra });

/** A simple jet ski, forward = +Z, origin at the hull reference point (just under the waterline). */
export const makeCraftModel = (): Group => {
  const g = new Group();
  const white = mat(0xf4f4f0, { roughness: 0.3 });
  const accent = mat(0xe8452c);
  const dark = mat(0x23262b, { roughness: 0.8 });

  const hull = new Mesh(new CylinderGeometry(0.5, 0.42, 2.2, 12, 1), white);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1, 1, 0.55);
  hull.position.set(0, 0.35, -0.15);
  g.add(hull);

  const bow = new Mesh(new CylinderGeometry(0.02, 0.5, 1.0, 12, 1), white);
  bow.rotation.x = Math.PI / 2;
  bow.scale.set(1, 1, 0.55);
  bow.position.set(0, 0.35, 1.45);
  g.add(bow);

  const stripe = new Mesh(new CylinderGeometry(0.505, 0.505, 0.3, 12, 1, true), accent);
  stripe.rotation.x = Math.PI / 2;
  stripe.scale.set(1, 1, 0.55);
  stripe.position.set(0, 0.36, -0.2);
  g.add(stripe);

  const deck = new Mesh(new CylinderGeometry(0.46, 0.46, 1.6, 12, 1), accent);
  deck.rotation.x = Math.PI / 2;
  deck.scale.set(1, 1, 0.3);
  deck.position.set(0, 0.62, -0.1);
  g.add(deck);

  const seat = new Mesh(new CylinderGeometry(0.28, 0.3, 0.9, 10), dark);
  seat.rotation.x = Math.PI / 2;
  seat.scale.set(1, 1, 0.5);
  seat.position.set(0, 0.8, -0.55);
  g.add(seat);

  const bars = new Mesh(new CylinderGeometry(0.03, 0.03, 0.7, 8), dark);
  bars.rotation.z = Math.PI / 2;
  bars.position.set(0, 1.05, 0.45);
  g.add(bars);

  const column = new Mesh(new CylinderGeometry(0.04, 0.05, 0.4, 8), dark);
  column.position.set(0, 0.9, 0.5);
  g.add(column);

  const shield = new Mesh(
    new CylinderGeometry(0.3, 0.3, 0.35, 8, 1, true, 0, Math.PI),
    new MeshStandardMaterial({
      color: 0x9fd4f2,
      transparent: true,
      opacity: 0.45,
      side: DoubleSide,
    }),
  );
  shield.position.set(0, 1.15, 0.75);
  shield.rotation.set(-0.4, Math.PI / 2, 0);
  g.add(shield);

  const torso = new Mesh(new CylinderGeometry(0.17, 0.2, 0.55, 8), mat(0x2459c9));
  torso.position.set(0, 1.25, -0.35);
  torso.rotation.x = 0.35;
  g.add(torso);
  const head = new Mesh(new SphereGeometry(0.14, 10, 8), mat(0xf2c9a0));
  head.position.set(0, 1.62, -0.2);
  g.add(head);
  const helmet = new Mesh(
    new SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.8),
    accent,
  );
  helmet.position.set(0, 1.64, -0.2);
  g.add(helmet);
  return g;
};

/** Place the craft model from physics state (heading yaw, bow-up pitch, starboard-down roll). */
export const poseCraft = (model: Object3D, c: CraftState): void => {
  model.position.set(c.pos.x, c.pos.y, c.pos.z);
  model.rotation.order = 'YXZ';
  model.rotation.set(-c.pitch, c.heading, -c.roll);
};

export interface CourseScenery {
  readonly group: Group;
  /** Bob everything on the waves and highlight the next gate. */
  readonly update: (waves: WaveField, t: number, race: RaceState) => void;
}

/** Buoys at gates, a beacon on the next gate, and rocks / markers from the obstacle list. */
export const makeCourseScenery = (
  course: Course,
  obstacles: readonly Obstacle[],
): CourseScenery => {
  const group = new Group();
  const n = course.gates.length;

  const buoyGeo = new CylinderGeometry(0.35, 0.55, 1.4, 12);
  const gates = course.gates.map((g, i) => {
    const colours = i === 0 ? [0xffd23a, 0xffd23a] : [0xe03a3a, 0x2fae5a];
    const buoys = [g.left, g.right].map((p, side) => {
      const m = new Mesh(
        buoyGeo,
        mat(colours[side] ?? 0xffffff, { emissive: new Color(0x000000), emissiveIntensity: 1 }),
      );
      m.position.set(p.x, 0, p.z);
      group.add(m);
      return m;
    });
    return { gate: g, buoys };
  });

  const beacon = new Mesh(
    new CylinderGeometry(1.2, 1.2, 40, 16, 1, true),
    new MeshBasicMaterial({
      color: 0xfff2a0,
      transparent: true,
      opacity: 0.22,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  group.add(beacon);

  const rockGeo = new DodecahedronGeometry(1, 1);
  const things = obstacles.map((o) => {
    const m =
      o.kind === 'rock'
        ? new Mesh(rockGeo, mat(0x6d6a64, { roughness: 0.95, flatShading: true }))
        : new Mesh(new CylinderGeometry(0.25, 0.4, 3.2, 8), mat(0xff7a1a));
    if (o.kind === 'rock') m.scale.set(o.radius, o.radius * 0.8, o.radius);
    m.position.set(o.pos.x, 0, o.pos.z);
    group.add(m);
    return { o, m };
  });

  const update = (waves: WaveField, t: number, race: RaceState): void => {
    const target = race.next % n;
    gates.forEach(({ gate, buoys }, i) => {
      const lit = i === target;
      buoys.forEach((b, side) => {
        const p = side === 0 ? gate.left : gate.right;
        b.position.y = heightAt(waves, p.x, p.z, t) + 0.15;
        (b.material as MeshStandardMaterial).emissive.setHex(lit ? 0x555555 : 0x000000);
      });
    });
    const tg = course.gates[target];
    if (tg) beacon.position.set(tg.centre.x, 20, tg.centre.z);
    things.forEach(({ o, m }) => {
      const h = heightAt(waves, o.pos.x, o.pos.z, t);
      m.position.y = o.kind === 'rock' ? h + o.radius * 0.1 : h + 1.3;
    });
  };
  return { group, update };
};

export interface Spray {
  readonly points: Points;
  readonly update: (craft: CraftState, speed: number, waterY: number, dt: number) => void;
}

const SPRAY_COUNT = 240;

/** Ring-buffer spray particles kicked up behind the craft. Seeded, so no Math.random. */
export const makeSpray = (): Spray => {
  const positions = new Float32Array(SPRAY_COUNT * 3).fill(-1000);
  const velocities = new Float32Array(SPRAY_COUNT * 3);
  const life = new Float32Array(SPRAY_COUNT);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  const points = new Points(
    geo,
    new PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  const state = { head: 0, rng: 12345, carry: 0 };
  const rand = (): number => {
    const [u, s] = next(state.rng);
    state.rng = s;
    return u;
  };
  const update = (craft: CraftState, speed: number, waterY: number, dt: number): void => {
    const rate = craft.airborne ? 0 : Math.max(0, speed - 4) * 12;
    state.carry += rate * dt;
    const emit = Math.floor(state.carry);
    state.carry -= emit;
    for (let e = 0; e < emit; e++) {
      const i = state.head;
      state.head = (state.head + 1) % SPRAY_COUNT;
      const side = rand() < 0.5 ? -1 : 1;
      const fx = Math.sin(craft.heading);
      const fz = Math.cos(craft.heading);
      const sx = fz;
      const sz = -fx;
      positions[i * 3] = craft.pos.x - fx * 1.0 + sx * side * 0.5;
      positions[i * 3 + 1] = waterY + 0.1;
      positions[i * 3 + 2] = craft.pos.z - fz * 1.0 + sz * side * 0.5;
      const out = 1 + rand() * 2;
      velocities[i * 3] = craft.vel.x * 0.4 + sx * side * out - fx * 1;
      velocities[i * 3 + 1] = 1.5 + rand() * 2.5;
      velocities[i * 3 + 2] = craft.vel.z * 0.4 + sz * side * out - fz * 1;
      life[i] = 0.6 + rand() * 0.4;
    }
    for (let i = 0; i < SPRAY_COUNT; i++) {
      if ((life[i] ?? 0) <= 0) {
        positions[i * 3 + 1] = -1000;
        continue;
      }
      life[i] = (life[i] ?? 0) - dt;
      velocities[i * 3 + 1] = (velocities[i * 3 + 1] ?? 0) - 9.81 * dt;
      positions[i * 3] = (positions[i * 3] ?? 0) + (velocities[i * 3] ?? 0) * dt;
      positions[i * 3 + 1] = (positions[i * 3 + 1] ?? 0) + (velocities[i * 3 + 1] ?? 0) * dt;
      positions[i * 3 + 2] = (positions[i * 3 + 2] ?? 0) + (velocities[i * 3 + 2] ?? 0) * dt;
    }
    geo.getAttribute('position').needsUpdate = true;
  };
  return { points, update };
};
