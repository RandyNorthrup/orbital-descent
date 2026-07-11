import Phaser from 'phaser';
import {
  EXTRACTION_MATERIALS_UNITS,
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
import {
  EMPTY_MANIFEST,
  cargoMass,
  evaluateCargoFit,
  meetsMinManifest,
  type CargoManifest,
  type CargoType,
} from '../missions/cargo';
import { createMissionState, type MissionDefinition, type MissionState } from '../missions/mission';
import type { GameSceneData, MissionContext } from './game-scene';
import {
  SCENE_KEY_GAME,
  SCENE_KEY_LOADOUT,
  SCENE_KEY_MENU,
  SCENE_KEY_WORLD_MAP,
} from './scene-keys';
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

/** How far left/right of center each equipment column sits (2 weapons vs 6
 * utility items, Milestone 11's Barrier Shield the latest addition, split
 * into their own column per LAYOUT SAFETY guidance — halves the tallest
 * column from 8 rows to 6). Leaves ~220px of half-width budget on each side
 * before the two columns' text could ever meet at center, comfortably more
 * than this roster's longest row string (`"UNLOCK: ESTABLISH SCARP
 * OUTPOST"` at `UI_BODY_FONT_SIZE_PX`, ~300px wide) needs. */
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
 * reason, then reduced again by Milestone 11 (12 -> 6) once a 6th utility
 * item (Barrier Shield) pushed the utility column's `BACK` button past
 * `GAME_HEIGHT` -- re-verified against a real screenshot that this smaller
 * gap alone (not `INFO_LINE_GAP_PX`, which stays at its own already-tight
 * proven value) keeps every row visually separated. */
const ROW_GAP_PX = 6;
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
 * convention. Reduced by Milestone 11 (24 -> 12) alongside `ROW_GAP_PX`,
 * same reason. */
const BACK_BUTTON_GAP_PX = 12;

/* ---------------------------------------------------------------------- */
/* Milestone 9.5's mission/cargo extension                                 */
/* ---------------------------------------------------------------------- */

/** Whole squads only per click (troops are discrete, `cargo.ts`'s own doc
 * comment: "you can't deliver 0.6 of a squad"). */
const TROOP_STEP_UNITS = 1;
/** Supplies are "continuously loadable" (`cargo.ts`) -- a UI stepper still
 * needs a concrete click granularity; 5 units/click keeps this project's
 * shipped mission sizes (20-60 units, PLAN.md §9.5.7) reachable in a
 * reasonable number of clicks without pretending to be a true analog
 * slider this project has no drag-input convention for yet. */
const SUPPLY_STEP_UNITS = 5;

/** The mission section renders in the horizontal band the two equipment
 * columns leave empty below the (always exactly 2-row) weapon column --
 * see this file's own class-level doc comment on `renderMissionSection`
 * for why this placement, not a third full-width column, is what fits
 * Milestone 9's already nearly-full 640px vertical budget. */
const MISSION_SECTION_GAP_PX = 20;
const MISSION_LINE_HEIGHT_PX = 26;
const MISSION_STEPPER_BUTTON_GAP_PX = 90;
const MISSION_ROW_GAP_PX = 12;

/** Half of a real `createUiButton`'s own painted height -- reused for the
 * LAUNCH row's own inert-reason offset, same derivation as
 * `BUTTON_HALF_HEIGHT_PX` above. */
const MISSION_BUTTON_HALF_HEIGHT_PX = UI_BUTTON_FONT_SIZE_PX / 2 + UI_BUTTON_PADDING_Y;

/**
 * A mission being prepared at this screen (Milestone 9.5) — the
 * `MissionDefinition` to launch, plus the in-progress `MissionState` to
 * reuse when this is a return visit for a multi-trip mission's 2nd+ trip
 * (absent for every brand-new mission attempt, including a relay's origin
 * leg, which is always brand new: its destination leg is launched by
 * `TransitScene` directly, never by revisiting this screen).
 */
export interface LoadoutMissionContext {
  readonly definition: MissionDefinition;
  readonly existingState?: MissionState;
}

/** Absent entirely reproduces certified Milestone 9 behavior byte-for-byte
 * (reached from Menu's LOADOUT button) — equipment-only, BACK returns to
 * Menu. Present (reached from `WorldMapScene`'s mission-select screen)
 * additionally renders the cargo-manifest picker below, and BACK returns to
 * `WorldMapScene` instead of Menu. */
export interface LoadoutSceneData {
  readonly mission?: LoadoutMissionContext;
}

/**
 * Which cargo type(s) a mission's manifest picker should offer — derived
 * from flavor/structure rather than read straight off `minManifest`, since
 * a Resupply mission's `minManifest` is always `{}` (no named minimum,
 * PLAN.md §9.5.4) even though its whole narrative point is carrying
 * supplies; Establish Presence always names `troops` in its own
 * `minManifest` so that half needs no such inference. Every mission this
 * project ships needs exactly one type here; the shape stays a list for a
 * future mission that might genuinely need both.
 */
function relevantCargoTypesFor(definition: MissionDefinition): readonly CargoType[] {
  if (definition.structure === 'multi-trip-same-base') {
    const target = definition.cargoTarget;
    return target === null ? [] : [target.type];
  }
  if (definition.flavor === 'establish-presence') {
    return ['troops'];
  }
  if (definition.flavor === 'extraction') {
    // Milestone 15: the haul flows INBOUND (loaded at the pad on
    // touchdown) — an outbound cargo stepper would only waste mass budget
    // on a mission that can't use it.
    return [];
  }
  return ['supplies'];
}

/** Whether `candidate` already satisfies what this mission needs to LAUNCH
 * with. First, the shared-mass-pool invariant (PLAN.md §9.5.1: "the single
 * constraint is `totalCarriedMass ≤ shipClass.massBudget`... both are
 * checked together; failing either blocks launch") — re-checked here
 * against `ship`/`equipmentMass` at the actual moment of LAUNCH, not just
 * at each individual cargo-stepper click (`renderCargoStepperRow`'s own
 * `evaluateCargoFit` gate), because equipping *more* gear after already
 * loading cargo is never re-validated against the combined total
 * otherwise — the stepper's own bound goes stale the moment `equipmentMass`
 * changes out from under it. Second, `multi-trip-same-base` and `relay`
 * both additionally require a nonzero pick even though their `minManifest`
 * can be `{}` (Resupply flavor, PLAN.md §9.5.4): a zero-cargo multi-trip
 * launch would just waste mission-clock time for nothing, and a zero-cargo
 * relay origin leg can never satisfy `mission.ts`'s `isTargetMet` (which
 * itself requires nonzero delivered mass for `structure === 'relay'`,
 * precisely so an empty pickup leg can't trivially conclude the mission) —
 * so it would softlock the relay in an unwinnable repeat-the-destination-
 * leg loop. `single-trip` has no such downside (it resolves in one leg, no
 * clock), so its own intentional zero-cargo-succeeds Resupply case is
 * untouched. */
function meetsLaunchRequirement(
  definition: MissionDefinition,
  candidate: CargoManifest,
  ship: ShipClass,
  equipmentMass: number,
): boolean {
  const fit = evaluateCargoFit(ship, equipmentMass, candidate);
  if (!fit.fitsCargoBay || !fit.fitsMassBudget) {
    return false;
  }
  if (definition.structure === 'multi-trip-same-base' || definition.structure === 'relay') {
    return cargoMass(candidate) > 0 && meetsMinManifest(candidate, definition.minManifest);
  }
  return meetsMinManifest(candidate, definition.minManifest);
}

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
    case 'shield':
      return `${mass} · BLOCKS ${effect.hitsAbsorbed.toString()} HIT (SHIELD T${effect.tier.toString()}, UTILITY)`;
    case 'repairKit':
      return `${mass} · +${effect.fuelRestored.toString()} FUEL ON USE (UTILITY)`;
    case 'thrustBurst': {
      const seconds = effect.durationMs / MILLISECONDS_PER_SECOND;
      return `${mass} · +${effect.bonusThrustAccel.toString()} THR for ${seconds.toString()}s (UTILITY)`;
    }
  }
}

