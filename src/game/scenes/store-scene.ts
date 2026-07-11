import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_PADDING_Y,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_FONT_FAMILY,
  UI_INK_COLOR,
  UI_INK_MUTED_COLOR,
  UI_BUTTON_BG_COLOR,
  UI_TEXT_CHIP_PADDING_X,
  UI_TEXT_CHIP_PADDING_Y,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  OUTLINE_COLOR,
  UI_TEXT_SHADOW_OFFSET_PX,
} from '../constants';
import {
  equipmentListings,
  listingStatus,
  shipListings,
  upgradeListings,
  type StoreListing,
  type StoreListingKind,
} from '../economy/store';
import { SHIPS, findShipById } from '../ships/ships';
import { UPGRADES } from '../ships/upgrades';
import { EQUIPMENT_ITEMS, findEquipmentById } from '../equipment/equipment';
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
import {
  initialUpgradeProgress,
  loadUpgradeProgress,
  purchaseUpgrade,
  saveUpgradeProgress,
  type UpgradeProgressState,
} from '../persistence/upgrade-progress';
import {
  initialEquipmentProgress,
  loadEquipmentProgress,
  purchaseEquipment,
  saveEquipmentProgress,
  type EquipmentProgressState,
} from '../persistence/equipment-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { createShipVisual } from '../rendering/ship-visual';
import { createItemIconImage } from '../rendering/item-icons';
import { SCENE_KEY_MENU, SCENE_KEY_STORE } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.07;
/** Same spot ShipSelectScene's own list starts at (`LIST_START_Y_FRACTION`
 * there) — the balance line is this screen's one line of "why does any of
 * this matter" context before the catalog, so it claims that slot instead
 * of the catalog itself. */
const BALANCE_Y_FRACTION = 0.16;
/** One column-header row ("SHIPS"/"UPGRADES"/"WEAPONS"/"UTILITY", see
 * `renderView`'s own column list) between the balance line and the catalog
 * itself — added by Milestone 9, which turned this screen's single-
 * `'ship'`-listing catalog into a many-listing, multi-column one (see
 * `LIST_START_Y_FRACTION`'s own doc comment for why a flat single-column
 * list no longer fits). Sits roughly one row below `BALANCE_Y_FRACTION`
 * (640 * (0.22 - 0.16) = 38.4px, comfortably more than a single text line
 * needs). */
const COLUMN_HEADER_Y_FRACTION = 0.22;
/** Pushed down from `COLUMN_HEADER_Y_FRACTION` by roughly one row's worth of
 * room (640 * (0.27 - 0.22) = 32px) so the catalog never crowds the column
 * headers above it.
 *
 * Milestone 9 grew this screen's catalog from Milestone 7/8's single
 * `'ship'` listing (Vanguard) to 9 listings across three `StoreListingKind`s
 * (1 ship, `UPGRADES.length` = 4 upgrades, 4 purchase-type equipment items)
 * — a flat single-column list at the old row heights would put its BACK
 * button close to 1000px down, hundreds of pixels past `GAME_HEIGHT` (640).
 * `renderView` splits the catalog into one column per kind instead (same
 * technique `LoadoutScene`'s own weapon/utility column split uses) — since
 * Milestone 11 added a 5th purchase-type equipment item, that split now
 * also applies within `'equipment'` itself (its own 1 weapon vs. 4 utility
 * purchase-type items, `EQUIPMENT_WEAPON_COLUMN_X_FRACTION`/
 * `EQUIPMENT_UTILITY_COLUMN_X_FRACTION`) — capping the tallest column at 4
 * rows (upgrades or the utility sub-column, whichever this save's
 * ownership/afford state renders more of at the taller
 * `AFFORDABLE_ROW_HEIGHT_PX`): listStartY itself is `640 * 0.27` = 172.8px, so
 * the tallest column ends around `172.8 + 4 * 99` = 568.8px, landing the BACK
 * button (`renderView()` sets its y to that column-end plus
 * `BACK_BUTTON_GAP_PX(24)`, with no further offset) ≈ 592.8px — comfortably
 * inside `GAME_HEIGHT`, re-verified against a real screenshot (see
 * `PLAN.md` Milestone 9/11 notes, which independently state y≈593). */
const LIST_START_Y_FRACTION = 0.27;

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

