import { describe, expect, it } from 'vitest';
import {
  cargoMass,
  cargoValue,
  EMPTY_MANIFEST,
  evaluateCargoFit,
  meetsMinManifest,
  type CargoManifest,
} from './cargo';
import { findShipById } from '../ships/ships';

describe('cargoMass', () => {
  it('is zero for an empty manifest', () => {
    expect(cargoMass(EMPTY_MANIFEST)).toBe(0);
  });

  it('sums troops at 10 MU/squad and supplies at 2 MU/unit', () => {
    const manifest: CargoManifest = { troops: 6, supplies: 20 };
    expect(cargoMass(manifest)).toBe(6 * 10 + 20 * 2);
  });
});

describe('cargoValue', () => {
  it('is zero for an empty manifest', () => {
    expect(cargoValue(EMPTY_MANIFEST)).toBe(0);
  });

  it('sums troops at 25 credits/squad and supplies at 5 credits/unit', () => {
    const manifest: CargoManifest = { troops: 6, supplies: 20 };
    expect(cargoValue(manifest)).toBe(6 * 25 + 20 * 5);
  });
});

describe('meetsMinManifest', () => {
  it('is true against an empty minManifest regardless of delivered cargo', () => {
    expect(meetsMinManifest(EMPTY_MANIFEST, {})).toBe(true);
  });

  it('is false when a named minimum is not yet met', () => {
    expect(meetsMinManifest({ troops: 5, supplies: 0 }, { troops: 6 })).toBe(false);
  });

  it('is true once a named minimum is exactly met', () => {
    expect(meetsMinManifest({ troops: 6, supplies: 0 }, { troops: 6 })).toBe(true);
  });

  it('ignores cargo types the minManifest does not constrain', () => {
    expect(meetsMinManifest({ troops: 0, supplies: 999 }, { troops: 6 })).toBe(false);
    expect(meetsMinManifest({ troops: 6, supplies: 0 }, { troops: 6 })).toBe(true);
  });

  it('checks every named minimum, not just the first', () => {
    const minManifest = { troops: 6, supplies: 10 };
    expect(meetsMinManifest({ troops: 6, supplies: 9 }, minManifest)).toBe(false);
    expect(meetsMinManifest({ troops: 6, supplies: 10 }, minManifest)).toBe(true);
  });
});

describe('evaluateCargoFit', () => {
  const scout = findShipById('scout'); // massBudget 90, cargoBayCapacity 60

  it('passes both gates for a light manifest with no equipment', () => {
    const result = evaluateCargoFit(scout, 0, { troops: 2, supplies: 0 });
    expect(result.fitsCargoBay).toBe(true);
    expect(result.fitsMassBudget).toBe(true);
  });

  it('fails fitsCargoBay when cargo mass alone exceeds cargoBayCapacity', () => {
    // 7 troop squads = 70 MU > 60 cargoBayCapacity, but < 90 massBudget alone.
    const result = evaluateCargoFit(scout, 0, { troops: 7, supplies: 0 });
    expect(result.fitsCargoBay).toBe(false);
    expect(result.fitsMassBudget).toBe(true);
  });

  it('fails fitsMassBudget when cargo plus equipment exceeds massBudget, independent of cargoBayCapacity', () => {
    // 5 troop squads = 50 MU, within cargoBayCapacity (60), but + 45 equipment = 95 > 90 massBudget.
    const result = evaluateCargoFit(scout, 45, { troops: 5, supplies: 0 });
    expect(result.fitsCargoBay).toBe(true);
    expect(result.fitsMassBudget).toBe(false);
  });

  it('can fail both gates at once', () => {
    const result = evaluateCargoFit(scout, 45, { troops: 7, supplies: 0 });
    expect(result.fitsCargoBay).toBe(false);
    expect(result.fitsMassBudget).toBe(false);
  });
});
