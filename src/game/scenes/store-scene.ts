import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_PADDING_Y,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import { listingStatus, shipListings, type StoreListing } from '../economy/store';
import { SHIPS } from '../ships/ships';
import {
  initialCurrencyState,
  loadCurrencyState,
  saveCurrencyState,
  spendCurrency,
  type CurrencyState,
} from '../persistence/currency-progress';
import {
  initialShipProgress,
  loadShipProgress,
  purchaseShip,
  saveShipProgress,
  type ShipProgressState,
} from '../persistence/ship-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_MENU, SCENE_KEY_STORE } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.07;
/** Same spot ShipSelectScene's own list starts at (`LIST_START_Y_FRACTION`
 * there) — the balance line is this screen's one line of "why does any of
 * this matter" context before the catalog, so it claims that slot instead
 * of the catalog itself. */
const BALANCE_Y_FRACTION = 0.16;
/** Pushed down from `BALANCE_Y_FRACTION` by roughly one row's worth of room
 * (640 * (0.26 - 0.16) = 64px, comfortably more than the 22px-tall balance
 * line needs) so the catalog never crowds the balance line above it.
 *
 * Hand-verified against today's actual one-listing catalog (`shipListings`
 * over `SHIPS` yields exactly the Vanguard, Milestone 7's one
 * `'purchase'`-type ship): title at `640 * 0.07` = 44.8px, balance line at
 * `640 * 0.16` = 102.4px, catalog starting at `640 * 0.26` = 166.4px. The
 * Vanguard's row is at worst `AFFORDABLE_ROW_HEIGHT_PX` (99px, the taller of
 * the two price-reason-line row heights -- see its own doc comment) tall,
 * landing the BACK button at `166.4 + 99 + BACK_BUTTON_GAP_PX(24)` = 289.4px
 * -- under half of `GAME_HEIGHT` (640), nowhere near colliding with
 * anything above it. */
const LIST_START_Y_FRACTION = 0.26;

/** One list entry's worth of vertical space for an "owned" listing (a
 * single plain text line, no reason line needed) — matches every other
 * scene's stacked-button rhythm (see `UI_BUTTON_ROW_HEIGHT_PX`'s own doc
 * comment) and ShipSelectScene's identical `ROW_HEIGHT_PX`. */
const ROW_HEIGHT_PX = UI_BUTTON_ROW_HEIGHT_PX;

/** Extra vertical room below a "too-expensive" listing's own name for its
 * price reason line, shown separately underneath rather than appended to
 * the name itself — same e2e-click-target-stability reasoning as
 * ShipSelectScene's own `REASON_LINE_OFFSET_PX` (a rebalanced price can't
 * silently break a test matching the name text). Reuses that exact value
 * because it's the exact same geometry: two plain, backgroundless
 * `UI_BODY_FONT_SIZE_PX` text lines stacked, same as ShipSelectScene's own
 * locked rows. An "affordable" listing's reason line sits under a real
 * `createUiButton` instead, which needs a different offset — see
 * `BUTTON_REASON_LINE_OFFSET_PX` below, not this constant. */
const REASON_LINE_OFFSET_PX = 24;
const LOCKED_ROW_HEIGHT_PX = ROW_HEIGHT_PX + REASON_LINE_OFFSET_PX;

/** Extra vertical room below an "affordable" listing's own *button* for its
 * price reason line. Unlike `REASON_LINE_OFFSET_PX` above, this offset has
 * to clear a real `createUiButton`, which paints a solid
 * `UI_BUTTON_BG_COLOR` background box around its label
 * (`UI_BUTTON_FONT_SIZE_PX` tall plus `UI_BUTTON_PADDING_Y` padding on each
 * side) — reusing `REASON_LINE_OFFSET_PX` here (as an earlier version of
 * this file did) left the reason line overlapping that box by several
 * pixels with ~0px clearance, confirmed against a real screenshot. Computed
 * the same way `UI_BUTTON_ROW_HEIGHT_PX` derives its own value: half the
 * button's full height (`UI_BUTTON_FONT_SIZE_PX / 2 + UI_BUTTON_PADDING_Y`)
 * clears the button itself from its own center-anchor, half the reason
 * line's own text height (`UI_BODY_FONT_SIZE_PX / 2`) clears the reason
 * line's center-anchor the same way, and `BUTTON_REASON_LINE_GAP_PX` adds
 * real breathing room between the two rather than exact-zero clearance —
 * re-verified against a real screenshot after this change, no collision at
 * any `ListingStatus`. */
const BUTTON_REASON_LINE_GAP_PX = 8;
const BUTTON_REASON_LINE_OFFSET_PX =
  UI_BUTTON_FONT_SIZE_PX / 2 +
  UI_BUTTON_PADDING_Y +
  BUTTON_REASON_LINE_GAP_PX +
  UI_BODY_FONT_SIZE_PX / 2;
const AFFORDABLE_ROW_HEIGHT_PX = ROW_HEIGHT_PX + BUTTON_REASON_LINE_OFFSET_PX;

