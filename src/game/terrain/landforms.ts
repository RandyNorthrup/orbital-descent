/**
 * Signature landform archetypes (Milestone 16.5, Decision D26) — the
 * shaping pass that turns the shared bounded-random-walk heightmap into
 * each world's own recognizable ground silhouette (crater bowls, mesa
 * steps, ice spikes, a volcano cone…), modeled on temp/planet_pack's
 * papercraft planets where every world stakes its identity on one
 * distinct landform.
 *
 * Pure module: no phaser import (AGENTS.md architecture rules). Callers
 * pass a PRNG; `terrain-generator.ts` derives it from a SEPARATE seeded
 * stream (`seed + LANDFORM_SEED_OFFSET`) so the walk and the random
 * landing-pad draw consume the main stream exactly as they did before
 * this milestone — pad positions are provably unchanged (pinned by
 * terrain-generator.test.ts).
 */
/* eslint-disable @typescript-eslint/no-magic-numbers --
 * Every number below is authored shape-recipe geometry (crater depth
 * fractions, dune wavelengths, cone exponents), exactly the class of
 * silhouette-table literals decoration-visual.ts and base-structures.ts
 * already carry file-level disables for. Naming ~90 one-use fractions
 * individually would bury the recipes they describe. Shared, cross-module
 * tunables (seed offset) still live in constants.ts. */

/** One kind per world — bodies.test.ts pins that no two of the twelve
 * worlds share a landform, so "all terrain is shaped the same" is
 * structurally impossible, not just unlikely. */
export type LandformKind =
  | 'crater-field'
  | 'dune-sea'
  | 'mesa'
  | 'ice-spikes'
  | 'wave-swell'
  | 'hummocks'
  | 'rift-canyon'
  | 'basin'
  | 'terraces'
  | 'cracked-flats'
  | 'volcano'
  | 'needle-spires';

export interface LandformBounds {
  /** y of the tallest allowed ground (Phaser y-down: smaller = taller). */
  readonly peakY: number;
  /** y of the lowest allowed ground (the valley floor). */
  readonly floorY: number;
}

/** Elevation space used by every recipe below: 0 = valley floor, 1 = the
 * tallest allowed peak — inverted from Phaser's y-down heightmap so the
 * shape math reads the way the landforms are described ("a spike ADDS
 * elevation"). Converted back at the end of applyLandform. */
const ELEVATION_MIN = 0.02;
const ELEVATION_MAX = 0.98;

type Recipe = (elevations: number[], walk: readonly number[], random: () => number) => void;

/** Rounded cosine-falloff bump: 1 at d=0, 0 at |d|>=1. */
function bump(d: number): number {
  if (Math.abs(d) >= 1) {
    return 0;
  }
  const c = Math.cos((Math.abs(d) * Math.PI) / 2);
  return c * c;
}

function craterField(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.32 + 0.24 * (walk[i] ?? 0.5);
  }
  const craterCount = 5 + Math.floor(random() * 3);
  for (let c = 0; c < craterCount; c += 1) {
    const center = (0.06 + random() * 0.88) * n;
    const radius = 2.5 + random() * 3;
    const depth = 0.3 + random() * 0.18;
    const rimHeight = 0.15 + random() * 0.08;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(i - center) / radius;
      const bowl = depth * Math.pow(bump(d), 1.4);
      const rim = rimHeight * bump((d - 1.08) / 0.35);
      elevations[i] = (elevations[i] ?? 0) - bowl + rim;
    }
  }
}

function duneSea(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  const primaryWaves = 5.5 + random() * 2.5;
  const primaryPhase = random() * Math.PI * 2;
  const ripplePhase = random() * Math.PI * 2;
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    const primary = Math.sin(t * primaryWaves * Math.PI * 2 + primaryPhase);
    const ripple = Math.sin(t * primaryWaves * 2.3 * Math.PI * 2 + ripplePhase);
    elevations[i] = 0.4 + 0.26 * primary + 0.1 * ripple + 0.08 * ((walk[i] ?? 0.5) - 0.5);
  }
}

