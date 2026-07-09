import type { Base } from '../bases/base';
import { findBodyById } from '../bases/bases';
import type { BaseProgressMap } from '../persistence/base-progress';
import {
  RESUPPLY_STREAK_TIER_1_THRESHOLD,
  RESUPPLY_STREAK_TIER_2_THRESHOLD,
  RESUPPLY_STREAK_TIER_3_THRESHOLD,
} from '../constants';

/** The one shape a caller ever sees — no trigger-condition detail leaks out
 * of this module, so a scene/toast-UI consumer never needs to parse an id
 * string back into "what does this mean" (that's `isUnlocked`'s job,
 * evaluated entirely inside this file). */
export interface AchievementDefinition {
  readonly id: string;
  readonly displayText: string;
}

/** Internal-only: `AchievementDefinition` plus the closure that evaluates
 * it. Kept out of the public surface so a consumer can't accidentally call
 * `isUnlocked` with a stale/mismatched `bases` array from outside this
 * module's own registry-building pass. */
interface AchievementRule extends AchievementDefinition {
  readonly isUnlocked: (bases: readonly Base[], progress: BaseProgressMap) => boolean;
}

/** `(5, "Lifeline")` / `(10, "Old Reliable")` / `(25, "Backbone of the
 * Fleet")` (PLAN.md §9.5.4) — paired here, rather than as three separate
 * parallel arrays, so a tier's threshold and display text can never drift
 * out of sync with each other. */
const RESUPPLY_STREAK_TIERS: readonly {
  readonly threshold: number;
  readonly displayText: string;
}[] = [
  { threshold: RESUPPLY_STREAK_TIER_1_THRESHOLD, displayText: 'Lifeline' },
  { threshold: RESUPPLY_STREAK_TIER_2_THRESHOLD, displayText: 'Old Reliable' },
  { threshold: RESUPPLY_STREAK_TIER_3_THRESHOLD, displayText: 'Backbone of the Fleet' },
];

/** True once every base a predicate cares about has reached `established`
 * in `progress` — a base absent from `progress` entirely (shouldn't happen
 * given `initialBaseProgress` seeds every base, but this module doesn't
 * assume its caller's progress map is necessarily in sync with its bases
 * array) counts as not established, never as a thrown lookup error. */
function allEstablished(bases: readonly Base[], progress: BaseProgressMap): boolean {
  return bases.every((base) => progress[base.id]?.status === 'established');
}

/**
 * Builds every achievement rule derivable from `bases` — world-scoped and
 * resupply-streak rules are generated, not hand-listed, so a future base or
 * world added to the registry automatically gets its own
 * `world-pioneer-<worldId>`/`full-claim-<worldId>` pair with zero changes
 * needed here.
 */
function buildAchievementRules(bases: readonly Base[]): readonly AchievementRule[] {
  const rules: AchievementRule[] = [];

  rules.push({
    id: 'first-presence',
    displayText: 'Boots on the Ground',
    isUnlocked: (_bases, progress) =>
      Object.values(progress).some((entry) => entry.status === 'established'),
  });

  // Distinct worldIds present in `bases`, not a hardcoded world list — a
  // world/base added in a future milestone gets its own pair of rules below
  // automatically.
  const worldIds = Array.from(new Set(bases.map((base) => base.worldId)));
  for (const worldId of worldIds) {
    const worldName = findBodyById(worldId).name;

    rules.push({
      id: `world-pioneer-${worldId}`,
      displayText: `Pioneer of ${worldName}`,
      isUnlocked: (currentBases, progress) =>
        currentBases
          .filter((base) => base.worldId === worldId)
          .some((base) => progress[base.id]?.status === 'established'),
    });

    // For a single-base world, this and `world-pioneer-<worldId>` above
    // become true at the exact same moment (establishing that world's only
    // base is simultaneously "first base on this world" and "every base on
    // this world") — that's correct, not a bug (PLAN.md §9.5.4's own
    // examples treat a 1-base world's pioneer/full-claim as one event).
    rules.push({
      id: `full-claim-${worldId}`,
      displayText: `World Secured: ${worldName}`,
      isUnlocked: (currentBases, progress) =>
        allEstablished(
          currentBases.filter((base) => base.worldId === worldId),
          progress,
        ),
    });
  }

  for (const tier of RESUPPLY_STREAK_TIERS) {
    rules.push({
      id: `resupply-streak-${tier.threshold.toString()}`,
      displayText: tier.displayText,
      // GLOBAL sum across every base's own `resupplyCounts`, not one
      // base's own count — deliberate reading of PLAN.md §9.5.4's "(or a
      // global sum)" alternative, chosen because this id has no
      // per-base component (`resupply-streak-<tier>`, not
      // `resupply-streak-<baseId>-<tier>`), so it only makes sense as a
      // single, global counter.
      isUnlocked: (currentBases, progress) =>
        currentBases.reduce((sum, base) => sum + (progress[base.id]?.resupplyCounts ?? 0), 0) >=
        tier.threshold,
    });
  }

  rules.push({
    id: 'frontier-claimed',
    displayText: 'Frontier Claimed',
    isUnlocked: (currentBases, progress) =>
      allEstablished(
        currentBases.filter((base) => base.isCriticalPath),
        progress,
      ),
  });

  return rules;
}

/**
 * The full current list of every achievement definition derivable from
 * `bases` — deliberately not a fixed-count literal: world-scoped and
 * resupply-tier rules scale with however many distinct worlds/tiers are
 * configured, so this grows automatically if a future milestone adds more
 * bases/worlds.
 */
export function buildAchievementRegistry(bases: readonly Base[]): readonly AchievementDefinition[] {
  return buildAchievementRules(bases).map(({ id, displayText }) => ({ id, displayText }));
}

/**
 * Returns only the achievement definitions whose condition holds against
 * the given `bases`/`progress` AND whose id is not already in
 * `alreadyUnlockedIds` — the single call site a scene needs after any state
 * change that could newly satisfy a trigger (an establish/resupply
 * mission's own outcome handler), without that caller needing to know
 * which specific trigger(s) might now be true.
 */
export function evaluateNewlyUnlockedAchievements(
  bases: readonly Base[],
  progress: BaseProgressMap,
  alreadyUnlockedIds: ReadonlySet<string>,
): readonly AchievementDefinition[] {
  return buildAchievementRules(bases)
    .filter((rule) => !alreadyUnlockedIds.has(rule.id) && rule.isUnlocked(bases, progress))
    .map(({ id, displayText }) => ({ id, displayText }));
}
