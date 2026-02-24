import { Graphics } from 'pixi.js';
import { CONFIG } from '../config.js';

export class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height ?? CONFIG.PLATFORM_HEIGHT;

    this.graphics = new Graphics()
      .rect(0, 0, this.width, this.height)
      .fill(CONFIG.PLATFORM_COLOR);
    this.graphics.position.set(this.x, this.y);
  }
}
