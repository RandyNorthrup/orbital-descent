import type { Base, BaseProgress } from '../bases/base';
import type { KeyValueStorage } from './safe-local-storage';

export type BaseProgressMap = Readonly<Record<string, BaseProgress>>;

// Versioned (`:v1` suffix) so a future schema change can move to `:v2` and
// simply orphan old-shape data under the old key rather than needing to
// migrate it in place. See `high-scores.ts`'s identical convention.
export const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';

function isBaseProgress(value: unknown): value is BaseProgress {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate['status'] === 'locked' ||
      candidate['status'] === 'discovered-unclaimed' ||
      candidate['status'] === 'established') &&
    (candidate['establishedAt'] === null ||
      (typeof candidate['establishedAt'] === 'number' &&
        Number.isFinite(candidate['establishedAt']))) &&
    // resupplyCounts is conceptually a count, not an arbitrary finite
    // number -- matches high-scores.ts's Number.isInteger precedent for
    // `score`. Number.isInteger already implies finite (false for
    // NaN/Infinity), so no separate Number.isFinite check is needed.
    typeof candidate['resupplyCounts'] === 'number' &&
    Number.isInteger(candidate['resupplyCounts']) &&
    candidate['resupplyCounts'] >= 0
  );
}

function isBaseProgressMap(value: unknown): value is Record<string, BaseProgress> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(isBaseProgress);
}

/**
 * Builds a fresh progress map for a brand-new save: every base starts at
 * exactly its own authored `status` (from the static `bases.ts` registry),
 * never established, never resupplied.
 */
export function initialBaseProgress(bases: readonly Base[]): BaseProgressMap {
  const progress: Record<string, BaseProgress> = {};
  for (const base of bases) {
    progress[base.id] = { status: base.status, establishedAt: null, resupplyCounts: 0 };
  }
  return progress;
}

/**
 * Reads and validates the stored base-progress map. A real production
 * browser can have literally anything under this key -- a previous
 * different app version's shape, a hand-edited garbage string, truncated
 * JSON from a quota issue -- so any parse failure or shape mismatch (in the
 * map itself or any single entry) rejects the whole read and falls back to
 * a fresh `initialBaseProgress`, rather than sanitizing down to the valid
 * subset. Matches `loadHighScores`'s exact resilience philosophy.
 */
export function loadBaseProgress(
  storage: KeyValueStorage,
  bases: readonly Base[],
): BaseProgressMap {
  const raw = storage.getItem(BASE_PROGRESS_STORAGE_KEY);
  if (raw === null) {
    return initialBaseProgress(bases);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialBaseProgress(bases);
  }

  if (!isBaseProgressMap(parsed)) {
    return initialBaseProgress(bases);
  }

  return parsed;
}

/**
 * Persists the given progress map. The write is best-effort: Safari
 * private-browsing mode's zero storage quota throwing on `setItem` is a
 * real, documented browser behavior, not hypothetical, so a failed write
 * is silently swallowed -- matches `recordHighScore`'s own best-effort
 * write.
 */
export function saveBaseProgress(storage: KeyValueStorage, progress: BaseProgressMap): void {
  try {
    storage.setItem(BASE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/**
 * Pure state transition: establishes `baseId` and propagates unlocks to the
 * bases it names, without mutating `progress`.
 */
export function establishBase(
  bases: readonly Base[],
  progress: BaseProgressMap,
  baseId: string,
  establishedAtMs: number,
): BaseProgressMap {
  const base = bases.find((candidate) => candidate.id === baseId);
  if (!base) {
    // A real data-integrity bug if it happens -- the caller controls which
    // id it passes, so this surfaces a real caller error loudly rather
    // than silently producing wrong data (matches `requireKeyboard`'s
    // throw-over-silent-default precedent elsewhere in this codebase).
    throw new Error(`establishBase: unknown base id "${baseId}".`);
  }

  const existing = progress[baseId];
  const updated: Record<string, BaseProgress> = {
    ...progress,
    [baseId]: {
      status: 'established',
      establishedAt: existing?.establishedAt ?? establishedAtMs,
      resupplyCounts: existing?.resupplyCounts ?? 0,
    },
  };

  for (const unlockedId of base.unlocks) {
    const unlockedProgress = updated[unlockedId];
    if (unlockedProgress?.status === 'locked') {
      updated[unlockedId] = { ...unlockedProgress, status: 'discovered-unclaimed' };
    }
  }

  return updated;
}

/**
 * Pure state transition: increments `baseId`'s `resupplyCounts`, without
 * mutating `progress` (Milestone 9.5's Resupply/Reinforcement flavor,
 * PLAN.md §9.5.4) — unlike `establishBase`, this never changes `status` and
 * never propagates `unlocks`; a resupply mission is repeatable indefinitely
 * and never gates world-map progression (that's the deliberate design
 * point — see §9.5.4). Feeds Milestone 12's `resupply-streak-<tier>`
 * achievements, which read this same counter rather than inventing their
 * own copy.
 */
export function resupplyBase(progress: BaseProgressMap, baseId: string): BaseProgressMap {
  const existing = progress[baseId];
  if (!existing) {
    // A real data-integrity bug if it happens -- mirrors establishBase's
    // own throw-over-silent-default precedent for an unknown caller-passed
    // id.
    throw new Error(`resupplyBase: unknown base id "${baseId}".`);
  }
  return {
    ...progress,
    [baseId]: { ...existing, resupplyCounts: existing.resupplyCounts + 1 },
  };
}
