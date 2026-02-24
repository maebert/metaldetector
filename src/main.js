import { Application, Assets, Container, Text } from 'pixi.js';
import { CONFIG } from './config.js';
import { initInput, isPressed, isTap, isLeft, isRight, isJump, showTouchControls, hideTouchControls } from './input.js';
import { Player } from './entities/Player.js';
import { Policeman } from './entities/Policeman.js';
import { generateLevel } from './level/LevelGenerator.js';
import { applyGravity, resolveCollisions, checkOverlap } from './systems/Physics.js';
import { initPlatformTexture } from './level/Platform.js';
import { Camera } from './systems/Camera.js';
import { HUD } from './ui/HUD.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { MenuScreen } from './ui/MenuScreen.js';
import { extractFrames } from './SpriteAnimation.js';

import { Graphics } from 'pixi.js';

const State = { MENU: 0, INTRO: 1, PLAYING: 2, ARREST: 3, CELEBRATION: 4, WIN: 5, LOSE: 6 };
const ARREST_DURATION = 90;
const ARREST_ZOOM = 5;
const CELEBRATION_DURATION = 90;
const CELEBRATION_ZOOM = 5;
const INTRO_REVEAL = 30;    // 0.5s: black → aperture open
const INTRO_HOLD = 30;      // 0.5s: hold at aperture
const INTRO_OPEN = 30;      // 0.5s: open all the way + zoom out
const INTRO_ZOOM = 8;

let app;
let worldContainer;
let player;
let policeman;
let platforms;
let metalPieces;
let camera;
let hud;
let gameOverScreen;
let menuScreen;
let state;
let collected;
let playerAnimations;
let policeAnimations;
let metalAnimation;
let arrestTimer;
let celebrationTimer;
let introTimer;
let vignette;
let playerHasMoved;

async function init() {
  app = new Application();
  await app.init({
    resizeTo: window,
    backgroundColor: 0x87ceeb,
    antialias: false,
  });
  document.body.appendChild(app.canvas);

  // Scale stage to fit window while preserving 960x540 logical resolution
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / CONFIG.SCREEN_WIDTH, h / CONFIG.SCREEN_HEIGHT);
    app.stage.scale.set(scale);
    app.stage.position.set(
      (w - CONFIG.SCREEN_WIDTH * scale) / 2,
      (h - CONFIG.SCREEN_HEIGHT * scale) / 2
    );
  }
  window.addEventListener('resize', onResize);
  onResize();

  initInput();

  // Preload sprite sheets
  const [standingTex, runningTex, jumpingTex, winningTex, policeRunTex, policeJumpTex, policeArrestTex, metalTex, platformTex, iconTex, titleTex] = await Promise.all([
    Assets.load('/assets/hero-standing.png'),
    Assets.load('/assets/hero-running.png'),
    Assets.load('/assets/hero-jumping.png'),
    Assets.load('/assets/hero-winning.png'),
    Assets.load('/assets/police-running.png'),
    Assets.load('/assets/police-jumping.png'),
    Assets.load('/assets/police-arrest.png'),
    Assets.load('/assets/metal-spinning.png'),
    Assets.load('/assets/platform.png'),
    Assets.load('/assets/icon.png'),
    Assets.load('/assets/title.png'),
  ]);
  document.getElementById('loading')?.remove();
  initPlatformTexture(platformTex);
  playerAnimations = {
    standing: extractFrames(standingTex, 6, 6, 36),
    running: extractFrames(runningTex, 6, 6, 36),
    jumping: extractFrames(jumpingTex, 5, 5, 25),
    winning: extractFrames(winningTex, 6, 6, 36),
  };
  policeAnimations = {
    running: extractFrames(policeRunTex, 6, 6, 36),
    jumping: extractFrames(policeJumpTex, 4, 4, 16),
    arrest: extractFrames(policeArrestTex, 6, 6, 36),
  };
  metalAnimation = extractFrames(metalTex, 6, 6, 36);

  // Persistent UI elements
  hud = new HUD();
  gameOverScreen = new GameOverScreen();
  menuScreen = new MenuScreen(iconTex, titleTex);

  // FPS counter (toggle with Y key)
  const fpsText = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 16, fill: 0x00ff00 },
  });
  fpsText.anchor.set(1, 0);
  fpsText.position.set(CONFIG.SCREEN_WIDTH - 8, 8);
  fpsText.visible = false;
  let fpsVisible = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyY') {
      fpsVisible = !fpsVisible;
      fpsText.visible = fpsVisible;
    }
  });

  showMenu();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    if (fpsVisible) {
      fpsText.text = `${Math.round(ticker.FPS)} fps`;
      // Keep FPS on top
      const stage = app.stage;
      if (fpsText.parent !== stage) stage.addChild(fpsText);
      else stage.setChildIndex(fpsText, stage.children.length - 1);
    }

    switch (state) {
      case State.MENU:
        updateMenu();
        break;
      case State.INTRO:
        updateIntro(dt);
        break;
      case State.PLAYING:
        updatePlaying(dt);
        break;
      case State.ARREST:
        updateArrest(dt);
        break;
      case State.CELEBRATION:
        updateCelebration(dt);
        break;
      case State.WIN:
      case State.LOSE:
        updateGameOver();
        break;
    }
  });
}