/** Where each column sits, spread across `GAME_WIDTH` (960) with margin
 * either side of its own worst-case row string width (estimated at this
 * project's own established ~9.6px/monospace-character rate, the same
 * rate `"EFFICIENT INJECTORS (LOCKED)"`'s own ~278px/29-char measurement
 * implies): ships (`"VANGUARD (LOCKED)"`, ~163px), upgrades (the 278px
 * string above — this catalog's widest by a clear margin), the equipment
 * catalog's one purchase-type weapon (`"PULSE CANNON (OWNED)"`, ~192px),
 * and its purchase-type utility items (`"BARRIER SHIELD (LOCKED)"`/
 * `"THRUST BOOSTER (LOCKED)"`, ~221px, this sub-column's own worst case).
 * Milestone 11 split the original single `'equipment'` column (Milestone
 * 9, 4 rows) into these last two sub-columns once a 5th purchase-type
 * equipment item (Barrier Shield) pushed a single combined column past
 * `GAME_HEIGHT` (see `git blame`/`PLAN.md`'s Milestone 11 notes) — four
 * columns need tighter per-gap clearance than the original three (960px
 * split four ways, not three), re-verified against a real screenshot
 * rather than asserted from arithmetic alone, matching this project's
 * established "no automated collision detection, hand-verified margin"
 * convention for this kind of layout (e.g. `ShipSelectScene`'s
 * `NAME_COLUMN_OFFSET_PX`). */
/** Milestone 16 (D24): every row leads with its item's own paper art.
 * The four store columns leave no reliable gutter between the widest
 * neighboring rows (every fixed/outside placement either clipped the
 * screen edge, hid behind a button, covered its first letters, or
 * collided with the next column — all caught by screenshots), so art is
 * drawn SMALL: inside a button's own left padding for button rows, and
 * just outside the text for plain-text rows (flipping right when the
 * leftmost column would clip the screen edge). Labels themselves are
 * never altered — e2e click targeting matches exact label text. */
const LISTING_ART_SCALE = 0.6;
const LISTING_ART_GAP_PX = 12;
const LISTING_ART_MIN_X_PX = 18;
/** Half the scaled icon + a sliver, keeping the icon within
 * UI_BUTTON_PADDING_X so it never covers label glyphs. */
const LISTING_ART_BUTTON_INSET_PX = 10;
const STORE_SHIP_PREVIEW_SCALE = 0.55;
const SHIPS_COLUMN_X_FRACTION = 0.1;
const UPGRADES_COLUMN_X_FRACTION = 0.35;
const EQUIPMENT_WEAPON_COLUMN_X_FRACTION = 0.61;
const EQUIPMENT_UTILITY_COLUMN_X_FRACTION = 0.84;

/**
 * The store screen (Milestone 8, Decision D15; extended by Milestone 9 to
 * also sell permanent upgrades and purchase-type equipment): every listing
 * in `this.catalog` is shown as owned, affordable and buyable, or too
 * expensive — reading balance from Milestone 8's own `persistence/
 * currency-progress.ts` and ownership from whichever domain's own
 * persistence module the listing's `kind` routes to (`ownedIdsFor`).
 * Rendered as one column per `StoreListingKind` (`STORE_COLUMNS`) rather
 * than Milestone 8's original flat single-column list — seeing all 9
 * listings at `AFFORDABLE_ROW_HEIGHT_PX` each would run the list ~830px
 * past `GAME_HEIGHT` in a single column (see `COLUMN_HEADER_Y_FRACTION`'s
 * doc comment for the exact math). Buying a listing is a persistent
 * ownership change, not an equip/select action — the player still visits
 * `ShipSelectScene`/`LoadoutScene` to equip a purchased ship/equipment item,
 * exactly mirroring how `selectShip` and `purchaseShip` are two
 * deliberately separate actions there.
 */
