import type { PermanentUpgrade } from '../ships/upgrades';
import type { KeyValueStorage } from './safe-local-storage';

export interface UpgradeProgressState {
  /** Upgrade ids purchased via the store — every permanent upgrade is
   * purchase-only (Decision D14: "bought once, always active"), unlike
   * ships/equipment, so there is no parallel unlock-gated acquisition path
   * to track here. */
  readonly purchasedUpgradeIds: readonly string[];
}

// Versioned (`:v1` suffix), same convention as `ship-progress.ts`/
// `base-progress.ts`/`high-scores.ts` — a future schema change moves to
// `:v2` and simply orphans old-shape data under the old key rather than
// migrating in place.
export const UPGRADE_PROGRESS_STORAGE_KEY = 'orbital-descent:upgrade-progress:v1';

function isUpgradeProgressState(value: unknown): value is UpgradeProgressState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['purchasedUpgradeIds']) &&
    candidate['purchasedUpgradeIds'].every((id) => typeof id === 'string')
  );
}

/** A fresh save owns no upgrades yet. */
export function initialUpgradeProgress(): UpgradeProgressState {
  return { purchasedUpgradeIds: [] };
}

/**
 * Reads and validates the stored upgrade-progress state. Any parse failure
 * or shape mismatch rejects the whole read and falls back to a fresh
 * `initialUpgradeProgress`, rather than sanitizing down to a valid subset —
 * matches `loadShipProgress`/`loadBaseProgress`/`loadCurrencyState`'s exact
 * resilience philosophy. Beyond the shape check, a purchased id that
 * doesn't name any upgrade in the *current* `upgrades` registry (a stale id
 * surviving a roster change between app versions) is treated the same as a
 * shape mismatch — matches `loadShipProgress`'s identical stale-id handling.
 */
export function loadUpgradeProgress(
  storage: KeyValueStorage,
  upgrades: readonly PermanentUpgrade[],
): UpgradeProgressState {
  const raw = storage.getItem(UPGRADE_PROGRESS_STORAGE_KEY);
  if (raw === null) {
    return initialUpgradeProgress();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialUpgradeProgress();
  }

  if (!isUpgradeProgressState(parsed)) {
    return initialUpgradeProgress();
  }

  const everyIdKnown = parsed.purchasedUpgradeIds.every((id) =>
    upgrades.some((upgrade) => upgrade.id === id),
  );
  if (!everyIdKnown) {
    return initialUpgradeProgress();
  }

  return parsed;
}

/**
 * Persists the given state. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, so a failed write is silently swallowed —
 * matches every other persistence module's own best-effort write.
 */
export function saveUpgradeProgress(
  storage: KeyValueStorage,
  progress: UpgradeProgressState,
): void {
  try {
    storage.setItem(UPGRADE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/**
 * Pure state transition: records `upgradeId` as purchased, without mutating
 * `progress`. Idempotent — buying an already-owned upgrade (shouldn't be
 * reachable through the store's own UI, which stops offering an owned
 * listing as buyable) returns `progress` with an unchanged
 * `purchasedUpgradeIds` rather than a duplicate entry, matching
 * `purchaseShip`'s identical idempotency.
 */
export function purchaseUpgrade(
  progress: UpgradeProgressState,
  upgradeId: string,
): UpgradeProgressState {
  if (progress.purchasedUpgradeIds.includes(upgradeId)) {
    return progress;
  }
  return { ...progress, purchasedUpgradeIds: [...progress.purchasedUpgradeIds, upgradeId] };
}

/** Resolves the live list of owned `PermanentUpgrade`s from persisted ids —
 * the one place `GameScene`/`fit-check.ts` go from "which ids are owned" to
 * "which upgrade objects to fold via `applyPermanentUpgrades`," so the two
 * can't independently re-derive this lookup differently. */
export function ownedUpgrades(
  progress: UpgradeProgressState,
  upgrades: readonly PermanentUpgrade[],
): readonly PermanentUpgrade[] {
  return upgrades.filter((upgrade) => progress.purchasedUpgradeIds.includes(upgrade.id));
}
