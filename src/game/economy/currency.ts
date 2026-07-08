/**
 * Score-to-currency conversion (Decision D15, Milestone 8). Pinned 1:1 to
 * Milestone 4's landing score — Milestone 9.5's own reward formula (§9.5.5)
 * later sums `m4ScoreBonus(fuelRemaining, time, precision)` directly into
 * `missionReward` with no separate scaling factor, so this project's
 * currency scale is already committed to matching the score scale exactly,
 * not some independently-tuned fraction of it. Kept as its own named
 * function rather than inlined at the call site (`GameScene`) anyway,
 * matching this project's "every tunable gets a named seam" convention —
 * a future rebalance changes one function, not every call site.
 *
 * `calculateScore` (`scoring/score.ts`) already rounds to a whole number,
 * so this never needs to round again.
 */
export function scoreToCurrency(score: number): number {
  return score;
}