export class StoreScene extends Phaser.Scene {
  private currencyState!: CurrencyState;
  private shipProgress!: ShipProgressState;
  private upgradeProgress!: UpgradeProgressState;
  private equipmentProgress!: EquipmentProgressState;
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
    this.upgradeProgress =
      storage === null ? initialUpgradeProgress() : loadUpgradeProgress(storage, UPGRADES);
    this.equipmentProgress =
      storage === null
        ? initialEquipmentProgress()
        : loadEquipmentProgress(storage, EQUIPMENT_ITEMS);
    // Milestone 9: concatenated, in this order, onto Milestone 7's own ship
    // catalog -- StoreScene's generic listing/afford/purchase mechanism
    // doesn't change to grow from one domain to three (economy/store.ts's
    // own doc comment anticipated exactly this).
    this.catalog = [
      ...shipListings(SHIPS),
      ...upgradeListings(UPGRADES),
      ...equipmentListings(EQUIPMENT_ITEMS),
    ];
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
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER)
        .setShadow(UI_TEXT_SHADOW_OFFSET_PX, UI_TEXT_SHADOW_OFFSET_PX, hexToCss(OUTLINE_COLOR), 0),
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
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_INK_COLOR),
            backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
            padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );

    const headerY = GAME_HEIGHT * COLUMN_HEADER_Y_FRACTION;
    const listStartY = GAME_HEIGHT * LIST_START_Y_FRACTION;

    // Milestone 11: the 'equipment' kind splits into its own weapon/utility
    // sub-columns (this file's own `LIST_START_Y_FRACTION` doc comment
    // explains why) -- computed here, from the live catalog, rather than a
    // static column list, since which listing is a weapon vs. a utility
    // item isn't itself part of `StoreListing`'s generic cross-domain shape
    // (`economy/store.ts`'s own doc comment on why that type stays a flat
    // `{kind, id, name, price}`).
    const equipmentListingsAll = this.catalog.filter((listing) => listing.kind === 'equipment');
    const columns: readonly {
      readonly header: string;
      readonly x: number;
      readonly listings: readonly StoreListing[];
    }[] = [
      {
        header: 'SHIPS',
        x: GAME_WIDTH * SHIPS_COLUMN_X_FRACTION,
        listings: this.catalog.filter((listing) => listing.kind === 'ship'),
      },
      {
        header: 'UPGRADES',
        x: GAME_WIDTH * UPGRADES_COLUMN_X_FRACTION,
        listings: this.catalog.filter((listing) => listing.kind === 'upgrade'),
      },
      {
        header: 'WEAPONS',
        x: GAME_WIDTH * EQUIPMENT_WEAPON_COLUMN_X_FRACTION,
        listings: equipmentListingsAll.filter(
          (listing) => findEquipmentById(listing.id).slotType === 'weapon',
        ),
      },
      {
        header: 'UTILITY',
        x: GAME_WIDTH * EQUIPMENT_UTILITY_COLUMN_X_FRACTION,
        listings: equipmentListingsAll.filter(
          (listing) => findEquipmentById(listing.id).slotType === 'utility',
        ),
      },
    ];

    let backButtonY = listStartY;
    for (const column of columns) {
      this.track(
        this.add
          .text(column.x, headerY, column.header, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_INK_COLOR),
            backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
            padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
          })
          .setOrigin(ORIGIN_CENTER),
      );
      const columnEndY = this.renderCatalogColumn(column.listings, column.x, listStartY);
      backButtonY = Math.max(backButtonY, columnEndY);
    }

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: backButtonY + BACK_BUTTON_GAP_PX,
        label: 'BACK',
        onClick: () => {
          this.scene.start(SCENE_KEY_MENU);
        },
      }),
    );
  }

  /** Routes a listing's own domain (`StoreListingKind`) to the matching
   * owned-ids array -- the one place `renderListingRow`/`purchaseAndRerender`
   * both go from "which listing" to "which persisted ownership list", so the
   * two can't independently drift on the routing. */
  private ownedIdsFor(kind: StoreListingKind): readonly string[] {
    switch (kind) {
      case 'ship':
        return this.shipProgress.purchasedShipIds;
      case 'upgrade':
        return this.upgradeProgress.purchasedUpgradeIds;
      case 'equipment':
        return this.equipmentProgress.purchasedEquipmentIds;
    }
  }

  /** Renders `listings`, stacked at `x` starting from `y` -- returns the y
   * the next row after this column's last one would start at, so the
   * caller can size the BACK button gap off whichever column ends up
   * tallest (same pattern as `LoadoutScene`'s own `renderEquipmentColumn`).
   * Takes the already-filtered listings directly (Milestone 11), not a
   * `StoreListingKind` to filter `this.catalog` by itself, since one kind
   * (`'equipment'`) now renders as two separate columns (weapon/utility)
   * the caller has already split. */
  private renderCatalogColumn(listings: readonly StoreListing[], x: number, y: number): number {
    let currentY = y;
    for (const listing of listings) {
      currentY = this.renderListingRow(listing, x, currentY);
    }
    return currentY;
  }

  /** Renders one listing's row at `x, y`, returning the y for the next row
   * in the same column. */
  private renderListingRow(listing: StoreListing, x: number, y: number): number {
    const status = listingStatus(
      listing,
      this.ownedIdsFor(listing.kind),
      this.currencyState.balance,
    );
    const name = listing.name.toUpperCase();

    if (status === 'owned') {
      const row = this.add
        .text(x, y, `${name} (OWNED)`, {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_INK_MUTED_COLOR),
          backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
          padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
        })
        .setOrigin(ORIGIN_CENTER);
      this.track(row);
      this.renderListingArt(listing, this.listingArtX(x, row.displayWidth / 2), y);
      return y + ROW_HEIGHT_PX;
    }

    if (status === 'affordable') {
      const button = createUiButton(this, {
        x,
        y,
        label: name,
        onClick: () => {
          this.purchaseAndRerender(listing);
        },
      });
      this.track(button);
      this.renderListingArt(
        listing,
        x - button.getBounds().width / 2 + LISTING_ART_BUTTON_INSET_PX,
        y,
      );
      this.track(
        this.add
          .text(x, y + BUTTON_REASON_LINE_OFFSET_PX, priceReasonText(listing), {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_INK_MUTED_COLOR),
            backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
            padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + AFFORDABLE_ROW_HEIGHT_PX;
    }

    // status === 'too-expensive'
    const lockedRow = this.add
      .text(x, y, `${name} (LOCKED)`, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_INK_MUTED_COLOR),
        backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
        padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
      })
      .setOrigin(ORIGIN_CENTER);
    this.track(lockedRow);
    this.renderListingArt(listing, this.listingArtX(x, lockedRow.displayWidth / 2), y);
    this.track(
      this.add
        .text(x, y + REASON_LINE_OFFSET_PX, priceReasonText(listing), {
          fontFamily: UI_FONT_FAMILY,
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_INK_MUTED_COLOR),
          backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
          padding: { x: UI_TEXT_CHIP_PADDING_X, y: UI_TEXT_CHIP_PADDING_Y },
        })
        .setOrigin(ORIGIN_CENTER),
    );
    return y + LOCKED_ROW_HEIGHT_PX;
  }

  /** Outside-left of the measured row, flipping to outside-right when the
   * left slot would clip the screen edge (leftmost column). */
  private listingArtX(rowCenterX: number, rowHalfWidth: number): number {
    const left = rowCenterX - rowHalfWidth - LISTING_ART_GAP_PX;
    return left < LISTING_ART_MIN_X_PX ? rowCenterX + rowHalfWidth + LISTING_ART_GAP_PX : left;
  }

  /** Outside-left of a MEASURED plain-text row (flipping right at the
   * screen edge) — button rows instead inset their art into their own
   * left padding; see the LISTING_ART_* constants' doc comment. */

  /** The row's leading art (Milestone 16, D24): a ship listing shows its
   * real in-flight hull at mini scale (the same silhouette system SHIP
   * SELECT uses, per-listing texture prefix); everything else shows its
   * item-icon card. */
  private renderListingArt(listing: StoreListing, x: number, y: number): void {
    if (listing.kind === 'ship') {
      const visual = createShipVisual(this, {
        ship: findShipById(listing.id),
        textureKeyPrefix: `store-ship-${listing.id}`,
      });
      visual.container.setPosition(x, y).setScale(STORE_SHIP_PREVIEW_SCALE).setDepth(1);
      visual.setFlamesVisible(true);
      this.track(visual.container);
      return;
    }
    this.track(createItemIconImage(this, listing.id, x, y).setScale(LISTING_ART_SCALE).setDepth(1));
  }

  /** Completes a purchase in one synchronous handler: deducts the balance,
   * records ownership in whichever domain the listing belongs to (routed by
   * `listing.kind`), then persists *all four* progress states
   * unconditionally (currency, ship, upgrade, equipment) rather than only
   * the one that actually changed -- simplest correct approach, and cheaper
   * than conditional saves for a low-frequency user action (a few extra
   * `localStorage` writes on a purchase is free). Does not navigate away and
   * does not equip/select whatever was just bought -- that's
   * `ShipSelectScene`'s/`LoadoutScene`'s own separate, deliberate action,
   * mirroring `purchaseShip`'s own established convention.
   * `getSafeLocalStorage()` is called once and reused for every write,
   * matching every other "read/write pair share one storage handle" call
   * site in this codebase. */
  private purchaseAndRerender(listing: StoreListing): void {
    this.currencyState = spendCurrency(this.currencyState, listing.price);
    switch (listing.kind) {
      case 'ship':
        this.shipProgress = purchaseShip(this.shipProgress, listing.id);
        break;
      case 'upgrade':
        this.upgradeProgress = purchaseUpgrade(this.upgradeProgress, listing.id);
        break;
      case 'equipment':
        this.equipmentProgress = purchaseEquipment(this.equipmentProgress, listing.id);
        break;
    }

    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveCurrencyState(storage, this.currencyState);
      saveShipProgress(storage, this.shipProgress);
      saveUpgradeProgress(storage, this.upgradeProgress);
      saveEquipmentProgress(storage, this.equipmentProgress);
    }

    this.renderView();
  }
}
