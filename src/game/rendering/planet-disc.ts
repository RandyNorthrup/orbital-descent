import Phaser from 'phaser';
import { DECOR_LAVA_COLOR, MOON_CRATER_DARKEN_FRACTION } from '../constants';
import type { CelestialBody } from '../planets/celestial-body';
import type { LandformKind } from '../terrain/landforms';
import { generateMoonCraters } from './moon-craters';
import { createSeededRandom } from '../random/seeded-random';
import { darken, lighten } from './color-mix';
import { bakeCanvasTexture, hexToCss } from './canvas-texture-utils';

/* eslint-disable @typescript-eslint/no-magic-numbers --
 * The per-landform feature painters below are authored glyph geometry
 * (spike offsets, wave phases, crack vertices) at a fixed 13px disc
 * radius — the same silhouette-table class as decoration-visual.ts's
 * file-level disable. Shared, cross-module tunables stay in constants.ts. */

/** Presentation-only geometry for the world map's planet discs (PLAN.md
 * Milestone 14; per-landform signatures Milestone 16.5, D26) — scoped to
 * this file per the constants convention. */
const PLANET_DISC_RADIUS_PX = 16;
const PLANET_DISC_CRATER_COUNT = 4;
const PLANET_DISC_CRATER_MIN_RADIUS_FRACTION = 0.12;
const PLANET_DISC_CRATER_MAX_RADIUS_FRACTION = 0.26;
const PLANET_DISC_CRATER_SEED = 6060;
/** Canvas margin so protruding features (ice spikes, needle spires, the
 * volcano's smoke curl) draw outside the disc rim without clipping. */
const PLANET_DISC_FEATURE_PAD_PX = 10;

interface FeatureArgs {
  readonly ctx: CanvasRenderingContext2D;
  /** Canvas-space disc center (both axes — the canvas is square). */
  readonly c: number;
  readonly r: number;
  readonly body: CelestialBody;
}

/** Deep punched craters with a lit rim arc — temp/planet_pack's cratered
 * rocky world. The one landform that keeps M14's crater treatment. */
function paintCraterField(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  const craterColor = darken(body.terrainPalette.fillTopColor, MOON_CRATER_DARKEN_FRACTION);
  const rimColor = lighten(body.terrainPalette.fillTopColor, 0.3);
  const craters = generateMoonCraters({
    seed: PLANET_DISC_CRATER_SEED + body.distance,
    moonRadius: r,
    count: PLANET_DISC_CRATER_COUNT,
    minRadiusFraction: PLANET_DISC_CRATER_MIN_RADIUS_FRACTION,
    maxRadiusFraction: PLANET_DISC_CRATER_MAX_RADIUS_FRACTION,
  });
  for (const crater of craters) {
    ctx.beginPath();
    ctx.arc(c + crater.x, c + crater.y, crater.radius, 0, Math.PI * 2);
    ctx.fillStyle = hexToCss(craterColor);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c + crater.x, c + crater.y, crater.radius, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.strokeStyle = hexToCss(rimColor);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Horizontal wavy dune bands. */
function paintDuneSea(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillTopColor, 0.22));
  for (const bandY of [-0.35, 0.1, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(c - r, c + bandY * r);
    for (let i = 0; i <= 8; i += 1) {
      const x = c - r + (i / 8) * r * 2;
      const y = c + bandY * r + Math.sin(i * Math.PI * 0.75) * 1.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(c + r, c + bandY * r + 3.5);
    ctx.lineTo(c - r, c + bandY * r + 3.5);
    ctx.closePath();
    ctx.fill();
  }
}

/** Angular flat-topped mesa patches. */
function paintMesa(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillTopColor, 0.3));
  const patches = [
    [-0.7, -0.25, 0.5, 0.3],
    [0.05, 0.15, 0.6, 0.35],
    [-0.35, 0.55, 0.45, 0.25],
  ] as const;
  for (const [px, py, w, h] of patches) {
    ctx.beginPath();
    ctx.moveTo(c + px * r, c + py * r);
    ctx.lineTo(c + (px + w) * r, c + py * r);
    ctx.lineTo(c + (px + w * 0.82) * r, c + (py + h) * r);
    ctx.lineTo(c + (px + w * 0.14) * r, c + (py + h) * r);
    ctx.closePath();
    ctx.fill();
  }
}

