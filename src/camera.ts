import type { PerspectiveCamera } from 'three';
import type { CraftState } from './types';
import { wrapAngle } from './vec';

/** Chase camera with exponential smoothing. Not unit tested: tuned by eye. */
export interface ChaseCamera {
  readonly update: (craft: CraftState, waterY: number, dt: number, speed: number) => void;
}

const POS_RATE = 5;
const HEADING_RATE = 2.5;
const DISTANCE = 9;
const HEIGHT = 3.6;

export const makeChaseCamera = (camera: PerspectiveCamera): ChaseCamera => {
  const s = { heading: 0, x: 0, y: 0, z: 0, init: false };
  const update = (craft: CraftState, waterY: number, dt: number, speed: number): void => {
    if (!s.init) {
      s.heading = craft.heading;
      s.x = craft.pos.x - Math.sin(craft.heading) * DISTANCE;
      s.y = craft.pos.y + HEIGHT;
      s.z = craft.pos.z - Math.cos(craft.heading) * DISTANCE;
      s.init = true;
    }
    s.heading += wrapAngle(craft.heading - s.heading) * (1 - Math.exp(-HEADING_RATE * dt));
    const dist = DISTANCE + Math.min(speed, 25) * 0.12;
    const tx = craft.pos.x - Math.sin(s.heading) * dist;
    const tz = craft.pos.z - Math.cos(s.heading) * dist;
    const ty = Math.max(waterY + 1.2, craft.pos.y + HEIGHT);
    const k = 1 - Math.exp(-POS_RATE * dt);
    s.x += (tx - s.x) * k;
    s.y += (ty - s.y) * k;
    s.z += (tz - s.z) * k;
    camera.position.set(s.x, Math.max(s.y, waterY + 1.0), s.z);
    camera.lookAt(
      craft.pos.x + Math.sin(s.heading) * 5,
      craft.pos.y + 1,
      craft.pos.z + Math.cos(s.heading) * 5,
    );
    const fov = 62 + Math.min(speed, 25) * 0.5;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
  };
  return { update };
};