// Mesa country deliberately ignores the walk layer: real mesas are FLAT —
// authored plateau levels with sharp steps, no residual roll.
function mesa(elevations: number[], _walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  const levels = [0.14, 0.44, 0.74];
  let i = 0;
  let previousLevel = -1;
  while (i < n) {
    const runLength = 5 + Math.floor(random() * 9);
    let levelIndex = Math.floor(random() * levels.length);
    if (levels[levelIndex] === previousLevel) {
      levelIndex = (levelIndex + 1) % levels.length;
    }
    const level = levels[levelIndex] ?? levels[0] ?? 0.44;
    for (let j = i; j < Math.min(i + runLength, n); j += 1) {
      elevations[j] = level;
    }
    previousLevel = level;
    i += runLength;
  }
}

function iceSpikes(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.18 + 0.22 * (walk[i] ?? 0.5);
  }
  let i = 2 + Math.floor(random() * 3);
  while (i < n - 2) {
    const spikeHeight = 0.32 + random() * 0.34;
    elevations[i] = (elevations[i] ?? 0) + spikeHeight;
    elevations[i - 1] = (elevations[i - 1] ?? 0) + spikeHeight * 0.4;
    elevations[i + 1] = (elevations[i + 1] ?? 0) + spikeHeight * 0.4;
    i += 3 + Math.floor(random() * 4);
  }
}

function waveSwell(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  const swells = 3 + random() * 1.5;
  const phase = random();
  // Breaking-wave asymmetry (temp/planet_pack's ocean world): a long slow
  // rise to the crest, then a near-cliff drop on the face.
  const crestPoint = 0.8;
  for (let i = 0; i < n; i += 1) {
    const p = ((i / n) * swells + phase) % 1;
    const rise = Math.sin((Math.PI / 2) * (p / crestPoint));
    const fall = Math.cos((Math.PI / 2) * ((p - crestPoint) / (1 - crestPoint)));
    const profile = p < crestPoint ? rise * rise : fall * fall;
    elevations[i] = 0.24 + 0.44 * profile + 0.05 * ((walk[i] ?? 0.5) - 0.5);
  }
}

function hummocks(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.16 + 0.04 * ((walk[i] ?? 0.5) - 0.5);
  }
  const moundCount = 5 + Math.floor(random() * 4);
  for (let m = 0; m < moundCount; m += 1) {
    const center = (0.05 + random() * 0.9) * n;
    const width = 2 + random() * 3;
    const height = 0.18 + random() * 0.2;
    for (let i = 0; i < n; i += 1) {
      elevations[i] = (elevations[i] ?? 0) + height * bump((i - center) / width);
    }
  }
}

function riftCanyon(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.6 + 0.08 * ((walk[i] ?? 0.5) - 0.5);
  }
  const riftCount = 2 + Math.floor(random() * 2);
  for (let r = 0; r < riftCount; r += 1) {
    const binStart = (r / riftCount) * 0.8 + 0.1;
    const center = (binStart + (random() * 0.6) / riftCount) * n;
    const width = 2.5 + random() * 2.5;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(i - center) / width;
      if (d < 1) {
        const wall = Math.pow(d, 3);
        const plain = elevations[i] ?? 0.6;
        elevations[i] = 0.07 + (plain - 0.07) * wall;
      }
    }
  }
}

function basin(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  const center = n / 2 + (random() - 0.5) * n * 0.1;
  const halfWidth = n * 0.34;
  for (let i = 0; i < n; i += 1) {
    const d = Math.min(Math.abs(i - center) / halfWidth, 1);
    elevations[i] = 0.12 + 0.72 * Math.pow(d, 1.8) + 0.04 * ((walk[i] ?? 0.5) - 0.5);
  }
}

function terraces(elevations: number[], walk: readonly number[]): void {
  const n = elevations.length;
  const stepHeight = 0.13;
  for (let i = 0; i < n; i += 1) {
    const raw = 0.12 + (walk[i] ?? 0.5) * 0.6;
    elevations[i] = Math.round(raw / stepHeight) * stepHeight;
  }
  // Merge single-point steps into their left neighbor: a one-segment
  // stair reads as noise, not strata.
  for (let i = 1; i < n - 1; i += 1) {
    if (elevations[i] !== elevations[i - 1] && elevations[i] !== elevations[i + 1]) {
      elevations[i] = elevations[i - 1] ?? 0;
    }
  }
}

