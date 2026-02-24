import { Application, Assets, Container } from 'pixi.js';
import { CONFIG } from './config.js';
import { initInput, isPressed, isTap, showTouchControls, hideTouchControls } from './input.js';
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

const State = { MENU: 0, PLAYING: 1, ARREST: 2, WIN: 3, LOSE: 4 };
const ARREST_DURATION = 90; // 1.5 seconds at 60fps
const ARREST_ZOOM = 5;

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
  const [standingTex, runningTex, jumpingTex, policeRunTex, policeJumpTex, policeArrestTex, metalTex, platformTex, iconTex, titleTex] = await Promise.all([
    Assets.load('/assets/hero-standing.png'),
    Assets.load('/assets/hero-running.png'),
    Assets.load('/assets/hero-jumping.png'),
    Assets.load('/assets/police-running.png'),
    Assets.load('/assets/police-jumping.png'),
    Assets.load('/assets/police-arrest.png'),
    Assets.load('/assets/metal-spinning.png'),
    Assets.load('/assets/platform.png'),
    Assets.load('/assets/icon.png'),
    Assets.load('/assets/title.png'),
  ]);
  initPlatformTexture(platformTex);
  playerAnimations = {
    standing: extractFrames(standingTex, 6, 6, 36),
    running: extractFrames(runningTex, 6, 6, 36),
    jumping: extractFrames(jumpingTex, 4, 4, 16),
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

  showMenu();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    switch (state) {
      case State.MENU:
        updateMenu();
        break;
      case State.PLAYING:
        updatePlaying(dt);
        break;
      case State.ARREST:
        updateArrest(dt);
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
  state = State.PLAYING;
  collected = 0;
  showTouchControls();

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

  // Create policeman at same start position
  policeman = new Policeman(level.startPosition.x, level.startPosition.y, policeAnimations);
  worldContainer.addChild(policeman.graphics);

  // Systems
  camera = new Camera();

  // UI (on app.stage, not worldContainer)
  app.stage.addChild(hud.text);
  hud.update(0, metalPieces.length);

  gameOverScreen.hide();
  app.stage.addChild(gameOverScreen.container);
}

function updateMenu() {
  if (isPressed('Enter') || isTap()) {
    startGame();
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

  // Policeman AI
  policeman.update(dt, platforms, player);

  // Metal piece collection
  for (const metal of metalPieces) {
    if (!metal.collected && checkOverlap(player, metal)) {
      metal.collected = true;
      worldContainer.removeChild(metal.graphics);
      collected++;
      hud.update(collected, metalPieces.length);

      if (collected >= metalPieces.length) {
        endGame(State.WIN);
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
  camera.update(player, worldContainer);
}

function startArrest() {
  state = State.ARREST;
  arrestTimer = 0;

  // Switch policeman to arrest animation
  policeman.playArrest();

  // Zoom camera toward midpoint between player and policeman
  const midX = (player.x + policeman.x) / 2;
  const midY = (player.y + policeman.y) / 2;
  camera.zoomTo(ARREST_ZOOM, { x: midX, y: midY }, 0.03);
}

function updateArrest(dt) {
  arrestTimer += dt;

  // Keep animating the policeman arrest
  policeman.updateArrest(dt);

  // Keep updating camera (smooth zoom-in)
  camera.update(player, worldContainer);

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