/** Spikes protruding past the rim — the shattered-ice-sphere reference. */
function paintSpikes(
  args: FeatureArgs,
  count: number,
  lengthFraction: number,
  halfWidth: number,
): void {
  const { ctx, c, r, body } = args;
  const random = createSeededRandom(PLANET_DISC_CRATER_SEED + body.distance);
  ctx.fillStyle = hexToCss(lighten(body.terrainPalette.fillTopColor, 0.35));
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.5;
    const tip = r * (1 + lengthFraction + random() * 0.25);
    const baseAngleOffset = halfWidth / r;
    ctx.beginPath();
    ctx.moveTo(
      c + Math.cos(angle - baseAngleOffset) * r * 0.92,
      c + Math.sin(angle - baseAngleOffset) * r * 0.92,
    );
    ctx.lineTo(c + Math.cos(angle) * tip, c + Math.sin(angle) * tip);
    ctx.lineTo(
      c + Math.cos(angle + baseAngleOffset) * r * 0.92,
      c + Math.sin(angle + baseAngleOffset) * r * 0.92,
    );
    ctx.closePath();
    ctx.fill();
  }
}

/** One curling wave band with foam scallops. */
function paintWaveSwell(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillBottomColor, 0.12));
  ctx.beginPath();
  ctx.moveTo(c - r, c + r * 0.15);
  ctx.quadraticCurveTo(c - r * 0.2, c - r * 0.55, c + r * 0.35, c + r * 0.05);
  ctx.quadraticCurveTo(c + r * 0.8, c + r * 0.4, c + r, c + r * 0.15);
  ctx.lineTo(c + r, c + r);
  ctx.lineTo(c - r, c + r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToCss(lighten(body.terrainPalette.fillTopColor, 0.55));
  for (const [fx, fy] of [
    [-0.45, -0.18],
    [0.05, -0.3],
    [0.5, 0.02],
  ] as const) {
    ctx.beginPath();
    ctx.arc(c + fx * r, c + fy * r, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Small rounded mound bumps. */
function paintHummocks(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillTopColor, 0.26));
  for (const [hx, hy, hr] of [
    [-0.5, 0.3, 0.28],
    [0.1, -0.15, 0.34],
    [0.55, 0.45, 0.24],
    [-0.15, 0.65, 0.2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(c + hx * r, c + hy * r, hr * r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
}

/** One jagged dark rift crack across the face — the Mars-rift reference. */
function paintRiftCanyon(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillBottomColor, 0.3));
  ctx.beginPath();
  ctx.moveTo(c - r * 0.95, c - r * 0.2);
  ctx.lineTo(c - r * 0.35, c + r * 0.05);
  ctx.lineTo(c + r * 0.1, c - r * 0.25);
  ctx.lineTo(c + r * 0.6, c + r * 0.15);
  ctx.lineTo(c + r * 0.95, c - r * 0.05);
  ctx.lineTo(c + r * 0.9, c + r * 0.18);
  ctx.lineTo(c + r * 0.55, c + r * 0.42);
  ctx.lineTo(c + r * 0.05, c + r * 0.02);
  ctx.lineTo(c - r * 0.4, c + r * 0.35);
  ctx.lineTo(c - r * 0.92, c + r * 0.05);
  ctx.closePath();
  ctx.fill();
}

/** One vast offset depression with a lit rim ring. */
function paintBasin(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.beginPath();
  ctx.arc(c + r * 0.15, c + r * 0.1, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillTopColor, 0.34));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c + r * 0.15, c + r * 0.1, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = hexToCss(lighten(body.terrainPalette.fillTopColor, 0.28));
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** Slanted stacked strata bands — the sliced-band reference. */
function paintTerraces(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  const shades = [0.22, 0.1, 0.3, 0.16];
  for (let i = 0; i < shades.length; i += 1) {
    const y = -0.6 + i * 0.4;
    const shade = shades[i] ?? 0.2;
    ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillTopColor, shade));
    ctx.beginPath();
    ctx.moveTo(c - r, c + y * r + 2);
    ctx.lineTo(c + r, c + y * r - 2);
    ctx.lineTo(c + r, c + (y + 0.2) * r - 2);
    ctx.lineTo(c - r, c + (y + 0.2) * r + 2);
    ctx.closePath();
    ctx.fill();
  }
}

/** A branching web of thin dark cracks — the cracked-ice reference. */
function paintCrackedFlats(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.strokeStyle = hexToCss(darken(body.terrainPalette.fillBottomColor, 0.28));
  ctx.lineWidth = 1.3;
  const cracks = [
    [
      [-0.8, -0.3],
      [-0.2, -0.05],
      [0.3, -0.4],
      [0.75, -0.15],
    ],
    [
      [-0.2, -0.05],
      [-0.05, 0.45],
      [0.4, 0.7],
    ],
    [
      [-0.05, 0.45],
      [-0.55, 0.6],
    ],
  ] as const;
  for (const crack of cracks) {
    ctx.beginPath();
    for (const [i, [px, py]] of crack.entries()) {
      if (i === 0) {
        ctx.moveTo(c + px * r, c + py * r);
      } else {
        ctx.lineTo(c + px * r, c + py * r);
      }
    }
    ctx.stroke();
  }
}

/** A cone on the limb with a glow mouth and a smoke curl above. */
function paintVolcano(args: FeatureArgs): void {
  const { ctx, c, r, body } = args;
  ctx.fillStyle = hexToCss(darken(body.terrainPalette.fillBottomColor, 0.2));
  ctx.beginPath();
  ctx.moveTo(c - r * 0.65, c + r * 0.35);
  ctx.lineTo(c - r * 0.1, c - r * 0.75);
  ctx.lineTo(c + r * 0.45, c + r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hexToCss(DECOR_LAVA_COLOR);
  ctx.beginPath();
  ctx.arc(c - r * 0.1, c - r * 0.72, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToCss(lighten(body.skyPalette.ridgeColor, 0.35));
  for (const [sx, sy, sr] of [
    [-0.05, -1.05, 0.14],
    [0.12, -1.28, 0.18],
  ] as const) {
    ctx.beginPath();
    ctx.arc(c + sx * r, c + sy * r, sr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

const FEATURE_PAINTERS: Readonly<Record<LandformKind, (args: FeatureArgs) => void>> = {
  'crater-field': paintCraterField,
  'dune-sea': paintDuneSea,
  mesa: paintMesa,
  'ice-spikes': (args) => {
    paintSpikes(args, 7, 0.3, 2.4);
  },
  'wave-swell': paintWaveSwell,
  hummocks: paintHummocks,
  'rift-canyon': paintRiftCanyon,
  basin: paintBasin,
  terraces: paintTerraces,
  'cracked-flats': paintCrackedFlats,
  volcano: paintVolcano,
  'needle-spires': (args) => {
    paintSpikes(args, 5, 0.45, 1.3);
  },
};

/** Landforms whose features protrude past the rim and therefore paint
 * AFTER the clip is released. */
const UNCLIPPED_LANDFORMS: ReadonlySet<LandformKind> = new Set([
  'ice-spikes',
  'needle-spires',
  'volcano',
]);

/**
 * Bakes and adds one small planet disc for the world map — the world's
 * own terrain palette as a lit sphere (terrain top color at the face
 * center shading to the terrain bottom color at the limb), stamped with
 * its landform's signature feature (Milestone 16.5, D26: punched craters,
 * dune bands, rift crack, protruding ice spikes…), ringed by the shared
 * paper outline. Texture key is per-world (`planet-disc-<id>`), so twelve
 * discs alive at once never collide; rebaking the same key on a later
 * render pass is safe because `WorldMapScene.renderView()` destroys the
 * previous view's images first.
 */
export function createPlanetDiscImage(
  scene: Phaser.Scene,
  body: CelestialBody,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  const radius = PLANET_DISC_RADIUS_PX;
  const canvasSize = (radius + PLANET_DISC_FEATURE_PAD_PX) * 2;
  const center = canvasSize / 2;
  const faceColor = body.terrainPalette.fillTopColor;
  const limbColor = body.terrainPalette.fillBottomColor;

  const textureKey = `planet-disc-${body.id}`;
  bakeCanvasTexture(scene, textureKey, canvasSize, canvasSize, (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, hexToCss(faceColor));
    gradient.addColorStop(1, hexToCss(limbColor));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const painter = FEATURE_PAINTERS[body.landform];
    if (!UNCLIPPED_LANDFORMS.has(body.landform)) {
      painter({ ctx, c: center, r: radius, body });
    }
    ctx.restore();

    if (UNCLIPPED_LANDFORMS.has(body.landform)) {
      FEATURE_PAINTERS[body.landform]({ ctx, c: center, r: radius, body });
    }
  });

  return scene.add.image(x, y, textureKey);
}
