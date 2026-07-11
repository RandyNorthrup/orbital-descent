import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BUTTON_BG_COLOR,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_PADDING_X,
  UI_BUTTON_PADDING_Y,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_FONT_FAMILY,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  OUTLINE_COLOR,
  UI_TEXT_SHADOW_OFFSET_PX,
} from '../constants';
import { loadHighScores } from '../persistence/high-scores';
import { initialCurrencyState, loadCurrencyState } from '../persistence/currency-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { BODIES } from '../planets/bodies';
import { buildBackground } from '../rendering/background';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import {
  SCENE_KEY_GAME,
  SCENE_KEY_LOADOUT,
  SCENE_KEY_MENU,
  SCENE_KEY_SETTINGS,
  SCENE_KEY_SHIP_SELECT,
  SCENE_KEY_STORE,
  SCENE_KEY_WORLD_MAP,
} from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';
import type { SettingsSceneData } from './settings-scene';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.3;
/** Milestone 9's own LOADOUT button pushed a 6th entry onto what was a
 * 5-button stack -- fitting it under GAME_HEIGHT (640) required freeing a
 * full row of vertical space, done by combining the old two-line BEST/
 * BALANCE display into this one line (`"BEST: <score> · BALANCE: <n>
 * CREDITS"`, or just the balance half when no score exists yet) rather than
 * showing them separately. Sits at the same slot the old
 * `BEST_SCORE_Y_FRACTION` occupied (`640 * 0.39` = 249.6px), clear of the
 * title's own real rendered height above it (`640 * 0.3` = 192px) by the
 * same ~57.6px magnitude Milestone 8's own doc comment already verified
 * safe for a title-to-first-content-line gap. */
const STAT_LINE_Y_FRACTION = 0.39;
/** Nudged up from Milestone 8's 0.56 (5-button stack) to 0.46, reclaiming
 * the vertical space the BEST/BALANCE merge above freed up, to fit this
 * milestone's 6th (LOADOUT) button. Verified against a real screenshot (see
 * PLAN.md Milestone 9 notes): with 6 buttons at UI_BUTTON_ROW_HEIGHT_PX
 * (62px) apart, the last button (SETTINGS, index 5 of 6) centers at
 * 640 * 0.46 + 5 * 62 = 604.4px -- well inside GAME_HEIGHT (640), landing
 * with the same kind of comfortable hand-verified margin ShipSelectScene's
 * own doc comments describe. */
const START_BUTTON_Y_FRACTION = 0.46;

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

    // Title diorama (Milestone 14): the home world's own papercraft sky
    // behind the menu, replacing the flat page-background color — the
    // first thing a player ever sees now shows the game's actual art.
    buildBackground(this, BODIES[0]);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'ORBITAL DESCENT', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setOrigin(ORIGIN_CENTER)
      .setShadow(UI_TEXT_SHADOW_OFFSET_PX, UI_TEXT_SHADOW_OFFSET_PX, hexToCss(OUTLINE_COLOR), 0);

    // getSafeLocalStorage() returns null when storage access itself is
    // blocked (sandboxed iframe, privacy setting), in which case the menu
    // degrades to a fresh save's own defaults (no best score, 0 balance),
    // same as a first-time player, rather than throwing and aborting the
    // rest of create() (the button stack below).
    const storage = getSafeLocalStorage();
    const bestScore = storage === null ? undefined : loadHighScores(storage)[0]?.score;
    const balance =
      storage === null ? initialCurrencyState().balance : loadCurrencyState(storage).balance;

    // One combined line (Milestone 9 -- see STAT_LINE_Y_FRACTION's own doc
    // comment for why BEST and BALANCE were merged): BEST is only ever
    // included once a real score exists (Milestone 4/Decision D8) -- a
    // first-time player with an empty leaderboard sees a clean
    // "BALANCE: 0 CREDITS", not a confusing "BEST: undefined". BALANCE
    // itself always renders (Milestone 8/Decision D15) -- starting at 0
    // credits is a normal, self-explanatory economy-game state.
    const statLine =
      bestScore === undefined
        ? `BALANCE: ${balance.toString()} CREDITS`
        : `BEST: ${bestScore.toString()} · BALANCE: ${balance.toString()} CREDITS`;
    // Same dark chip the buttons use — over the Milestone 14 diorama
    // backdrop, bare muted text lands on the mid-tone ridge band and
    // becomes illegible without a backing (verified against a real
    // screenshot).
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * STAT_LINE_Y_FRACTION, statLine, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_MUTED_TEXT_COLOR),
        backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
        padding: { x: UI_BUTTON_PADDING_X, y: UI_BUTTON_PADDING_Y },
      })
      .setOrigin(ORIGIN_CENTER);

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
        label: 'LOADOUT',
        onClick: (): void => {
          this.openLoadout();
        },
      },
      {
        label: 'STORE',
        onClick: (): void => {
          this.openStore();
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
    // An explicit empty object, not an omitted argument: Phaser's own
    // `Systems.start(data)` only overwrites `settings.data` when `data` is
    // truthy ("if (data) { settings.data = data; }") -- omitting it here
    // would silently leave GameScene's *previous* launch data in place
    // (e.g. a curated `base`/`mission` from an earlier real mission
    // flight), so a later "generic free flight" START would silently
    // re-fly that same base/mission forever instead, contradicting this
    // button's own certified Milestone 6 behavior. Confirmed directly
    // against the installed Phaser 4.2.0 source
    // (node_modules/phaser/src/scene/Systems.js).
    this.scene.start(SCENE_KEY_GAME, {});
  }

  private openWorldMap(): void {
    this.scene.start(SCENE_KEY_WORLD_MAP);
  }

  private openShipSelect(): void {
    this.scene.start(SCENE_KEY_SHIP_SELECT);
  }

  private openLoadout(): void {
    this.scene.start(SCENE_KEY_LOADOUT);
  }

  private openStore(): void {
    this.scene.start(SCENE_KEY_STORE);
  }

  private openSettings(): void {
    const data: SettingsSceneData = { returnTo: SCENE_KEY_MENU };
    this.scene.run(SCENE_KEY_SETTINGS, data);
    this.scene.pause();
  }
}
