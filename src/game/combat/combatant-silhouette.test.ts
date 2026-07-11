import { describe, expect, it } from 'vitest';
import { COMBATANT_SILHOUETTES, findCombatantSilhouette } from './combatant-silhouette';
import { GLACIAN_WARDEN, VERDALIS_WASP } from './combatant';

/** Matches COMBATANT_COLLISION_RADIUS (16) — the drawn hostile may not
 * promise a different target than the circle physics checks. */
const MAX_ART_EXTENT_PX = 16;
const MIN_POLYGON_VERTICES = 3;

describe('COMBATANT_SILHOUETTES', () => {
  it('covers every combatant definition the encounters actually spawn', () => {
    expect(COMBATANT_SILHOUETTES[VERDALIS_WASP.id]).toBeDefined();
    expect(COMBATANT_SILHOUETTES[GLACIAN_WARDEN.id]).toBeDefined();
  });

  it('gives every combatant a distinct body outline', () => {
    const signatures = new Set(
      Object.values(COMBATANT_SILHOUETTES).map((silhouette) =>
        JSON.stringify(silhouette.bodyPoints),
      ),
    );
    expect(signatures.size).toBe(Object.keys(COMBATANT_SILHOUETTES).length);
  });

  it('keeps every vertex of every piece within the collision radius', () => {
    for (const silhouette of Object.values(COMBATANT_SILHOUETTES)) {
      for (const point of [...silhouette.bodyPoints, ...silhouette.accentPolygons.flat()]) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(MAX_ART_EXTENT_PX);
      }
    }
  });

  it('gives every piece a real polygon (3+ vertices)', () => {
    for (const silhouette of Object.values(COMBATANT_SILHOUETTES)) {
      expect(silhouette.bodyPoints.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      for (const accent of silhouette.accentPolygons) {
        expect(accent.length).toBeGreaterThanOrEqual(MIN_POLYGON_VERTICES);
      }
    }
  });
});

describe('findCombatantSilhouette', () => {
  it('returns the registered silhouette for a real id', () => {
    expect(findCombatantSilhouette(VERDALIS_WASP.id)).toBe(COMBATANT_SILHOUETTES[VERDALIS_WASP.id]);
  });

  it('throws a clear error for an unregistered id', () => {
    expect(() => findCombatantSilhouette('unknown-hostile')).toThrow(/unknown-hostile/);
  });
});
