import { Container, Graphics, Sprite, Texture, TilingSprite, Rectangle } from 'pixi.js';
import { CONFIG } from '../config.js';

// Slice boundaries in the source texture
const LEFT_W = 322;
const MID_W = 238;
const RIGHT_W = 290;

let leftTex, midTex, rightTex, texScale;

export function initPlatformTexture(platformTexture) {
  const h = platformTexture.height;
  const src = platformTexture.source;

  leftTex = new Texture({ source: src, frame: new Rectangle(0, 0, LEFT_W, h) });
  midTex = new Texture({ source: src, frame: new Rectangle(LEFT_W, 0, MID_W, h) });
  rightTex = new Texture({ source: src, frame: new Rectangle(LEFT_W + MID_W, 0, RIGHT_W, h) });
  texScale = CONFIG.PLATFORM_HEIGHT / h;
}

export class Platform {
  constructor(x, y, width, height, sinkable = true) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height ?? CONFIG.PLATFORM_HEIGHT;
    this.sinkable = sinkable;

    if (leftTex) {
      this.graphics = this._buildTextured();
    } else {
      this.graphics = new Graphics()
        .rect(0, 0, this.width, this.height)
        .fill(CONFIG.PLATFORM_COLOR);
    }
    this.graphics.position.set(this.x, this.y);
  }

  sink(dt) {
    if (!this.sinkable) return;
    const sinkSpeed = CONFIG.PLAYER_HEIGHT / 60; // PLAYER_HEIGHT per second
    this.y += sinkSpeed * dt;
    // Never go below ground level
    if (this.y > CONFIG.GROUND_Y - this.height) {
      this.y = CONFIG.GROUND_Y - this.height;
    }
    this.graphics.position.y = this.y;
  }

  _buildTextured() {
    const container = new Container();
    const s = this.height / (leftTex.height);

    const leftWorldW = LEFT_W * s;
    const rightWorldW = RIGHT_W * s;

    // If platform is too narrow for both caps, scale caps to fit
    const capsW = leftWorldW + rightWorldW;
    const capScale = this.width < capsW ? this.width / capsW : 1;

    const actualLeftW = leftWorldW * capScale;
    const actualRightW = rightWorldW * capScale;
    const midSectionW = Math.max(0, this.width - actualLeftW - actualRightW);

    // Left cap
    const left = new Sprite(leftTex);
    left.width = actualLeftW;
    left.height = this.height;
    left.position.set(0, 0);
    container.addChild(left);

    // Middle tiling section
    if (midSectionW > 0) {
      const mid = new TilingSprite({
        texture: midTex,
        width: midSectionW / s,
        height: midTex.height,
      });
      mid.scale.set(s);
      mid.position.set(actualLeftW, 0);
      container.addChild(mid);
    }

    // Right cap
    const right = new Sprite(rightTex);
    right.width = actualRightW;
    right.height = this.height;
    right.position.set(this.width - actualRightW, 0);
    container.addChild(right);

    return container;
  }
}
