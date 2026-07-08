import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_PADDING_Y,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import type { ShipClass } from '../ships/ship';
import { SHIPS, findShipById } from '../ships/ships';
import { UPGRADES, applyPermanentUpgrades } from '../ships/upgrades';
import { BASES } from '../bases/bases';
import {
  EQUIPMENT_ITEMS,
  totalCarriedMass,
  type EquipmentAcquisition,
  type EquipmentItem,
  type UtilityEffect,
  type UtilityEquipmentItem,
  type WeaponEquipmentItem,
} from '../equipment/equipment';
import { resolveEquippedItems } from '../equipment/loadout';
import {
  initialBaseProgress,
  loadBaseProgress,
  type BaseProgressMap,
} from '../persistence/base-progress';
import { initialShipProgress, loadShipProgress } from '../persistence/ship-progress';
import {
  initialUpgradeProgress,
  loadUpgradeProgress,
  ownedUpgrades,
} from '../persistence/upgrade-progress';
import {
  equipItem,
  initialEquipmentProgress,
  isEquipmentAvailable,
  loadEquipmentProgress,
  saveEquipmentProgress,
  unequipItem,
  type EquipmentProgressState,
} from '../persistence/equipment-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_LOADOUT, SCENE_KEY_MENU } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.06;
/** One row's worth of gap below the title (`0.09` of `GAME_HEIGHT`, i.e.
 * ~57.6px) reuses the exact magnitude ShipSelectScene/StoreScene already
 * verified is clear of `UI_TITLE_FONT_SIZE_PX`'s own real rendered height —
 * this screen stacks far more content below the title than either of those,
 * so unlike its row spacing further down (which can safely compress), this
 * one gap keeps the same proven-safe size. */
const USAGE_LINE_Y_FRACTION = 0.15;
/** Below `USAGE_LINE_Y_FRACTION` by `0.04` of `GAME_HEIGHT` (~25.6px) — both
 * are single small text lines (unlike the title-to-content gap above), so
 * this reuses `ShipSelectScene`/`StoreScene`'s own proven ~24px text-to-text
 * offset magnitude rather than the larger title-clearing gap. */
const UPGRADES_LINE_Y_FRACTION = 0.19;
const COLUMN_HEADER_Y_FRACTION = 0.23;
const LIST_START_Y_FRACTION = 0.27;

/** How far left/right of center each equipment column sits (2 weapons vs 5
 * utility items split into their own column, per LAYOUT SAFETY guidance —
 * halves the tallest column from 7 rows to 5). Leaves ~220px of half-width
 * budget on each side before the two columns' text could ever meet at
 * center, comfortably more than this roster's longest row string (`"UNLOCK:
 * ESTABLISH SCARP OUTPOST"` at `UI_BODY_FONT_SIZE_PX`, ~300px wide) needs. */
const WEAPON_COLUMN_X_FRACTION = 0.27;
const UTILITY_COLUMN_X_FRACTION = 0.73;

/** Breathing room between a row's own main line (button or plain text) and
 * its info line (reason/stat) directly below it. A first version of this
 * constant (4px) left a real `createUiButton` row's info line reading as
 * touching the *next* row's button box in a real screenshot — monospace
 * `Text` line-height renders visibly taller than the nominal `fontSize`
 * half-heights `BUTTON_HALF_HEIGHT_PX`/`BODY_HALF_HEIGHT_PX` below assume,
 * the same real-vs-nominal mismatch `store-scene.ts`'s own
 * `BUTTON_REASON_LINE_GAP_PX` doc comment already found once for its
 * button-to-reason-line case — widened here and re-verified against a real
 * screenshot (see `PLAN.md` Milestone 9 notes). */
const INFO_LINE_GAP_PX = 6;
/** Breathing room between one row's info line and the next row's main line —
 * widened alongside `INFO_LINE_GAP_PX` above for the same real-screenshot
 * reason. */
const ROW_GAP_PX = 12;
/** Half of a real `createUiButton`'s own painted height (font + padding on
 * each side) — the largest a row's main line can be, since a locked/no-fit
 * row's plain-text main line (`UI_BODY_FONT_SIZE_PX`) is always shorter.
 * Derived the same way `store-scene.ts`'s `BUTTON_REASON_LINE_OFFSET_PX`
 * derives its own half-button-height term. */
