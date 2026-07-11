import { describe, expect, it } from 'vitest';
import {
  generateCloudBank,
  generateCloudPuff,
  generatePuffPlacements,
  type GenerateCloudBankOptions,
} from './cloud-bank';

const BANK_OPTIONS: GenerateCloudBankOptions = {
  seed: 42,
  width: 960,
  baselineY: 400,
  minRadius: 24,
  maxRadius: 56,
  overlapFraction: 0.4,
  jitterY: 10,
};

describe('generateCloudBank', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a = generateCloudBank(BANK_OPTIONS);
    const b = generateCloudBank(BANK_OPTIONS);
    const c = generateCloudBank({ ...BANK_OPTIONS, seed: 43 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('spans the full width with no gap at either edge', () => {
    const circles = generateCloudBank(BANK_OPTIONS);
    const first = circles[0];
    const last = circles.at(-1);
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    // First circle starts at x=0 (covers the left edge); the loop only
    // stops once a circle's right extent passes the full width.
    expect(first?.x).toBe(0);
    expect((last?.x ?? 0) + (last?.radius ?? 0)).toBeGreaterThanOrEqual(BANK_OPTIONS.width);
  });

  it('keeps every radius within the configured range', () => {
    for (const circle of generateCloudBank(BANK_OPTIONS)) {
      expect(circle.radius).toBeGreaterThanOrEqual(BANK_OPTIONS.minRadius);
      expect(circle.radius).toBeLessThanOrEqual(BANK_OPTIONS.maxRadius);
    }
  });

  it('keeps every scallop center within jitter range of the baseline', () => {
    for (const circle of generateCloudBank(BANK_OPTIONS)) {
      expect(Math.abs(circle.y - BANK_OPTIONS.baselineY)).toBeLessThanOrEqual(BANK_OPTIONS.jitterY);
    }
  });

  it('leaves no horizontal gap between adjacent scallops (adjacent circles overlap)', () => {
    const circles = generateCloudBank(BANK_OPTIONS);
    for (let i = 1; i < circles.length; i += 1) {
      const previous = circles[i - 1];
      const current = circles[i];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      const gap = (current?.x ?? 0) - (previous?.x ?? 0);
      expect(gap).toBeLessThan((previous?.radius ?? 0) + (current?.radius ?? 0));
    }
  });
});

describe('generateCloudPuff', () => {
  it('is deterministic for the same seed', () => {
    expect(generateCloudPuff({ seed: 7, coreRadius: 40 })).toEqual(
      generateCloudPuff({ seed: 7, coreRadius: 40 }),
    );
  });

  it('produces a connected cluster: every lobe overlaps the core circle', () => {
    const circles = generateCloudPuff({ seed: 7, coreRadius: 40 });
    const core = circles[0];
    expect(core).toBeDefined();
    for (const lobe of circles.slice(1)) {
      const distance = Math.hypot(lobe.x - (core?.x ?? 0), lobe.y - (core?.y ?? 0));
      expect(distance).toBeLessThan(lobe.radius + (core?.radius ?? 0));
    }
  });

  it('scales the whole cluster with coreRadius', () => {
    const small = generateCloudPuff({ seed: 7, coreRadius: 20 });
    const large = generateCloudPuff({ seed: 7, coreRadius: 40 });
    const smallCore = small[0];
    const largeCore = large[0];
    expect((largeCore?.radius ?? 0) / (smallCore?.radius ?? 1)).toBeCloseTo(2);
  });
});

describe('generatePuffPlacements', () => {
  const OPTIONS = {
    seed: 11,
    width: 2880,
    minY: 60,
    maxY: 300,
    count: 6,
    minScale: 0.5,
    maxScale: 1.2,
  };

  it('is deterministic for the same seed', () => {
    expect(generatePuffPlacements(OPTIONS)).toEqual(generatePuffPlacements(OPTIONS));
  });

  it('produces exactly count placements inside the configured bounds', () => {
    const placements = generatePuffPlacements(OPTIONS);
    expect(placements).toHaveLength(OPTIONS.count);
    for (const placement of placements) {
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.x).toBeLessThanOrEqual(OPTIONS.width);
      expect(placement.y).toBeGreaterThanOrEqual(OPTIONS.minY);
      expect(placement.y).toBeLessThanOrEqual(OPTIONS.maxY);
      expect(placement.scale).toBeGreaterThanOrEqual(OPTIONS.minScale);
      expect(placement.scale).toBeLessThanOrEqual(OPTIONS.maxScale);
    }
  });
});
