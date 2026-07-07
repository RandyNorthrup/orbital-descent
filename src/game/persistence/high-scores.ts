export interface HighScoreEntry {
  readonly score: number;
  readonly achievedAt: number; // Date.now()-style epoch ms, informational only (not used for sorting)
}

// Deliberately just the two methods this module needs, not the full
// Storage DOM interface -- but a real window.localStorage structurally
// satisfies this with zero adaptation, since getItem/setItem match its
// real signatures exactly.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Versioned (`:v1` suffix) so a future schema change can move to `:v2` and
// simply orphan old-shape data under the old key rather than needing to
// migrate it in place.
export const HIGH_SCORES_STORAGE_KEY = 'orbital-descent:high-scores:v1';

/**
 * Safely obtains `window.localStorage`, or `null` if merely *accessing* the
 * property throws. Reading `window.localStorage` is a getter, not a plain
 * property, and real browsers can throw a `SecurityError` DOMException on
 * that read alone -- e.g. a sandboxed cross-origin iframe without
 * `allow-same-origin`, or a browser/privacy setting that blocks all storage.
 * That throw happens at the call site, before `loadHighScores`/
 * `recordHighScore` are ever entered, so their own internal try/catches
 * around `JSON.parse`/`setItem` cannot help -- callers must go through this
 * instead of writing `window.localStorage` directly.
 */
export function getSafeLocalStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isHighScoreEntry(value: unknown): value is HighScoreEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['score'] === 'number' &&
    // calculateScore always Math.round()s its result (score.ts), so any
    // real in-game score is an integer -- a non-integer here can only come
    // from direct storage tampering (devtools, an extension, a foreign
    // value under this key), not gameplay. Number.isInteger already implies
    // finite (false for NaN/Infinity), so no separate Number.isFinite check
    // is needed for this field.
    Number.isInteger(candidate['score']) &&
    candidate['score'] >= 0 &&
    typeof candidate['achievedAt'] === 'number' &&
    Number.isFinite(candidate['achievedAt'])
  );
}

/**
 * Reads and validates the stored high-score list. A real production browser
 * can have literally anything under this key -- a previous different app
 * version's shape, a hand-edited garbage string, truncated JSON from a
 * quota issue -- so any parse failure or shape mismatch (in the array
 * itself or any single element) rejects the whole read rather than
 * sanitizing it down to the valid subset.
 */
export function loadHighScores(storage: KeyValueStorage): readonly HighScoreEntry[] {
  const raw = storage.getItem(HIGH_SCORES_STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || !parsed.every(isHighScoreEntry)) {
    return [];
  }

  return parsed;
}

/**
 * Appends a new entry to the valid stored list, keeps only the top
 * `maxEntries` by score, and persists the result. The write is best-effort:
 * Safari private-browsing mode's zero storage quota throwing on `setItem`
 * is a real, documented browser behavior, not hypothetical, so a failed
 * write is swallowed and the freshly computed in-memory list is returned
 * regardless -- the caller's current session still reflects the correct
 * result even if it won't survive a reload.
 */
export function recordHighScore(
  storage: KeyValueStorage,
  score: number,
  achievedAt: number,
  maxEntries: number,
): readonly HighScoreEntry[] {
  const current = loadHighScores(storage);
  const updated = [...current, { score, achievedAt }]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries);

  try {
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Swallowed: see function doc comment above.
  }

  return updated;
}
