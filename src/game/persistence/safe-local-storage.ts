// Deliberately just the two methods any consumer in this codebase needs,
// not the full Storage DOM interface -- but a real window.localStorage
// structurally satisfies this with zero adaptation, since getItem/setItem
// match its real signatures exactly.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Safely obtains `window.localStorage`, or `null` if merely *accessing* the
 * property throws. Reading `window.localStorage` is a getter, not a plain
 * property, and real browsers can throw a `SecurityError` DOMException on
 * that read alone -- e.g. a sandboxed cross-origin iframe without
 * `allow-same-origin`, or a browser/privacy setting that blocks all storage.
 * That throw happens at the call site, before any validated-read/write
 * module's own internal try/catches around `JSON.parse`/`setItem` would
 * ever run -- callers must go through this instead of writing
 * `window.localStorage` directly.
 *
 * Shared by every `localStorage`-backed persistence module in this
 * project (`persistence/high-scores.ts`, `persistence/base-progress.ts`,
 * and more to come per Milestone 4's own "one philosophy, four consumers"
 * note) so this safety check and its rationale live in exactly one place.
 */
export function getSafeLocalStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