function showMenu() {
  state = State.MENU;
  hideTouchControls();

  // Clear stage
  app.stage.removeChildren();

  app.stage.addChild(menuScreen.container);
}

function startGame() {
  state = State.INTRO;
  collected = 0;
  introTimer = 0;
  playerHasMoved = false;

  // Clear stage
  app.stage.removeChildren();

  // Create world container
  worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Generate level
  const level = generateLevel(worldContainer, metalAnimation);
  platforms = level.platforms;
  metalPieces = level.metalPieces;

  // Create player at start position
  player = new Player(level.startPosition.x, level.startPosition.y, playerAnimations);
  worldContainer.addChild(player.graphics);

  // Create policeman at same start position (hidden until player moves)
  policeman = new Policeman(level.startPosition.x, level.startPosition.y, policeAnimations);
  worldContainer.addChild(policeman.graphics);

  // Systems
  camera = new Camera();
  camera.zoom = INTRO_ZOOM;
  camera.targetZoom = INTRO_ZOOM;
  camera.snapTo(player);

  // Vignette overlay: dark screen with a circular cutout
  vignette = new Graphics();
  app.stage.addChild(vignette);
  drawVignette(0);

  // UI (on app.stage, not worldContainer)
  app.stage.addChild(hud.text);
  hud.update(0, metalPieces.length);

  gameOverScreen.hide();
  app.stage.addChild(gameOverScreen.container);
}

function drawVignette(radius) {
  // Center on the hero's head in screen coordinates
  const cx = CONFIG.SCREEN_WIDTH * CONFIG.CAMERA_OFFSET_X + CONFIG.PLAYER_WIDTH / 2 + 120;
  const cy = CONFIG.SCREEN_HEIGHT * 0.5 - CONFIG.PLAYER_HEIGHT * 0.3 + 60;
  const PAD = 2000;

  vignette.clear()
    .rect(-PAD, -PAD, CONFIG.SCREEN_WIDTH + PAD * 2, CONFIG.SCREEN_HEIGHT + PAD * 2)
    .fill(0x000000)
    .circle(cx, cy, radius)
    .cut();
}

function updateMenu() {
  if (isPressed('Enter') || isTap()) {
    startGame();
  }
}

