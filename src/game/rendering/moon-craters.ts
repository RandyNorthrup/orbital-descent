import { createSeededRandom } from '../random/seeded-random';

/**
 * Pure, seeded crater layout for the papercraft moon disc (PLAN.md
 * Milestone 14): flat darker blobs inside the disc, the way the reference
 * art draws its moons — not photoreal impact craters. The renderer bakes
 * these as filled circles in a derived darker moon shade.
 *
 * Phaser-free and unit-tested, same convention as `cloud-bank.ts`.
 */

export interface MoonCrater {
  /** Offset from the moon disc's center, in the same px units as `radius`. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface GenerateMoonCratersOptions {
  readonly seed: number;
  readonly moonRadius: number;
  readonly count: number;
  /** Crater radius range as fractions of the moon radius. */
  readonly minRadiusFraction: number;
  readonly maxRadiusFraction: number;
}

/** How far from the disc center a crater's own center may sit, as a
 * fraction of the remaining room after its radius — strictly below 1 so
 * every crater stays fully inside the disc (no blob bleeding over the
 * moon's paper edge). */
const CRATER_MAX_CENTER_FRACTION = 0.85;

export function generateMoonCraters(options: GenerateMoonCratersOptions): MoonCrater[] {
  const random = createSeededRandom(options.seed);
  const craters: MoonCrater[] = [];
  for (let i = 0; i < options.count; i += 1) {
    const radius =
      options.moonRadius *
      (options.minRadiusFraction +
        random() * (options.maxRadiusFraction - options.minRadiusFraction));
    const maxCenterDistance = (options.moonRadius - radius) * CRATER_MAX_CENTER_FRACTION;
    const angle = random() * Math.PI * 2;
    const distance = random() * maxCenterDistance;
    craters.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius,
    });
  }
  return craters;
}
