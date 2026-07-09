import type { AchievementDefinition } from '../achievements/achievements';
import type { KeyValueStorage } from './safe-local-storage';

export interface UnlockedAchievement {
  readonly id: string;
  readonly unlockedAt: number; // Date.now()-style epoch ms
}

// Versioned (`:v1` suffix) so a future schema change can move to `:v2` and
// simply orphan old-shape data under the old key rather than needing to
// migrate it in place. Same convention as `high-scores.ts`/`base-progress.ts`.
export const ACHIEVEMENT_PROGRESS_STORAGE_KEY = 'orbital-descent:achievement-progress:v1';

function isUnlockedAchievement(value: unknown): value is UnlockedAchievement {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['unlockedAt'] === 'number' &&
    Number.isFinite(candidate['unlockedAt'])
  );
}

/**
 * Reads and validates the stored unlocked-achievement list. A real
 * production browser can have literally anything under this key -- a
 * previous different app version's shape, a hand-edited garbage string,
 * truncated JSON from a quota issue -- so any parse failure or shape
 * mismatch (in the array itself or any single entry) rejects the whole read
 * and falls back to an empty list, rather than sanitizing down to the valid
 * subset. Matches `loadHighScores`'s exact resilience philosophy.
 */
export function loadUnlockedAchievements(storage: KeyValueStorage): readonly UnlockedAchievement[] {
  const raw = storage.getItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || !parsed.every(isUnlockedAchievement)) {
    return [];
  }

  return parsed;
}

/**
 * Appends one entry per newly-unlocked definition to the valid stored list
 * and persists the result. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, not hypothetical, so a failed write is
 * silently swallowed and the freshly computed in-memory list is returned
 * regardless -- matches `recordHighScore`'s own return-updated-list-even-
 * if-the-write-failed behavior.
 */
export function recordUnlockedAchievements(
  storage: KeyValueStorage,
  newlyUnlocked: readonly AchievementDefinition[],
  unlockedAtMs: number,
): readonly UnlockedAchievement[] {
  const current = loadUnlockedAchievements(storage);
  const updated = [
    ...current,
    ...newlyUnlocked.map((achievement) => ({ id: achievement.id, unlockedAt: unlockedAtMs })),
  ];

  try {
    storage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Swallowed: see function doc comment above.
  }

  return updated;
}