function updateIntro(dt) {
  introTimer += dt;

  camera.update(player, worldContainer, dt);

  const t1 = INTRO_REVEAL;
  const t2 = t1 + INTRO_HOLD;
  const t3 = t2 + INTRO_OPEN;

  if (introTimer < t1) {
    // Phase 1: open from black to aperture (0 → 80)
    const p = introTimer / t1;
    const eased = p * p * (3 - 2 * p);
    drawVignette(eased * 80);
  } else if (introTimer < t2) {
    // Phase 2: hold at aperture
    drawVignette(80);
  } else if (introTimer < t3) {
    // Phase 3: open all the way + zoom out
    camera.targetZoom = CONFIG.CAMERA_ZOOM;
    camera.zoomLerp = 0.08;

    const p = (introTimer - t2) / INTRO_OPEN;
    const eased = p * p * (3 - 2 * p);
    const maxRadius = Math.max(CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
    drawVignette(80 + eased * maxRadius);
  } else {
    // Intro complete
    state = State.PLAYING;
    showTouchControls();
    if (vignette.parent) vignette.parent.removeChild(vignette);
    camera.zoomLerp = CONFIG.CAMERA_LERP;
  }
}

function updatePlaying(dt) {
  // Player movement + physics
  player.update(dt);
  applyGravity(player, dt);
  resolveCollisions(player, platforms);
  player.graphics.position.set(player.x, player.y);

  // Sink platform the player is standing on, carrying the player with it
  if (player.groundedPlatform) {
    const prevY = player.groundedPlatform.y;
    player.groundedPlatform.sink(dt);
    player.y += player.groundedPlatform.y - prevY;
  }

  // Detect first player movement to activate policeman
  if (!playerHasMoved && (isLeft() || isRight() || isJump())) {
    playerHasMoved = true;
    policeman.activate();
  }

  // Policeman AI (only runs after activation)
  policeman.update(dt, platforms, player);

  // Carry policeman with sinking platform
  if (policeman.groundedPlatform) {
    const prevY = policeman.groundedPlatform.y;
    policeman.groundedPlatform.sink(dt);
    policeman.y += policeman.groundedPlatform.y - prevY;
  }

  // Metal piece collection
  for (const metal of metalPieces) {
    if (!metal.collected && checkOverlap(player, metal)) {
      metal.collected = true;
      worldContainer.removeChild(metal.graphics);
      collected++;
      hud.update(collected, metalPieces.length);

      if (collected >= metalPieces.length) {
        startCelebration();
        return;
      }
    }
    metal.update(dt);
  }

  // Catch detection
  if (policeman.active && policeman.distanceTo(player) < CONFIG.CATCH_DISTANCE) {
    startArrest();
    return;
  }

  // Death pit
  if (player.y > CONFIG.WORLD_HEIGHT + 100) {
    endGame(State.LOSE);
    return;
  }

  // Camera
  camera.update(player, worldContainer, dt);
}

function startCelebration() {
  state = State.CELEBRATION;
  celebrationTimer = 0;
  player.velocityX = 0;
}

function updateCelebration(dt) {
  if (!player.isGrounded) {
    // Keep falling until we land
    applyGravity(player, dt);
    resolveCollisions(player, platforms);
    player.graphics.position.set(player.x, player.y);
    camera.update(player, worldContainer, dt);
    return;
  }

  // Start celebration animation + zoom on first grounded frame
  if (celebrationTimer === 0) {
    player.playCelebration();
    camera.zoomTo(CELEBRATION_ZOOM, { x: player.x, y: player.y }, 0.03);
  }

  celebrationTimer += dt;

  player.updateCelebration(dt);
  player.graphics.position.set(player.x, player.y);

  camera.update(player, worldContainer, dt);

  if (celebrationTimer >= CELEBRATION_DURATION) {
    endGame(State.WIN);
  }
}

function startArrest() {
  state = State.ARREST;
  arrestTimer = 0;
  player.velocityX = 0;
  policeman.velocityX = 0;
}

function updateArrest(dt) {
  // Wait for both to land
  if (!player.isGrounded || !policeman.isGrounded) {
    if (!player.isGrounded) {
      applyGravity(player, dt);
      resolveCollisions(player, platforms);
      player.graphics.position.set(player.x, player.y);
    }
    if (!policeman.isGrounded) {
      applyGravity(policeman, dt);
      resolveCollisions(policeman, platforms);
      policeman.container.position.set(policeman.x, policeman.y);
    }
    camera.update(player, worldContainer, dt);
    return;
  }

  // Start arrest animation + zoom on first grounded frame
  if (arrestTimer === 0) {
    policeman.playArrest();
    const midX = (player.x + policeman.x) / 2;
    const midY = (player.y + policeman.y) / 2;
    camera.zoomTo(ARREST_ZOOM, { x: midX, y: midY }, 0.03);
  }

  arrestTimer += dt;

  policeman.updateArrest(dt);

  camera.update(player, worldContainer, dt);

  if (arrestTimer >= ARREST_DURATION) {
    endGame(State.LOSE);
  }
}

function endGame(newState) {
  state = newState;
  hideTouchControls();
  if (newState === State.WIN) {
    gameOverScreen.show('ALL METAL COLLECTED!');
  } else {
    gameOverScreen.show('CAUGHT BY THE POLICE!');
  }
}

function updateGameOver() {
  if (isPressed('KeyR') || isTap()) {
    startGame();
  }
}

init();
