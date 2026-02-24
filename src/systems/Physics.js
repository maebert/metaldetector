import { CONFIG } from '../config.js';

export function applyGravity(entity, dt) {
  entity.velocityY += CONFIG.GRAVITY * dt;
  if (entity.velocityY > CONFIG.MAX_FALL_SPEED) {
    entity.velocityY = CONFIG.MAX_FALL_SPEED;
  }
  entity.y += entity.velocityY * dt;
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function resolveCollisions(entity, platforms) {
  entity.isGrounded = false;
  entity.groundedPlatform = null;

  for (const plat of platforms) {
    if (!overlaps(entity, plat)) continue;

    const overlapLeft = (entity.x + entity.width) - plat.x;
    const overlapRight = (plat.x + plat.width) - entity.x;
    const overlapTop = (entity.y + entity.height) - plat.y;
    const overlapBottom = (plat.y + plat.height) - entity.y;

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapTop && entity.velocityY >= 0) {
      // Landing on top
      entity.y = plat.y - entity.height;
      entity.velocityY = 0;
      entity.isGrounded = true;
      entity.groundedPlatform = plat;
    } else if (minOverlap === overlapBottom && entity.velocityY < 0) {
      // Hitting head
      entity.y = plat.y + plat.height;
      entity.velocityY = 0;
    } else if (minOverlap === overlapLeft) {
      entity.x = plat.x - entity.width;
      entity.velocityX = 0;
    } else if (minOverlap === overlapRight) {
      entity.x = plat.x + plat.width;
      entity.velocityX = 0;
    }
  }
}

export function checkOverlap(a, b) {
  return overlaps(a, b);
}
