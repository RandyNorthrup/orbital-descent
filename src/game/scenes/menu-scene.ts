import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import { loadHighScores } from '../persistence/high-scores';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import {
  SCENE_KEY_GAME,
  SCENE_KEY_MENU,
  SCENE_KEY_SETTINGS,
  SCENE_KEY_SHIP_SELECT,
  SCENE_KEY_WORLD_MAP,
} from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';
import type { SettingsSceneData } from './settings-scene';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.3;
const BEST_SCORE_Y_FRACTION = 0.42;
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

    // Only shown once a real score exists (Milestone 4/Decision D8) — a
    // first-time player with an empty leaderboard sees a clean menu, not a
    // confusing "BEST: 0". getSafeLocalStorage() returns null when storage
    // access itself is blocked (sandboxed iframe, privacy setting), in which
    // case the menu degrades to showing no BEST line at all, same as a
    // first-time player, rather than throwing and aborting the rest of
    // create() (the START/SETTINGS buttons below).
    const storage = getSafeLocalStorage();
    const bestScore = storage === null ? undefined : loadHighScores(storage)[0]?.score;
    if (bestScore !== undefined) {
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * BEST_SCORE_Y_FRACTION,
          `BEST: ${bestScore.toString()}`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER);
    }

    const startY = GAME_HEIGHT * START_BUTTON_Y_FRACTION;
    const buttons: readonly { readonly label: string; readonly onClick: () => void }[] = [
      {
        label: 'START',
        onClick: (): void => {
          this.startFlight();
        },
      },
      {
        label: 'WORLD MAP',
        onClick: (): void => {
          this.openWorldMap();
        },
      },
      {
        label: 'SHIP SELECT',
        onClick: (): void => {
          this.openShipSelect();
        },
      },
      {
        label: 'SETTINGS',
        onClick: (): void => {
          this.openSettings();
        },
      },
    ];
    buttons.forEach((button, index) => {
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: startY + index * UI_BUTTON_ROW_HEIGHT_PX,
        label: button.label,
        onClick: button.onClick,
      });
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

  private openWorldMap(): void {
    this.scene.start(SCENE_KEY_WORLD_MAP);
  }

  private openShipSelect(): void {
    this.scene.start(SCENE_KEY_SHIP_SELECT);
  }

  private openSettings(): void {
    const data: SettingsSceneData = { returnTo: SCENE_KEY_MENU };
    this.scene.run(SCENE_KEY_SETTINGS, data);
    this.scene.pause();
  }
}
