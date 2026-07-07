/**
 * A random walk whose value is clamped to [min, max] and whose per-step
 * change never exceeds maxStep — the shared shape behind both the gameplay
 * terrain heightmap (terrain-generator.ts) and decorative background
 * ridgelines (rendering/ridgeline.ts), so "connected profile, not
 * disconnected spikes" is defined once instead of duplicated per caller.
 */
export function boundedRandomWalk(
  random: () => number,
  steps: number,
  min: number,
  max: number,
  maxStep: number,
): number[] {
  const values: number[] = [min + random() * (max - min)];
  for (let i = 1; i <= steps; i += 1) {
    const delta = (random() * 2 - 1) * maxStep;
    // `values[i - 1]` is always defined here (the loop only ever reads an
    // index it already pushed) — the `?? min` fallback exists to satisfy
    // `noUncheckedIndexedAccess`'s `T | undefined` typing without a
    // non-null assertion (disallowed project-wide), not because this
    // branch is reachable at runtime.
    const previous = values[i - 1] ?? min;
    values.push(Math.min(Math.max(previous + delta, min), max));
  }
  return values;
}
