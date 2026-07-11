import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_FONT_FAMILY,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  OUTLINE_COLOR,
  UI_TEXT_SHADOW_OFFSET_PX,
} from '../constants';
import type { ShipAcquisition, ShipClass } from '../ships/ship';
import { SHIPS } from '../ships/ships';
import { BASES } from '../bases/bases';
import {
  initialBaseProgress,
  loadBaseProgress,
  type BaseProgressMap,
} from '../persistence/base-progress';
import {
  initialShipProgress,
  isShipAvailable,
  loadShipProgress,
  saveShipProgress,
  selectShip,
  type ShipProgressState,
} from '../persistence/ship-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createShipVisual } from '../rendering/ship-visual';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_MENU, SCENE_KEY_SHIP_SELECT } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.07;
const LIST_START_Y_FRACTION = 0.16;

/** One list entry's worth of vertical space for an already-available ship
 * (no reason line needed) — matches every other scene's stacked-button
 * rhythm (see `UI_BUTTON_ROW_HEIGHT_PX`'s own doc comment). */
const ROW_HEIGHT_PX = UI_BUTTON_ROW_HEIGHT_PX;

/** Extra vertical room below a locked ship's own name for its "why locked"
 * reason line, shown separately underneath rather than appended to the
 * name itself -- a locked entry is plain text, not a clickable button, so
 * (unlike `WorldMapScene`'s difficulty badge) there's no e2e click-target
 * stability concern with putting a price/condition in that text directly;
 * it's still a separate line purely for legibility, matching the badge
 * layout's visual rhythm. */
const REASON_LINE_OFFSET_PX = 24;
const LOCKED_ROW_HEIGHT_PX = ROW_HEIGHT_PX + REASON_LINE_OFFSET_PX;

/** Gap between the last roster row and the BACK button -- computed off the
 * actual accumulated list height (row heights vary: available ships need
 * one row, locked ones need two) rather than a fixed fraction, so it can't
 * collide with the list once the roster grows past this milestone's 7
 * ships. */
const BACK_BUTTON_GAP_PX = 24;

/** How far left of center each row's own name/button sits, to make room for
 * `STAT_COLUMN_OFFSET_PX`'s stat tag beside it rather than below it. A
 * stat tag *below* each row (`WorldMapScene`'s difficulty-badge convention)
 * would need one extra text line per row; this screen already spends its
 * entire vertical budget on a flat, unpaginated 7-row list (`GAME_HEIGHT`
 * 640, `LIST_START_Y_FRACTION` + 5 `ROW_HEIGHT_PX` + 2 `LOCKED_ROW_HEIGHT_PX`
 * rows already lands within ~30px of the bottom edge before `BACK`), so a
 * sideways stat tag is the only placement that doesn't grow the list past
 * the canvas. Checked against the widest current row content (`"COURIER
 * (SELECTED)"` at `UI_BUTTON_FONT_SIZE_PX`, ~427px right edge) with a
 * comfortable margin below `STAT_COLUMN_OFFSET_PX`'s own start -- same
 * "no automated collision detection, hand-verified margin" convention as
 * `BACK_BUTTON_GAP_PX` above. */
const NAME_COLUMN_OFFSET_PX = 190;

/** Where each row's papercraft ship preview (Milestone 14) sits — left of
 * the name column with real clearance: the widest name text ("COURIER
 * (SELECTED)", centered at x=290) reaches to ~x=175, and a preview's art
 * extent is ±18px around this center (silhouette.test.ts pins that bound),
 * so 120 keeps ~35px of daylight between icon and text. */
const SHIP_PREVIEW_X_PX = 120;

/** A locked ship's preview renders dimmed to match its muted text — still
 * visibly its own hull family (that's part of what a price is buying), but
 * clearly not flyable yet. */
const LOCKED_PREVIEW_ALPHA = 0.45;

/** Where each row's stat tag starts, right of center -- left-anchored (not
 * centered) so its start position doesn't shift with the tag's own text
 * length. Checked against the longest possible tag (an `'unlock'`/
 * `'purchase'` ship's full "THR 64 · FUEL 90 · HDL 210 (INTERCEPTOR)"-shaped
 * string, ~384px) landing with real margin before the canvas's right edge
 * (`GAME_WIDTH` 960). See `NAME_COLUMN_OFFSET_PX`'s doc comment for why this
 * sits beside the row instead of below it. */
const STAT_COLUMN_OFFSET_PX = 20;

/** "PRICE: 750 CREDITS" / "UNLOCK: ESTABLISH FROSTGATE" -- the reason a
 * locked ship isn't selectable yet. Only ever called for a `'purchase'` or
 * `'unlock'` acquisition (the roster's `'starter'` ships are always
 * available, so a `'starter'` ship's entry never reaches this function) --
 * the fallback empty string exists only so this stays a total function.
 */
function lockedReasonText(acquisition: ShipAcquisition): string {
  if (acquisition.type === 'purchase') {
    return `PRICE: ${acquisition.price.toString()} CREDITS`;
  }
  if (acquisition.type === 'unlock') {
    return `UNLOCK: ${acquisition.description.toUpperCase()}`;
  }
  return '';
}

/** "THR 46 · FUEL 100 · HDL 150 (BALANCED)" -- the only stat information
 * shown anywhere on this screen; mirrors `WorldMapScene`'s
 * `formatDifficultyBadge` convention (abbreviated numbers, archetype/
 * dominant descriptor last in parens) so the two list screens read as the
 * same system. Shown for every row, available or locked, since a locked
 * ship's stats are exactly what a player is deciding whether its price/
 * unlock condition is worth. */