/**
 * The pre-mission loadout screen (Milestone 9, extended by Milestone 9.5):
 * chooses which owned/unlocked equipment is equipped within the currently
 * selected ship's slot count and mass budget. Reads (never writes) the
 * ship/upgrade selection — `GameScene`/`ShipSelectScene`/`StoreScene` own
 * those — and reads+writes `persistence/equipment-progress.ts`'s equip/
 * unequip state, the one piece of progress this screen actually manages.
 * Permanent upgrades (Decision D14: "bought once, always active, no slot
 * cost") are shown here only as an informational one-line summary, never
 * interactive — the store is the only place to buy one.
 *
 * Milestone 9.5 extends this screen (doesn't replace it, PLAN.md §9.5.1)
 * with an optional cargo-manifest picker when reached with mission data:
 * absent `mission` scene data reproduces certified Milestone 9 behavior
 * byte-for-byte (equipment-only, BACK returns to Menu); present, this
 * screen additionally renders troop/supply steppers bounded by
 * `evaluateCargoFit`, folds cargo mass into the same shared usage line
 * equipment already uses, and gates a LAUNCH action on the mission's own
 * cargo requirement -- BACK returns to `WorldMapScene` instead of Menu in
 * this mode.
 */
export class LoadoutScene extends Phaser.Scene {
  private effectiveShip!: ShipClass;
  private equipmentProgress!: EquipmentProgressState;
  private baseProgress!: BaseProgressMap;
  private ownedUpgradeNames: readonly string[] = [];
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;
  /** Present only when this screen was reached from `WorldMapScene`'s
   * mission-select flow (Milestone 9.5) — see this class's own doc comment. */
  private missionContext: LoadoutMissionContext | null = null;
  /** This launch's player-chosen cargo manifest -- always starts empty on
   * entry (PLAN.md §9.5.2: "cargo quantity per trip is player-chosen at
   * each launch," never carried over from a previous trip/render). */
  private chosenManifest: CargoManifest = EMPTY_MANIFEST;

