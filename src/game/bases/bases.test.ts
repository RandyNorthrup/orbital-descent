import { describe, expect, it } from 'vitest';
import { BASES, findBodyById } from './bases';
import { computeDifficultyProfile } from './difficulty';
import { BODIES } from '../planets/bodies';
import { findShipById } from '../ships/ships';
import {
  GAME_HEIGHT,
  TERRAIN_MAX_HEIGHT_FRACTION,
  TERRAIN_MIN_HEIGHT_FRACTION,
  TERRAIN_SEGMENTS,
  WORLD_WIDTH,
} from '../constants';

/** Looks up a base by id, throwing (rather than returning `undefined`) if
 * it's missing -- every test below already asserts `BASES` has exactly the
 * 5 expected ids, so a lookup miss here would mean this helper itself is
 * broken, not a real "can't happen" case worth silently tolerating. */
function findBaseById(id: string): (typeof BASES)[number] {
  const base = BASES.find((candidate) => candidate.id === id);
  if (!base) {
    throw new Error(`test setup error: no base with id '${id}' in BASES`);
  }
  return base;
}

describe('BASES', () => {
  it('has exactly 5 entries', () => {
    expect(BASES).toHaveLength(5);
  });

  it('has a unique id for every base', () => {
    const ids = new Set(BASES.map((base) => base.id));
    expect(ids.size).toBe(BASES.length);
  });

  it("references a real BODIES id in every base's worldId", () => {
    const bodyIds = new Set(BODIES.map((body) => body.id));
    for (const base of BASES) {
      expect(bodyIds.has(base.worldId)).toBe(true);
    }
  });

  it('has no dangling unlock target: every unlocks id names a real base in BASES', () => {
    const baseIds = new Set(BASES.map((base) => base.id));
    for (const base of BASES) {
      for (const unlockedId of base.unlocks) {
        expect(baseIds.has(unlockedId)).toBe(true);
      }
    }
  });

  it('keeps every difficulty axis within the documented [0, 10] range', () => {
    for (const base of BASES) {
      expect(base.difficulty.axes.mechanical).toBeGreaterThanOrEqual(0);
      expect(base.difficulty.axes.mechanical).toBeLessThanOrEqual(10);
      expect(base.difficulty.axes.spatial).toBeGreaterThanOrEqual(0);
      expect(base.difficulty.axes.spatial).toBeLessThanOrEqual(10);
      expect(base.difficulty.axes.combat).toBeGreaterThanOrEqual(0);
      expect(base.difficulty.axes.combat).toBeLessThanOrEqual(10);
    }
  });

  it('gives every base a positive firstClearCredits reward', () => {
    for (const base of BASES) {
      expect(base.firstClearCredits).toBeGreaterThan(0);
    }
  });

  // Pin test: Milestone 9.5's own worked examples (PLAN.md §9.5.7) do exact
  // relay-distance/unlock-graph reasoning against this precise roster's
  // id/worldId/localOffset/isCriticalPath/unlocks/status values. A casual
  // future edit to any one of them would silently break that milestone's
  // design without any test here noticing unless this suite pins them by
  // exact value.
  describe('pins the Milestone 9.5-load-bearing fields of every base', () => {
    it('anchor-station', () => {
      const base = findBaseById('anchor-station');
      expect(base.worldId).toBe('kessels-reach');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual(['meridian-yard', 'scarp-outpost']);
      expect(base.status).toBe('discovered-unclaimed');
    });

    it('scarp-outpost', () => {
      const base = findBaseById('scarp-outpost');
      expect(base.worldId).toBe('kessels-reach');
      expect(base.localOffset).toBe(2.4);
      expect(base.isCriticalPath).toBe(false);
      expect(base.unlocks).toEqual([]);
      expect(base.status).toBe('locked');
    });

    it('meridian-yard', () => {
      const base = findBaseById('meridian-yard');
      expect(base.worldId).toBe('verdalis');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual(['rustwell-landing']);
      expect(base.status).toBe('locked');
    });

    it('rustwell-landing', () => {
      const base = findBaseById('rustwell-landing');
      expect(base.worldId).toBe('pyrrhine-expanse');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual(['frostgate']);
      expect(base.status).toBe('locked');
    });

    it('frostgate', () => {
      const base = findBaseById('frostgate');
      expect(base.worldId).toBe('glacian-drift');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual([]);
      expect(base.status).toBe('locked');
    });
  });

  // Proves anchor-station's difficulty is genuinely computed from its own
  // authored requirements/terrainOptions/body, not a hardcoded literal that
  // happens to look plausible: recomputing computeDifficultyProfile here
  // with the same real inputs must deep-equal the registry entry's own
  // difficulty field. If bases.ts ever hand-wrote `difficulty` as a literal
  // independent of its own requirements/terrainOptions, this test is the
  // one that would catch it silently drifting from the real formula.
  it("computes anchor-station's difficulty from its own real inputs rather than hardcoding it", () => {
    const base = findBaseById('anchor-station');
    const body = findBodyById('kessels-reach');

    const expectedDifficulty = computeDifficultyProfile(
      base.requirements,
      base.terrainOptions,
      body,
      {
        thrustAccel: findShipById('falcon').baseThrustAccel,
      },
    );

    expect(base.difficulty).toEqual(expectedDifficulty);
  });
});

describe('findBodyById', () => {
  it('returns the matching CelestialBody for a real id', () => {
    expect(findBodyById('kessels-reach')).toBe(BODIES[0]);
  });

  it('throws a clear error for an id not in BODIES', () => {
    expect(() => findBodyById('nonexistent-world')).toThrow(/nonexistent-world/);
  });
});

// Sanity-checks this test file's own understanding of the shared
// terrainOptions fields every base spreads (`bases.ts`'s COMMON_TERRAIN_OPTIONS)
// so a future accidental change to one of them doesn't pass unnoticed just
// because no other test reads these fields directly.
describe('shared terrainOptions fields', () => {
  it('are identical across every base', () => {
    for (const base of BASES) {
      expect(base.terrainOptions.width).toBe(WORLD_WIDTH);
      expect(base.terrainOptions.height).toBe(GAME_HEIGHT);
      expect(base.terrainOptions.segments).toBe(TERRAIN_SEGMENTS);
      expect(base.terrainOptions.minHeightFraction).toBe(TERRAIN_MIN_HEIGHT_FRACTION);
      expect(base.terrainOptions.maxHeightFraction).toBe(TERRAIN_MAX_HEIGHT_FRACTION);
    }
  });
});
