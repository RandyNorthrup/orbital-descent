import type { ShipClass } from '../ships/ship';
import type { EquipmentItem, EquipmentSlotType } from './equipment';

/**
 * Resolves which equipped-item ids are actually carried right now, against
 * the *current* ship's slot count and mass budget. Persisted equip order
 * (`EquipmentProgressState.equippedItemIds`, `persistence/
 * equipment-progress.ts`) is not itself re-validated on every ship switch —
 * a player can equip a full loadout on a Hauler, then switch to a
 * lower-`equipmentSlots`/lower-`massBudget` Vanguard, and this is the one
 * place that reconciles the mismatch. Walks the persisted order and keeps
 * an item only if it fits within *both* remaining constraints, so an
 * over-budget switch degrades to "carry as much of your intended loadout as
 * still fits, in the order you equipped it," never a hard error — matches
 * `ship-progress.ts`'s general "never throw on a reachable player action"
 * philosophy, extended to a case a stale localStorage id doesn't cover
 * (a live in-session ship swap, not a data-integrity problem).
 */
export function resolveEquippedItems(
  ship: ShipClass,
  equippedItemIdsInEquipOrder: readonly string[],
  allItems: readonly EquipmentItem[],
): readonly EquipmentItem[] {
  const resolved: EquipmentItem[] = [];
  let carriedMass = 0;

  for (const id of equippedItemIdsInEquipOrder) {
    const item = allItems.find((candidate) => candidate.id === id);
    if (!item) {
      continue;
    }
    if (resolved.length >= ship.equipmentSlots) {
      break;
    }
    if (carriedMass + item.mass > ship.massBudget) {
      continue;
    }
    resolved.push(item);
    carriedMass += item.mass;
  }

  return resolved;
}

/**
 * Advances to the next equipped id of one slot type, wrapping around —
 * `GameScene`'s cycle-weapon/cycle-utility inputs are this function called
 * with `equippedIdsOfThisSlotType` pre-filtered to `'weapon'` or `'utility'`
 * respectively (see `equipmentIdsOfSlotType` below). Returns `null` when
 * nothing of that slot type is equipped. A `currentActiveId` no longer
 * present in the list (the active item was just unequipped, or a ship
 * switch trimmed it away) is treated the same as "start from the top" —
 * `indexOf` returns `-1`, and `-1 + 1 === 0` wraps to the first entry
 * without a separate not-found branch.
 */
export function cycleActiveItem(
  currentActiveId: string | null,
  equippedIdsOfThisSlotType: readonly string[],
): string | null {
  if (equippedIdsOfThisSlotType.length === 0) {
    return null;
  }
  const currentIndex =
    currentActiveId === null ? -1 : equippedIdsOfThisSlotType.indexOf(currentActiveId);
  const nextIndex = (currentIndex + 1) % equippedIdsOfThisSlotType.length;
  // nextIndex is always a valid index into a non-empty array (checked
  // above), so the `?? null` fallback is unreachable in practice -- it
  // exists only to satisfy noUncheckedIndexedAccess honestly rather than a
  // non-null assertion.
  return equippedIdsOfThisSlotType[nextIndex] ?? null;
}

/** Filters a resolved equipment list down to one slot type's ids, in
 * order — the shared helper `cycleActiveItem`'s callers and `GameScene`'s
 * "what's the active weapon/utility item's full definition" lookup both
 * need, so the two can't silently disagree on ordering. */
export function equipmentIdsOfSlotType(
  items: readonly EquipmentItem[],
  slotType: EquipmentSlotType,
): readonly string[] {
  return items.filter((item) => item.slotType === slotType).map((item) => item.id);
}
