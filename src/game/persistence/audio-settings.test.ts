import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUDIO_SETTINGS_STORAGE_KEY,
  initialAudioSettingsState,
  isAudioMuted,
  loadAudioSettingsState,
  saveAudioSettingsState,
  toggleMuted,
  type AudioSettingsState,
} from './audio-settings';
import type { KeyValueStorage } from './safe-local-storage';

/** Test-only in-memory stand-in for a real Storage object (localStorage),
 * so this module can be unit-tested in plain Node without jsdom. */
class FakeStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/** A FakeStorage whose setItem always throws, simulating Safari
 * private-browsing mode's zero storage quota. */
class ThrowingStorage implements KeyValueStorage {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

describe('initialAudioSettingsState', () => {
  it('starts unmuted', () => {
    expect(initialAudioSettingsState()).toEqual({ muted: false });
  });
});

describe('loadAudioSettingsState', () => {
  it('falls back to initialAudioSettingsState when the key was never written', () => {
    const storage = new FakeStorage();
    expect(loadAudioSettingsState(storage)).toEqual(initialAudioSettingsState());
  });

  it('falls back to initialAudioSettingsState, without throwing, when the stored value is not valid JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, 'not valid json{{{');

    let result: AudioSettingsState | undefined;
    expect(() => {
      result = loadAudioSettingsState(storage);
    }).not.toThrow();
    expect(result).toEqual(initialAudioSettingsState());
  });

  it('round-trips a valid, previously-saved state through saveAudioSettingsState then loadAudioSettingsState', () => {
    const storage = new FakeStorage();
    const saved: AudioSettingsState = { muted: true };

    saveAudioSettingsState(storage, saved);
    expect(loadAudioSettingsState(storage)).toEqual(saved);
  });

  it('falls back to initialAudioSettingsState when the parsed value is null', () => {
    const storage = new FakeStorage();
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(null));
    expect(loadAudioSettingsState(storage)).toEqual(initialAudioSettingsState());
  });

  it('falls back to initialAudioSettingsState when muted is missing', () => {
    const storage = new FakeStorage();
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({}));
    expect(loadAudioSettingsState(storage)).toEqual(initialAudioSettingsState());
  });

  it('falls back to initialAudioSettingsState when muted is not a boolean', () => {
    const storage = new FakeStorage();
    storage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({ muted: 'true' }));
    expect(loadAudioSettingsState(storage)).toEqual(initialAudioSettingsState());
  });
});

describe('saveAudioSettingsState', () => {
  it('does not throw when the underlying storage setItem throws', () => {
    const storage = new ThrowingStorage();
    expect(() => {
      saveAudioSettingsState(storage, initialAudioSettingsState());
    }).not.toThrow();
  });
});

describe('toggleMuted', () => {
  it('flips muted from false to true without mutating the original state', () => {
    const before: AudioSettingsState = { muted: false };
    const after = toggleMuted(before);
    expect(after).toEqual({ muted: true });
    expect(before).toEqual({ muted: false });
  });

  it('flips muted from true back to false', () => {
    expect(toggleMuted({ muted: true })).toEqual({ muted: false });
  });
});

describe('isAudioMuted', () => {
  // This suite runs under vitest's plain-Node environment (no global
  // `window`), same as safe-local-storage.test.ts -- stub one in per case.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads true from a stored muted state', () => {
    const storage = new FakeStorage();
    saveAudioSettingsState(storage, { muted: true });
    vi.stubGlobal('window', { localStorage: storage });
    expect(isAudioMuted()).toBe(true);
  });

  it('reads false from a stored unmuted state', () => {
    const storage = new FakeStorage();
    saveAudioSettingsState(storage, { muted: false });
    vi.stubGlobal('window', { localStorage: storage });
    expect(isAudioMuted()).toBe(false);
  });

  it('defaults to false when storage is unavailable (no window)', () => {
    expect(isAudioMuted()).toBe(false);
  });
});
