import { Texture, Rectangle } from 'pixi.js';

/**
 * Extract animation frames from a sprite sheet texture.
 * Returns { frames: Texture[], frameWidth, frameHeight }.
 */
export function extractFrames(texture, cols, rows, frameCount) {
  const fw = texture.width / cols;
  const fh = texture.height / rows;
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    frames.push(
      new Texture({
        source: texture.source,
        frame: new Rectangle(col * fw, row * fh, fw, fh),
      })
    );
  }

  return { frames, frameWidth: fw, frameHeight: fh };
}
