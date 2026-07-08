import type { ShipClass } from '../ships/ship';
import type { EquipmentItem } from '../equipment/equipment';
import {
  cycleActiveItem,
  equipmentIdsOfSlotType,
  resolveEquippedItems,
} from '../equipment/loadout';
import type { BaseProgressMap } from './base-progress';
import type { KeyValueStorage } from './safe-local-storage';

export interface EquipmentProgressState {
  /** Equipment ids acquired via the store's purchase transaction — mirrors
   * `ship-progress.ts`'s `purchasedShipIds`. An unlock-type item's
   * availability is instead checked live against a `BaseProgressMap`, same
   * as `isShipAvailable`, so it has no entry here. */
  readonly purchasedEquipmentIds: readonly string[];
  /** Every currently-equipped item's id, in the order it was equipped —
   * not itself re-validated against the current ship's slot/mass budget on
   * every read; `equipment/loadout.ts`'s `resolveEquippedItems` is the one
   * place that reconciles this list against whichever ship is active right
   * now (see that function's own doc comment for why). */
  readonly equippedItemIds: readonly string[];
  readonly activeWeaponId: string | null;
  readonly activeUtilityId: string | null;
}

// Versioned (`:v1` suffix), same convention as every other persistence
// module in this project — a future schema change moves to `:v2` and
// simply orphans old-shape data under the old key rather than migrating in
// place.
export const EQUIPMENT_PROGRESS_STORAGE_KEY = 'orbital-descent:equipment-progress:v1';

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isEquipmentProgressState(value: unknown): value is EquipmentProgressState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['purchasedEquipmentIds']) &&
    candidate['purchasedEquipmentIds'].every((id) => typeof id === 'string') &&
    Array.isArray(candidate['equippedItemIds']) &&
    candidate['equippedItemIds'].every((id) => typeof id === 'string') &&
    isNullableString(candidate['activeWeaponId']) &&
    isNullableString(candidate['activeUtilityId'])
  );
}

/** A fresh save owns and equips no equipment yet. */
export function initialEquipmentProgress(): EquipmentProgressState {
  return {
    purchasedEquipmentIds: [],
    equippedItemIds: [],
    activeWeaponId: null,
    activeUtilityId: null,
  };
}

/**
 * Reads and validates the stored equipment-progress state. Any parse
 * failure or shape mismatch rejects the whole read and falls back to a
 * fresh `initialEquipmentProgress`, rather than sanitizing down to a valid
 * subset — matches every other persistence module's exact resilience
 * philosophy. Beyond the shape check, any id (purchased, equipped, or
 * active) that doesn't name any item in the *current* `allItems` registry
 * (a stale id surviving a roster change between app versions) is treated
 * the same as a shape mismatch, matching `loadShipProgress`'s identical
 * stale-id handling.
 */
export function loadEquipmentProgress(
  storage: KeyValueStorage,
  allItems: readonly EquipmentItem[],
): EquipmentProgressState {
  const raw = storage.getItem(EQUIPMENT_PROGRESS_STORAGE_KEY);
  if (raw === null) {
    return initialEquipmentProgress();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialEquipmentProgress();
  }

  if (!isEquipmentProgressState(parsed)) {
    return initialEquipmentProgress();
  }

  const knownIds = new Set(allItems.map((item) => item.id));
  const everyIdKnown =
    parsed.purchasedEquipmentIds.every((id) => knownIds.has(id)) &&
    parsed.equippedItemIds.every((id) => knownIds.has(id)) &&
    (parsed.activeWeaponId === null || knownIds.has(parsed.activeWeaponId)) &&
    (parsed.activeUtilityId === null || knownIds.has(parsed.activeUtilityId));
  if (!everyIdKnown) {
    return initialEquipmentProgress();
  }

  return parsed;
}

/**
 * Persists the given state. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, so a failed write is silently swallowed —
 * matches every other persistence module's own best-effort write.
 */
