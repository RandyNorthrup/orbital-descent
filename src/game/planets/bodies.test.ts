import { describe, expect, it } from 'vitest';
import { BODIES } from './bodies';
import type { EtchStyle } from './celestial-body';

const ETCH_STYLES: readonly EtchStyle[] = ['rock', 'sand', 'water', 'foliage'];

describe('BODIES', () => {
  it('has a starter registry of at least 12 worlds (allowed to grow later)', () => {
    expect(BODIES.length).toBeGreaterThanOrEqual(12);
  });

  it('has no duplicate ids', () => {
    const ids = new Set(BODIES.map((body) => body.id));
    expect(ids.size).toBe(BODIES.length);
  });

  it('gives every body a non-empty name and physically sane fields', () => {
    for (const body of BODIES) {
      expect(body.name.length).toBeGreaterThan(0);
      expect(body.gravityAccel).toBeGreaterThan(0);
      expect(body.atmosphereDensity).toBeGreaterThanOrEqual(0);
      expect(body.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every hazard internally-consistent values', () => {
    for (const body of BODIES) {
      const hazard = body.hazard;
      if (hazard?.type === 'corrosive') {
        expect(hazard.fuelDrainRate).toBeGreaterThan(0);
      }
      if (hazard?.type === 'cold') {
        expect(hazard.thrustEfficiency).toBeGreaterThan(0);
        expect(hazard.thrustEfficiency).toBeLessThanOrEqual(1);
      }
    }
  });

  it('includes at least one body of each hazard category', () => {
    const counts = { null: 0, corrosive: 0, cold: 0 };
    for (const body of BODIES) {
      const key = body.hazard === null ? 'null' : body.hazard.type;
      counts[key] += 1;
    }
    expect(counts.null).toBeGreaterThan(0);
    expect(counts.corrosive).toBeGreaterThan(0);
    expect(counts.cold).toBeGreaterThan(0);
  });

  it('includes at least one body of each etch style', () => {
    const counts = new Map<EtchStyle, number>(ETCH_STYLES.map((style) => [style, 0]));
    for (const body of BODIES) {
      const style = body.terrainPalette.etchStyle;
      counts.set(style, (counts.get(style) ?? 0) + 1);
    }
    for (const style of ETCH_STYLES) {
      expect(counts.get(style)).toBeGreaterThan(0);
    }
  });

  it('gives every body a distinct sky palette (no two worlds sharing a full set of sky colors)', () => {
    const signatures = new Set(BODIES.map((body) => JSON.stringify(body.skyPalette)));
    expect(signatures.size).toBe(BODIES.length);
  });

  it('gives every sky palette in-range colors and a darker sky top than bottom (night-sky depth cue)', () => {
    const MAX_COLOR = 0xffffff;
    const channelAverage = (color: number): number => {
      const BYTE = 0xff;
      const RED_SHIFT = 16;
      const GREEN_SHIFT = 8;
      const CHANNELS = 3;
      return (
        (((color >> RED_SHIFT) & BYTE) + ((color >> GREEN_SHIFT) & BYTE) + (color & BYTE)) /
        CHANNELS
      );
    };
    for (const body of BODIES) {
      const palette = body.skyPalette;
      for (const color of [
        palette.skyTopColor,
        palette.skyBottomColor,
        palette.moonColor,
        palette.ridgeColor,
        palette.starColor,
        ...(palette.cloudColor === undefined ? [] : [palette.cloudColor]),
      ]) {
        expect(color).toBeGreaterThanOrEqual(0x000000);
        expect(color).toBeLessThanOrEqual(MAX_COLOR);
      }
      // Every palette deepens overhead: top darker than bottom, whether
      // that's a night sky whose moon/stars read against the darkest band
      // or a day sky's zenith blue over brighter horizon haze (Milestone
      // 15's day palettes obey the same gradient direction).
      expect(channelAverage(palette.skyTopColor)).toBeLessThan(
        channelAverage(palette.skyBottomColor),
      );
    }
  });

  it('has a cloud color exactly when the world has an atmosphere (airless worlds render a companion moon instead)', () => {
    for (const body of BODIES) {
      if (body.atmosphereDensity > 0) {
        expect(body.skyPalette.cloudColor).toBeDefined();
      } else {
        expect(body.skyPalette.cloudColor).toBeUndefined();
      }
    }
  });

  it("classifies a body as a moon exactly when it is airless (kind 'moon' ⇔ atmosphereDensity 0)", () => {
    for (const body of BODIES) {
      if (body.kind === 'moon') {
        expect(body.atmosphereDensity).toBe(0);
      } else {
        expect(body.atmosphereDensity).toBeGreaterThan(0);
      }
    }
  });

  it("authors every moon at night — an airless sky is black regardless of sun position, so daylight 'day'/'dusk' on a moon would be a physics lie", () => {
    for (const body of BODIES) {
      if (body.kind === 'moon') {
        expect(body.skyPalette.daylight).toBe('night');
      }
    }
  });

  it('authors a real daylight sun only where an atmosphere can scatter it (day ⇒ atmosphere)', () => {
    for (const body of BODIES) {
      if (body.skyPalette.daylight === 'day') {
        expect(body.atmosphereDensity).toBeGreaterThan(0);
      }
    }
  });

  it('spans all three world kinds and all three daylights (Milestone 15 — the map must not read as twelve night scenes)', () => {
    const kinds = new Set(BODIES.map((body) => body.kind));
    expect(kinds).toEqual(new Set(['moon', 'barren', 'lush']));
    const daylights = new Set(BODIES.map((body) => body.skyPalette.daylight));
    expect(daylights).toEqual(new Set(['day', 'dusk', 'night']));
  });

  // Pin test: a later milestone's worked examples in PLAN.md do exact
  // fuel/distance arithmetic against these four specific bodies (Kessel's
  // Reach, Verdalis, Pyrrhine Expanse, Glacian Drift), so a casual future
  // edit silently changing one of them would break that milestone's math
  // without this suite noticing.
  it('pins the distance/hazard of the four bodies used in PLAN.md worked examples', () => {
    const byId = new Map(BODIES.map((body) => [body.id, body]));

    const kesselsReach = byId.get('kessels-reach');
    expect(kesselsReach?.distance).toBe(0);
    expect(kesselsReach?.hazard).toBe(null);

    const verdalis = byId.get('verdalis');
    expect(verdalis?.distance).toBe(42);
    expect(verdalis?.hazard).toBe(null);

    const pyrrhineExpanse = byId.get('pyrrhine-expanse');
    expect(pyrrhineExpanse?.distance).toBe(95);
    expect(pyrrhineExpanse?.hazard?.type).toBe('corrosive');

    const glacianDrift = byId.get('glacian-drift');
    expect(glacianDrift?.distance).toBe(210);
    expect(glacianDrift?.hazard?.type).toBe('cold');
  });
});
