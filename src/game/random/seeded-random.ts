/**
 * Mulberry32 PRNG — deterministic given a seed, returns floats in [0, 1).
 * The bit-twiddling constants are the algorithm itself, not tunable
 * parameters; naming them individually would obscure the well-known
 * reference implementation rather than clarify it. See PLAN.md §5.
 *
 * Extracted from terrain-generator.ts so every seeded procedural-layout
 * generator (gameplay terrain, background starfield/ridgeline) shares one
 * PRNG implementation instead of each module carrying its own copy.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
