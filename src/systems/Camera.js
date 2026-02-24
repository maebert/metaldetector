import { CONFIG } from '../config.js';

const BASE_ZOOM = CONFIG.CAMERA_ZOOM;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = BASE_ZOOM;
    this.targetZoom = BASE_ZOOM;
    this.focusOverride = null;
    this.zoomLerp = CONFIG.CAMERA_LERP;
  }

  update(player, worldContainer, dt = 1) {
    // Frame-rate independent lerp: same smoothing at any fps
    const lerpFactor = 1 - Math.pow(1 - CONFIG.CAMERA_LERP, dt);
    const zoomFactor = 1 - Math.pow(1 - this.zoomLerp, dt);

    this.zoom += (this.targetZoom - this.zoom) * zoomFactor;

    const viewW = CONFIG.SCREEN_WIDTH / this.zoom;
    const viewH = CONFIG.SCREEN_HEIGHT / this.zoom;

    const focus = this.focusOverride || player;
    const targetX = -focus.x + viewW * (this.focusOverride ? 0.5 : CONFIG.CAMERA_OFFSET_X);
    const targetY = -focus.y + viewH * 0.5;

    // Clamp to world bounds
    const clampedX = Math.min(0, Math.max(targetX, -(CONFIG.WORLD_WIDTH - viewW)));
    const clampedY = Math.min(0, Math.max(targetY, -(CONFIG.WORLD_HEIGHT - viewH)));

    // Smooth follow
    this.x += (clampedX - this.x) * lerpFactor;
    this.y += (clampedY - this.y) * lerpFactor;

    worldContainer.scale.set(this.zoom);
    worldContainer.position.set(this.x * this.zoom, this.y * this.zoom);
  }

  snapTo(focus) {
    const viewW = CONFIG.SCREEN_WIDTH / this.zoom;
    const viewH = CONFIG.SCREEN_HEIGHT / this.zoom;
    const targetX = -focus.x + viewW * CONFIG.CAMERA_OFFSET_X;
    const targetY = -focus.y + viewH * 0.5;
    this.x = Math.min(0, Math.max(targetX, -(CONFIG.WORLD_WIDTH - viewW)));
    this.y = Math.min(0, Math.max(targetY, -(CONFIG.WORLD_HEIGHT - viewH)));
  }

  zoomTo(targetZoom, focusPoint, lerp) {
    this.targetZoom = targetZoom;
    this.focusOverride = focusPoint;
    if (lerp !== undefined) this.zoomLerp = lerp;
  }
}
