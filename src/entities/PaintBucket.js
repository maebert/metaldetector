import { AnimatedSprite } from 'pixi.js';
import { CONFIG } from '../config.js';

const DISPLAY_HEIGHT = 24;

export class PaintBucket {
  constructor(x, y, animation) {
    this.x = x;
    this.y = y;
    this.width = DISPLAY_HEIGHT * (animation.frameWidth / animation.frameHeight);
    this.height = DISPLAY_HEIGHT;
    this.triggered = false;
    this.done = false;

    const scale = (DISPLAY_HEIGHT / animation.frameHeight) * 1.5;

    this.graphics = new AnimatedSprite(animation.frames);
    this.graphics.anchor.set(0.5, 1.0);
    this.graphics.scale.set(scale);
    this.graphics.position.set(this.x + this.width / 2, this.y + this.height + 8);
    this.graphics.animationSpeed = 24 / 60;
    this.graphics.loop = false;
    this.graphics.gotoAndStop(0);
    this.graphics.onComplete = () => {
      this.done = true;
      this.graphics.visible = false;
    };
  }

  trigger() {
    if (this.triggered) return;
    this.triggered = true;
    this.graphics.play();
  }
}
