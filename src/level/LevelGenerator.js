import { CONFIG } from '../config.js';
import { Platform } from './Platform.js';
import { MetalPiece } from '../entities/MetalPiece.js';

const MAX_JUMP_HEIGHT = 50;
const MAX_HORIZONTAL = 100;
const MAX_FALL = 300;

function findReachableY(newX, newWidth, platforms) {
  const candidates = platforms.filter((p) => {
    const horizontalDist = Math.max(
      0,
      newX - (p.x + p.width),
      p.x - (newX + newWidth)
    );
    return horizontalDist < MAX_HORIZONTAL;
  });

  if (candidates.length === 0) return null;

  const ref = candidates[Math.floor(Math.random() * candidates.length)];
  const minY = Math.max(60, ref.y - MAX_JUMP_HEIGHT);
  const maxY = Math.min(CONFIG.GROUND_Y - 40, ref.y + MAX_FALL);

  if (minY >= maxY) return null;
  return minY + Math.random() * (maxY - minY);
}

export function generateLevel(worldContainer, metalAnimation) {
  const platforms = [];
  const metalPieces = [];

  // Ground platform
  const ground = new Platform(0, CONFIG.GROUND_Y, CONFIG.WORLD_WIDTH, CONFIG.GROUND_HEIGHT, false);
  platforms.push(ground);
  worldContainer.addChild(ground.graphics);

  // Generate floating platforms column by column
  const safeZone = 400;
  const columnWidth = (CONFIG.WORLD_WIDTH - safeZone) / CONFIG.PLATFORM_COUNT;

  for (let i = 0; i < CONFIG.PLATFORM_COUNT; i++) {
    const colX = safeZone + i * columnWidth;
    let placed = false;

    for (let attempt = 0; attempt < 20; attempt++) {
      const width =
        CONFIG.PLATFORM_MIN_WIDTH +
        Math.random() * (CONFIG.PLATFORM_MAX_WIDTH - CONFIG.PLATFORM_MIN_WIDTH);
      const x = colX + Math.random() * Math.max(0, columnWidth - width);
      const y = findReachableY(x, width, platforms);

      if (y !== null) {
        const plat = new Platform(x, y, width);
        platforms.push(plat);
        worldContainer.addChild(plat.graphics);
        placed = true;
        break;
      }
    }

    // Fallback: place at reachable height near ground
    if (!placed) {
      const plat = new Platform(colX + 20, CONFIG.GROUND_Y - 40, 120);
      platforms.push(plat);
      worldContainer.addChild(plat.graphics);
    }
  }

  // Place metal pieces on random floating platforms
  const floating = platforms.filter((p) => p.y < CONFIG.GROUND_Y);
  const shuffled = [...floating].sort(() => Math.random() - 0.5);
  const count = Math.min(CONFIG.METAL_COUNT, shuffled.length);

  for (let i = 0; i < count; i++) {
    const plat = shuffled[i];
    const mx = plat.x + plat.width / 2 - CONFIG.METAL_WIDTH / 2;
    const my = plat.y - CONFIG.METAL_HEIGHT;
    const metal = new MetalPiece(mx, my, metalAnimation);
    metalPieces.push(metal);
    worldContainer.addChild(metal.graphics);
  }

  return {
    platforms,
    metalPieces,
    startPosition: { x: 100, y: CONFIG.GROUND_Y - CONFIG.PLAYER_HEIGHT },
  };
}
