import Phaser from 'phaser';
import {
  UI_BUTTON_BG_COLOR,
  UI_BUTTON_BG_HOVER_COLOR,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_HOVER_TEXT_COLOR,
  UI_BUTTON_PADDING_X,
  UI_BUTTON_PADDING_Y,
  UI_BUTTON_TEXT_COLOR,
  UI_FONT_FAMILY,
} from '../constants';
import { hexToCss } from './canvas-texture-utils';

const ORIGIN_CENTER = 0.5;

export interface UiButtonOptions {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly onClick: () => void;
}

/**
 * A clickable, keyboard-shortcut-friendly text button shared by every menu/
 * result/settings scene — one look, one hover/click behavior, defined once.
 */
export function createUiButton(
  scene: Phaser.Scene,
  options: UiButtonOptions,
): Phaser.GameObjects.Text {
  // Milestone 16.6 (D27): buttons are cream paper cards carrying dark ink
  // — no glyph shadow (dark-on-dark smear on a pale card); the card itself
  // IS the paper piece.
  const button = scene.add
    .text(options.x, options.y, options.label, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
      color: hexToCss(UI_BUTTON_TEXT_COLOR),
      backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
      padding: { x: UI_BUTTON_PADDING_X, y: UI_BUTTON_PADDING_Y },
    })
    .setOrigin(ORIGIN_CENTER)
    .setInteractive({ useHandCursor: true });

  button.on('pointerover', () => {
    button.setColor(hexToCss(UI_BUTTON_HOVER_TEXT_COLOR));
    button.setBackgroundColor(hexToCss(UI_BUTTON_BG_HOVER_COLOR));
  });
  button.on('pointerout', () => {
    button.setColor(hexToCss(UI_BUTTON_TEXT_COLOR));
    button.setBackgroundColor(hexToCss(UI_BUTTON_BG_COLOR));
  });
  button.on('pointerdown', options.onClick);

  return button;
}
