import { CONFIG } from '../config.js';

export class BreadcrumbTrail {
  constructor() {
    this.trail = [];
    this.frameCount = 0;
  }

  record(player) {
    this.frameCount++;
    if (this.frameCount % CONFIG.BREADCRUMB_RECORD_INTERVAL === 0) {
      this.trail.push({
        velocityX: player.velocityX,
        jump: player.justJumped,
      });
    }
  }

  get length() {
    return this.trail.length;
  }

  get(index) {
    const i = Math.min(Math.floor(index), this.trail.length - 1);
    return this.trail[i];
  }

  reset() {
    this.trail = [];
    this.frameCount = 0;
  }
}
