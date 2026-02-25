import { AnimatedSprite } from 'pixi.js';
import { CONFIG } from '../config.js';

const ANIM_SPEED = 12 / 60; // 12fps relative to 60fps ticker

export class MetalPiece {
  constructor(x, y, animation) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.METAL_WIDTH;
    this.height = CONFIG.METAL_HEIGHT;
    this.collected = false;
    this.baseY = y;
    this.bobTime = Math.random() * Math.PI * 2;

    const scale = (CONFIG.METAL_HEIGHT / animation.frameHeight) * 1.6;

    this.graphics = new AnimatedSprite(animation.frames);
    this.graphics.anchor.set(0.5, 1.0);
    this.graphics.scale.set(scale);
    this.graphics.position.set(this.x + this.width / 2, this.y + this.height - 6);
    this.graphics.animationSpeed = ANIM_SPEED;
    this.graphics.loop = true;
    this.graphics.gotoAndPlay(Math.floor(Math.random() * animation.frames.length));
  }

  update(dt) {
    if (this.collected) return;

    // Subtle bob
    this.bobTime += 0.05 * dt;
    this.graphics.position.y = this.baseY + this.height - 6 + Math.sin(this.bobTime) * 3;
  }
}
