import { CONFIG } from '../config.js';

const ZOOM = CONFIG.CAMERA_ZOOM;
// Visible area in world coordinates
const VIEW_W = CONFIG.SCREEN_WIDTH / ZOOM;
const VIEW_H = CONFIG.SCREEN_HEIGHT / ZOOM;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  update(player, worldContainer) {
    worldContainer.scale.set(ZOOM);

    const targetX = -player.x + VIEW_W * CONFIG.CAMERA_OFFSET_X;
    const targetY = -player.y + VIEW_H * 0.5;

    // Clamp to world bounds
    const clampedX = Math.min(0, Math.max(targetX, -(CONFIG.WORLD_WIDTH - VIEW_W)));
    const clampedY = Math.min(0, Math.max(targetY, -(CONFIG.WORLD_HEIGHT - VIEW_H)));

    // Smooth follow
    this.x += (clampedX - this.x) * CONFIG.CAMERA_LERP;
    this.y += (clampedY - this.y) * CONFIG.CAMERA_LERP;

    worldContainer.position.set(this.x * ZOOM, this.y * ZOOM);
  }
}
