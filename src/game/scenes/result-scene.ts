import Phaser from 'phaser';
import {
  CRASHED_COLOR_TOP,
  GAME_HEIGHT,
  GAME_WIDTH,
  LANDED_COLOR_TOP,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_GAME, SCENE_KEY_MENU, SCENE_KEY_RESULT } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const HEADING_Y_FRACTION = 0.35;
const BUTTON_Y_FRACTION = 0.6;

export type FlightOutcome = 'landed' | 'crashed';

export interface ResultSceneData {
  readonly outcome: FlightOutcome;
}

/** Single source of truth for how an outcome is labeled — shared with
 * GameScene's brief freeze-frame text, so the two can't drift apart
 * (e.g. a copy change applied to only one of them). */
export function outcomeLabel(outcome: FlightOutcome): string {
  return outcome === 'landed' ? 'LANDED SAFELY' : 'CRASHED';
}

/** Single source of truth for the outcome's color, matching the D18
 * landed/crashed gradient palette — shared with GameScene's freeze-frame. */
export function outcomeColor(outcome: FlightOutcome): number {
  return outcome === 'landed' ? LANDED_COLOR_TOP : CRASHED_COLOR_TOP;
}

/**
 * The one unified result screen for every flight outcome (Milestone 3) —
 * replaces Milestone 2's placeholder in-scene "press R to try again" text.
 */
export class ResultScene extends Phaser.Scene {
  private outcome!: FlightOutcome;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private restartGuard!: ArmedKeyGuard;
  private menuGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_RESULT);
  }

  init(data: ResultSceneData): void {
    this.outcome = data.outcome;
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.restartGuard = new ArmedKeyGuard(this.keyR);
    this.menuGuard = new ArmedKeyGuard(this.keyEscape);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * HEADING_Y_FRACTION, outcomeLabel(this.outcome), {
        fontFamily: 'monospace',
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(outcomeColor(this.outcome)),
      })
      .setOrigin(ORIGIN_CENTER);

    const buttonY = GAME_HEIGHT * BUTTON_Y_FRACTION;
    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: buttonY,
      label: 'RESTART',
      onClick: () => {
        this.restart();
      },
    });
    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: buttonY + UI_BUTTON_ROW_HEIGHT_PX,
      label: 'MAIN MENU',
      onClick: () => {
        this.toMainMenu();
      },
    });
  }

  override update(): void {
    if (this.restartGuard.consumeJustPressed()) {
      this.restart();
    }
    if (this.menuGuard.consumeJustPressed()) {
      this.toMainMenu();
    }
  }

  private restart(): void {
    this.scene.start(SCENE_KEY_GAME);
  }

  private toMainMenu(): void {
    this.scene.start(SCENE_KEY_MENU);
  }
}