function shipStatTag(ship: ShipClass): string {
  return (
    `THR ${ship.baseThrustAccel.toString()} · FUEL ${ship.fuelCapacity.toString()} · ` +
    `HDL ${ship.handling.toString()} (${ship.archetype.toUpperCase()})`
  );
}

/**
 * The ship-select / "hangar" screen (Milestone 7, Decision D13): every
 * registered ship is listed, available ones are selectable and show which
 * is currently equipped, locked ones are visible with why they're locked
 * (price or unlock condition) -- reading availability from Milestone 7's
 * `persistence/ship-progress.ts` (purchases/selection) composed with
 * Milestone 6's `persistence/base-progress.ts` (unlock conditions tied to
 * establishing a base). Selecting a ship is a persistent loadout choice,
 * not a launch action -- `GameScene` itself reads the persisted selection
 * on every flight, so this scene never needs to start a flight directly.
 */
export class ShipSelectScene extends Phaser.Scene {
  private shipProgress!: ShipProgressState;
  private baseProgress!: BaseProgressMap;
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_SHIP_SELECT);
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backGuard = new ArmedKeyGuard(this.keyEscape);

    // getSafeLocalStorage() returns null when storage access itself is
    // blocked (sandboxed iframe, privacy setting) -- the screen still shows
    // every ship's own authored starting state in that case (a fresh
    // save's defaults), same as a first-time player, rather than throwing.
    // A selection made while storage is blocked still updates this scene's
    // own in-memory state (and the ship GameScene actually flies, since it
    // degrades identically), it just can't survive a reload.
    const storage = getSafeLocalStorage();
    this.shipProgress =
      storage === null ? initialShipProgress(SHIPS) : loadShipProgress(storage, SHIPS);
    this.baseProgress =
      storage === null ? initialBaseProgress(BASES) : loadBaseProgress(storage, BASES);
    this.renderView();
  }

  override update(): void {
    if (this.backGuard.consumeJustPressed()) {
      this.scene.start(SCENE_KEY_MENU);
    }
  }

  /** Tracks a just-created display object so the next `renderView()` call
   * can destroy exactly this screen's objects before rebuilding it --
   * Phaser scenes don't recycle their own display list, so re-rendering
   * after a selection (to move the "(SELECTED)" marker) needs an explicit
   * teardown, same as `WorldMapScene`'s identical `track()`. */
  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.viewObjects.push(object);
    return object;
  }

  private renderView(): void {
    this.viewObjects.forEach((object) => {
      object.destroy();
    });
    this.viewObjects = [];

    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'SHIP SELECT', {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER)
        .setShadow(UI_TEXT_SHADOW_OFFSET_PX, UI_TEXT_SHADOW_OFFSET_PX, hexToCss(OUTLINE_COLOR), 0),
    );

    let y = GAME_HEIGHT * LIST_START_Y_FRACTION;
    for (const ship of SHIPS) {
      y = this.renderShipRow(ship, y);
    }

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: y + BACK_BUTTON_GAP_PX,
        label: 'BACK',
        onClick: () => {
          this.scene.start(SCENE_KEY_MENU);
        },
      }),
    );
  }

  /** Renders one ship's row at `y`, returning the y for the next row. */
  private renderShipRow(ship: ShipClass, y: number): number {
    const available = isShipAvailable(ship, this.shipProgress, this.baseProgress);
    const name = ship.name.toUpperCase();
    const nameColumnX = GAME_WIDTH / 2 - NAME_COLUMN_OFFSET_PX;
    const statColumnX = GAME_WIDTH / 2 + STAT_COLUMN_OFFSET_PX;

    // Milestone 14: each row shows its ship's actual papercraft hull, in
    // its own colors — the roster finally looks like a hangar, not a text
    // list. Texture keys are per-ship-id (never shared across live
    // previews — Milestone 11's texture-key lesson), and renderView()
    // destroys the previous roster before this rebake, so each key has
    // exactly one live owner at any moment.
    const preview = createShipVisual(this, {
      ship,
      textureKeyPrefix: `ship-preview-${ship.id}`,
    });
    preview.container.setPosition(SHIP_PREVIEW_X_PX, y);
    if (!available) {
      preview.container.setAlpha(LOCKED_PREVIEW_ALPHA);
    }
    this.track(preview.container);

    if (!available) {
      this.track(
        this.add
          .text(nameColumnX, y, `${name} (LOCKED)`, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      this.track(
        this.add
          .text(nameColumnX, y + REASON_LINE_OFFSET_PX, lockedReasonText(ship.acquisition), {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      this.track(
        this.add
          .text(statColumnX, y, shipStatTag(ship), {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(0, ORIGIN_CENTER),
      );
      return y + LOCKED_ROW_HEIGHT_PX;
    }

    const isSelected = ship.id === this.shipProgress.selectedShipId;
    this.track(
      createUiButton(this, {
        x: nameColumnX,
        y,
        label: isSelected ? `${name} (SELECTED)` : name,
        onClick: () => {
          this.selectAndRerender(ship.id);
        },
      }),
    );
    this.track(
      this.add
        .text(statColumnX, y, shipStatTag(ship), {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(0, ORIGIN_CENTER),
    );
    return y + ROW_HEIGHT_PX;
  }

  private selectAndRerender(shipId: string): void {
    this.shipProgress = selectShip(SHIPS, this.shipProgress, shipId);
    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveShipProgress(storage, this.shipProgress);
    }
    this.renderView();
  }
}