const BUTTON_HALF_HEIGHT_PX = UI_BUTTON_FONT_SIZE_PX / 2 + UI_BUTTON_PADDING_Y;
const BODY_HALF_HEIGHT_PX = UI_BODY_FONT_SIZE_PX / 2;

/** Offset from a button-main-line row's own y to its info line below it. */
const BUTTON_INFO_LINE_OFFSET_PX = BUTTON_HALF_HEIGHT_PX + INFO_LINE_GAP_PX + BODY_HALF_HEIGHT_PX;
/** Offset from a plain-text-main-line row's own y to its info line below it
 * — both lines are `UI_BODY_FONT_SIZE_PX`, so this is shorter than
 * `BUTTON_INFO_LINE_OFFSET_PX` above. */
const TEXT_INFO_LINE_OFFSET_PX = BODY_HALF_HEIGHT_PX * 2 + INFO_LINE_GAP_PX;

/** Vertical distance from one row's own y to the next row's, uniform across
 * every row regardless of whether either one is a button or plain text —
 * sized for the worst case (two consecutive button rows, each with its own
 * info line) so a column's accumulated height can never depend on which
 * particular rows happen to render as buttons this frame (equip/unequip
 * changes that every render). */
const ROW_HEIGHT_PX =
  BUTTON_INFO_LINE_OFFSET_PX + BODY_HALF_HEIGHT_PX + ROW_GAP_PX + BUTTON_HALF_HEIGHT_PX;

/** Gap between the taller column's last row and the BACK button — computed
 * off the actual accumulated column height (see `renderEquipmentColumn`)
 * rather than a fixed fraction, matching every other list scene's identical
 * convention. */
const BACK_BUTTON_GAP_PX = 24;

/** "PRICE: 200 CREDITS (VISIT STORE)" / "UNLOCK: ESTABLISH FROSTGATE" — the
 * reason a not-yet-owned equipment item isn't selectable yet. Mirrors
 * `ship-select-scene.ts`'s `lockedReasonText`, minus its `'starter'` branch
 * (no equivalent variant exists for equipment, see `EquipmentAcquisition`'s
 * own doc comment) — both remaining variants are covered, so this stays a
 * total function without a fallback string. */
function equipmentLockedReasonText(acquisition: EquipmentAcquisition): string {
  if (acquisition.type === 'purchase') {
    return `PRICE: ${acquisition.price.toString()} CREDITS (VISIT STORE)`;
  }
  return `UNLOCK: ${acquisition.description.toUpperCase()}`;
}

/** "TOO HEAVY" / "SLOTS FULL" — why an *owned* item isn't offered as a
 * clickable equip button right now (this project's "never offer a button
 * for an action that would silently no-op" convention). */
function noFitReasonText(wouldExceedSlots: boolean): string {
  return wouldExceedSlots ? 'SLOTS FULL' : 'TOO HEAVY';
}

/** "MASS 20 · DMG 15 (WEAPON T1)" / "MASS 15 · +20 THR for 3s (UTILITY)" —
 * the one paired benefit-stat this screen shows per item (Milestone 9's own
 * "pros-and-cons bundle" rule), one line per `UtilityEffect` kind. */
const MILLISECONDS_PER_SECOND = 1000;
function equipmentStatTag(item: EquipmentItem): string {
  const mass = `MASS ${item.mass.toString()}`;
  if (item.slotType === 'weapon') {
    return `${mass} · DMG ${item.damage.toString()} (WEAPON T${item.tier.toString()})`;
  }
  const effect: UtilityEffect = item.effect;
  switch (effect.kind) {
    case 'fuelCapacityBonus':
      return `${mass} · +${effect.amount.toString()} FUEL CAP (UTILITY)`;
    case 'corrosionResistance':
      return `${mass} · CORROSION RESIST (UTILITY)`;
    case 'coldResistance':
      return `${mass} · COLD RESIST (UTILITY)`;
    case 'repairKit':
      return `${mass} · +${effect.fuelRestored.toString()} FUEL ON USE (UTILITY)`;
    case 'thrustBurst': {
      const seconds = effect.durationMs / MILLISECONDS_PER_SECOND;
      return `${mass} · +${effect.bonusThrustAccel.toString()} THR for ${seconds.toString()}s (UTILITY)`;
    }
  }
}

