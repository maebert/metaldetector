import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { CONFIG } from '../config.js';

export class MenuScreen {
  constructor(iconTexture, titleTexture) {
    this.container = new Container();

    const PAD = 2000;
    const bg = new Graphics()
      .rect(-PAD, -PAD, CONFIG.SCREEN_WIDTH + PAD * 2, CONFIG.SCREEN_HEIGHT + PAD * 2)
      .fill(0x87ceeb);
    this.container.addChild(bg);

    const cx = CONFIG.SCREEN_WIDTH / 2;

    // Icon — smaller, above the title
    const icon = new Sprite(iconTexture);
    icon.anchor.set(0.5);
    icon.width = 80;
    icon.height = 80;
    icon.position.set(cx, 80);
    this.container.addChild(icon);

    // Title image — replaces the old text title
    const title = new Sprite(titleTexture);
    title.anchor.set(0.5);
    // Scale to a reasonable width, preserve aspect ratio
    const titleScale = 360 / titleTexture.width;
    title.scale.set(titleScale);
    title.position.set(cx, CONFIG.SCREEN_HEIGHT / 2);
    this.container.addChild(title);

    const subtitle = new Text({
      text: 'Collect all the metal before the police catch you!',
      style: {
        fontFamily: 'monospace',
        fontSize: 18,
        fill: 0x333333,
        align: 'center',
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(cx, CONFIG.SCREEN_HEIGHT / 2 + 140);
    this.container.addChild(subtitle);

    const startText = new Text({
      text: 'Tap or press ENTER to start',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0x222222,
        align: 'center',
      },
    });
    startText.anchor.set(0.5);
    startText.position.set(cx, CONFIG.SCREEN_HEIGHT / 2 + 190);
    this.container.addChild(startText);

    const controls = new Text({
      text: 'Arrow keys / WASD to move  |  Space to jump',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0x555555,
        align: 'center',
      },
    });
    controls.anchor.set(0.5);
    controls.position.set(cx, CONFIG.SCREEN_HEIGHT / 2 + 240);
    this.container.addChild(controls);
  }
}
