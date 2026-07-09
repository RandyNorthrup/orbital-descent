import { describe, expect, it } from 'vitest';
import { buildAchievementRegistry, evaluateNewlyUnlockedAchievements } from './achievements';
import { BASES } from '../bases/bases';
import type { Base, BaseDifficultyProfile, BaseProgress, BaseRequirements } from '../bases/base';
import type { GenerateTerrainOptions } from '../terrain/terrain-generator';
import type { BaseProgressMap } from '../persistence/base-progress';

const TERRAIN_OPTIONS: GenerateTerrainOptions = {
  seed: 1,
  width: 800,
  height: 600,
  segments: 20,
  minHeightFraction: 0.6,
  maxHeightFraction: 0.9,
  maxStepFraction: 0.05,
  padSegmentCount: 3,
};

const REQUIREMENTS: BaseRequirements = {
  minTWR: { hardFloor: 1.1, comfortable: 1.4 },
  handling: null,
  hazardCounterTags: [],
  recommendedTags: [],
  combat: { minWeaponTier: 0, minShieldTier: 0 },
};

const DIFFICULTY: BaseDifficultyProfile = {
  axes: { mechanical: 2, spatial: 2, combat: 0 },
  dominant: 'tutorial',
  budget: 10,
};

/** Builds a minimal, valid `Base` fixture -- every field besides
 * id/worldId/isCriticalPath is a fixed, real (not placeholder/any-cast)
 * value, since only id/worldId/isCriticalPath matter to this module. Uses
 * real `planets/bodies.ts` world ids so `findBodyById` (called by
 * `buildAchievementRegistry`/`evaluateNewlyUnlockedAchievements` to resolve
 * a world's display name) never throws. */
function createBase(id: string, worldId: string, isCriticalPath: boolean): Base {
  return {
    id,
    name: id,
    worldId,
    order: 0,
    terrainOptions: TERRAIN_OPTIONS,
    encounters: [],
    requirements: REQUIREMENTS,
    difficulty: DIFFICULTY,
    status: 'locked',
    isCriticalPath,
    unlocks: [],
    localOffset: 0,
    garrisonRequirement: 0,
  };
}

/** Builds a `BaseProgressMap` covering every base in `bases`: `established`
 * (with an arbitrary fixed `establishedAt`) for ids in `establishedIds`,
 * `discovered-unclaimed` otherwise, and each base's own `resupplyCounts`
 * from `resupplyCountsById` (defaulting to 0). */
function createProgress(
  bases: readonly Base[],
  establishedIds: readonly string[] = [],
  resupplyCountsById: Readonly<Record<string, number>> = {},
): BaseProgressMap {
  const progress: Record<string, BaseProgress> = {};
  for (const base of bases) {
    const established = establishedIds.includes(base.id);
    progress[base.id] = {
      status: established ? 'established' : 'discovered-unclaimed',
      establishedAt: established ? 1_700_000_000_000 : null,
      resupplyCounts: resupplyCountsById[base.id] ?? 0,
    };
  }
  return progress;
}

const NO_UNLOCKS: ReadonlySet<string> = new Set();

describe('buildAchievementRegistry', () => {
  it('scales to a synthetic fixture: 2 worlds (one single-base, one multi-base) yield 9 definitions', () => {
    // thessaly-shoals: single-base world. umbral-fen: multi-base (2 bases,
    // one critical-path, one not) world -- proves world-scoped rules are
    // derived per distinct worldId, not hand-listed.
    const bases: readonly Base[] = [
      createBase('thessaly-base', 'thessaly-shoals', true),
      createBase('umbral-base-1', 'umbral-fen', true),
      createBase('umbral-base-2', 'umbral-fen', false),
    ];

    const registry = buildAchievementRegistry(bases);
    const ids = registry.map((definition) => definition.id);

    expect(ids).toEqual([
      'first-presence',
      'world-pioneer-thessaly-shoals',
      'full-claim-thessaly-shoals',
      'world-pioneer-umbral-fen',
      'full-claim-umbral-fen',
      'resupply-streak-5',
      'resupply-streak-10',
      'resupply-streak-25',
      'frontier-claimed',
    ]);
    // 1 (first-presence) + 2 worlds x 2 (pioneer/full-claim) + 3 (resupply
    // tiers) + 1 (frontier-claimed).
    expect(registry).toHaveLength(9);
  });

  it('derives correct display text for world-scoped achievements from findBodyById', () => {
    const bases: readonly Base[] = [createBase('thessaly-base', 'thessaly-shoals', true)];
    const registry = buildAchievementRegistry(bases);

    expect(registry).toContainEqual({
      id: 'world-pioneer-thessaly-shoals',
      displayText: 'Pioneer of Thessaly Shoals',
    });
    expect(registry).toContainEqual({
      id: 'full-claim-thessaly-shoals',
      displayText: 'World Secured: Thessaly Shoals',
    });
  });

  it('scales to a larger fixture: 3 worlds yields 3 world-scoped pairs, not a fixed count', () => {
    const bases: readonly Base[] = [
      createBase('thessaly-base', 'thessaly-shoals', true),
      createBase('umbral-base', 'umbral-fen', true),
      createBase('kharun-base', 'kharun-wastes', true),
    ];
    const ids = buildAchievementRegistry(bases).map((definition) => definition.id);

    for (const worldId of ['thessaly-shoals', 'umbral-fen', 'kharun-wastes']) {
      expect(ids).toContain(`world-pioneer-${worldId}`);
      expect(ids).toContain(`full-claim-${worldId}`);
    }
    // 1 + 3 worlds x 2 + 3 + 1.
    expect(ids).toHaveLength(11);
  });

  it("scales correctly against this project's real BASES roster (4 worlds)", () => {
    const registry = buildAchievementRegistry(BASES);
    const ids = registry.map((definition) => definition.id);

    // 1 + 4 worlds x 2 + 3 + 1 -- not hardcoded here as a bare `13`, spelled
    // out as the same derivation the module itself performs, so this
    // assertion documents *why* 13, not just that it's 13.
    const worldCount = new Set(BASES.map((base) => base.worldId)).size;
    expect(registry).toHaveLength(1 + worldCount * 2 + 3 + 1);
    expect(new Set(ids).size).toBe(ids.length); // every id unique
  });
});