function crackedFlats(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.22 + 0.03 * ((walk[i] ?? 0.5) - 0.5);
  }
  const slabCount = 3 + Math.floor(random() * 3);
  for (let s = 0; s < slabCount; s += 1) {
    const center = (0.08 + random() * 0.84) * n;
    const width = 1.5 + random() * 1.5;
    const height = 0.24 + random() * 0.2;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(i - center) / width;
      if (d < 1) {
        elevations[i] = (elevations[i] ?? 0) + height * (1 - d);
      }
    }
  }
  const crackCount = 4;
  for (let c = 0; c < crackCount; c += 1) {
    const center = (0.05 + random() * 0.9) * n;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(i - center) / 1.2;
      if (d < 1) {
        elevations[i] = (elevations[i] ?? 0) - 0.07 * (1 - d);
      }
    }
  }
}

function volcano(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  const center = (0.4 + random() * 0.2) * n;
  const halfWidth = n * 0.15;
  for (let i = 0; i < n; i += 1) {
    const ground = 0.14 + 0.12 * (walk[i] ?? 0.5);
    const d = Math.abs(i - center) / halfWidth;
    const cone = d < 1 ? 0.95 * Math.pow(1 - d, 1.5) : 0;
    elevations[i] = Math.max(ground, cone);
    if (Math.abs(i - center) <= 2) {
      elevations[i] = (elevations[i] ?? 0) - 0.22;
    }
  }
}

function needleSpires(elevations: number[], walk: readonly number[], random: () => number): void {
  const n = elevations.length;
  for (let i = 0; i < n; i += 1) {
    elevations[i] = 0.12 + 0.14 * (walk[i] ?? 0.5);
  }
  const spireCount = 4 + Math.floor(random() * 3);
  for (let s = 0; s < spireCount; s += 1) {
    const binStart = (s / spireCount) * 0.86 + 0.06;
    const center = Math.round((binStart + (random() * 0.7) / spireCount) * n);
    const height = 0.55 + random() * 0.3;
    if (center >= 1 && center < n - 1) {
      elevations[center] = (elevations[center] ?? 0) + height;
      elevations[center - 1] = (elevations[center - 1] ?? 0) + height * 0.22;
      elevations[center + 1] = (elevations[center + 1] ?? 0) + height * 0.22;
    }
  }
}

const RECIPES: Record<LandformKind, Recipe> = {
  'crater-field': craterField,
  'dune-sea': duneSea,
  mesa,
  'ice-spikes': iceSpikes,
  'wave-swell': waveSwell,
  hummocks,
  'rift-canyon': riftCanyon,
  basin,
  terraces,
  'cracked-flats': crackedFlats,
  volcano,
  'needle-spires': needleSpires,
};

/**
 * Reshapes a walk-generated heightmap into the given landform. Returns a
 * NEW array (the input is not mutated). `heights` are y-down world
 * coordinates within [bounds.peakY, bounds.floorY]; the walk's own values
 * survive as a normalized texture layer inside each recipe, so two worlds
 * with the same landform kind (none exist today, pinned) would still
 * differ by seed.
 */
export function applyLandform(
  heights: readonly number[],
  kind: LandformKind,
  random: () => number,
  bounds: LandformBounds,
): number[] {
  const span = bounds.floorY - bounds.peakY;
  // Walk heights normalized to elevation space (0 = floor, 1 = peak).
  const walk = heights.map((y) => (span === 0 ? 0.5 : (bounds.floorY - y) / span));
  const elevations = new Array<number>(heights.length).fill(0);
  RECIPES[kind](elevations, walk, random);
  return elevations.map((e) => {
    const clamped = Math.min(Math.max(e, ELEVATION_MIN), ELEVATION_MAX);
    return bounds.floorY - clamped * span;
  });
}
