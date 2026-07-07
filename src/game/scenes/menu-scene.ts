import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_GAME, SCENE_KEY_MENU, SCENE_KEY_SETTINGS } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';
import type { SettingsSceneData } from './settings-scene';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.3;
const START_BUTTON_Y_FRACTION = 0.55;

export class MenuScene extends Phaser.Scene {
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private startGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_MENU);
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEnter = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.startGuard = new ArmedKeyGuard(this.keyEnter);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'ORBITAL DESCENT', {
        fontFamily: 'monospace',
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setOrigin(ORIGIN_CENTER);

    const startY = GAME_HEIGHT * START_BUTTON_Y_FRACTION;
    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: startY,
      label: 'START',
      onClick: () => {
        this.startFlight();
      },
    });
    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: startY + UI_BUTTON_ROW_HEIGHT_PX,
      label: 'SETTINGS',
      onClick: () => {
        this.openSettings();
      },
    });
  }

  override update(): void {
    if (this.startGuard.consumeJustPressed()) {
      this.startFlight();
    }
  }

  private startFlight(): void {
    this.scene.start(SCENE_KEY_GAME);
  }

  private openSettings(): void {
    const data: SettingsSceneData = { returnTo: SCENE_KEY_MENU };
    this.scene.run(SCENE_KEY_SETTINGS, data);
    this.scene.pause();
  }
}
