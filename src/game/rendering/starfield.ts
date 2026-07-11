import { createSeededRandom } from '../random/seeded-random';

export interface Star {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly alpha: number;
  /** A small fraction of stars render as 4-point paper sparkles instead of
   * plain dots (Milestone 14, matching the reference art's star treatment);
   * sparkles use a larger radius range so the points actually read. */
  readonly sparkle: boolean;
}

export interface GenerateStarfieldOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly maxRadius: number;
  readonly maxAlpha: number;
  /** 0-1 fraction of stars that are 4-point sparkles rather than dots. */
  readonly sparkleFraction: number;
  /** Radius multiplier applied to sparkle stars only — a 4-point shape at
   * dot size would just read as a slightly blurry dot. */
  readonly sparkleRadiusMultiplier: number;
}

/**
 * Deterministic star positions/sizes/brightness for the background sky —
 * seeded so the layout is stable across scene restarts, unlike the gameplay
 * terrain, which deliberately reseeds every attempt (see terrain-generator.ts).
 */
export function generateStarfield(options: GenerateStarfieldOptions): Star[] {
  const random = createSeededRandom(options.seed);
  const stars: Star[] = [];
  for (let i = 0; i < options.count; i += 1) {
    const x = random() * options.width;
    const y = random() * options.height;
    const baseRadius = random() * options.maxRadius;
    const alpha = random() * options.maxAlpha;
    const sparkle = random() < options.sparkleFraction;
    stars.push({
      x,
      y,
      radius: sparkle ? baseRadius * options.sparkleRadiusMultiplier : baseRadius,
      alpha,
      sparkle,
    });
  }
  return stars;
}
