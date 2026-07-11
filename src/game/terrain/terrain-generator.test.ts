import { describe, expect, it } from 'vitest';
import {
  generateTerrain,
  getTerrainHeightAt,
  type GenerateTerrainOptions,
  type Obstacle,
} from './terrain-generator';

const BASE_OPTIONS: GenerateTerrainOptions = {
  seed: 12345,
  width: 960,
  height: 640,
  segments: 40,
  minHeightFraction: 0.55,
  maxHeightFraction: 0.9,
  maxStepFraction: 0.05,
  padSegmentCount: 3,
};

describe('generateTerrain', () => {
  it('is deterministic given the same seed', () => {
    const a = generateTerrain(BASE_OPTIONS);
    const b = generateTerrain(BASE_OPTIONS);
    expect(a).toEqual(b);
  });

  it('produces different terrain for a different seed', () => {
    const a = generateTerrain(BASE_OPTIONS);
    const b = generateTerrain({ ...BASE_OPTIONS, seed: 99999 });
    expect(a).not.toEqual(b);
  });

  it('generates segments + 1 points spanning exactly the requested width', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    expect(terrain.points).toHaveLength(BASE_OPTIONS.segments + 1);
    expect(terrain.points[0]?.x).toBe(0);
    expect(terrain.points[terrain.points.length - 1]?.x).toBe(BASE_OPTIONS.width);
  });

  it('keeps every point within the configured height band', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const minHeight = BASE_OPTIONS.height * BASE_OPTIONS.minHeightFraction;
    const maxHeight = BASE_OPTIONS.height * BASE_OPTIONS.maxHeightFraction;
    for (const point of terrain.points) {
      expect(point.y).toBeGreaterThanOrEqual(minHeight - Number.EPSILON);
      expect(point.y).toBeLessThanOrEqual(maxHeight + Number.EPSILON);
    }
  });

  it('never changes height between adjacent points by more than the max step', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const maxStep = BASE_OPTIONS.height * BASE_OPTIONS.maxStepFraction;
    for (let i = 1; i < terrain.points.length; i += 1) {
      const previous = terrain.points[i - 1];
      const current = terrain.points[i];
      if (!previous || !current) {
        continue;
      }
      // The landing pad flattens several adjacent points to an equal height,
      // which is a zero-delta special case, not a violation of the max-step
      // random walk that generates everything else.
      expect(Math.abs(current.y - previous.y)).toBeLessThanOrEqual(maxStep + Number.EPSILON);
    }
  });

  it('flattens exactly padSegmentCount consecutive points to the same height', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    const { landingPad, points } = terrain;
    const padPoints = points.filter((p) => p.x >= landingPad.xStart && p.x <= landingPad.xEnd);
    expect(padPoints).toHaveLength(BASE_OPTIONS.padSegmentCount);
    for (const point of padPoints) {
      expect(point.y).toBe(landingPad.y);
    }
  });

  it('keeps the landing pad away from both edges of the terrain', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    expect(terrain.landingPad.xStart).toBeGreaterThan(0);
    expect(terrain.landingPad.xEnd).toBeLessThan(BASE_OPTIONS.width);
  });

  it('returns an empty obstacles array when none are configured (every pre-Milestone-10 base)', () => {
    const terrain = generateTerrain(BASE_OPTIONS);
    expect(terrain.obstacles).toEqual([]);
  });

  it('echoes configured obstacles verbatim onto the returned Terrain', () => {
    const obstacles: Obstacle[] = [
      { kind: 'spire', xStart: 500, xEnd: 524, yTop: 200, yBottom: 400 },
    ];
    const terrain = generateTerrain({ ...BASE_OPTIONS, obstacles });
    expect(terrain.obstacles).toEqual(obstacles);
  });

  it('pins the pad to padStartIndexOverride instead of the random draw, without consuming randomness for it', () => {
    const overridden = generateTerrain({ ...BASE_OPTIONS, padStartIndexOverride: 10 });
    const segmentWidth = BASE_OPTIONS.width / BASE_OPTIONS.segments;
    expect(overridden.landingPad.xStart).toBe(10 * segmentWidth);
    expect(overridden.landingPad.xEnd).toBe((10 + BASE_OPTIONS.padSegmentCount - 1) * segmentWidth);
  });

  it('is still deterministic given the same seed when padStartIndexOverride is set', () => {
    const options = { ...BASE_OPTIONS, padStartIndexOverride: 10 };
    expect(generateTerrain(options)).toEqual(generateTerrain(options));
  });

  it('applies terrainOverrides before pad flattening, so an override inside the pad range is superseded', () => {
    const segmentWidth = BASE_OPTIONS.width / BASE_OPTIONS.segments;
    const withOverride = generateTerrain({
      ...BASE_OPTIONS,
      padStartIndexOverride: 10,
      terrainOverrides: [{ index: 5, y: 999 }],
    });
    // Index 5 is outside the pinned pad range [10, 12] -- the override applies as-is.
    expect(withOverride.points[5]?.y).toBe(999);
    expect(withOverride.points[5]?.x).toBe(5 * segmentWidth);

    const overriddenInsidePad = generateTerrain({
      ...BASE_OPTIONS,
      padStartIndexOverride: 10,
      terrainOverrides: [{ index: 11, y: 999 }],
    });
    // Index 11 is inside the pinned pad's range [10, 12] but not its start
    // index (padHeight is read from index 10) -- pad flattening supersedes
    // the override here, so index 11 ends up at padHeight, not 999.
    expect(overriddenInsidePad.points[11]?.y).toBe(overriddenInsidePad.landingPad.y);
    expect(overriddenInsidePad.points[11]?.y).not.toBe(999);
  });

  // Milestone 16.5 (D26) — the landform shaping pass.

  it('leaves the random landing-pad position untouched when a landform is applied (separate PRNG stream)', () => {
    const plain = generateTerrain(BASE_OPTIONS);
    const shaped = generateTerrain({ ...BASE_OPTIONS, landform: 'volcano' });
    expect(shaped.landingPad.xStart).toBe(plain.landingPad.xStart);
    expect(shaped.landingPad.xEnd).toBe(plain.landingPad.xEnd);
  });

  it('reshapes heights when a landform is set, and is deterministic', () => {
    const plain = generateTerrain(BASE_OPTIONS);
    const shaped = generateTerrain({ ...BASE_OPTIONS, landform: 'mesa' });
    const shapedAgain = generateTerrain({ ...BASE_OPTIONS, landform: 'mesa' });
    expect(shaped).toEqual(shapedAgain);
    expect(shaped.points.map((p) => p.y)).not.toEqual(plain.points.map((p) => p.y));
  });

  it('keeps landform-shaped heights inside the configured height band', () => {
    const shaped = generateTerrain({ ...BASE_OPTIONS, landform: 'needle-spires' });
    const minHeight = BASE_OPTIONS.height * BASE_OPTIONS.minHeightFraction;
    const maxHeight = BASE_OPTIONS.height * BASE_OPTIONS.maxHeightFraction;
    for (const point of shaped.points) {
      expect(point.y).toBeGreaterThanOrEqual(minHeight);
      expect(point.y).toBeLessThanOrEqual(maxHeight);
    }
  });

  it('applies terrainOverrides after the landform, so authored anchoring stays the last word', () => {
    const shaped = generateTerrain({
      ...BASE_OPTIONS,
      landform: 'ice-spikes',
      padStartIndexOverride: 10,
      terrainOverrides: [{ index: 5, y: 999 }],
    });
    expect(shaped.points[5]?.y).toBe(999);
  });
});

describe('getTerrainHeightAt', () => {
  const points = [
    { x: 0, y: 100 },
    { x: 10, y: 200 },
    { x: 20, y: 100 },
  ];

  it('returns the exact height at a known point', () => {
    expect(getTerrainHeightAt(points, 0)).toBe(100);
    expect(getTerrainHeightAt(points, 10)).toBe(200);
    expect(getTerrainHeightAt(points, 20)).toBe(100);
  });

  it('linearly interpolates between two points', () => {
    expect(getTerrainHeightAt(points, 5)).toBeCloseTo(150);
    expect(getTerrainHeightAt(points, 15)).toBeCloseTo(150);
  });

  it('clamps to the first point height before the terrain starts', () => {
    expect(getTerrainHeightAt(points, -50)).toBe(100);
  });

  it('clamps to the last point height past the terrain end', () => {
    expect(getTerrainHeightAt(points, 999)).toBe(100);
  });
});
