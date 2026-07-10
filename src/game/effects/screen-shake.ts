/**
 * Milestone 13's screen-shake decision data: which fixed duration/intensity
 * profile a given impact event's camera shake uses. Phaser-free, mirroring
 * `effects/particle-burst.ts`'s own "event kind -> fixed plain data record"
 * shape — `scenes/game-scene.ts` only ever calls `screenShakeForImpact` and
 * hands the result straight to `this.cameras.main.shake(durationMs,
 * intensity)`, never decides a shake's own strength itself.
 */
import {
  SCREEN_SHAKE_CRASH_DURATION_MS,
  SCREEN_SHAKE_CRASH_INTENSITY,
  SCREEN_SHAKE_SHIP_CONTACT_DURATION_MS,
  SCREEN_SHAKE_SHIP_CONTACT_INTENSITY,
  SCREEN_SHAKE_SHIP_RANGED_DURATION_MS,
  SCREEN_SHAKE_SHIP_RANGED_INTENSITY,
} from '../constants';

/**
 * One entry per real impact event `scenes/game-scene.ts` shakes the camera
 * for: a crash landing (off-pad, obstacle, or combat-destruction — all
 * already resolved to the same 'crashed' outcome before this is ever read,
 * so there is only one crash entry, not three), the ship absorbing a
 * contact hit, and the ship absorbing a ranged hit. A normal safe landing
 * never shakes — there is deliberately no `'landed'` entry here.
 */
export type ScreenShakeKind = 'crash' | 'shipContactDamage' | 'shipRangedDamage';

export interface ScreenShakeConfig {
  readonly durationMs: number;
  readonly intensity: number;
}

const SHAKE_CONFIGS: Readonly<Record<ScreenShakeKind, ScreenShakeConfig>> = {
  crash: {
    durationMs: SCREEN_SHAKE_CRASH_DURATION_MS,
    intensity: SCREEN_SHAKE_CRASH_INTENSITY,
  },
  shipContactDamage: {
    durationMs: SCREEN_SHAKE_SHIP_CONTACT_DURATION_MS,
    intensity: SCREEN_SHAKE_SHIP_CONTACT_INTENSITY,
  },
  shipRangedDamage: {
    durationMs: SCREEN_SHAKE_SHIP_RANGED_DURATION_MS,
    intensity: SCREEN_SHAKE_SHIP_RANGED_INTENSITY,
  },
};

/** Every kind this milestone defines, for iteration (shape-validation
 * tests) without hand-maintaining a second list that could drift from
 * `SHAKE_CONFIGS`'s own keys. */
export const ALL_SCREEN_SHAKE_KINDS: readonly ScreenShakeKind[] = [
  'crash',
  'shipContactDamage',
  'shipRangedDamage',
];

/**
 * Real decision logic (per this milestone's own "unit tests for any new
 * particle/juice pure-logic parameters" acceptance criterion): which fixed
 * duration/intensity profile a given impact `kind` uses — a full crash
 * shakes longer and harder than either in-flight combat hit, matching this
 * being the flight-ending event versus a survivable hit the player is still
 * flying after.
 */
export function screenShakeForImpact(kind: ScreenShakeKind): ScreenShakeConfig {
  return SHAKE_CONFIGS[kind];
}