describe('evaluateNewlyUnlockedAchievements: first-presence', () => {
  const bases: readonly Base[] = [createBase('base-a', 'thessaly-shoals', true)];

  it('does not fire before any base is established', () => {
    const progress = createProgress(bases, []);
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    expect(unlocked.map((a) => a.id)).not.toContain('first-presence');
  });

  it('fires exactly once the first base becomes established', () => {
    const progress = createProgress(bases, ['base-a']);
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    expect(unlocked).toContainEqual({ id: 'first-presence', displayText: 'Boots on the Ground' });
  });

  it('does not re-fire when already unlocked', () => {
    const progress = createProgress(bases, ['base-a']);
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set(['first-presence']),
    );
    expect(unlocked.map((a) => a.id)).not.toContain('first-presence');
  });
});

describe('evaluateNewlyUnlockedAchievements: world-pioneer / full-claim on a multi-base world', () => {
  const bases: readonly Base[] = [
    createBase('umbral-base-1', 'umbral-fen', true),
    createBase('umbral-base-2', 'umbral-fen', true),
  ];

  it('world-pioneer fires once the first base on the world is established, before full-claim', () => {
    const progress = createProgress(bases, ['umbral-base-1']);
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    const ids = unlocked.map((a) => a.id);

    expect(ids).toContain('world-pioneer-umbral-fen');
    expect(ids).not.toContain('full-claim-umbral-fen');
  });

  it('full-claim does NOT fire until every base on the world is established, not just one', () => {
    const progress = createProgress(bases, ['umbral-base-1']);
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set(['first-presence', 'world-pioneer-umbral-fen']),
    );
    expect(unlocked.map((a) => a.id)).not.toContain('full-claim-umbral-fen');
  });

  it('full-claim fires once every base on the world reaches established', () => {
    const progress = createProgress(bases, ['umbral-base-1', 'umbral-base-2']);
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set(['first-presence', 'world-pioneer-umbral-fen']),
    );
    expect(unlocked).toContainEqual({
      id: 'full-claim-umbral-fen',
      displayText: 'World Secured: Umbral Fen',
    });
  });
});

describe('evaluateNewlyUnlockedAchievements: single-base world simultaneity', () => {
  it('world-pioneer and full-claim fire at the same moment for a single-base world (correct, not a bug)', () => {
    const bases: readonly Base[] = [createBase('thessaly-base', 'thessaly-shoals', true)];
    const progress = createProgress(bases, ['thessaly-base']);
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set(['first-presence']),
    );
    const ids = unlocked.map((a) => a.id);

    expect(ids).toContain('world-pioneer-thessaly-shoals');
    expect(ids).toContain('full-claim-thessaly-shoals');
  });
});

