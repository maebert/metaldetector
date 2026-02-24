import { Text } from 'pixi.js';

export class HUD {
  constructor() {
    this.text = new Text({
      text: 'Metal: 0/0',
      style: {
        fontFamily: 'monospace',
        fontSize: 24,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.text.position.set(16, 16);
  }

  update(collected, total) {
    this.text.text = `Metal: ${collected}/${total}`;
  }
}
