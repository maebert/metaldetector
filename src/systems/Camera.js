import { CONFIG } from '../config.js';

const BASE_ZOOM = CONFIG.CAMERA_ZOOM;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = BASE_ZOOM;
    this.targetZoom = BASE_ZOOM;
    this.focusOverride = null; // { x, y } to override player focus
    this.zoomLerp = CONFIG.CAMERA_LERP;
  }

  update(player, worldContainer) {
    // Smoothly interpolate zoom
    this.zoom += (this.targetZoom - this.zoom) * this.zoomLerp;

    const viewW = CONFIG.SCREEN_WIDTH / this.zoom;
    const viewH = CONFIG.SCREEN_HEIGHT / this.zoom;

    const focus = this.focusOverride || player;
    const targetX = -focus.x + viewW * (this.focusOverride ? 0.5 : CONFIG.CAMERA_OFFSET_X);
    const targetY = -focus.y + viewH * 0.5;

    // Clamp to world bounds
    const clampedX = Math.min(0, Math.max(targetX, -(CONFIG.WORLD_WIDTH - viewW)));
    const clampedY = Math.min(0, Math.max(targetY, -(CONFIG.WORLD_HEIGHT - viewH)));

    // Smooth follow
    this.x += (clampedX - this.x) * CONFIG.CAMERA_LERP;
    this.y += (clampedY - this.y) * CONFIG.CAMERA_LERP;

    worldContainer.scale.set(this.zoom);
    worldContainer.position.set(this.x * this.zoom, this.y * this.zoom);
  }

  zoomTo(targetZoom, focusPoint, lerp) {
    this.targetZoom = targetZoom;
    this.focusOverride = focusPoint;
    if (lerp !== undefined) this.zoomLerp = lerp;
  }
}
