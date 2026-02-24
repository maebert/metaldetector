const keys = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevent spacebar from scrolling the page
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
}

export function isPressed(code) {
  return keys[code] === true;
}

export function isLeft() {
  return isPressed('ArrowLeft') || isPressed('KeyA');
}

export function isRight() {
  return isPressed('ArrowRight') || isPressed('KeyD');
}

export function isJump() {
  return isPressed('Space') || isPressed('ArrowUp') || isPressed('KeyW');
}
