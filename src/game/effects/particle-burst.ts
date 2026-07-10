/**
 * Milestone 13's particle-burst decision data: which fixed count/speed/
 * lifespan/scale profile a given impact event's burst uses. Phaser-free,
 * mirroring `audio/sfx-cues.ts`'s own "event kind -> fixed plain data
 * record" shape and its own shape-validation unit-test convention —
 * `scenes/game-scene.ts` only ever calls `particleBurstForImpact` and hands
 * the result to a real Phaser `ParticleEmitter.explode()`, never decides a
 * burst's own shape itself (this project's "scenes render state, they
 * don't compute it" rule — the same split this milestone's audio system
 * already applies between `sfx-cues.ts` and `rendering/audio-player.ts`).
 */
import {
  COMBATANT_DEFEATED_BURST_COUNT,
  COMBATANT_DEFEATED_BURST_LIFESPAN_MS,
  COMBATANT_DEFEATED_BURST_SCALE_END,
  COMBATANT_DEFEATED_BURST_SCALE_START,
  COMBATANT_DEFEATED_BURST_SPEED_MAX,
  COMBATANT_DEFEATED_BURST_SPEED_MIN,
  COMBATANT_HIT_BURST_COUNT,
  COMBATANT_HIT_BURST_LIFESPAN_MS,
  COMBATANT_HIT_BURST_SCALE_END,
  COMBATANT_HIT_BURST_SCALE_START,
  COMBATANT_HIT_BURST_SPEED_MAX,
  COMBATANT_HIT_BURST_SPEED_MIN,
  OBSTACLE_CLEARED_BURST_COUNT,
  OBSTACLE_CLEARED_BURST_LIFESPAN_MS,
  OBSTACLE_CLEARED_BURST_SCALE_END,
  OBSTACLE_CLEARED_BURST_SCALE_START,
  OBSTACLE_CLEARED_BURST_SPEED_MAX,
  OBSTACLE_CLEARED_BURST_SPEED_MIN,
  SHIP_DAMAGE_BURST_COUNT,
  SHIP_DAMAGE_BURST_LIFESPAN_MS,
  SHIP_DAMAGE_BURST_SCALE_END,
  SHIP_DAMAGE_BURST_SCALE_START,
  SHIP_DAMAGE_BURST_SPEED_MAX,
  SHIP_DAMAGE_BURST_SPEED_MIN,
} from '../constants';

/**
 * One entry per real impact/weapon event `scenes/game-scene.ts` triggers a
 * particle burst for. `shipDamage` covers both the contact-hit and
 * ranged-hit cases with the same "you got hurt" look (PLAN.md Milestone 13
 * groups them as a single burst point) — `effects/screen-shake.ts`'s own
 * `ScreenShakeKind` is what actually distinguishes contact from ranged
 * severity, not this module.
 */
export type ImpactKind = 'obstacleCleared' | 'combatantHit' | 'combatantDefeated' | 'shipDamage';

export interface ParticleBurstConfig {
  readonly count: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly lifespanMs: number;
  readonly scaleStart: number;
  readonly scaleEnd: number;
}

const BURST_CONFIGS: Readonly<Record<ImpactKind, ParticleBurstConfig>> = {
  obstacleCleared: {
    count: OBSTACLE_CLEARED_BURST_COUNT,
    speedMin: OBSTACLE_CLEARED_BURST_SPEED_MIN,
    speedMax: OBSTACLE_CLEARED_BURST_SPEED_MAX,
    lifespanMs: OBSTACLE_CLEARED_BURST_LIFESPAN_MS,
    scaleStart: OBSTACLE_CLEARED_BURST_SCALE_START,
    scaleEnd: OBSTACLE_CLEARED_BURST_SCALE_END,
  },
  combatantHit: {
    count: COMBATANT_HIT_BURST_COUNT,
    speedMin: COMBATANT_HIT_BURST_SPEED_MIN,
    speedMax: COMBATANT_HIT_BURST_SPEED_MAX,
    lifespanMs: COMBATANT_HIT_BURST_LIFESPAN_MS,
    scaleStart: COMBATANT_HIT_BURST_SCALE_START,
    scaleEnd: COMBATANT_HIT_BURST_SCALE_END,
  },
  combatantDefeated: {
    count: COMBATANT_DEFEATED_BURST_COUNT,
    speedMin: COMBATANT_DEFEATED_BURST_SPEED_MIN,
    speedMax: COMBATANT_DEFEATED_BURST_SPEED_MAX,
    lifespanMs: COMBATANT_DEFEATED_BURST_LIFESPAN_MS,
    scaleStart: COMBATANT_DEFEATED_BURST_SCALE_START,
    scaleEnd: COMBATANT_DEFEATED_BURST_SCALE_END,
  },
  shipDamage: {
    count: SHIP_DAMAGE_BURST_COUNT,
    speedMin: SHIP_DAMAGE_BURST_SPEED_MIN,
    speedMax: SHIP_DAMAGE_BURST_SPEED_MAX,
    lifespanMs: SHIP_DAMAGE_BURST_LIFESPAN_MS,
    scaleStart: SHIP_DAMAGE_BURST_SCALE_START,
    scaleEnd: SHIP_DAMAGE_BURST_SCALE_END,
  },
};

/** Every kind this milestone defines, for iteration (shape-validation
 * tests) without hand-maintaining a second list that could drift from
 * `BURST_CONFIGS`'s own keys. */
export const ALL_IMPACT_KINDS: readonly ImpactKind[] = [
  'obstacleCleared',
  'combatantHit',
  'combatantDefeated',
  'shipDamage',
];

/**
 * Real decision logic (per this milestone's own "unit tests for any new
 * particle/juice pure-logic parameters" acceptance criterion): which fixed
 * particle-burst profile a given impact `kind` uses — `combatantDefeated`'s
 * destruction reads as a bigger, longer-lived burst than a mere
 * `combatantHit` scoring a wound, matching the same "distinct event,
 * distinct feel" principle `audio/sfx-cues.ts` already applies to its own
 * landing/achievement-unlock cues.
 */
export function particleBurstForImpact(kind: ImpactKind): ParticleBurstConfig {
  return BURST_CONFIGS[kind];
}
