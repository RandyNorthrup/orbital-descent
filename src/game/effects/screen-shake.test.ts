import { describe, expect, it } from 'vitest';
import {
  ALL_SCREEN_SHAKE_KINDS,
  screenShakeForImpact,
  type ScreenShakeConfig,
} from './screen-shake';

function expectWellFormed(config: ScreenShakeConfig): void {
  expect(config.durationMs).toBeGreaterThan(0);
  expect(config.intensity).toBeGreaterThan(0);
  // Phaser's own Camera#shake `intensity` is a fraction of camera size
  // (typically well under 1) — anything at or above 1 would be a wildly
  // unintended, screen-tearing-strength shake, not a tuning choice.
  expect(config.intensity).toBeLessThan(1);
}

describe('screenShakeForImpact', () => {
  it('has exactly 3 kinds: crash, shipContactDamage, shipRangedDamage', () => {
    expect(ALL_SCREEN_SHAKE_KINDS).toHaveLength(3);
    expect(ALL_SCREEN_SHAKE_KINDS).toEqual(['crash', 'shipContactDamage', 'shipRangedDamage']);
  });

  it('gives every kind a well-formed shake config', () => {
    for (const kind of ALL_SCREEN_SHAKE_KINDS) {
      expectWellFormed(screenShakeForImpact(kind));
    }
  });

  it('gives every kind a distinct full configuration', () => {
    const signatures = new Set(
      ALL_SCREEN_SHAKE_KINDS.map((kind) => JSON.stringify(screenShakeForImpact(kind))),
    );
    expect(signatures.size).toBe(ALL_SCREEN_SHAKE_KINDS.length);
  });

  it('is a pure function: repeated calls for the same kind return an equivalent config', () => {
    for (const kind of ALL_SCREEN_SHAKE_KINDS) {
      expect(screenShakeForImpact(kind)).toEqual(screenShakeForImpact(kind));
    }
  });

  it('makes a crash shake longer and harder than either in-flight combat hit', () => {
    const crash = screenShakeForImpact('crash');
    const contact = screenShakeForImpact('shipContactDamage');
    const ranged = screenShakeForImpact('shipRangedDamage');
    expect(crash.durationMs).toBeGreaterThan(contact.durationMs);
    expect(crash.durationMs).toBeGreaterThan(ranged.durationMs);
    expect(crash.intensity).toBeGreaterThan(contact.intensity);
    expect(crash.intensity).toBeGreaterThan(ranged.intensity);
  });
});
