import {
  BufferAttribute,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { makeChaseCamera } from './camera';
import { horizontalSpeed } from './craft';
import type { GameState } from './game';
import {
  HORIZON,
  makeCourseScenery,
  makeCraftModel,
  makeSky,
  makeSpray,
  poseCraft,
} from './scenery';
import { heightAt, normalAt } from './waves';

/** three.js renderer glue. Not unit tested: verified in a browser. */

const SEGMENTS = 128;
const SIZE = 220;
const CELL = SIZE / SEGMENTS;
const DEEP = new Color(0x0b4a7a);
const SHALLOW = new Color(0x2f93b8);
const FOAM = new Color(0xe6f4fa);

export interface Renderer {
  readonly render: (game: GameState, dt: number) => void;
  readonly resize: () => void;
}

export const createRenderer = (canvas: HTMLCanvasElement, game: GameState): Renderer => {
  const gl = new WebGLRenderer({ canvas, antialias: true });
  gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  scene.fog = new Fog(HORIZON, 40, 105);
  scene.background = HORIZON;
  const camera = new PerspectiveCamera(62, 1, 0.2, 1200);
  const chase = makeChaseCamera(camera);

  scene.add(new HemisphereLight(0xcfe6ff, 0x1c4a6a, 1.1));
  const sun = new DirectionalLight(0xfff1d0, 2.2);
  sun.position.set(-220, 220, 260);
  scene.add(sun);

  const sky = makeSky();
  scene.add(sky);

  // Water grid: positions are rebuilt every frame from the analytic wave field, around the craft,
  // snapped to whole cells so the mesh does not swim.
  const geo = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as BufferAttribute;
  const localX = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i));
  const localZ = Float32Array.from({ length: pos.count }, (_, i) => pos.getZ(i));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(pos.count * 3), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(pos.count * 3), 3));
  const nrm = geo.getAttribute('normal') as BufferAttribute;
  const col = geo.getAttribute('color') as BufferAttribute;
  const water = new Mesh(
    geo,
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 }),
  );
  water.frustumCulled = false;
  scene.add(water);
  const tmp = new Color();

  const updateWater = (g: GameState): void => {
    const { waves } = g.world;
    const t = g.sim.t;
    const ox = Math.round(g.sim.craft.pos.x / CELL) * CELL;
    const oz = Math.round(g.sim.craft.pos.z / CELL) * CELL;
    const amp = Math.max(
      0.01,
      waves.components.reduce((s, c) => s + c.amp, 0),
    );
    for (let i = 0; i < pos.count; i++) {
      const x = ox + (localX[i] ?? 0);
      const z = oz + (localZ[i] ?? 0);
      const h = heightAt(waves, x, z, t);
      const n = normalAt(waves, x, z, t);
      pos.setXYZ(i, x, h, z);
      nrm.setXYZ(i, n.x, n.y, n.z);
      const k = (h / amp + 1) / 2;
      tmp.copy(DEEP).lerp(SHALLOW, k);
      if (k > 0.82) tmp.lerp(FOAM, (k - 0.82) * 2.2);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    pos.needsUpdate = true;
    nrm.needsUpdate = true;
    col.needsUpdate = true;
  };

  const craftModel = makeCraftModel();
  scene.add(craftModel);
  const scenery = makeCourseScenery(game.world.course, game.world.obstacles);
  scene.add(scenery.group);
  const spray = makeSpray();
  scene.add(spray.points);

  const resize = (): void => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const render = (g: GameState, dt: number): void => {
    const { craft, t } = g.sim;
    updateWater(g);
    scenery.update(g.world.waves, t, g.sim.race);
    poseCraft(craftModel, craft);
    const waterY = heightAt(g.world.waves, craft.pos.x, craft.pos.z, t);
    const speed = horizontalSpeed(craft);
    spray.update(craft, speed, waterY, dt);
    chase.update(craft, waterY, dt, speed);
    sky.position.copy(camera.position);
    gl.render(scene, camera);
  };
  return { render, resize };
};
