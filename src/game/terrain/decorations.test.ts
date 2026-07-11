import { describe, expect, it } from 'vitest';
import {
  decorationKindsFor,
  generateDecorations,
  type GenerateDecorationsOptions,
} from './decorations';

const BASE_OPTIONS: GenerateDecorationsOptions = {
  seed: 7070,
  worldKind: 'lush',
  etchStyle: 'foliage',
  landform: 'hummocks',
  worldWidth: 2880,
  landingPad: { xStart: 1200, xEnd: 1344, y: 400 },
  obstacles: [],
  count: 26,
  clearanceMarginPx: 40,
  edgeMarginPx: 24,
  minScale: 0.7,
  maxScale: 1.3,
  variantCount: 3,
};

describe('decorationKindsFor', () => {
  it('grows only vegetation kinds on lush worlds, varying by ground material', () => {
    const vegetation = new Set(['tree', 'bush', 'reed', 'flower', 'grass-tuft']);
    for (const etch of ['rock', 'sand', 'water', 'foliage'] as const) {
      for (const kind of decorationKindsFor('lush', etch, 'hummocks')) {
        expect(vegetation.has(kind)).toBe(true);
      }
    }
    expect(decorationKindsFor('lush', 'water', 'wave-swell')).toContain('reed');
    expect(decorationKindsFor('lush', 'foliage', 'terraces')).toContain('tree');
  });

  it('scatters only dead-world kinds on barren worlds and only lunar kinds on moons, regardless of ground material', () => {
    for (const etch of ['rock', 'sand', 'water', 'foliage'] as const) {
      expect(decorationKindsFor('barren', etch, 'mesa')).toEqual([
        'rock',
        'crystal',
        'snag',
        'rock',
      ]);
      expect(decorationKindsFor('moon', etch, 'crater-field')).toEqual([
        'boulder',
        'surface-crater',
        'boulder',
      ]);
    }
  });

  it('lets the volcano and ice-spikes landforms override the default set with their own surface features (Milestone 16.5)', () => {
    expect(decorationKindsFor('barren', 'rock', 'volcano')).toContain('lava-vent');
    expect(decorationKindsFor('lush', 'water', 'ice-spikes')).toContain('ice-shard');
    // The override wins regardless of world kind — the landform IS the identity.
    expect(decorationKindsFor('moon', 'sand', 'volcano')).toContain('lava-vent');
  });
});

describe('generateDecorations', () => {
  it('is deterministic for a given seed and differs across seeds', () => {
    const first = generateDecorations(BASE_OPTIONS);
    const second = generateDecorations(BASE_OPTIONS);
    expect(second).toEqual(first);
    const reseeded = generateDecorations({ ...BASE_OPTIONS, seed: 7071 });
    expect(JSON.stringify(reseeded)).not.toBe(JSON.stringify(first));
  });

  it('never places anything inside the landing pad span plus its clearance margin', () => {
    const specs = generateDecorations({ ...BASE_OPTIONS, count: 400 });
    for (const spec of specs) {
      const insidePad =
        spec.x >= BASE_OPTIONS.landingPad.xStart - BASE_OPTIONS.clearanceMarginPx &&
        spec.x <= BASE_OPTIONS.landingPad.xEnd + BASE_OPTIONS.clearanceMarginPx;
      expect(insidePad).toBe(false);
    }
  });

  it('never places anything inside an obstacle span plus its clearance margin', () => {
    const obstacle = { kind: 'spire' as const, xStart: 600, xEnd: 660, yTop: 200, yBottom: 400 };
    const specs = generateDecorations({ ...BASE_OPTIONS, obstacles: [obstacle], count: 400 });
    for (const spec of specs) {
      const insideObstacle =
        spec.x >= obstacle.xStart - BASE_OPTIONS.clearanceMarginPx &&
        spec.x <= obstacle.xEnd + BASE_OPTIONS.clearanceMarginPx;
      expect(insideObstacle).toBe(false);
    }
  });

  it('keeps every placement inside the world edges, scale range, variant range, and its own kind set', () => {
    const kinds = new Set(
      decorationKindsFor(BASE_OPTIONS.worldKind, BASE_OPTIONS.etchStyle, BASE_OPTIONS.landform),
    );
    const specs = generateDecorations({ ...BASE_OPTIONS, count: 200 });
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.length).toBeLessThanOrEqual(200);
    for (const spec of specs) {
      expect(spec.x).toBeGreaterThanOrEqual(BASE_OPTIONS.edgeMarginPx);
      expect(spec.x).toBeLessThanOrEqual(BASE_OPTIONS.worldWidth - BASE_OPTIONS.edgeMarginPx);
      expect(spec.scale).toBeGreaterThanOrEqual(BASE_OPTIONS.minScale);
      expect(spec.scale).toBeLessThanOrEqual(BASE_OPTIONS.maxScale);
      expect(Number.isInteger(spec.variant)).toBe(true);
      expect(spec.variant).toBeGreaterThanOrEqual(0);
      expect(spec.variant).toBeLessThan(BASE_OPTIONS.variantCount);
      expect(kinds.has(spec.kind)).toBe(true);
    }
  });

  it('an exclusion hit skips that attempt without shifting any later placement (PRNG draws are attempt-independent)', () => {
    // Same seed, one run with a pad exclusion covering part of the world
    // and one with the pad moved fully out of range: every x placed by
    // the excluded run must appear at the same attempt position in the
    // unexcluded run's output.
    const unblocked = generateDecorations({
      ...BASE_OPTIONS,
      count: 60,
      landingPad: { xStart: -500, xEnd: -400, y: 400 },
    });
    const blocked = generateDecorations({ ...BASE_OPTIONS, count: 60 });
    const unblockedXs = new Set(unblocked.map((spec) => spec.x));
    for (const spec of blocked) {
      expect(unblockedXs.has(spec.x)).toBe(true);
    }
    expect(blocked.length).toBeLessThan(unblocked.length);
  });
});
