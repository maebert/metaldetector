import { Application, Assets, Container } from 'pixi.js';
import { CONFIG } from './config.js';
import { initInput, isPressed } from './input.js';
import { Player } from './entities/Player.js';
import { Policeman } from './entities/Policeman.js';
import { generateLevel } from './level/LevelGenerator.js';
import { applyGravity, resolveCollisions, checkOverlap } from './systems/Physics.js';
import { Camera } from './systems/Camera.js';
import { BreadcrumbTrail } from './systems/BreadcrumbTrail.js';
import { HUD } from './ui/HUD.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { MenuScreen } from './ui/MenuScreen.js';
import { extractFrames } from './SpriteAnimation.js';

const State = { MENU: 0, PLAYING: 1, WIN: 2, LOSE: 3 };

let app;
let worldContainer;
let player;
let policeman;
let platforms;
let metalPieces;
let camera;
let trail;
let hud;
let gameOverScreen;
let menuScreen;
let state;
let collected;
let playerAnimations;
let policeAnimations;
let metalAnimation;

async function init() {
  app = new Application();
  await app.init({
    width: CONFIG.SCREEN_WIDTH,
    height: CONFIG.SCREEN_HEIGHT,
    backgroundColor: 0x87ceeb,
    antialias: false,
  });
  document.body.appendChild(app.canvas);

  initInput();

  // Preload sprite sheets
  const [standingTex, runningTex, jumpingTex, policeRunTex, policeJumpTex, metalTex, iconTex, titleTex] = await Promise.all([
    Assets.load('/assets/hero-standing.png'),
    Assets.load('/assets/hero-running.png'),
    Assets.load('/assets/hero-jumping.png'),
    Assets.load('/assets/police-running.png'),
    Assets.load('/assets/police-jumping.png'),
    Assets.load('/assets/metal-spinning.png'),
    Assets.load('/assets/icon.png'),
    Assets.load('/assets/title.png'),
  ]);
  playerAnimations = {
    standing: extractFrames(standingTex, 6, 6, 36),
    running: extractFrames(runningTex, 6, 6, 36),
    jumping: extractFrames(jumpingTex, 4, 4, 16),
  };
  policeAnimations = {
    running: extractFrames(policeRunTex, 6, 6, 36),
    jumping: extractFrames(policeJumpTex, 4, 4, 16),
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
      case State.WIN:
      case State.LOSE:
        updateGameOver();
        break;
    }
  });
}

function showMenu() {
  state = State.MENU;

  // Clear stage
  app.stage.removeChildren();

  app.stage.addChild(menuScreen.container);
}

function startGame() {
  state = State.PLAYING;
  collected = 0;

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
  trail = new BreadcrumbTrail();

  // UI (on app.stage, not worldContainer)
  app.stage.addChild(hud.text);
  hud.update(0, metalPieces.length);

  gameOverScreen.hide();
  app.stage.addChild(gameOverScreen.container);
}

function updateMenu() {
  if (isPressed('Enter')) {
    startGame();
  }
}

function updatePlaying(dt) {
  // Player movement + physics
  player.update(dt);
  applyGravity(player, dt);
  resolveCollisions(player, platforms);
  player.graphics.position.set(player.x, player.y);

  // Record breadcrumb trail
  trail.record(player);

  // Policeman follows trail
  policeman.update(dt, trail);

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
    endGame(State.LOSE);
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

function endGame(newState) {
  state = newState;
  if (newState === State.WIN) {
    gameOverScreen.show('ALL METAL COLLECTED!');
  } else {
    gameOverScreen.show('CAUGHT BY THE POLICE!');
  }
}

function updateGameOver() {
  if (isPressed('KeyR')) {
    startGame();
  }
}

init();
