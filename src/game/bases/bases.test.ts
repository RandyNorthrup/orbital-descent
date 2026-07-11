import { describe, expect, it } from 'vitest';
import { BASES, findBodyById } from './bases';
import { computeDifficultyProfile } from './difficulty';
import { BODIES } from '../planets/bodies';
import { findShipById } from '../ships/ships';
import { generateTerrain } from '../terrain/terrain-generator';
import { isCollidingWithObstacle } from '../terrain/obstacles';
import { simulateEncounter } from '../combat/encounter';
import { findEquipmentById } from '../equipment/equipment';
import {
  GAME_HEIGHT,
  LANDER_RADIUS,
  SHIP_BASE_HULL_POINTS,
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

  it('places every base with hostile encounters on a lush world (Milestone 15/D22 — hostiles live where a biosphere can sustain them)', () => {
    for (const base of BASES) {
      if (base.encounters.length > 0) {
        expect(findBodyById(base.worldId).kind).toBe('lush');
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
      expect(base.garrisonRequirement).toBe(6);
    });

    it('scarp-outpost', () => {
      const base = findBaseById('scarp-outpost');
      expect(base.worldId).toBe('kessels-reach');
      expect(base.localOffset).toBe(2.4);
      expect(base.isCriticalPath).toBe(false);
      expect(base.unlocks).toEqual([]);
      expect(base.status).toBe('locked');
      expect(base.garrisonRequirement).toBe(10);
    });

    it('meridian-yard', () => {
      const base = findBaseById('meridian-yard');
      expect(base.worldId).toBe('verdalis');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual(['rustwell-landing']);
      expect(base.status).toBe('locked');
      expect(base.garrisonRequirement).toBe(15);
    });

    it('rustwell-landing', () => {
      const base = findBaseById('rustwell-landing');
      expect(base.worldId).toBe('pyrrhine-expanse');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual(['frostgate']);
      expect(base.status).toBe('locked');
      expect(base.garrisonRequirement).toBe(30);
    });

    it('frostgate', () => {
      const base = findBaseById('frostgate');
      expect(base.worldId).toBe('glacian-drift');
      expect(base.localOffset).toBe(0);
      expect(base.isCriticalPath).toBe(true);
      expect(base.unlocks).toEqual([]);
      expect(base.status).toBe('locked');
      expect(base.garrisonRequirement).toBe(30);
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
      base.encounters,
      body,
      {
        thrustAccel: findShipById('falcon').baseThrustAccel,
        hullPoints: SHIP_BASE_HULL_POINTS,
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

// Milestone 10: Scarp Outpost/Frostgate's curated obstacle layouts are
// authored by hand against the pad position generateTerrain actually
// produces for their real seed/options -- this test proves that against
// the genuine generator (not just the authoring comment's own arithmetic),
// so a future change to either base's seed/padSegmentCount/pad-affecting
// options that silently moves the pad into an obstacle is caught here
// rather than only discovered in-game.
describe('Milestone 10 curated obstacle layouts', () => {
  it('gives Scarp Outpost and Frostgate at least one authored obstacle, and every other base none', () => {
    const withObstacles = new Set(['scarp-outpost', 'frostgate']);
    for (const base of BASES) {
      if (withObstacles.has(base.id)) {
        expect(base.terrainOptions.obstacles?.length ?? 0).toBeGreaterThan(0);
      } else {
        expect(base.terrainOptions.obstacles ?? []).toEqual([]);
      }
    }
  });

  it("never lets a real generated landing pad collide with that base's own authored obstacles", () => {
    for (const base of BASES) {
      const obstacles = base.terrainOptions.obstacles ?? [];
      if (obstacles.length === 0) {
        continue;
      }
      const terrain = generateTerrain(base.terrainOptions);
      const { landingPad } = terrain;
      // Sample across the pad's full width, not just its endpoints, so an
      // obstacle overlapping the pad's middle (but clear of both ends)
      // would still be caught.
      const sampleCount = 10;
      for (let i = 0; i <= sampleCount; i += 1) {
        const x = landingPad.xStart + (landingPad.xEnd - landingPad.xStart) * (i / sampleCount);
        const position = { x, y: landingPad.y };
        for (const obstacle of obstacles) {
          expect(isCollidingWithObstacle(position, LANDER_RADIUS, obstacle)).toBe(false);
        }
      }
    }
  });

  it('never lets two obstacles on the same base overlap each other', () => {
    for (const base of BASES) {
      const obstacles = base.terrainOptions.obstacles ?? [];
      for (let i = 0; i < obstacles.length; i += 1) {
        for (let j = i + 1; j < obstacles.length; j += 1) {
          const a = obstacles[i];
          const b = obstacles[j];
          if (!a || !b) {
            continue;
          }
          const overlapsX = a.xStart < b.xEnd && b.xStart < a.xEnd;
          const overlapsY = a.yTop < b.yBottom && b.yTop < a.yBottom;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    }
  });
});

// Milestone 11: Meridian Yard and Frostgate carry this project's first two
// real EncounterSpecs -- proves the curated roster end-to-end against the
// real combat/difficulty/equipment modules, not just each module's own
// isolated unit tests.
describe('Milestone 11 curated encounters', () => {
  it('gives Meridian Yard and Frostgate at least one authored encounter, and every other base none', () => {
    const withEncounters = new Set(['meridian-yard', 'frostgate']);
    for (const base of BASES) {
      if (withEncounters.has(base.id)) {
        expect(base.encounters.length).toBeGreaterThan(0);
      } else {
        expect(base.encounters).toEqual([]);
      }
    }
  });

  it("every base's combat difficulty axis is nonzero if and only if it has encounters", () => {
    for (const base of BASES) {
      if (base.encounters.length > 0) {
        expect(base.difficulty.axes.combat).toBeGreaterThan(0);
      } else {
        expect(base.difficulty.axes.combat).toBe(0);
      }
    }
  });

  it("Frostgate's Glacian Warden hard-fails the tier-1 Pulse Cannon but is clearable by the tier-2 Autocannon", () => {
    const frostgate = findBaseById('frostgate');
    const pulseCannon = findEquipmentById('pulse-cannon');
    const autocannon = findEquipmentById('autocannon');
    if (pulseCannon.slotType !== 'weapon' || autocannon.slotType !== 'weapon') {
      throw new Error('expected pulse-cannon and autocannon to both be weapons');
    }

    for (const encounter of frostgate.encounters) {
      const withPulseCannon = simulateEncounter(
        encounter,
        { damage: pulseCannon.damage, cooldownMs: pulseCannon.cooldownMs },
        0,
        SHIP_BASE_HULL_POINTS,
      );
      expect(withPulseCannon.cleared).toBe(false);

      const withAutocannon = simulateEncounter(
        encounter,
        { damage: autocannon.damage, cooldownMs: autocannon.cooldownMs },
        0,
        SHIP_BASE_HULL_POINTS,
      );
      expect(withAutocannon.cleared).toBe(true);
    }

    expect(frostgate.requirements.combat.minWeaponTier).toBe(2);
  });

  it("classifies Frostgate as 'combat'-dominant now that Milestone 11 populates its combat axis", () => {
    // mechanical 4, spatial 5 (both unchanged since Milestone 10). combat:
    // Glacian Warden's attack (damagePerHit 18, cooldownMs 2200) against
    // FROSTGATE_ENCOUNTER's clearWindowMs (6000) -> floor(6000/2200) + 1
    // (the "+1" is the guaranteed immediate hit at t=0, see
    // computeCombatAxis's own doc comment) = 3 hits -> 54 threat.
    // threatScore = 54/(3*30) = 0.6 -> 0.6*6 = 3.6. armorRating 20 vs the
    // 25 reference -> armorScore 0.8 -> 0.8*4 = 3.2. Sum 6.8 -> rounds to 7.
    const frostgate = findBaseById('frostgate');
    expect(frostgate.difficulty.axes).toEqual({ mechanical: 4, spatial: 5, combat: 7 });
    // Spread (7-4=3) exceeds CAPSTONE_MAX_SPREAD(2), so this base is
    // combat-dominant rather than capstone-balanced -- difficulty.test.ts's
    // own synthetic "classifies a base with every axis at 4" test already
    // proves the capstone-balanced classification itself is reachable in
    // principle; Frostgate's own real, corrected numbers just don't happen
    // to land in that band.
    expect(frostgate.difficulty.dominant).toBe('combat');
  });
});
