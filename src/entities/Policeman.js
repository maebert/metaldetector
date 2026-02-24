import { Container, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';

const ANIM_FPS = 12;
const TICKS_PER_FRAME = 60 / ANIM_FPS;

export class Policeman {
  constructor(x, y, animations) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.POLICEMAN_WIDTH;
    this.height = CONFIG.POLICEMAN_HEIGHT;
    this.trailIndex = 0;
    this.active = false;

    this.animations = animations;
    this.currentState = 'running';
    this.animFrame = 0;
    this.animTimer = 0;
    this.facingRight = true;

    // Per-animation scale to match POLICEMAN_HEIGHT
    this.scaleByAnim = {
      running: CONFIG.POLICEMAN_HEIGHT / animations.running.frameHeight,
      jumping: CONFIG.POLICEMAN_HEIGHT / animations.jumping.frameHeight,
    };

    // Container + Sprite
    this.container = new Container();

    this.sprite = new Sprite(animations.running.frames[0]);
    this.sprite.anchor.set(0.5, 1.0);
    const scale = this.scaleByAnim.running;
    this.sprite.scale.set(scale);
    this.sprite.position.set(this.width / 2, this.height);
    this.container.addChild(this.sprite);

    this.container.position.set(this.x, this.y);
    this.container.visible = false;
  }

  get graphics() {
    return this.container;
  }

  update(dt, trail) {
    if (trail.length < CONFIG.POLICEMAN_TRAIL_DELAY) {
      return;
    }

    if (!this.active) {
      this.active = true;
      this.trailIndex = 0;
      this.container.visible = true;
    }

    // Advance through trail at same speed it was recorded
    this.trailIndex += (CONFIG.POLICEMAN_SPEED_MULT * dt) / CONFIG.BREADCRUMB_RECORD_INTERVAL;

    // Skip past standing entries — policeman doesn't wait when player stood still
    const maxIndex = trail.length - 1;
    while (this.trailIndex < maxIndex) {
      const pt = trail.getPosition(Math.floor(this.trailIndex));
      if (pt.state !== 'standing') break;
      this.trailIndex += 1;
    }

    if (this.trailIndex > maxIndex) {
      this.trailIndex = maxIndex;
    }

    // Interpolate between two trail points
    const low = Math.floor(this.trailIndex);
    const high = Math.min(low + 1, maxIndex);
    const frac = this.trailIndex - low;

    const a = trail.getPosition(low);
    const b = trail.getPosition(high);

    this.x = a.x + (b.x - a.x) * frac;
    this.y = a.y + (b.y - a.y) * frac;

    // Read recorded state from trail point
    const trailState = a.state;
    const trailFacing = a.facingRight;
    const animKey = (trailState === 'jumping') ? 'jumping' : 'running';

    // Reset animation on state change
    if (animKey !== this.currentState) {
      this.currentState = animKey;
      this.animFrame = 0;
      this.animTimer = 0;
    }
    this.facingRight = trailFacing;

    // Advance animation
    const anim = this.animations[this.currentState];
    this.animTimer += dt;
    while (this.animTimer >= TICKS_PER_FRAME) {
      this.animTimer -= TICKS_PER_FRAME;
      this.animFrame = (this.animFrame + 1) % anim.frames.length;
    }

    const scale = this.scaleByAnim[this.currentState];
    this.sprite.texture = anim.frames[this.animFrame];
    this.sprite.scale.set(
      scale * (this.facingRight ? 1 : -1),
      scale
    );

    this.container.position.set(this.x, this.y);
  }

  distanceTo(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
