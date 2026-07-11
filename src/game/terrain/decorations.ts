import { createSeededRandom } from '../random/seeded-random';
import type { EtchStyle, WorldKind } from '../planets/celestial-body';
import type { LandingPad, Obstacle } from './terrain-generator';

/**
 * Ground set-dressing (PLAN.md Milestone 16, Decision D24) — the pure,
 * seeded placement half of making a world's kind *visible* on its own
 * terrain: lush worlds grow paper vegetation, barren worlds scatter dead
 * rock and the ore the extraction economy mines, moons collect boulders
 * and surface craters. `rendering/decoration-visual.ts` owns how each
 * kind is drawn; this module owns only what goes where, so the layout
 * rules (pad/obstacle exclusion, seeded determinism, density) stay
 * unit-testable in Node.
 */
export type DecorationKind =
  | 'tree'
  | 'bush'
  | 'reed'
  | 'flower'
  | 'grass-tuft'
  | 'rock'
  | 'crystal'
  | 'snag'
  | 'boulder'
  | 'surface-crater';

export interface DecorationSpec {
  readonly kind: DecorationKind;
  /** World-space x of the decoration's bottom-center anchor. */
  readonly x: number;
  /** Uniform draw scale within the caller's [minScale, maxScale]. */
  readonly scale: number;
  /** Seeded shape-variation index in [0, variantCount) — the renderer
   * bakes one texture per (kind, variant), so a row of trees reads as
   * siblings, not clones. */
  readonly variant: number;
}

/**
 * Which decoration kinds a world grows, weighted by repetition (a kind
 * listed twice is placed roughly twice as often). Lush worlds vary by
 * ground material (their biosphere follows the terrain: water worlds
 * reed up, sand prairies flower); barren worlds and moons read the same
 * dead way regardless of ground material — that sameness IS their look.
 */
export function decorationKindsFor(
  worldKind: WorldKind,
  etchStyle: EtchStyle,
): readonly DecorationKind[] {
  if (worldKind === 'barren') {
    return ['rock', 'crystal', 'snag', 'rock'];
  }
  if (worldKind === 'moon') {
    return ['boulder', 'surface-crater', 'boulder'];
  }
  switch (etchStyle) {
    case 'water':
      return ['reed', 'reed', 'tree', 'flower'];
    case 'sand':
      return ['grass-tuft', 'tree', 'flower', 'bush'];
    case 'foliage':
      return ['tree', 'tree', 'bush', 'flower'];
    case 'rock':
      return ['tree', 'bush', 'grass-tuft'];
  }
}

export interface GenerateDecorationsOptions {
  readonly seed: number;
  readonly worldKind: WorldKind;
  readonly etchStyle: EtchStyle;
  readonly worldWidth: number;
  readonly landingPad: LandingPad;
  readonly obstacles: readonly Obstacle[];
  /** Placement attempts, not a guaranteed final count — an attempt that
   * lands inside the pad/obstacle exclusion zones is skipped, never
   * retried, so the sequence of PRNG draws (and therefore every other
   * decoration's position) is independent of how many exclusions hit. */
  readonly count: number;
  /** Exclusion margin around the landing pad and each obstacle span. */
  readonly clearanceMarginPx: number;
  /** Keep-out from the world's own left/right edges. */
  readonly edgeMarginPx: number;
  readonly minScale: number;
  readonly maxScale: number;
  readonly variantCount: number;
}

export function generateDecorations(
  options: GenerateDecorationsOptions,
): readonly DecorationSpec[] {
  const random = createSeededRandom(options.seed);
  const kinds = decorationKindsFor(options.worldKind, options.etchStyle);
  const specs: DecorationSpec[] = [];

  const blockedSpans: { start: number; end: number }[] = [
    {
      start: options.landingPad.xStart - options.clearanceMarginPx,
      end: options.landingPad.xEnd + options.clearanceMarginPx,
    },
    ...options.obstacles.map((obstacle) => ({
      start: obstacle.xStart - options.clearanceMarginPx,
      end: obstacle.xEnd + options.clearanceMarginPx,
    })),
  ];

  for (let attempt = 0; attempt < options.count; attempt += 1) {
    // All draws happen unconditionally, before the exclusion check, so a
    // skipped attempt consumes exactly the same PRNG stream as a placed
    // one (see `count`'s own doc comment).
    const x = options.edgeMarginPx + random() * (options.worldWidth - options.edgeMarginPx * 2);
    const kind = kinds[Math.floor(random() * kinds.length)] ?? kinds[0];
    const scale = options.minScale + random() * (options.maxScale - options.minScale);
    const variant = Math.floor(random() * options.variantCount);
    if (kind === undefined) {
      // Unreachable — `decorationKindsFor` never returns an empty list —
      // but stated honestly for noUncheckedIndexedAccess rather than
      // asserted away.
      continue;
    }
    if (blockedSpans.some((span) => x >= span.start && x <= span.end)) {
      continue;
    }
    specs.push({ kind, x, scale, variant });
  }

  return specs;
}