describe('evaluateNewlyUnlockedAchievements: resupply-streak (global sum across bases)', () => {
  const baseP = createBase('base-p', 'thessaly-shoals', true);
  const baseQ = createBase('base-q', 'umbral-fen', true);
  const bases: readonly Base[] = [baseP, baseQ];

  it('does not fire any tier while the global sum stays below the lowest threshold', () => {
    // Sum is 4 (2 + 2), one below the tier-1 threshold of 5 -- proves the
    // "not yet" boundary the next test's 3 + 3 = 6 sum then crosses.
    const progress = createProgress(bases, [], { 'base-p': 2, 'base-q': 2 });
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    const ids = unlocked.map((a) => a.id);

    expect(ids).not.toContain('resupply-streak-5');
    expect(ids).not.toContain('resupply-streak-10');
    expect(ids).not.toContain('resupply-streak-25');
  });

  it("sums resupplyCounts across bases, not just one base's own count", () => {
    // Neither base individually reaches 5, but their sum (3 + 3 = 6) does --
    // proves this is a global sum, not a per-base check.
    const progress = createProgress(bases, [], { 'base-p': 3, 'base-q': 3 });
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    expect(unlocked.map((a) => a.id)).toContain('resupply-streak-5');
  });

  it('unlocks all three tiers at once when the sum jumps from 4 to 26 in a single evaluation', () => {
    const progress = createProgress(bases, [], { 'base-p': 20, 'base-q': 6 });
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    const ids = unlocked.map((a) => a.id);

    expect(ids).toContain('resupply-streak-5');
    expect(ids).toContain('resupply-streak-10');
    expect(ids).toContain('resupply-streak-25');
  });

  it('does not re-fire any tier already present in alreadyUnlockedIds', () => {
    const progress = createProgress(bases, [], { 'base-p': 20, 'base-q': 6 });
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set(['resupply-streak-5', 'resupply-streak-10', 'resupply-streak-25']),
    );
    const ids = unlocked.map((a) => a.id);

    expect(ids).not.toContain('resupply-streak-5');
    expect(ids).not.toContain('resupply-streak-10');
    expect(ids).not.toContain('resupply-streak-25');
  });

  it('treats a base entirely absent from the progress map as contributing 0 to the sum', () => {
    // Defensive case: `progress` and `bases` shouldn't drift out of sync in
    // real usage (`initialBaseProgress` seeds every base), but this module
    // doesn't assume it -- `createProgress` here only seeds `base-p`, so
    // `base-q` (present in `bases`, absent from `progress`) must not throw
    // or count as some other value.
    const progress = createProgress([baseP], [], { 'base-p': 5 });
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    expect(unlocked.map((a) => a.id)).toContain('resupply-streak-5');
  });
});

describe('evaluateNewlyUnlockedAchievements: frontier-claimed (critical-path bases only)', () => {
  const bases: readonly Base[] = [
    createBase('critical-a', 'thessaly-shoals', true),
    createBase('critical-b', 'umbral-fen', true),
    createBase('non-critical', 'umbral-fen', false),
  ];

  it('a fully-established non-critical-path base alone does not satisfy it', () => {
    const progress = createProgress(bases, ['non-critical']);
    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, NO_UNLOCKS);
    expect(unlocked.map((a) => a.id)).not.toContain('frontier-claimed');
  });

  it('fires once every critical-path base (and only the critical-path bases) is established', () => {
    const progress = createProgress(bases, ['critical-a', 'critical-b']);
    const unlocked = evaluateNewlyUnlockedAchievements(
      bases,
      progress,
      new Set([
        'first-presence',
        'world-pioneer-thessaly-shoals',
        'full-claim-thessaly-shoals',
        'world-pioneer-umbral-fen',
      ]),
    );
    expect(unlocked).toContainEqual({ id: 'frontier-claimed', displayText: 'Frontier Claimed' });
  });
});

describe('evaluateNewlyUnlockedAchievements: multiple simultaneous unlocks in one call', () => {
  it('establishing the last critical-path base fires its world-pioneer, full-claim, AND frontier-claimed together', () => {
    // umbral-fen is already fully claimed going into this evaluation;
    // thessaly-shoals's one (critical-path) base is the very last
    // unestablished critical-path base in the whole roster -- establishing
    // it should complete its own single-base world (pioneer + full-claim)
    // and the game-wide frontier-claimed all in the same call.
    const bases: readonly Base[] = [
      createBase('thessaly-base', 'thessaly-shoals', true),
      createBase('umbral-base-1', 'umbral-fen', true),
      createBase('umbral-base-2', 'umbral-fen', false),
    ];
    const alreadyUnlocked: ReadonlySet<string> = new Set([
      'first-presence',
      'world-pioneer-umbral-fen',
      'full-claim-umbral-fen',
    ]);
    const progress = createProgress(bases, ['umbral-base-1', 'umbral-base-2', 'thessaly-base']);

    const unlocked = evaluateNewlyUnlockedAchievements(bases, progress, alreadyUnlocked);
    const ids = unlocked.map((a) => a.id);

    expect(ids).toEqual([
      'world-pioneer-thessaly-shoals',
      'full-claim-thessaly-shoals',
      'frontier-claimed',
    ]);
  });
});
