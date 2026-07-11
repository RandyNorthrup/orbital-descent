import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SETTINGS_OVERLAY_ALPHA,
  SETTINGS_OVERLAY_COLOR,
  UI_FONT_FAMILY,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  OUTLINE_COLOR,
  UI_TEXT_SHADOW_OFFSET_PX,
} from '../constants';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import {
  initialAudioSettingsState,
  loadAudioSettingsState,
  saveAudioSettingsState,
  toggleMuted,
  type AudioSettingsState,
} from '../persistence/audio-settings';
import { SCENE_KEY_SETTINGS } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const HEADING_Y_FRACTION = 0.35;
const SOUND_TOGGLE_Y_FRACTION = 0.48;
// Deliberately far from MenuScene's own SETTINGS button (~0.55-0.65 of
// GAME_HEIGHT) — this overlay is semi-transparent over whatever launched
// it, so a BACK button placed near that range visually collides with the
// paused menu's own button showing through underneath.
const BACK_BUTTON_Y_FRACTION = 0.8;

export interface SettingsSceneData {
  /** Which scene to resume when this overlay closes — the menu, or a
   * paused flight. Settings has no scene of its own to "belong" to, since
   * it's launched as a modal on top of whichever scene opened it. */
  readonly returnTo: string;
}

function soundToggleLabel(state: AudioSettingsState): string {
  return state.muted ? 'SOUND: OFF' : 'SOUND: ON';
}

/**
 * An overlay reused by both the main menu and a paused flight (see PLAN.md
 * Milestone 3) — a single SOUND ON/OFF toggle, persisted via
 * `persistence/audio-settings.ts` and read fresh by every `playSfxCue` call
 * site (Milestone 13 added real sound; this is the settings this scene's
 * own text used to promise once that happened).
 */
export class SettingsScene extends Phaser.Scene {
  private returnTo!: string;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private closeGuard!: ArmedKeyGuard;
  private audioSettings!: AudioSettingsState;
  private soundToggleButton!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEY_SETTINGS);
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data.returnTo;
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.closeGuard = new ArmedKeyGuard(this.keyEscape);

    const storage = getSafeLocalStorage();
    this.audioSettings =
      storage === null ? initialAudioSettingsState() : loadAudioSettingsState(storage);

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, SETTINGS_OVERLAY_COLOR, SETTINGS_OVERLAY_ALPHA)
      .setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * HEADING_Y_FRACTION, 'SETTINGS', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setOrigin(ORIGIN_CENTER)
      .setShadow(UI_TEXT_SHADOW_OFFSET_PX, UI_TEXT_SHADOW_OFFSET_PX, hexToCss(OUTLINE_COLOR), 0);

    this.soundToggleButton = createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT * SOUND_TOGGLE_Y_FRACTION,
      label: soundToggleLabel(this.audioSettings),
      onClick: () => {
        this.toggleSound();
      },
    });

    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT * BACK_BUTTON_Y_FRACTION,
      label: 'BACK',
      onClick: () => {
        this.close();
      },
    });
  }

  private toggleSound(): void {
    this.audioSettings = toggleMuted(this.audioSettings);
    this.soundToggleButton.setText(soundToggleLabel(this.audioSettings));
    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveAudioSettingsState(storage, this.audioSettings);
    }
  }

  override update(): void {
    if (this.closeGuard.consumeJustPressed()) {
      this.close();
    }
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(this.returnTo);
  }
}