/** Gap between the last catalog row and the BACK button — computed off the
 * actual accumulated list height (row heights vary: an owned listing needs
 * one row, an affordable/too-expensive one needs two) rather than a fixed
 * fraction, so it can't collide with the catalog once Milestone 9 adds
 * equipment listings alongside today's single ship. */
const BACK_BUTTON_GAP_PX = 24;

/** "PRICE: 750 CREDITS" — the reason an "affordable" or "too-expensive"
 * listing isn't shown as owned yet. Identical wording/format to
 * ShipSelectScene's own `lockedReasonText`'s `'purchase'` branch, so the
 * same fact (a ship's price) reads identically on both screens. */
function priceReasonText(listing: StoreListing): string {
  return `PRICE: ${listing.price.toString()} CREDITS`;
}

/**
 * The store screen (Milestone 8, Decision D15): every listing in the
 * catalog (Milestone 7's purchasable ships today; Milestone 9 will add
 * equipment listings into the same flat list) is shown as owned, affordable
 * and buyable, or too expensive — reading balance from Milestone 8's own
 * `persistence/currency-progress.ts` and ownership from Milestone 7's
 * `persistence/ship-progress.ts`. Buying a listing is a persistent
 * ownership change, not an equip action — the player still visits the
 * existing `ShipSelectScene` to equip a purchased ship, exactly mirroring
 * how `selectShip` and `purchaseShip` are two deliberately separate actions
 * there.
 */
export class StoreScene extends Phaser.Scene {
  private currencyState!: CurrencyState;
  private shipProgress!: ShipProgressState;
  private catalog!: readonly StoreListing[];
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_STORE);
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backGuard = new ArmedKeyGuard(this.keyEscape);

    // getSafeLocalStorage() returns null when storage access itself is
    // blocked (sandboxed iframe, privacy setting) -- the screen still shows
    // a fresh save's own starting state in that case (zero balance, no
    // purchases), same as a first-time player, rather than throwing. A
    // purchase made while storage is blocked still updates this scene's own
    // in-memory state, it just can't survive a reload.
    const storage = getSafeLocalStorage();
    this.currencyState = storage === null ? initialCurrencyState() : loadCurrencyState(storage);
    this.shipProgress =
      storage === null ? initialShipProgress(SHIPS) : loadShipProgress(storage, SHIPS);
    this.catalog = shipListings(SHIPS);
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
   * after a purchase (to move the balance and the listing's new "OWNED"
   * status) needs an explicit teardown, same as ShipSelectScene's and
   * WorldMapScene's identical `track()`. */
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
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'STORE', {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    // Always shown, including at 0 -- unlike MenuScene's BEST score line
    // (conditionally hidden pre-first-score), starting at 0 credits is a
    // normal, self-explanatory economy-game state, not a confusing one.
    this.track(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * BALANCE_Y_FRACTION,
          `BALANCE: ${this.currencyState.balance.toString()} CREDITS`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );

    let y = GAME_HEIGHT * LIST_START_Y_FRACTION;
    for (const listing of this.catalog) {
      y = this.renderListingRow(listing, y);
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

  /** Renders one listing's row at `y`, returning the y for the next row. */
  private renderListingRow(listing: StoreListing, y: number): number {
    const status = listingStatus(
      listing,
      this.shipProgress.purchasedShipIds,
      this.currencyState.balance,
    );
    const name = listing.name.toUpperCase();

    if (status === 'owned') {
      this.track(
        this.add
          .text(GAME_WIDTH / 2, y, `${name} (OWNED)`, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + ROW_HEIGHT_PX;
    }

    if (status === 'affordable') {
      this.track(
        createUiButton(this, {
          x: GAME_WIDTH / 2,
          y,
          label: name,
          onClick: () => {
            this.purchaseAndRerender(listing);
          },
        }),
      );
      this.track(
        this.add
          .text(GAME_WIDTH / 2, y + BUTTON_REASON_LINE_OFFSET_PX, priceReasonText(listing), {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + AFFORDABLE_ROW_HEIGHT_PX;
    }

    // status === 'too-expensive'
    this.track(
      this.add
        .text(GAME_WIDTH / 2, y, `${name} (LOCKED)`, {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    this.track(
      this.add
        .text(GAME_WIDTH / 2, y + REASON_LINE_OFFSET_PX, priceReasonText(listing), {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    return y + LOCKED_ROW_HEIGHT_PX;
  }

  /** Completes a purchase in one synchronous handler: deducts the balance,
   * records ownership, persists both (storage permitting), then re-renders
   * in place -- does not navigate away and does not touch
   * `selectedShipId` (buying a ship doesn't equip it; that's
   * ShipSelectScene's own separate, deliberate action). `getSafeLocalStorage()`
   * is called once and reused for both writes, matching every other
   * "read/write pair share one storage handle" call site in this
   * codebase. */
  private purchaseAndRerender(listing: StoreListing): void {
    this.currencyState = spendCurrency(this.currencyState, listing.price);
    this.shipProgress = purchaseShip(this.shipProgress, listing.id);

    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveCurrencyState(storage, this.currencyState);
      saveShipProgress(storage, this.shipProgress);
    }

    this.renderView();
  }
}
