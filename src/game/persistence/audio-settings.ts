import { getSafeLocalStorage, type KeyValueStorage } from './safe-local-storage';

export interface AudioSettingsState {
  readonly muted: boolean;
}

// Versioned (`:v1` suffix), same convention as `currency-progress.ts`/
// `base-progress.ts`/`ship-progress.ts`/`high-scores.ts` — a future schema
// change moves to `:v2` and simply orphans old-shape data under the old key
// rather than migrating in place.
export const AUDIO_SETTINGS_STORAGE_KEY = 'orbital-descent:audio-settings:v1';

function isAudioSettingsState(value: unknown): value is AudioSettingsState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate['muted'] === 'boolean';
}

/** A fresh save starts unmuted — every SFX cue Milestone 13 added plays by
 * default, matching this game's behavior before this setting existed. */
export function initialAudioSettingsState(): AudioSettingsState {
  return { muted: false };
}

/**
 * Reads and validates the stored audio settings. Any parse failure or shape
 * mismatch rejects the whole read and falls back to a fresh
 * `initialAudioSettingsState`, rather than sanitizing down to a valid subset
 * — matches `loadCurrencyState`/`loadShipProgress`/`loadBaseProgress`'s exact
 * resilience philosophy.
 */
export function loadAudioSettingsState(storage: KeyValueStorage): AudioSettingsState {
  const raw = storage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
  if (raw === null) {
    return initialAudioSettingsState();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initialAudioSettingsState();
  }

  if (!isAudioSettingsState(parsed)) {
    return initialAudioSettingsState();
  }

  return parsed;
}

/**
 * Persists the given state. The write is best-effort: Safari private-
 * browsing mode's zero storage quota throwing on `setItem` is a real,
 * documented browser behavior, so a failed write is silently swallowed —
 * matches every other persistence module's own best-effort write.
 */
export function saveAudioSettingsState(storage: KeyValueStorage, state: AudioSettingsState): void {
  try {
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Swallowed: see function doc comment above.
  }
}

/** Pure state transition: flips `muted`, without mutating `state`. */
export function toggleMuted(state: AudioSettingsState): AudioSettingsState {
  return { muted: !state.muted };
}

/**
 * Whether SFX playback should be suppressed right now, read fresh from
 * storage rather than cached — `SettingsScene` can toggle this while
 * `GameScene`/`WorldMapScene` sit paused underneath it (Settings is a
 * translucent modal, not a scene swap, per `constants.ts`'s
 * `SETTINGS_OVERLAY_*` doc comment), so a cached flag captured once in
 * `create()` would miss a toggle made mid-flight. Every `playSfxCue` call
 * site calls this immediately before playing, instead of caching the
 * result — deliberately cheap enough (one `localStorage` read) to not need
 * caching, unlike ship-progress/base-progress, which only ever change via
 * the scene reading them, never a concurrently-paused sibling scene.
 */
export function isAudioMuted(): boolean {
  const storage = getSafeLocalStorage();
  if (storage === null) {
    return initialAudioSettingsState().muted;
  }
  return loadAudioSettingsState(storage).muted;
}