/**
 * The pre-mission loadout screen (Milestone 9): extends M6/M7's menu flow to
 * choose which owned/unlocked equipment is equipped within the currently
 * selected ship's slot count and mass budget. Reads (never writes) the
 * ship/upgrade selection — `GameScene`/`ShipSelectScene`/`StoreScene` own
 * those — and reads+writes `persistence/equipment-progress.ts`'s equip/
 * unequip state, the one piece of progress this screen actually manages.
 * Permanent upgrades (Decision D14: "bought once, always active, no slot
 * cost") are shown here only as an informational one-line summary, never
 * interactive — the store is the only place to buy one.
 */
export class LoadoutScene extends Phaser.Scene {
  private effectiveShip!: ShipClass;
  private equipmentProgress!: EquipmentProgressState;
  private baseProgress!: BaseProgressMap;
  private ownedUpgradeNames: readonly string[] = [];
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_LOADOUT);
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backGuard = new ArmedKeyGuard(this.keyEscape);

    // getSafeLocalStorage() returns null when storage access itself is
    // blocked (sandboxed iframe, privacy setting) -- the screen still shows
    // a fresh save's own starting state in that case (default ship, no
    // upgrades, no equipment), same as every other scene's identical
    // degradation, rather than throwing.
    const storage = getSafeLocalStorage();
    const shipProgress =
      storage === null ? initialShipProgress(SHIPS) : loadShipProgress(storage, SHIPS);
    const upgradeProgress =
      storage === null ? initialUpgradeProgress() : loadUpgradeProgress(storage, UPGRADES);
    this.equipmentProgress =
      storage === null
        ? initialEquipmentProgress()
        : loadEquipmentProgress(storage, EQUIPMENT_ITEMS);
    this.baseProgress =
      storage === null ? initialBaseProgress(BASES) : loadBaseProgress(storage, BASES);

    const baseShip = findShipById(shipProgress.selectedShipId);
    const owned = ownedUpgrades(upgradeProgress, UPGRADES);
    this.effectiveShip = applyPermanentUpgrades(baseShip, owned);
    this.ownedUpgradeNames = owned.map((upgrade) => upgrade.name.toUpperCase());

    this.renderView();
  }

  override update(): void {
    if (this.backGuard.consumeJustPressed()) {
      this.scene.start(SCENE_KEY_MENU);
    }
  }

  /** Tracks a just-created display object so the next `renderView()` call
   * can destroy exactly this screen's objects before rebuilding it --
   * Phaser scenes don't recycle their own display list, same as every other
   * scene's identical `track()`. */
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
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'LOADOUT', {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    // Recomputed from resolveEquippedItems + totalCarriedMass every render
    // (never hand-tracked separately) so this line can never drift from
    // what is actually equipped -- the same live-resolution
    // `equipment/loadout.ts` guarantees for GameScene.
    const currentEquipped = resolveEquippedItems(
      this.effectiveShip,
      this.equipmentProgress.equippedItemIds,
      EQUIPMENT_ITEMS,
    );
    const carriedMass = totalCarriedMass(currentEquipped);
    this.track(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * USAGE_LINE_Y_FRACTION,
          `${this.effectiveShip.name.toUpperCase()} · SLOTS ${currentEquipped.length.toString()}/` +
            `${this.effectiveShip.equipmentSlots.toString()} · MASS ${carriedMass.toString()}/` +
            `${this.effectiveShip.massBudget.toString()} MU`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );

    // A compact one-line summary, never one row per upgrade (see
    // LAYOUT SAFETY) -- upgrades are always-active once owned (Decision
    // D14), so this is informational only, never interactive.
    const upgradesLine =
      this.ownedUpgradeNames.length === 0
        ? 'NO UPGRADES OWNED -- VISIT STORE'
        : `UPGRADES OWNED: ${this.ownedUpgradeNames.join(', ')}`;
    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * UPGRADES_LINE_Y_FRACTION, upgradesLine, {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    const weaponColumnX = GAME_WIDTH * WEAPON_COLUMN_X_FRACTION;
    const utilityColumnX = GAME_WIDTH * UTILITY_COLUMN_X_FRACTION;
    const headerY = GAME_HEIGHT * COLUMN_HEADER_Y_FRACTION;
    this.track(
      this.add
        .text(weaponColumnX, headerY, 'WEAPONS', {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    this.track(
      this.add
        .text(utilityColumnX, headerY, 'UTILITY', {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    const listStartY = GAME_HEIGHT * LIST_START_Y_FRACTION;
    const weaponItems = EQUIPMENT_ITEMS.filter(
      (item): item is WeaponEquipmentItem => item.slotType === 'weapon',
    );
    const utilityItems = EQUIPMENT_ITEMS.filter(
      (item): item is UtilityEquipmentItem => item.slotType === 'utility',
    );
    const weaponEndY = this.renderEquipmentColumn(
      weaponItems,
      currentEquipped,
      weaponColumnX,
      listStartY,
    );
    const utilityEndY = this.renderEquipmentColumn(
      utilityItems,
      currentEquipped,
      utilityColumnX,
      listStartY,
    );

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: Math.max(weaponEndY, utilityEndY) + BACK_BUTTON_GAP_PX,
        label: 'BACK',
        onClick: () => {
          this.scene.start(SCENE_KEY_MENU);
        },
      }),
    );
  }

  /** Renders one column's worth of equipment rows at `x`, starting at `y` --
   * returns the y the next row after this column's last one would start at,
   * so the caller can size the BACK button gap off whichever column ends up
   * taller. */
  private renderEquipmentColumn(
    items: readonly EquipmentItem[],
    currentEquipped: readonly EquipmentItem[],
    x: number,
    startY: number,
  ): number {
    let y = startY;
    for (const item of items) {
      y = this.renderEquipmentRow(item, currentEquipped, x, y);
    }
    return y;
  }

  /** Renders one equipment item's row at `x, y`, returning the y for the
   * next row in the same column. */
  private renderEquipmentRow(
    item: EquipmentItem,
    currentEquipped: readonly EquipmentItem[],
    x: number,
    y: number,
  ): number {
    const name = item.name.toUpperCase();
    const statTag = equipmentStatTag(item);

    if (!isEquipmentAvailable(item, this.equipmentProgress, this.baseProgress)) {
      this.track(
        this.add
          .text(x, y, `${name} (LOCKED)`, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      this.track(
        this.add
          .text(x, y + TEXT_INFO_LINE_OFFSET_PX, equipmentLockedReasonText(item.acquisition), {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + ROW_HEIGHT_PX;
    }

    const isEquipped = currentEquipped.some((carried) => carried.id === item.id);
    if (isEquipped) {
      this.track(
        createUiButton(this, {
          x,
          y,
          label: `${name} (EQUIPPED)`,
          onClick: () => {
            this.unequipAndRerender(item.id);
          },
        }),
      );
      this.track(
        this.add
          .text(x, y + BUTTON_INFO_LINE_OFFSET_PX, statTag, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + ROW_HEIGHT_PX;
    }

    // Owned but not equipped -- only ever a real button if equipping it
    // would actually change something (this project's "never offer a
    // button for an action that would silently no-op" convention).
    const candidateOrder = [...this.equipmentProgress.equippedItemIds, item.id];
    const candidateResolved = resolveEquippedItems(
      this.effectiveShip,
      candidateOrder,
      EQUIPMENT_ITEMS,
    );
    const wouldEquip = candidateResolved.some((candidate) => candidate.id === item.id);

    if (wouldEquip) {
      this.track(
        createUiButton(this, {
          x,
          y,
          label: name,
          onClick: () => {
            this.equipAndRerender(item.id);
          },
        }),
      );
      this.track(
        this.add
          .text(x, y + BUTTON_INFO_LINE_OFFSET_PX, statTag, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      return y + ROW_HEIGHT_PX;
    }

    const wouldExceedSlots = currentEquipped.length >= this.effectiveShip.equipmentSlots;
    this.track(
      this.add
        .text(x, y, name, {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    this.track(
      this.add
        .text(x, y + TEXT_INFO_LINE_OFFSET_PX, noFitReasonText(wouldExceedSlots), {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    return y + ROW_HEIGHT_PX;
  }

  private equipAndRerender(itemId: string): void {
    this.equipmentProgress = equipItem(
      this.equipmentProgress,
      this.effectiveShip,
      EQUIPMENT_ITEMS,
      itemId,
    );
    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveEquipmentProgress(storage, this.equipmentProgress);
    }
    this.renderView();
  }

  private unequipAndRerender(itemId: string): void {
    this.equipmentProgress = unequipItem(this.equipmentProgress, EQUIPMENT_ITEMS, itemId);
    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveEquipmentProgress(storage, this.equipmentProgress);
    }
    this.renderView();
  }
}
