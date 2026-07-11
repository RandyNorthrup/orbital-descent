import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_FONT_FAMILY,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  OUTLINE_COLOR,
  UI_TEXT_SHADOW_OFFSET_PX,
} from '../constants';
import type { Base } from '../bases/base';
import { BASES, findBodyById } from '../bases/bases';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { initialShipProgress, loadShipProgress } from '../persistence/ship-progress';
import {
  initialUpgradeProgress,
  loadUpgradeProgress,
  ownedUpgrades,
} from '../persistence/upgrade-progress';
import { initialEquipmentProgress, loadEquipmentProgress } from '../persistence/equipment-progress';
import { applyPermanentUpgrades, UPGRADES } from '../ships/upgrades';
import { EQUIPMENT_ITEMS, totalCarriedMass } from '../equipment/equipment';
import { resolveEquippedItems } from '../equipment/loadout';
import { SHIPS, findShipById } from '../ships/ships';
import type { ShipClass } from '../ships/ship';
import { cargoMass, type CargoManifest } from '../missions/cargo';
import type { MissionState } from '../missions/mission';
import { remainingFuelAfterTransit, transitDistanceTU, transitFuelCost } from '../missions/relay';
import type { GameSceneData, MissionContext } from './game-scene';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import { SCENE_KEY_GAME, SCENE_KEY_TRANSIT, SCENE_KEY_WORLD_MAP } from './scene-keys';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.15;
const SUMMARY_START_Y_FRACTION = 0.32;
const SUMMARY_LINE_HEIGHT_PX = 32;
const BUTTON_Y_FRACTION = 0.62;

/** One decimal place is enough precision for a relay's TU distance to read
 * as meaningful without implying false accuracy (matches
 * `world-map-scene.ts`'s identical `DISTANCE_DECIMAL_PLACES`). */
const DISTANCE_DECIMAL_PLACES = 1;
const FUEL_DECIMAL_PLACES = 1;

/**
 * Looks up a `Base` by id — mirrors `world-map-scene.ts`'s own
 * `findBaseById`, duplicated here rather than shared since each scene
 * independently resolves its own registry data (this project's existing
 * per-scene convention, see e.g. every scene's own `track()`/progress-load
 * boilerplate).
 */
function findBaseById(id: string): Base {
  const base = BASES.find((candidate) => candidate.id === id);
  if (!base) {
    throw new Error(`findBaseById: no Base registered with id '${id}'`);
  }
  return base;
}

interface CurrentShipContext {
  readonly effectiveShip: ShipClass;
  readonly equipmentMass: number;
}

/** The currently-equipped ship's flight-relevant stats (owned permanent
 * upgrades folded in) plus its carried equipment mass — same resolution
 * `LoadoutScene`/`GameScene`/`WorldMapScene` each already do in their own
 * `init()`/`create()`. The player cannot reach `ShipSelectScene` while a
 * mission is active (`WorldMapScene` always funnels an in-progress mission
 * back to its own continue/transit action first), so "whatever's currently
 * persisted" is safe to treat as "the ship that flew every leg of this
 * mission." */
function resolveCurrentShipContext(): CurrentShipContext {
  const storage = getSafeLocalStorage();
  const shipProgress =
    storage === null ? initialShipProgress(SHIPS) : loadShipProgress(storage, SHIPS);
  const upgradeProgress =
    storage === null ? initialUpgradeProgress() : loadUpgradeProgress(storage, UPGRADES);
  const equipmentProgress =
    storage === null ? initialEquipmentProgress() : loadEquipmentProgress(storage, EQUIPMENT_ITEMS);

  const baseShip = findShipById(shipProgress.selectedShipId);
  const effectiveShip = applyPermanentUpgrades(baseShip, ownedUpgrades(upgradeProgress, UPGRADES));
  const carriedItems = resolveEquippedItems(
    effectiveShip,
    equipmentProgress.equippedItemIds,
    EQUIPMENT_ITEMS,
  );
  return { effectiveShip, equipmentMass: totalCarriedMass(carriedItems) };
}

/**
 * Milestone 9.5's relay transit step (PLAN.md §9.5.3 point 5/§9.5.6):
 * reached only from `WorldMapScene`, for a relay whose origin/pickup leg
 * just landed safely. Renders a clear, static summary of the abstracted
 * transit (distance, fuel cost, fuel before/after) — no animated sequence,
 * matching this project's "arcade game, not a physics sandbox" scope
 * discipline (PLAN.md §4) — then either continues to the destination leg
 * or, if the transit would leave less than zero fuel, concludes the
 * mission right here as the distinct "stranded" failure mode (PLAN.md
 * §9.5.2), separate from a crash.
 *
 * Everything this scene needs is already on `this.registry`
 * (`'missionState'`, `'relayManifest'`, `'fuelRemainingAtTouchdown'`) or
 * the static ship/base/body registries — it takes no scene-launch data of
 * its own.
 */
