import type { ShipClass } from '../ships/ship';
import type { BaseProgressMap } from './base-progress';
import type { KeyValueStorage } from './safe-local-storage';

export interface ShipProgressState {
  /** The currently equipped ship — every flight (free flight, a curated
   * base, a restart) resolves its `ShipClass` from this field, not a
   * per-launch parameter, since equipping a ship is a persistent loadout
   * choice, not something picked fresh each time you fly (`GameScene`
   * reads this directly rather than every caller threading a `shipId`
   * through their own scene data). */
  readonly selectedShipId: string;
  /** Ship ids acquired via Milestone 8's purchase transaction. Always
   * empty until that milestone exists to populate it — exists now so M8
   * doesn't need a storage-schema migration to add it later (same
   * "cheaper to bake in now" reasoning as `BaseProgress.resupplyCounts`,
   * Milestone 6). */
  readonly purchasedShipIds: readonly string[];
}

// Versioned (`:v1` suffix), same convention as `base-progress.ts`/
// `high-scores.ts` — a future schema change moves to `:v2` and simply
// orphans old-shape data under the old key rather than migrating in place.
export const SHIP_PROGRESS_STORAGE_KEY = 'orbital-descent:ship-progress:v1';

function isShipProgressState(value: unknown): value is ShipProgressState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['selectedShipId'] === 'string' &&
    Array.isArray(candidate['purchasedShipIds']) &&
    candidate['purchasedShipIds'].every((id) => typeof id === 'string')
  );
}

/** A fresh save equips the first registered ship (`SHIPS[0]`, Falcon) and
 * owns no purchases yet. */
export function initialShipProgress(
  ships: readonly [ShipClass, ...ShipClass[]],
): ShipProgressState {
  return { selectedShipId: ships[0].id, purchasedShipIds: [] };
}

/**
 * Reads and validates the stored ship-progress state. Any parse failure or
 * shape mismatch rejects the whole read and falls back to a fresh
 * `initialShipProgress`, rather than sanitizing down to a valid subset —
 * matches `loadBaseProgress`/`loadHighScores`'s exact resilience
 * philosophy. Beyond the shape check, a `selectedShipId` that doesn't name
 * any ship in the *current* `ships` registry (a stale id surviving a roster
 * change between app versions) is treated the same as a shape mismatch —
 * otherwise a caller resolving it via `findShipById` would throw later,
 * far from where the actually-invalid data was read.
 */
export function loadShipProgress(
  storage: KeyValueStorage,
  ships: readonly [ShipClass, ...ShipClass[]],
): ShipProgressState {
  const raw = storage.getItem(SHIP_PROGRESS_STORAGE_KEY);
  if (raw === null) {
    return initialShipProgress(ships);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialShipProgress(ships);
  }

  if (!isShipProgressState(parsed)) {
    return initialShipProgress(ships);
  }

  if (!ships.some((ship) => ship.id === parsed.selectedShipId)) {
    return initialShipProgress(ships);
  }

  return parsed;
}

/**
 * Persists the given state. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, so a failed write is silently swallowed —
 * matches `saveBaseProgress`/`recordHighScore`'s own best-effort write.
 */
export function saveShipProgress(storage: KeyValueStorage, progress: ShipProgressState): void {
  try {
    storage.setItem(SHIP_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/**
 * Pure state transition: equips `shipId`, without mutating `progress`. Does
 * not itself re-check `isShipAvailable` — the ship-select screen only ever
 * offers this action for an already-available ship (matches
 * `establishBase`/`WorldMapScene.launchBase` trusting their own UI not to
 * expose an action for a locked entry). An unknown `shipId` is a real
 * caller-programming-error, not a reachable UI state, so it throws rather
 * than silently no-op'ing.
 */
export function selectShip(
  ships: readonly [ShipClass, ...ShipClass[]],
  progress: ShipProgressState,
  shipId: string,
): ShipProgressState {
  if (!ships.some((ship) => ship.id === shipId)) {
    throw new Error(`selectShip: unknown ship id "${shipId}".`);
  }
  return { ...progress, selectedShipId: shipId };
}

/**
 * Read-only availability check (this milestone's own scope — wiring a real
 * purchase transaction is Milestone 8's job). `'starter'` ships are always
 * available; `'purchase'` ships are available only once Milestone 8 adds
 * their id to `purchasedShipIds` (never true today); `'unlock'` ships are
 * available once their `requiredBaseId` reaches `'established'` in the live
 * `BaseProgressMap`.
 */
export function isShipAvailable(
  ship: ShipClass,
  progress: ShipProgressState,
  baseProgress: BaseProgressMap,
): boolean {
  switch (ship.acquisition.type) {
    case 'starter':
      return true;
    case 'purchase':
      return progress.purchasedShipIds.includes(ship.id);
    case 'unlock':
      return baseProgress[ship.acquisition.requiredBaseId]?.status === 'established';
  }
}
