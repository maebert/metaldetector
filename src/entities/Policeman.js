import { Container, Sprite } from 'pixi.js';
import { CONFIG } from '../config.js';
import { applyGravity, resolveCollisions } from '../systems/Physics.js';

const TICKS_PER_FRAME = 60 / 24;
const MAX_JUMP_HEIGHT = 50;
const MAX_JUMP_DIST = 100;

export class Policeman {
  constructor(x, y, animations) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.POLICEMAN_WIDTH;
    this.height = CONFIG.POLICEMAN_HEIGHT;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;
    this.groundedPlatform = null;

    this.activateTimer = 0;
    this.activated = false;
    this.active = false;

    this.animations = animations;
    this.currentState = 'running';
    this.animFrame = 0;
    this.animTimer = 0;
    this.facingRight = true;

    this.scaleByAnim = {
      running: (CONFIG.POLICEMAN_HEIGHT / animations.running.frameHeight) * 1.2,
      jumping: (CONFIG.POLICEMAN_HEIGHT / animations.jumping.frameHeight) * 1.2,
      arrest: animations.arrest
        ? (CONFIG.POLICEMAN_HEIGHT / animations.arrest.frameHeight) * 1.2
        : 0,
    };

    this.container = new Container();

    this.sprite = new Sprite(animations.running.frames[0]);
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.scale.set(this.scaleByAnim.running);
    this.sprite.position.set(this.width / 2, this.height + 5);
    this.container.addChild(this.sprite);

    this.container.position.set(this.x, this.y);
    this.container.visible = false;
  }

  get graphics() {
    return this.container;
  }

  activate() {
    this.activated = true;
    this.activateTimer = 0;
  }

  update(dt, platforms, player) {
    // Wait for activation, then delay before appearing
    if (!this.activated) return;
    if (!this.active) {
      this.activateTimer += dt;
      if (this.activateTimer < CONFIG.POLICEMAN_DELAY) return;
      this.active = true;
      this.container.visible = true;
    }

    // Always run toward the player
    const dir = player.x > this.x ? 1 : -1;
    this.velocityX = CONFIG.PLAYER_SPEED * dir;

    // Jump decision
    if (this.isGrounded && this._shouldJump(platforms, player, dir)) {
      this.velocityY = CONFIG.JUMP_FORCE;
      this.isGrounded = false;
    }

    // Physics
    applyGravity(this, dt);
    this.x += this.velocityX * dt;
    this.x = Math.max(0, Math.min(this.x, CONFIG.WORLD_WIDTH - this.width));
    resolveCollisions(this, platforms);

    // Facing direction
    if (this.velocityX > 0) this.facingRight = true;
    else if (this.velocityX < 0) this.facingRight = false;

    // Animation state from own physics
    const animKey = this.isGrounded ? 'running' : 'jumping';
    if (animKey !== this.currentState) {
      this.currentState = animKey;
      this.animFrame = 0;
      this.animTimer = 0;
    }

    const anim = this.animations[this.currentState];
    this.animTimer += dt;
    while (this.animTimer >= TICKS_PER_FRAME) {
      this.animTimer -= TICKS_PER_FRAME;
      this.animFrame = (this.animFrame + 1) % anim.frames.length;
    }

    const s = this.scaleByAnim[this.currentState];
    this.sprite.texture = anim.frames[this.animFrame];
    this.sprite.scale.set(s * (this.facingRight ? 1 : -1), s);

    this.container.position.set(this.x, this.y);
  }

  _shouldJump(platforms, player, dir) {
    const myFeetY = this.y + this.height;
    const onGround = myFeetY >= CONFIG.GROUND_Y - 2;
    const onFloatingPlatform = this.groundedPlatform && this.groundedPlatform.y < CONFIG.GROUND_Y;
    const playerAboveGround = player.y + player.height < CONFIG.GROUND_Y - 5;

    // Find nearest floating platform ahead within look-ahead distance
    const nearestAhead = this._findPlatformAhead(platforms, dir, CONFIG.POLICEMAN_LOOK_AHEAD);

    // Scenario 1: On the ground, approaching a floating platform
    if (onGround && nearestAhead) {
      // Platform blocks our path (vertically overlaps with us)
      if (nearestAhead.y < myFeetY && nearestAhead.y + nearestAhead.height > this.y) {
        return true;
      }
      // Player is above ground — jump onto the platform to chase
      if (playerAboveGround) {
        return true;
      }
    }

    // Scenario 2: On a floating platform, near the edge
    if (onFloatingPlatform) {
      const plat = this.groundedPlatform;
      const nearEdge = dir > 0
        ? (this.x + this.width) >= (plat.x + plat.width - 8)
        : this.x <= (plat.x + 8);

      if (nearEdge) {
        // Player is above ground and there's a reachable platform ahead — jump to it
        if (playerAboveGround && this._hasReachablePlatform(platforms, dir)) {
          return true;
        }
        // Otherwise just fall to ground (don't jump)
      }
    }

    return false;
  }

  _findPlatformAhead(platforms, dir, maxDist) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const plat of platforms) {
      if (plat.y >= CONFIG.GROUND_Y) continue; // skip ground

      let dist;
      if (dir > 0) {
        dist = plat.x - (this.x + this.width);
      } else {
        dist = this.x - (plat.x + plat.width);
      }

      if (dist > -10 && dist < maxDist && dist < nearestDist) {
        nearest = plat;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  _hasReachablePlatform(platforms, dir) {
    for (const plat of platforms) {
      if (plat === this.groundedPlatform) continue;
      if (plat.y >= CONFIG.GROUND_Y) continue;

      let dist;
      if (dir > 0) {
        dist = plat.x - (this.x + this.width);
      } else {
        dist = this.x - (plat.x + plat.width);
      }

      if (dist > 0 && dist < MAX_JUMP_DIST) {
        // Platform top must be reachable (not more than MAX_JUMP_HEIGHT above us)
        if (plat.y >= this.y - MAX_JUMP_HEIGHT) {
          return true;
        }
      }
    }

    return false;
  }

  playArrest() {
    this.currentState = 'arrest';
    this.animFrame = 0;
    this.animTimer = 0;
  }

  updateArrest(dt) {
    const anim = this.animations[this.currentState];
    if (!anim) return;

    this.animTimer += dt;
    while (this.animTimer >= TICKS_PER_FRAME) {
      this.animTimer -= TICKS_PER_FRAME;
      if (this.animFrame < anim.frames.length - 1) {
        this.animFrame++;
      }
    }

    const s = this.scaleByAnim[this.currentState] || this.scaleByAnim.running;
    this.sprite.texture = anim.frames[this.animFrame];
    this.sprite.scale.set(s * (this.facingRight ? 1 : -1), s);
  }

  distanceTo(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
