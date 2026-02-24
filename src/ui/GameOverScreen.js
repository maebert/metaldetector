import { Container, Graphics, Text } from 'pixi.js';
import { CONFIG } from '../config.js';

export class GameOverScreen {
  constructor() {
    this.container = new Container();

    // Semi-transparent overlay
    const overlay = new Graphics()
      .rect(0, 0, CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT)
      .fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(overlay);

    this.messageText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 48,
        fill: 0xffffff,
        align: 'center',
      },
    });
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(CONFIG.SCREEN_WIDTH / 2, CONFIG.SCREEN_HEIGHT / 2 - 30);
    this.container.addChild(this.messageText);

    const restartText = new Text({
      text: 'Press R to restart',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xcccccc,
      },
    });
    restartText.anchor.set(0.5);
    restartText.position.set(CONFIG.SCREEN_WIDTH / 2, CONFIG.SCREEN_HEIGHT / 2 + 40);
    this.container.addChild(restartText);
  }

  show(message) {
    this.messageText.text = message;
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }
}
