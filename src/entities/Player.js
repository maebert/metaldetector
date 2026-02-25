import { AnimatedSprite, Container } from 'pixi.js';
import { CONFIG } from '../config.js';
import * as Input from '../input.js';

const ANIM_SPEED = 24 / 60;
const TRANSFORM_DURATION = 90; // 1.5s at 60fps

export class Player {
  constructor(x, y, animations) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;

    // Hero and robot animation sets
    this.heroAnims = {
      standing: animations.standing,
      running: animations.running,
      jumping: animations.jumping,
      winning: animations.winning,
    };
    this.robotAnims = {
      standing: animations.robotStanding,
      running: animations.robotRunning,
      jumping: animations.robotJumping,
    };
    this.transformAnim = animations.robotTransform;
    this.transformBackAnim = animations.robotTransformBack;
    this.robotDieAnim = animations.robotDie;
    this.robotAttackAnim = animations.robotAttack;
    this.attacking = false;

    this.isRobot = false;
    this.transforming = false;
    this.transformTimer = 0;

    // Active animation set (switches between hero/robot)
    this.animations = this.heroAnims;
    this.state = 'standing';
    this.facingRight = true;

    this._buildScales();
    this.currentScale = this.scaleByAnim.standing;

    this.container = new Container();

    this.sprite = new AnimatedSprite(this.animations.standing.frames);
    this.sprite.anchor.set(0.5, 1.0);
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.scale.set(this.currentScale);
    this.sprite.position.set(this.width / 2, this.height + 5);
    this.sprite.play();
    this.container.addChild(this.sprite);

    this.container.position.set(this.x, this.y);
  }

  _buildScales() {
    const anims = this.animations;
    const mult = this.isRobot ? 1.2 : 1;
    this.scaleByAnim = {
      standing: (CONFIG.PLAYER_HEIGHT / anims.standing.frameHeight) * mult,
      running: (CONFIG.PLAYER_HEIGHT / anims.running.frameHeight) * (this.isRobot ? 1.4 : 1),
      jumping: (CONFIG.PLAYER_HEIGHT / anims.jumping.frameHeight) * (this.isRobot ? 1.3 : 1.25),
    };
    if (anims.winning) {
      this.scaleByAnim.winning = CONFIG.PLAYER_HEIGHT / anims.winning.frameHeight;
    }
  }

  get graphics() {
    return this.container;
  }

  _switchAnimation(stateName) {
    const anim = this.animations[stateName];
    if (!anim) return;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();
    this.currentScale = this.scaleByAnim[stateName];
  }

  startTransform() {
    if (this.transforming) return false;
    this.transforming = true;
    this.transformTimer = 0;
    this.velocityX = 0;

    const anim = this.isRobot ? this.transformBackAnim : this.transformAnim;
    if (!anim) return false;

    const scale = (CONFIG.PLAYER_HEIGHT / anim.frameHeight) * 1.25;
    this.currentScale = scale;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.play();
    return true;
  }

  updateTransform(dt) {
    this.transformTimer += dt;

    this.sprite.scale.set(
      this.currentScale * (this.facingRight ? 1 : -1),
      this.currentScale
    );
    this.sprite.position.set(this.width / 2, this.height + 5);

    if (this.transformTimer >= TRANSFORM_DURATION) {
      this.transforming = false;
      this.isRobot = !this.isRobot;
      this.animations = this.isRobot ? this.robotAnims : this.heroAnims;
      this._buildScales();
      this.state = 'standing';
      this._switchAnimation('standing');
      return true; // transform complete
    }
    return false;
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
    this.justJumped = false;
    if (Input.isJump() && this.isGrounded) {
      this.velocityY = CONFIG.JUMP_FORCE;
      this.isGrounded = false;
      this.justJumped = true;
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
      this._switchAnimation(newState);
    }

    // Flip sprite for facing direction
    this.sprite.scale.set(
      this.currentScale * (this.facingRight ? 1 : -1),
      this.currentScale
    );

    // Offset: robot running sits 5px lower
    const yOffset = (this.isRobot && this.state === 'running') ? 10 : 5;
    this.sprite.position.set(this.width / 2, this.height + yOffset);

    // Sync container position
    this.container.position.set(this.x, this.y);
  }

  playCelebration() {
    this.state = 'winning';
    const anim = this.animations.winning || this.heroAnims.winning;
    if (!anim) return;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = true;
    this.sprite.play();
    this.currentScale = CONFIG.PLAYER_HEIGHT / anim.frameHeight;
  }

  updateCelebration(dt) {
    const anim = this.animations.winning || this.heroAnims.winning;
    if (!anim) return;
    const s = CONFIG.PLAYER_HEIGHT / anim.frameHeight;
    this.sprite.scale.set(
      s * (this.facingRight ? 1 : -1),
      s
    );
    this.sprite.position.set(this.width / 2, this.height + 10);
  }

  playDie() {
    const anim = this.robotDieAnim;
    if (!anim) return;
    this.state = 'die';
    this.currentScale = (CONFIG.PLAYER_HEIGHT / anim.frameHeight) * 1.25;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.play();
  }

  updateDie(dt) {
    this.sprite.scale.set(
      this.currentScale * (this.facingRight ? 1 : -1),
      this.currentScale
    );
    this.sprite.position.set(this.width / 2, this.height + 5);
  }

  startAttack() {
    if (!this.isRobot || this.attacking) return false;
    this.attacking = true;
    const anim = this.robotAttackAnim;
    if (!anim) return false;
    this.state = 'attack';
    this.currentScale = (CONFIG.PLAYER_HEIGHT / anim.frameHeight) * 1.25;
    this.sprite.textures = anim.frames;
    this.sprite.animationSpeed = ANIM_SPEED;
    this.sprite.loop = false;
    this.sprite.play();
    this.sprite.onComplete = () => {
      this.attacking = false;
      this.state = 'standing';
      this._switchAnimation('standing');
      this.sprite.onComplete = null;
    };
    return true;
  }
}
