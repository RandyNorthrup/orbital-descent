import { describe, expect, it } from 'vitest';
import {
  ALL_IMPACT_KINDS,
  particleBurstForImpact,
  type ImpactKind,
  type ParticleBurstConfig,
} from './particle-burst';

function expectWellFormed(config: ParticleBurstConfig): void {
  expect(Number.isInteger(config.count)).toBe(true);
  expect(config.count).toBeGreaterThan(0);
  expect(config.speedMin).toBeGreaterThan(0);
  expect(config.speedMax).toBeGreaterThan(config.speedMin);
  expect(config.lifespanMs).toBeGreaterThan(0);
  expect(config.scaleStart).toBeGreaterThan(0);
  expect(config.scaleEnd).toBeGreaterThanOrEqual(0);
  expect(config.scaleEnd).toBeLessThan(config.scaleStart);
}

describe('particleBurstForImpact', () => {
  it('has exactly 4 impact kinds: obstacleCleared, combatantHit, combatantDefeated, shipDamage', () => {
    expect(ALL_IMPACT_KINDS).toHaveLength(4);
    expect(ALL_IMPACT_KINDS).toEqual([
      'obstacleCleared',
      'combatantHit',
      'combatantDefeated',
      'shipDamage',
    ]);
  });

  it('gives every kind a well-formed burst config', () => {
    for (const kind of ALL_IMPACT_KINDS) {
      expectWellFormed(particleBurstForImpact(kind));
    }
  });

  it('gives every kind a distinct full configuration', () => {
    const signatures = new Set(
      ALL_IMPACT_KINDS.map((kind) => JSON.stringify(particleBurstForImpact(kind))),
    );
    expect(signatures.size).toBe(ALL_IMPACT_KINDS.length);
  });

  it('is a pure function: repeated calls for the same kind return an equivalent config', () => {
    for (const kind of ALL_IMPACT_KINDS) {
      expect(particleBurstForImpact(kind)).toEqual(particleBurstForImpact(kind));
    }
  });

  it('makes a combatant defeat read as bigger and longer-lived than a mere hit', () => {
    const hit = particleBurstForImpact('combatantHit');
    const defeated = particleBurstForImpact('combatantDefeated');
    expect(defeated.count).toBeGreaterThan(hit.count);
    expect(defeated.lifespanMs).toBeGreaterThan(hit.lifespanMs);
    expect(defeated.speedMax).toBeGreaterThan(hit.speedMax);
  });

  it('never throws for any declared ImpactKind', () => {
    const kinds: readonly ImpactKind[] = [
      'obstacleCleared',
      'combatantHit',
      'combatantDefeated',
      'shipDamage',
    ];
    for (const kind of kinds) {
      expect(() => particleBurstForImpact(kind)).not.toThrow();
    }
  });
});
