import { AnimatedSprite, Container } from 'pixi.js';
import { CONFIG } from '../config.js';
import { applyGravity, resolveCollisions } from '../systems/Physics.js';

const ANIM_SPEED = 24 / 60;
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
    this.shocked = false;

    this.animations = animations;
    this.currentState = 'running';
    this.facingRight = true;

    this.scaleByAnim = {
      running: (CONFIG.POLICEMAN_HEIGHT / animations.running.frameHeight) * 1.2,
      jumping: (CONFIG.POLICEMAN_HEIGHT / animations.jumping.frameHeight) * 1.2,
      arrest: animations.arrest
        ? (CONFIG.POLICEMAN_HEIGHT / animations.arrest.frameHeight) * 1.2
        : 0,
      shock: animations.shock
        ? (CONFIG.POLICEMAN_HEIGHT / animations.shock.frameHeight) * 1.25
        : 0,
    };

    this.container = new Container();

    this.sprite = new AnimatedSprite(animations.running.frames);
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.scale.set(this.scaleByAnim.running);
    this.sprite.position.set(this.width / 2, this.height + 5);
    this.sprite.play();
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

  _switchAnimation(stateName) {
    const anim = this.animations[stateName];
    if (!anim) return;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();
  }

  update(dt, platforms, player) {
    if (this.shocked) {
      this.updateShock(dt);
      return;
    }
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
      this._switchAnimation(animKey);
    }

    const s = this.scaleByAnim[this.currentState];
    this.sprite.scale.set(s * (this.facingRight ? 1 : -1), s);

    this.container.position.set(this.x, this.y);
  }

  _shouldJump(platforms, player, dir) {
    const myFeetY = this.y + this.height;
    const onGround = myFeetY >= CONFIG.GROUND_Y - 2;
    const onFloatingPlatform = this.groundedPlatform && this.groundedPlatform.y < CONFIG.GROUND_Y;
    const playerAboveGround = player.y + player.height < CONFIG.GROUND_Y - 5;

    const nearestAhead = this._findPlatformAhead(platforms, dir, CONFIG.POLICEMAN_LOOK_AHEAD);

    if (onGround && nearestAhead) {
      if (nearestAhead.y < myFeetY && nearestAhead.y + nearestAhead.height > this.y) {
        return true;
      }
      if (playerAboveGround) {
        return true;
      }
    }

    if (onFloatingPlatform) {
      const plat = this.groundedPlatform;
      const nearEdge = dir > 0
        ? (this.x + this.width) >= (plat.x + plat.width - 8)
        : this.x <= (plat.x + 8);

      if (nearEdge) {
        if (playerAboveGround && this._hasReachablePlatform(platforms, dir)) {
          return true;
        }
      }
    }

    return false;
  }

  _findPlatformAhead(platforms, dir, maxDist) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const plat of platforms) {
      if (plat.y >= CONFIG.GROUND_Y) continue;

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
        if (plat.y >= this.y - MAX_JUMP_HEIGHT) {
          return true;
        }
      }
    }

    return false;
  }

  playArrest() {
    this.currentState = 'arrest';
    const anim = this.animations.arrest;
    if (!anim) return;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.play();
  }

  updateArrest(dt) {
    const s = this.scaleByAnim[this.currentState] || this.scaleByAnim.running;
    this.sprite.scale.set(s * (this.facingRight ? 1 : -1), s);
  }

  playShock() {
    this.currentState = 'shock';
    const anim = this.animations.shock;
    if (!anim) return;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.play();
  }

  updateShock(dt) {
    const s = this.scaleByAnim.shock || this.scaleByAnim.running;
    this.sprite.scale.set(s * (this.facingRight ? 1 : -1), s);
  }

  distanceTo(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
