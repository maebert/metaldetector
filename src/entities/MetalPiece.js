import { Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';

const ANIM_FPS = 12;
const TICKS_PER_FRAME = 60 / ANIM_FPS;

export class MetalPiece {
  constructor(x, y, animation) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.METAL_WIDTH;
    this.height = CONFIG.METAL_HEIGHT;
    this.collected = false;
    this.baseY = y;
    this.bobTime = Math.random() * Math.PI * 2;

    this.animation = animation;
    this.animFrame = Math.floor(Math.random() * animation.frames.length);
    this.animTimer = 0;

    const scale = CONFIG.METAL_HEIGHT / animation.frameHeight;
    this.spriteScale = scale;

    this.graphics = new Sprite(animation.frames[this.animFrame]);
    this.graphics.anchor.set(0.5, 1.0);
    this.graphics.scale.set(scale);
    this.graphics.position.set(this.x + this.width / 2, this.y + this.height);
  }

  update(dt) {
    if (this.collected) return;

    // Advance animation
    this.animTimer += dt;
    while (this.animTimer >= TICKS_PER_FRAME) {
      this.animTimer -= TICKS_PER_FRAME;
      this.animFrame = (this.animFrame + 1) % this.animation.frames.length;
    }
    this.graphics.texture = this.animation.frames[this.animFrame];

    // Subtle bob
    this.bobTime += 0.05 * dt;
    this.graphics.position.y = this.baseY + this.height + Math.sin(this.bobTime) * 3;
  }
}