export class TransitScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY_TRANSIT);
  }

  create(): void {
    const missionState = this.registry.get('missionState') as MissionState | undefined;
    if (missionState === undefined) {
      throw new Error(
        "TransitScene: this.registry is missing 'missionState' -- WorldMapScene must set it before starting this scene.",
      );
    }
    const definition = missionState.definition;
    if (definition.structure !== 'relay' || definition.destinationBaseId === null) {
      throw new Error(
        `TransitScene: mission '${definition.id}' is not a relay with a destination -- this scene is relay-only.`,
      );
    }

    // Throws like its two registry-read neighbors above/below (found by
    // the post-M15 completeness audit: this one read silently defaulted to
    // an empty manifest instead) — a missing manifest here is the same
    // caller-programming-error class as a missing missionState, and a
    // silent empty default would fly the destination leg with no cargo and
    // conclude the relay as a quiet failure instead of surfacing the bug.
    const relayManifest = this.registry.get('relayManifest') as CargoManifest | undefined;
    if (relayManifest === undefined) {
      throw new Error(
        "TransitScene: this.registry is missing 'relayManifest' -- LoadoutScene must set it when launching a relay's origin leg.",
      );
    }
    const fuelRemainingAtTouchdown = this.registry.get('fuelRemainingAtTouchdown') as
      number | null | undefined;
    if (fuelRemainingAtTouchdown === undefined || fuelRemainingAtTouchdown === null) {
      throw new Error(
        "TransitScene: this.registry is missing a numeric 'fuelRemainingAtTouchdown' -- GameScene must set it on the origin leg's safe landing before this scene starts.",
      );
    }

    const originBase = findBaseById(definition.originBaseId);
    const destinationBase = findBaseById(definition.destinationBaseId);
    const originBody = findBodyById(originBase.worldId);
    const destinationBody = findBodyById(destinationBase.worldId);

    const shipContext = resolveCurrentShipContext();
    const distanceTU = transitDistanceTU(originBase, originBody, destinationBase, destinationBody);
    const totalCarriedMassInTransit = shipContext.equipmentMass + cargoMass(relayManifest);
    const cost = transitFuelCost(distanceTU, shipContext.effectiveShip, totalCarriedMassInTransit);
    const remainingFuel = remainingFuelAfterTransit(fuelRemainingAtTouchdown, cost);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'TRANSIT', {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setOrigin(ORIGIN_CENTER)
      .setShadow(UI_TEXT_SHADOW_OFFSET_PX, UI_TEXT_SHADOW_OFFSET_PX, hexToCss(OUTLINE_COLOR), 0);

    const summaryLines = [
      `${originBase.name.toUpperCase()} -> ${destinationBase.name.toUpperCase()}`,
      `DISTANCE: ${distanceTU.toFixed(DISTANCE_DECIMAL_PLACES)} TU`,
      `TRANSIT FUEL COST: ${cost.toFixed(FUEL_DECIMAL_PLACES)}`,
      `FUEL BEFORE TRANSIT: ${fuelRemainingAtTouchdown.toFixed(FUEL_DECIMAL_PLACES)}`,
      `FUEL AFTER TRANSIT: ${remainingFuel.toFixed(FUEL_DECIMAL_PLACES)}`,
    ];
    summaryLines.forEach((line, index) => {
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * SUMMARY_START_Y_FRACTION + index * SUMMARY_LINE_HEIGHT_PX,
          line,
          {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER);
    });

    if (remainingFuel < 0) {
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * SUMMARY_START_Y_FRACTION + summaryLines.length * SUMMARY_LINE_HEIGHT_PX,
          'STRANDED -- INSUFFICIENT FUEL TO COMPLETE THE TRANSIT',
          {
            fontFamily: UI_FONT_FAMILY,
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER);

      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * BUTTON_Y_FRACTION,
        label: 'ACKNOWLEDGE (MISSION FAILED)',
        onClick: () => {
          // The distinct "stranded" failure mode (PLAN.md §9.5.2) -- not a
          // crash, but the same end state: the mission concludes as a
          // failure, nothing left to credit, `missionState` itself is left
          // untouched (WorldMapScene's own concluded-mission handling reads
          // it read-only before clearing every Milestone 9.5 registry key).
          this.registry.set('missionStatus', 'failure');
          this.scene.start(SCENE_KEY_WORLD_MAP);
        },
      });
      return;
    }

    createUiButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT * BUTTON_Y_FRACTION,
      label: 'CONTINUE',
      onClick: () => {
        const mission: MissionContext = {
          manifestThisTrip: relayManifest,
          startingFuel: remainingFuel,
        };
        const data: GameSceneData = { base: destinationBase, mission };
        this.scene.start(SCENE_KEY_GAME, data);
      },
    });
  }
}
