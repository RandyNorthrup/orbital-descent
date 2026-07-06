import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { BootScene } from './game/scenes/boot-scene';
import { GameScene } from './game/scenes/game-scene';
import './style.css';

const APP_PARENT_ELEMENT_ID = 'app';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: APP_PARENT_ELEMENT_ID,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);

// See global.d.ts for the Window.__LUNAR_LANDER_GAME__ ambient declaration.
window.__LUNAR_LANDER_GAME__ = game;
