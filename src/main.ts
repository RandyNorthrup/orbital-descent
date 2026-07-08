import Phaser from 'phaser';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { BootScene } from './game/scenes/boot-scene';
import { MenuScene } from './game/scenes/menu-scene';
import { GameScene } from './game/scenes/game-scene';
import { ResultScene } from './game/scenes/result-scene';
import { SettingsScene } from './game/scenes/settings-scene';
import { WorldMapScene } from './game/scenes/world-map-scene';
import { ShipSelectScene } from './game/scenes/ship-select-scene';
import { LoadoutScene } from './game/scenes/loadout-scene';
import { StoreScene } from './game/scenes/store-scene';
import './style.css';

const APP_PARENT_ELEMENT_ID = 'app';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: APP_PARENT_ELEMENT_ID,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    ResultScene,
    SettingsScene,
    WorldMapScene,
    ShipSelectScene,
    LoadoutScene,
    StoreScene,
  ],
};

const game = new Phaser.Game(config);

// See global.d.ts for the Window.__ORBITAL_DESCENT_GAME__ ambient declaration.
window.__ORBITAL_DESCENT_GAME__ = game;
