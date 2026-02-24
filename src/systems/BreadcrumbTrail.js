import { CONFIG } from '../config.js';

export class BreadcrumbTrail {
  constructor() {
    this.trail = [];
    this.frameCount = 0;
  }

  record(player) {
    this.frameCount++;
    if (this.frameCount % CONFIG.BREADCRUMB_RECORD_INTERVAL === 0) {
      this.trail.push({ x: player.x, y: player.y, state: player.state, facingRight: player.facingRight });
    }
  }

  get length() {
    return this.trail.length;
  }

  getPosition(index) {
    const clamped = Math.min(index, this.trail.length - 1);
    return this.trail[Math.floor(clamped)];
  }

  reset() {
    this.trail = [];
    this.frameCount = 0;
  }
}
