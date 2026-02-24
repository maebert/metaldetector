import { Container, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import * as Input from '../input.js';

// Game ticks between animation frames, per state
const TICKS_PER_FRAME = {
  standing: 60 / 24,
  running: 60 / 24,
  jumping: 60 / 24,
};

export class Player {
  constructor(x, y, animations) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;

    // Animation data: { running: { frames, frameWidth, frameHeight }, jumping: { ... } }
    this.animations = animations;
    this.state = 'standing';
    this.animFrame = 0;
    this.animTimer = 0;
    this.facingRight = true;

    // Per-animation scale so each always renders at PLAYER_HEIGHT
    this.scaleByAnim = {
      standing: CONFIG.PLAYER_HEIGHT / animations.standing.frameHeight,
      running: CONFIG.PLAYER_HEIGHT / animations.running.frameHeight,
      jumping: (CONFIG.PLAYER_HEIGHT / animations.jumping.frameHeight) * 1.1,
    };
    this.currentScale = this.scaleByAnim.standing;

    // Container acts as the display object (replaces the old Graphics)
    this.container = new Container();

    // Animated sprite — anchor at bottom-center so feet align with collision box bottom
    this.sprite = new Sprite(animations.standing.frames[0]);
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.scale.set(this.currentScale);
    this.sprite.position.set(this.width / 2, this.height);
    this.container.addChild(this.sprite);

    this.container.position.set(this.x, this.y);
  }

  // Backward-compatible: main.js uses player.graphics
  get graphics() {
    return this.container;
  }

  update(dt) {
    // Horizontal movement
    if (Input.isLeft()) {
      this.velocityX = -CONFIG.PLAYER_SPEED;
      this.facingRight = false;
    } else if (Input.isRight()) {
      this.velocityX = CONFIG.PLAYER_SPEED;
      this.facingRight = true;
    } else {
      this.velocityX = 0;
    }

    // Jump
    if (Input.isJump() && this.isGrounded) {
      this.velocityY = CONFIG.JUMP_FORCE;
      this.isGrounded = false;
    }

    // Apply horizontal movement
    this.x += this.velocityX * dt;
    this.x = Math.max(0, Math.min(this.x, CONFIG.WORLD_WIDTH - this.width));

    // Determine state
    let newState;
    if (!this.isGrounded) {
      newState = 'jumping';
    } else if (this.velocityX !== 0) {
      newState = 'running';
    } else {
      newState = 'standing';
    }

    if (newState !== this.state) {
      this.state = newState;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    // Advance animation
    const anim = this.animations[this.state];
    const ticksPerFrame = TICKS_PER_FRAME[this.state];
    this.animTimer += dt;
    while (this.animTimer >= ticksPerFrame) {
      this.animTimer -= ticksPerFrame;
      this.animFrame = (this.animFrame + 1) % anim.frames.length;
    }
    this.sprite.texture = anim.frames[this.animFrame];
    this.currentScale = this.scaleByAnim[this.state];

    // Flip sprite for facing direction (negative scaleX = mirror)
    this.sprite.scale.set(
      this.currentScale * (this.facingRight ? 1 : -1),
      this.currentScale
    );

    // Sync container position
    this.container.position.set(this.x, this.y);
  }
}