export function saveEquipmentProgress(
  storage: KeyValueStorage,
  progress: EquipmentProgressState,
): void {
  try {
    storage.setItem(EQUIPMENT_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/**
 * Pure state transition: records `itemId` as purchased, without mutating
 * `progress`. Idempotent, matching `purchaseShip`/`purchaseUpgrade`'s
 * identical convention.
 */
export function purchaseEquipment(
  progress: EquipmentProgressState,
  itemId: string,
): EquipmentProgressState {
  if (progress.purchasedEquipmentIds.includes(itemId)) {
    return progress;
  }
  return {
    ...progress,
    purchasedEquipmentIds: [...progress.purchasedEquipmentIds, itemId],
  };
}

/**
 * Read-only availability check, mirroring `ship-progress.ts`'s
 * `isShipAvailable` exactly: a `'purchase'` item is available once owned; an
 * `'unlock'` item is available once its `requiredBaseId` reaches
 * `'established'` in the live `BaseProgressMap`.
 */
export function isEquipmentAvailable(
  item: EquipmentItem,
  progress: EquipmentProgressState,
  baseProgress: BaseProgressMap,
): boolean {
  switch (item.acquisition.type) {
    case 'purchase':
      return progress.purchasedEquipmentIds.includes(item.id);
    case 'unlock':
      return baseProgress[item.acquisition.requiredBaseId]?.status === 'established';
  }
}

/** Reconciles `activeWeaponId`/`activeUtilityId` against whichever items are
 * still actually equipped (post-equip, post-unequip) — falls back to the
 * first remaining item of that slot type, or `null` if none remain. Shared
 * by `equipItem`/`unequipItem` below so the two can't independently drift
 * on how a stale active selection gets repaired. */
function normalizeActiveSelections(
  progress: EquipmentProgressState,
  allItems: readonly EquipmentItem[],
): EquipmentProgressState {
  const equippedItems = progress.equippedItemIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is EquipmentItem => item !== undefined);
  const weaponIds = equipmentIdsOfSlotType(equippedItems, 'weapon');
  const utilityIds = equipmentIdsOfSlotType(equippedItems, 'utility');

  const activeWeaponId =
    progress.activeWeaponId !== null && weaponIds.includes(progress.activeWeaponId)
      ? progress.activeWeaponId
      : (weaponIds[0] ?? null);
  const activeUtilityId =
    progress.activeUtilityId !== null && utilityIds.includes(progress.activeUtilityId)
      ? progress.activeUtilityId
      : (utilityIds[0] ?? null);

  return { ...progress, activeWeaponId, activeUtilityId };
}

/**
 * Pure state transition: equips `itemId`, without mutating `progress`. Only
 * ever offered by the loadout screen for an item that already fits the
 * current ship's slot count and mass budget (mirrors `selectShip`/
 * `purchaseShip` trusting their own UI not to expose an action for an
 * invalid state) — re-checked here via `resolveEquippedItems` regardless,
 * so a caller ignoring that precondition gets a safe no-op instead of a
 * silently-inconsistent persisted state.
 */
export function equipItem(
  progress: EquipmentProgressState,
  ship: ShipClass,
  allItems: readonly EquipmentItem[],
  itemId: string,
): EquipmentProgressState {
  if (progress.equippedItemIds.includes(itemId)) {
    return progress;
  }
  const candidateOrder = [...progress.equippedItemIds, itemId];
  const resolved = resolveEquippedItems(ship, candidateOrder, allItems);
  if (!resolved.some((item) => item.id === itemId)) {
    return progress;
  }
  return normalizeActiveSelections({ ...progress, equippedItemIds: candidateOrder }, allItems);
}

/** Pure state transition: unequips `itemId`, without mutating `progress`.
 * Idempotent — unequipping an item that isn't currently equipped is a
 * no-op. Removing an item can never push the remaining set over budget (a
 * strict subset of an already-valid set), so unlike `equipItem` this needs
 * no ship/budget re-check. */
export function unequipItem(
  progress: EquipmentProgressState,
  allItems: readonly EquipmentItem[],
  itemId: string,
): EquipmentProgressState {
  const equippedItemIds = progress.equippedItemIds.filter((id) => id !== itemId);
  if (equippedItemIds.length === progress.equippedItemIds.length) {
    return progress;
  }
  return normalizeActiveSelections({ ...progress, equippedItemIds }, allItems);
}

/** Advances `activeWeaponId` to the next currently-*carried* weapon (after
 * resolving `equippedItemIds` against `ship`'s live slot/mass budget, per
 * `resolveEquippedItems`'s own doc comment) — the cycle-weapon input's pure
 * state transition. */
export function cycleActiveWeapon(
  progress: EquipmentProgressState,
  ship: ShipClass,
  allItems: readonly EquipmentItem[],
): EquipmentProgressState {
  const carried = resolveEquippedItems(ship, progress.equippedItemIds, allItems);
  const weaponIds = equipmentIdsOfSlotType(carried, 'weapon');
  return { ...progress, activeWeaponId: cycleActiveItem(progress.activeWeaponId, weaponIds) };
}

/** Advances `activeUtilityId` to the next currently-*carried* utility item —
 * the cycle-utility input's pure state transition, mirroring
 * `cycleActiveWeapon` exactly for the other slot type. */
export function cycleActiveUtility(
  progress: EquipmentProgressState,
  ship: ShipClass,
  allItems: readonly EquipmentItem[],
): EquipmentProgressState {
  const carried = resolveEquippedItems(ship, progress.equippedItemIds, allItems);
  const utilityIds = equipmentIdsOfSlotType(carried, 'utility');
  return { ...progress, activeUtilityId: cycleActiveItem(progress.activeUtilityId, utilityIds) };
}
