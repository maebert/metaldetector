const keys = {};
const touch = { left: false, right: false, jump: false, transform: false, attack: false, tap: false };

let isTouchDevice = false;
let touchButtons = [];

export function initInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Detect touch device
  isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    createTouchControls();
    // Tap anywhere on canvas to start/restart
    window.addEventListener('touchstart', () => { touch.tap = true; });
    window.addEventListener('touchend', () => { touch.tap = false; });
  }
}

export function isPressed(code) {
  return keys[code] === true;
}

export function isLeft() {
  return isPressed('ArrowLeft') || isPressed('KeyA') || touch.left;
}

export function isRight() {
  return isPressed('ArrowRight') || isPressed('KeyD') || touch.right;
}

export function isJump() {
  return isPressed('Space') || isPressed('ArrowUp') || isPressed('KeyW') || touch.jump;
}

export function isTransform() {
  return isPressed('KeyE') || touch.transform;
}

export function isAttack() {
  return isPressed('KeyR') || touch.attack;
}

export function isTap() {
  return touch.tap;
}

function createButton(label, size, bottom, side, sideOffset) {
  const btn = document.createElement('div');
  btn.textContent = label;
  btn.style.cssText = `
    position: fixed;
    ${side}: ${sideOffset}px;
    bottom: ${bottom}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.8);
    font-size: ${size * 0.4}px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    z-index: 1000;
  `;
  document.body.appendChild(btn);
  return btn;
}

function bindTouch(btn, key) {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touch[key] = true;
  });
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    touch[key] = false;
  });
  btn.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    touch[key] = false;
  });
}

function createTouchControls() {
  // Prevent default touch behaviors on canvas
  document.body.style.touchAction = 'none';

  // Attack — bottom-left, above transform
  const attackBtn = createButton('💥', 70, 250, 'left', 40);
  bindTouch(attackBtn, 'attack');

  // Transform — bottom-left, above jump
  const transformBtn = createButton('⚡', 70, 140, 'left', 40);
  bindTouch(transformBtn, 'transform');

  // Jump — bottom-left, bigger
  const jumpBtn = createButton('▲', 90, 30, 'left', 30);
  bindTouch(jumpBtn, 'jump');

  // Left — bottom-right, left of pair
  const leftBtn = createButton('◀', 70, 30, 'right', 110);
  bindTouch(leftBtn, 'left');

  // Right — bottom-right, right of pair
  const rightBtn = createButton('▶', 70, 30, 'right', 30);
  bindTouch(rightBtn, 'right');

  touchButtons = [transformBtn, jumpBtn, leftBtn, rightBtn];
  attackButton = attackBtn;
  hideTouchControls();
}

let attackButton = null;

export function showTouchControls() {
  touchButtons.forEach((b) => { b.style.display = 'flex'; });
}

export function hideTouchControls() {
  touchButtons.forEach((b) => { b.style.display = 'none'; });
  if (attackButton) attackButton.style.display = 'none';
}

export function showAttackButton() {
  if (attackButton) attackButton.style.display = 'flex';
}

export function hideAttackButton() {
  if (attackButton) attackButton.style.display = 'none';
}