  constructor() {
    super(SCENE_KEY_LOADOUT);
  }

  create(data: LoadoutSceneData = {}): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backGuard = new ArmedKeyGuard(this.keyEscape);
    this.missionContext = data.mission ?? null;
    this.chosenManifest = EMPTY_MANIFEST;

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
      this.scene.start(this.missionContext === null ? SCENE_KEY_MENU : SCENE_KEY_WORLD_MAP);
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
    // Milestone 9.5: the shared mass-budget bar now folds in this launch's
    // chosen cargo mass too (`0` when no mission is being prepared, so this
    // line reduces to Milestone 9's plain equipment-only figure in that
    // mode) -- one bar, one number, per PLAN.md §9.5.1's "one shared mass
    // pool, not two."
    const cargoMassThisLaunch = this.missionContext === null ? 0 : cargoMass(this.chosenManifest);
    const totalMassThisLaunch = carriedMass + cargoMassThisLaunch;
    this.track(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * USAGE_LINE_Y_FRACTION,
          `${this.effectiveShip.name.toUpperCase()} · SLOTS ${currentEquipped.length.toString()}/` +
            `${this.effectiveShip.equipmentSlots.toString()} · MASS ${totalMassThisLaunch.toString()}/` +
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

    // Milestone 9.5's mission section renders in the weapon column's own
    // horizontal band, starting below its (always exactly 2-row) content --
    // see `renderMissionSection`'s own doc comment for why this placement.
    const missionSectionEndY =
      this.missionContext === null
        ? weaponEndY
        : this.renderMissionSection(this.missionContext, carriedMass, weaponColumnX, weaponEndY);

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: Math.max(weaponEndY, utilityEndY, missionSectionEndY) + BACK_BUTTON_GAP_PX,
        label: 'BACK',
        onClick: () => {
          this.scene.start(this.missionContext === null ? SCENE_KEY_MENU : SCENE_KEY_WORLD_MAP);
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

  /**
   * Milestone 9.5's cargo-manifest picker, rendered in the weapon column's
   * own horizontal band (`x` is `weaponColumnX`), starting below its
   * content (`startY` is `weaponEndY`). The weapon column is always
   * exactly 2 rows (`EQUIPMENT_ITEMS`'s fixed 2-weapon roster) while the
   * utility column is up to 5 -- this leaves a real, unused vertical band
   * directly below the (shorter) weapon column and directly above the
   * BACK button, which is exactly the room this section needs. A third
   * full-width column at the same y as the equipment rows was considered
   * and rejected: `WEAPON_COLUMN_X_FRACTION`/`UTILITY_COLUMN_X_FRACTION`'s
   * own doc comments already show the two columns' text can extend to
   * within a few px of screen-center, leaving no real horizontal gap for a
   * third column of readable text at that same y.
   *
   * Returns the y the next content below this section (the BACK button)
   * should start at.
   */
  private renderMissionSection(
    missionContext: LoadoutMissionContext,
    equipmentMass: number,
    x: number,
    startY: number,
  ): number {
    const { definition, existingState } = missionContext;
    let y = startY + MISSION_SECTION_GAP_PX;

    this.track(
      this.add
        .text(x, y, missionTitleText(definition), {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    y += MISSION_LINE_HEIGHT_PX;

    this.track(
      this.add
        .text(x, y, requirementLineText(definition, existingState), {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    y += MISSION_LINE_HEIGHT_PX + MISSION_ROW_GAP_PX;

    for (const type of relevantCargoTypesFor(definition)) {
      y = this.renderCargoStepperRow(type, equipmentMass, x, y);
    }

    const cargoBayUsed = cargoMass(this.chosenManifest);
    this.track(
      this.add
        .text(
          x,
          y,
          `CARGO BAY: ${cargoBayUsed.toString()}/${this.effectiveShip.cargoBayCapacity.toString()} MU`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );
    y += MISSION_LINE_HEIGHT_PX + MISSION_ROW_GAP_PX;

    const fit = evaluateCargoFit(this.effectiveShip, equipmentMass, this.chosenManifest);
    const launchReady = meetsLaunchRequirement(
      definition,
      this.chosenManifest,
      this.effectiveShip,
      equipmentMass,
    );
    if (launchReady) {
      this.track(
        createUiButton(this, {
          x,
          y,
          label: 'LAUNCH',
          onClick: () => {
            this.launchMission(missionContext);
          },
        }),
      );
    } else {
      // The blocked reason is folded into this one line (not a separate
      // line below, like equipment's locked/no-fit rows use) -- this
      // section's own vertical budget is tighter than the equipment
      // columns' (see `renderMissionSection`'s own doc comment). An
      // Establish Presence single-trip/relay's blocked reason is already
      // the exact text of the requirement line shown above the stepper;
      // multi-trip and a Resupply-flavored relay both need their own "pick
      // at least 1 unit" rule stated here, since their requirement line
      // above reads "NO MINIMUM CARGO REQUIRED" and wouldn't otherwise
      // explain why LAUNCH is still inert. The mass-budget case (gear
      // equipped after cargo was already chosen, pushing the combined
      // total over `massBudget`/`cargoBayCapacity`) takes priority over
      // the zero-cargo reason since it can equally apply when cargo is
      // nonzero.
      const needsZeroCargoReason =
        definition.structure === 'multi-trip-same-base' ||
        (definition.structure === 'relay' && definition.flavor === 'resupply');
      const reason =
        !fit.fitsCargoBay || !fit.fitsMassBudget
          ? ` (${OVER_MASS_BUDGET_LAUNCH_BLOCKED_REASON})`
          : needsZeroCargoReason
            ? ` (${ZERO_CARGO_LAUNCH_BLOCKED_REASON})`
            : '';
      this.track(
        this.add
          .text(x, y, `LAUNCH${reason}`, {
            fontFamily: 'monospace',
            fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
    }

    return y + MISSION_BUTTON_HALF_HEIGHT_PX * 2 + MISSION_LINE_HEIGHT_PX;
  }

  /** Renders one cargo type's stepper row ("TROOPS: 6" flanked by "TROOPS
   * -"/"TROOPS +" buttons, greyed out at either bound) at `x, y`, returning
   * the y the next row should start at. Bounded by `evaluateCargoFit`
   * against `equipmentMass` (this launch's already-equipped mass) so the
   * stepper can never be pushed past the ship's `cargoBayCapacity`/
   * `massBudget` -- this project's "never offer a button for an action
   * that would silently no-op/fail" convention, same as equipment's own
   * SLOTS FULL/TOO HEAVY rows above. */
  private renderCargoStepperRow(
    type: CargoType,
    equipmentMass: number,
    x: number,
    y: number,
  ): number {
    const amount = this.chosenManifest[type];
    const step = type === 'troops' ? TROOP_STEP_UNITS : SUPPLY_STEP_UNITS;

    this.track(
      this.add
        .text(x, y, `${type.toUpperCase()}: ${amount.toString()}`, {
          fontFamily: 'monospace',
          fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    // The -/+ buttons sit on their own row below the amount label (not
    // beside it) -- a first version placed them beside the label at the
    // same y and found, in a real screenshot, that a wide label ("TROOPS: 0")
    // painted directly under/through the "-" button at any gap narrow
    // enough to still fit this column's own horizontal budget. Stacking
    // removes the collision regardless of label/button text width.
    const buttonY = y + MISSION_LINE_HEIGHT_PX;
    const minusX = x - MISSION_STEPPER_BUTTON_GAP_PX;
    const plusX = x + MISSION_STEPPER_BUTTON_GAP_PX;
    const minusLabel = `${type.toUpperCase()} -`;
    const plusLabel = `${type.toUpperCase()} +`;

    if (amount > 0) {
      this.track(
        createUiButton(this, {
          x: minusX,
          y: buttonY,
          label: minusLabel,
          onClick: () => {
            this.adjustCargo(type, -step);
          },
        }),
      );
    } else {
      this.track(
        this.add
          .text(minusX, buttonY, minusLabel, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
    }

    const candidateIncrement: CargoManifest = { ...this.chosenManifest, [type]: amount + step };
    const incrementFit = evaluateCargoFit(this.effectiveShip, equipmentMass, candidateIncrement);
    if (incrementFit.fitsCargoBay && incrementFit.fitsMassBudget) {
      this.track(
        createUiButton(this, {
          x: plusX,
          y: buttonY,
          label: plusLabel,
          onClick: () => {
            this.adjustCargo(type, step);
          },
        }),
      );
    } else {
      this.track(
        this.add
          .text(plusX, buttonY, plusLabel, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
    }

    return buttonY + MISSION_LINE_HEIGHT_PX + MISSION_ROW_GAP_PX;
  }

  private adjustCargo(type: CargoType, delta: number): void {
    const nextAmount = Math.max(0, this.chosenManifest[type] + delta);
    this.chosenManifest = { ...this.chosenManifest, [type]: nextAmount };
    this.renderView();
  }

  /**
   * Resolves the `MissionState` to use (the passed-in in-progress one if
   * continuing a multi-trip mission, otherwise a fresh one), sets it on
   * `this.registry` per `GameScene`'s own contract (`MissionContext` doc
   * comment, `game-scene.ts`), and starts `GameScene` for this trip/leg.
   * A relay's origin/pickup leg always flies with an empty manifest (cargo
   * is picked up *at* the origin, not carried in flight -- PLAN.md
   * §9.5.2/§9.5.6, `MissionContext.manifestThisTrip`'s own doc comment) --
   * the player's chosen full payload is instead persisted under its own
   * registry key (`'relayManifest'`) for `TransitScene`/the destination
   * leg to read back once the transit itself has been resolved.
   */
  private launchMission(missionContext: LoadoutMissionContext): void {
    const { definition, existingState } = missionContext;
    const missionState = existingState ?? createMissionState(definition, Date.now());
    this.registry.set('missionState', missionState);

    const isRelayOriginLeg = definition.structure === 'relay';
    if (isRelayOriginLeg) {
      this.registry.set('relayManifest', this.chosenManifest);
    }

    const mission: MissionContext = {
      manifestThisTrip: isRelayOriginLeg ? EMPTY_MANIFEST : this.chosenManifest,
    };
    const base = BASES.find((candidate) => candidate.id === definition.originBaseId);
    if (!base) {
      throw new Error(`launchMission: no Base registered with id '${definition.originBaseId}'.`);
    }
    const data: GameSceneData = { base, mission };
    this.scene.start(SCENE_KEY_GAME, data);
  }
}

/** "MISSION: ESTABLISH PRESENCE — ANCHOR STATION" / "MISSION: RESUPPLY
 * (MULTI-TRIP) — MERIDIAN YARD" / "MISSION: RELAY — ANCHOR STATION TO
 * SCARP OUTPOST". */
function missionTitleText(definition: MissionDefinition): string {
  const originName = baseNameOf(definition.originBaseId);
  if (definition.structure === 'relay') {
    const destinationName =
      definition.destinationBaseId === null ? '?' : baseNameOf(definition.destinationBaseId);
    return `MISSION: RELAY — ${originName} TO ${destinationName}`;
  }
  const flavorLabel =
    definition.flavor === 'establish-presence'
      ? 'ESTABLISH PRESENCE'
      : definition.flavor === 'extraction'
        ? 'EXTRACT MATERIALS'
        : definition.structure === 'multi-trip-same-base'
          ? 'RESUPPLY (MULTI-TRIP)'
          : 'RESUPPLY';
  return `MISSION: ${flavorLabel} — ${originName}`;
}

function baseNameOf(baseId: string): string {
  const base = BASES.find((candidate) => candidate.id === baseId);
  return (base?.name ?? baseId).toUpperCase();
}

/** "TARGET: 60 SUPPLIES" (fresh multi-trip) / "DELIVERED: 20/60 SUPPLIES"
 * (continuing multi-trip) / "REQUIRES: 6 TROOPS" (single-trip/relay with a
 * minimum) / "NO MINIMUM CARGO REQUIRED" (a Resupply single-trip/relay,
 * whose `minManifest` names no type at all). */
function requirementLineText(definition: MissionDefinition, existingState?: MissionState): string {
  if (definition.structure === 'multi-trip-same-base') {
    const target = definition.cargoTarget;
    if (target === null) {
      throw new Error('requirementLineText: multi-trip-same-base mission is missing cargoTarget.');
    }
    if (existingState) {
      const delivered = existingState.delivered[target.type];
      return `DELIVERED: ${delivered.toString()}/${target.units.toString()} ${target.type.toUpperCase()}`;
    }
    return `TARGET: ${target.units.toString()} ${target.type.toUpperCase()}`;
  }

  if (definition.flavor === 'extraction') {
    return `HAUL ON TOUCHDOWN: ${EXTRACTION_MATERIALS_UNITS.toString()} RAW MATERIALS`;
  }

  const parts: string[] = [];
  if (definition.minManifest.troops !== undefined && definition.minManifest.troops > 0) {
    parts.push(`${definition.minManifest.troops.toString()} TROOPS`);
  }
  if (definition.minManifest.supplies !== undefined && definition.minManifest.supplies > 0) {
    parts.push(`${definition.minManifest.supplies.toString()} SUPPLIES`);
  }
  return parts.length === 0 ? 'NO MINIMUM CARGO REQUIRED' : `REQUIRES: ${parts.join(' · ')}`;
}

/** Why LAUNCH is currently inert for a `'multi-trip-same-base'` mission, or
 * a `'relay'` whose `minManifest` is empty (Resupply flavor, PLAN.md
 * §9.5.4) -- the two cases where `meetsLaunchRequirement`'s own nonzero-
 * cargo guard is the actual blocker, not the ordinary `minManifest`
 * threshold already stated in the requirement line above the stepper (an
 * Establish Presence relay/single-trip's blocked reason IS that line, so
 * they need no extra text here). Kept short (unlike `requirementLineText`'s
 * fuller wording) since it shares one line with "LAUNCH" itself, at
 * button-sized (not body-sized) font. */
const ZERO_CARGO_LAUNCH_BLOCKED_REASON = 'NEED CARGO';

/** Why LAUNCH is inert when equipping gear after already choosing cargo
 * pushed the combined total over `massBudget`/`cargoBayCapacity` -- the
 * cargo stepper's own `evaluateCargoFit` gate only bounds *increasing*
 * cargo against `equipmentMass` at click time, so it goes stale the moment
 * more gear is equipped afterward; `meetsLaunchRequirement`'s own re-check
 * at LAUNCH is what actually catches this, and needs its own short label
 * here for the same reason `ZERO_CARGO_LAUNCH_BLOCKED_REASON` does. */
const OVER_MASS_BUDGET_LAUNCH_BLOCKED_REASON = 'OVER MASS BUDGET';
