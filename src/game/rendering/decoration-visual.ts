/* eslint-disable @typescript-eslint/no-magic-numbers -- this module is
 * glyph geometry: every literal is a local coordinate, radius, or arc
 * fraction inside one glyph's own canvas box, the same data class as
 * ships/silhouette.ts's vertex tables (which the rule already permits as
 * object literals). Naming each would bury the drawings under dozens of
 * one-use constants; real tunables (sizes, colors, shared fractions)
 * still live in constants.ts. */
import Phaser from 'phaser';
import {
  DECOR_ACCENT_LIGHTEN_FRACTION,
  DECOR_CANOPY_LIGHTEN_FRACTION,
  DECOR_CRATER_DARKEN_FRACTION,
  DECOR_CRYSTAL_LIGHTEN_FRACTION,
  DECOR_FACET_LIGHTEN_FRACTION,
  DECOR_ICE_LIGHTEN_FRACTION,
  DECOR_LAVA_COLOR,
  DECOR_LAVA_CORE_COLOR,
  DECOR_ROCK_DARKEN_FRACTION,
  DECOR_SHADE_DARKEN_FRACTION,
  DECOR_TRUNK_DARKEN_FRACTION,
  VOLCANO_SMOKE_PUFF_ALPHA,
  DECORATION_BAKE_SUPERSAMPLE,
  DECORATION_SHADOW_ALPHA,
  DECORATION_SHADOW_OFFSET_PX,
  OUTLINE_COLOR,
  TERRAIN_SHADOW_LAYER_DEPTH,
} from '../constants';
import type { CelestialBody } from '../planets/celestial-body';
import type { DecorationKind, DecorationSpec } from '../terrain/decorations';
import { getTerrainHeightAt, type Terrain } from '../terrain/terrain-generator';
import { createSeededRandom } from '../random/seeded-random';
import { darken, lighten } from './color-mix';
import { bakeCanvasTexture, hexToCss } from './canvas-texture-utils';

/**
 * The drawing half of Milestone 16's terrain set-dressing (PLAN.md D24):
 * every decoration is its own paper cutout — clean silhouette, piece-scale
 * dark outline, hard offset shadow — planted on the terrain surface, so a
 * world reads as a built diorama (the Paper Mario research verdict: the
 * environment is made of crafted objects, not painted texture).
 *
 * Texture-key discipline (the M11/M13 lesson): one texture per
 * (world, kind, variant), baked at most once behind an exists() guard —
 * `bakeCanvasTexture` itself rebakes unconditionally, so the guard here is
 * load-bearing, exactly like GameScene's projectile glow.
 */

interface DecorationColors {
  readonly canopy: number;
  readonly canopyLit: number;
  readonly trunk: number;
  readonly accent: number;
  readonly rock: number;
  readonly rockFacet: number;
  readonly crystal: number;
  readonly crystalFacet: number;
  readonly ground: number;
  readonly groundShade: number;
  readonly lava: number;
  readonly lavaCore: number;
  readonly ice: number;
  readonly iceFacet: number;
}

function decorationColors(body: CelestialBody): DecorationColors {
  const ridge = body.skyPalette.ridgeColor;
  const terrainTop = body.terrainPalette.fillTopColor;
  const terrainBottom = body.terrainPalette.fillBottomColor;
  const warmAccent = body.skyPalette.moonColor;
  return {
    canopy: ridge,
    canopyLit: lighten(ridge, DECOR_CANOPY_LIGHTEN_FRACTION),
    trunk: darken(terrainBottom, DECOR_TRUNK_DARKEN_FRACTION),
    accent: lighten(warmAccent, DECOR_ACCENT_LIGHTEN_FRACTION),
    rock: darken(terrainTop, DECOR_ROCK_DARKEN_FRACTION),
    rockFacet: lighten(
      darken(terrainTop, DECOR_ROCK_DARKEN_FRACTION),
      DECOR_FACET_LIGHTEN_FRACTION,
    ),
    crystal: lighten(body.skyPalette.skyBottomColor, DECOR_CRYSTAL_LIGHTEN_FRACTION),
    crystalFacet: lighten(
      lighten(body.skyPalette.skyBottomColor, DECOR_CRYSTAL_LIGHTEN_FRACTION),
      DECOR_FACET_LIGHTEN_FRACTION,
    ),
    ground: terrainTop,
    groundShade: darken(terrainTop, DECOR_SHADE_DARKEN_FRACTION),
    lava: DECOR_LAVA_COLOR,
    lavaCore: DECOR_LAVA_CORE_COLOR,
    ice: lighten(terrainTop, DECOR_ICE_LIGHTEN_FRACTION),
    iceFacet: lighten(
      lighten(terrainTop, DECOR_ICE_LIGHTEN_FRACTION),
      DECOR_FACET_LIGHTEN_FRACTION,
    ),
  };
}

/** Canvas footprint per kind — every glyph draws with its bottom-center
 * anchored at (width/2, height - PAD), so instances plant on the terrain
 * surface via a (0.5, 1) origin. */
const GLYPH_SIZES: Readonly<Record<DecorationKind, { w: number; h: number }>> = {
  tree: { w: 48, h: 60 },
  bush: { w: 40, h: 26 },
  reed: { w: 30, h: 46 },
  flower: { w: 26, h: 34 },
  'grass-tuft': { w: 30, h: 20 },
  rock: { w: 44, h: 32 },
  crystal: { w: 40, h: 44 },
  snag: { w: 34, h: 48 },
  boulder: { w: 44, h: 30 },
  'surface-crater': { w: 60, h: 16 },
  'lava-vent': { w: 42, h: 36 },
  'ice-shard': { w: 46, h: 58 },
};

/** Inner padding so outlines/shadows never clip at the canvas edge. */
const GLYPH_PAD = 4;

type Ctx = CanvasRenderingContext2D;

interface DrawArgs {
  readonly ctx: Ctx;
  readonly colors: DecorationColors;
  /** Variant-seeded jitter source — same variant, same shape. */
  readonly rng: () => number;
  /** Bottom-center of the glyph in canvas space. */
  readonly baseX: number;
  readonly baseY: number;
}

/** D28 (True Paper): decoration pieces are cut paper — fill only, no
 * ink stroke; the baked shadow pass carries the layer separation. */
function cut(ctx: Ctx, fill: number, path: () => void): void {
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.fillStyle = hexToCss(fill);
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

const TREE_PUFFS = [
  { dx: -11, dy: -34, r: 12 },
  { dx: 11, dy: -34, r: 12 },
  { dx: 0, dy: -44, r: 13 },
] as const;
const TREE_TRUNK = { topHalfWidth: 3, bottomHalfWidth: 5, height: 26 } as const;
const PUFF_JITTER_PX = 3;
const LIT_INSET_FRACTION = 0.55;
const LIT_OFFSET_PX = 3;

function drawTree(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  cut(ctx, colors.trunk, () => {
    ctx.moveTo(baseX - TREE_TRUNK.bottomHalfWidth, baseY);
    ctx.lineTo(baseX - TREE_TRUNK.topHalfWidth, baseY - TREE_TRUNK.height);
    ctx.lineTo(baseX + TREE_TRUNK.topHalfWidth, baseY - TREE_TRUNK.height);
    ctx.lineTo(baseX + TREE_TRUNK.bottomHalfWidth, baseY);
  });
  const puffs = TREE_PUFFS.map((puff) => ({
    x: baseX + puff.dx + (rng() - 0.5) * PUFF_JITTER_PX * 2,
    y: baseY + puff.dy + (rng() - 0.5) * PUFF_JITTER_PX * 2,
    r: puff.r,
  }));
  cut(ctx, colors.canopy, () => {
    for (const puff of puffs) {
      circle(ctx, puff.x, puff.y, puff.r);
    }
  });
  ctx.beginPath();
  for (const puff of puffs) {
    circle(ctx, puff.x - LIT_OFFSET_PX, puff.y - LIT_OFFSET_PX, puff.r * LIT_INSET_FRACTION);
  }
  ctx.fillStyle = hexToCss(colors.canopyLit);
  ctx.fill();
}

const BUSH_LOBES = [
  { dx: -11, dy: -8, r: 9 },
  { dx: 0, dy: -12, r: 11 },
  { dx: 11, dy: -8, r: 9 },
] as const;

function drawBush(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  const lobes = BUSH_LOBES.map((lobe) => ({
    x: baseX + lobe.dx + (rng() - 0.5) * PUFF_JITTER_PX,
    y: baseY + lobe.dy,
    r: lobe.r,
  }));
  cut(ctx, colors.canopy, () => {
    for (const lobe of lobes) {
      circle(ctx, lobe.x, lobe.y, lobe.r);
    }
  });
  ctx.beginPath();
  for (const lobe of lobes) {
    circle(ctx, lobe.x - LIT_OFFSET_PX, lobe.y - LIT_OFFSET_PX, lobe.r * LIT_INSET_FRACTION);
  }
  ctx.fillStyle = hexToCss(colors.canopyLit);
  ctx.fill();
}

const REED_BLADES = [
  { dxBase: -8, dxTip: -12, height: 30 },
  { dxBase: 0, dxTip: 2, height: 40 },
  { dxBase: 8, dxTip: 13, height: 26 },
] as const;
const REED_HALF_WIDTH = 2;
const REED_HEAD = { rx: 3, ry: 6 } as const;
const REED_JITTER_PX = 4;

function drawReed(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  const tallest = REED_BLADES[1];
  for (const blade of REED_BLADES) {
    const tipX = baseX + blade.dxTip + (rng() - 0.5) * REED_JITTER_PX;
    cut(ctx, colors.canopy, () => {
      ctx.moveTo(baseX + blade.dxBase - REED_HALF_WIDTH, baseY);
      ctx.quadraticCurveTo(
        baseX + blade.dxBase,
        baseY - blade.height / 2,
        tipX,
        baseY - blade.height,
      );
      ctx.quadraticCurveTo(
        baseX + blade.dxBase + REED_HALF_WIDTH,
        baseY - blade.height / 2,
        baseX + blade.dxBase + REED_HALF_WIDTH,
        baseY,
      );
    });
  }
  cut(ctx, colors.accent, () => {
    ctx.ellipse(
      baseX + tallest.dxTip,
      baseY - tallest.height - REED_HEAD.ry,
      REED_HEAD.rx,
      REED_HEAD.ry,
      0,
      0,
      Math.PI * 2,
    );
  });
}

const FLOWER = { stemHeight: 18, petalRadius: 5, petalRing: 6, centerRadius: 4 } as const;
const FLOWER_PETAL_COUNT = 5;

function drawFlower(args: DrawArgs): void {
  const { ctx, colors, baseX, baseY } = args;
  const headY = baseY - FLOWER.stemHeight - FLOWER.petalRing;
  cut(ctx, colors.canopy, () => {
    ctx.moveTo(baseX - REED_HALF_WIDTH, baseY);
    ctx.lineTo(baseX - REED_HALF_WIDTH, baseY - FLOWER.stemHeight);
    ctx.lineTo(baseX + REED_HALF_WIDTH, baseY - FLOWER.stemHeight);
    ctx.lineTo(baseX + REED_HALF_WIDTH, baseY);
  });
  cut(ctx, colors.accent, () => {
    for (let i = 0; i < FLOWER_PETAL_COUNT; i += 1) {
      const angle = (i / FLOWER_PETAL_COUNT) * Math.PI * 2 - Math.PI / 2;
      circle(
        ctx,
        baseX + Math.cos(angle) * FLOWER.petalRing,
        headY + Math.sin(angle) * FLOWER.petalRing,
        FLOWER.petalRadius,
      );
    }
  });
  ctx.beginPath();
  circle(ctx, baseX, headY, FLOWER.centerRadius);
  ctx.fillStyle = hexToCss(colors.trunk);
  ctx.fill();
}

const GRASS_BLADES = [
  { dx: -10, height: 10 },
  { dx: -5, height: 14 },
  { dx: 0, height: 16 },
  { dx: 5, height: 13 },
  { dx: 10, height: 9 },
] as const;
const GRASS_HALF_WIDTH = 2.5;

function drawGrassTuft(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  for (const blade of GRASS_BLADES) {
    const lean = (rng() - 0.5) * REED_JITTER_PX;
    cut(ctx, colors.canopyLit, () => {
      ctx.moveTo(baseX + blade.dx - GRASS_HALF_WIDTH, baseY);
      ctx.lineTo(baseX + blade.dx + lean, baseY - blade.height);
      ctx.lineTo(baseX + blade.dx + GRASS_HALF_WIDTH, baseY);
    });
  }
}

const ROCK_POINTS = [
  { dx: -19, dy: 0 },
  { dx: -13, dy: -18 },
  { dx: -1, dy: -25 },
  { dx: 12, dy: -15 },
  { dx: 19, dy: 0 },
] as const;
const ROCK_JITTER_PX = 4;

function drawRock(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  const points = ROCK_POINTS.map((point) => ({
    x: baseX + point.dx + (rng() - 0.5) * ROCK_JITTER_PX,
    y: baseY + point.dy + (point.dy === 0 ? 0 : (rng() - 0.5) * ROCK_JITTER_PX),
  }));
  cut(ctx, colors.rock, () => {
    const first = points[0];
    if (!first) {
      return;
    }
    ctx.moveTo(first.x, first.y);
    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
  });
  const crest = points[2];
  const left = points[1];
  if (crest && left) {
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(crest.x, crest.y);
    ctx.lineTo((left.x + crest.x) / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = hexToCss(colors.rockFacet);
    ctx.fill();
  }
}

const CRYSTAL_SHARDS = [
  { tipDx: -2, tipDy: -38, leftDx: -11, rightDx: 6 },
  { tipDx: 12, tipDy: -22, leftDx: 4, rightDx: 18 },
] as const;

function drawCrystal(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  for (const shard of CRYSTAL_SHARDS) {
    const tipX = baseX + shard.tipDx + (rng() - 0.5) * ROCK_JITTER_PX;
    const tipY = baseY + shard.tipDy + (rng() - 0.5) * ROCK_JITTER_PX;
    cut(ctx, colors.crystal, () => {
      ctx.moveTo(baseX + shard.leftDx, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseX + shard.rightDx, baseY);
    });
    ctx.beginPath();
    ctx.moveTo(baseX + shard.leftDx, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(baseX + (shard.leftDx + shard.rightDx) / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = hexToCss(colors.crystalFacet);
    ctx.fill();
  }
}

const SNAG_BRANCHES = [
  { fromHeight: 26, dx: -11, dy: -34 },
  { fromHeight: 34, dx: 10, dy: -42 },
] as const;
const SNAG_TRUNK = { topHalfWidth: 2, bottomHalfWidth: 4, height: 42 } as const;
const SNAG_BRANCH_HALF_WIDTH = 2;

function drawSnag(args: DrawArgs): void {
  const { ctx, colors, baseX, baseY } = args;
  cut(ctx, colors.trunk, () => {
    ctx.moveTo(baseX - SNAG_TRUNK.bottomHalfWidth, baseY);
    ctx.lineTo(baseX - SNAG_TRUNK.topHalfWidth, baseY - SNAG_TRUNK.height);
    ctx.lineTo(baseX + SNAG_TRUNK.topHalfWidth, baseY - SNAG_TRUNK.height);
    ctx.lineTo(baseX + SNAG_TRUNK.bottomHalfWidth, baseY);
  });
  for (const branch of SNAG_BRANCHES) {
    cut(ctx, colors.trunk, () => {
      ctx.moveTo(baseX, baseY - branch.fromHeight - SNAG_BRANCH_HALF_WIDTH);
      ctx.lineTo(baseX + branch.dx, baseY + branch.dy);
      ctx.lineTo(baseX, baseY - branch.fromHeight + SNAG_BRANCH_HALF_WIDTH);
    });
  }
}

const BOULDER = { rx: 18, ry: 12 } as const;

function drawBoulder(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  const rx = BOULDER.rx + (rng() - 0.5) * ROCK_JITTER_PX;
  const ry = BOULDER.ry + (rng() - 0.5) * (ROCK_JITTER_PX / 2);
  cut(ctx, colors.ground, () => {
    ctx.ellipse(baseX, baseY - ry, rx, ry, 0, 0, Math.PI * 2);
  });
  ctx.beginPath();
  ctx.ellipse(
    baseX - LIT_OFFSET_PX,
    baseY - ry - LIT_OFFSET_PX,
    rx * LIT_INSET_FRACTION,
    ry * LIT_INSET_FRACTION,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = hexToCss(lighten(colors.ground, DECOR_FACET_LIGHTEN_FRACTION));
  ctx.fill();
}

const SURFACE_CRATER = { outerRx: 26, outerRy: 6, innerRx: 18, innerRy: 3.5 } as const;

function drawSurfaceCrater(args: DrawArgs): void {
  const { ctx, colors, baseX, baseY } = args;
  cut(ctx, colors.groundShade, () => {
    ctx.ellipse(
      baseX,
      baseY - SURFACE_CRATER.outerRy,
      SURFACE_CRATER.outerRx,
      SURFACE_CRATER.outerRy,
      0,
      0,
      Math.PI * 2,
    );
  });
  ctx.beginPath();
  ctx.ellipse(
    baseX,
    baseY - SURFACE_CRATER.outerRy,
    SURFACE_CRATER.innerRx,
    SURFACE_CRATER.innerRy,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = hexToCss(darken(colors.groundShade, DECOR_CRATER_DARKEN_FRACTION));
  ctx.fill();
}

const LAVA_VENT = {
  moundRx: 17,
  moundRy: 13,
  ventHalfWidth: 6,
  ventDepth: 9,
  coreRadius: 3.5,
  drips: [
    { dx: -7, length: 9 },
    { dx: 4, length: 13 },
  ],
} as const;

function drawLavaVent(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  const rx = LAVA_VENT.moundRx + (rng() - 0.5) * ROCK_JITTER_PX;
  // Dark rocky mound with a notched throat.
  cut(ctx, colors.rock, () => {
    ctx.moveTo(baseX - rx, baseY);
    ctx.lineTo(baseX - LAVA_VENT.ventHalfWidth, baseY - LAVA_VENT.moundRy * 2);
    ctx.lineTo(
      baseX - LAVA_VENT.ventHalfWidth + 2,
      baseY - LAVA_VENT.moundRy * 2 + LAVA_VENT.ventDepth,
    );
    ctx.lineTo(
      baseX + LAVA_VENT.ventHalfWidth - 2,
      baseY - LAVA_VENT.moundRy * 2 + LAVA_VENT.ventDepth,
    );
    ctx.lineTo(baseX + LAVA_VENT.ventHalfWidth, baseY - LAVA_VENT.moundRy * 2);
    ctx.lineTo(baseX + rx, baseY);
  });
  // Molten pool in the throat + glowing core.
  ctx.beginPath();
  ctx.moveTo(
    baseX - LAVA_VENT.ventHalfWidth + 2,
    baseY - LAVA_VENT.moundRy * 2 + LAVA_VENT.ventDepth,
  );
  ctx.lineTo(baseX, baseY - LAVA_VENT.moundRy * 2 + 2);
  ctx.lineTo(
    baseX + LAVA_VENT.ventHalfWidth - 2,
    baseY - LAVA_VENT.moundRy * 2 + LAVA_VENT.ventDepth,
  );
  ctx.closePath();
  ctx.fillStyle = hexToCss(colors.lava);
  ctx.fill();
  ctx.beginPath();
  circle(ctx, baseX, baseY - LAVA_VENT.moundRy * 2 + LAVA_VENT.ventDepth - 2, LAVA_VENT.coreRadius);
  ctx.fillStyle = hexToCss(colors.lavaCore);
  ctx.fill();
  // Lava drips running down the mound flanks.
  for (const drip of LAVA_VENT.drips) {
    ctx.beginPath();
    ctx.moveTo(baseX + drip.dx - 1.5, baseY - LAVA_VENT.moundRy - drip.length);
    ctx.lineTo(baseX + drip.dx + 1.5, baseY - LAVA_VENT.moundRy - drip.length);
    ctx.lineTo(baseX + drip.dx + 1, baseY - LAVA_VENT.moundRy + drip.length / 2);
    ctx.lineTo(baseX + drip.dx - 1, baseY - LAVA_VENT.moundRy + drip.length / 2);
    ctx.closePath();
    ctx.fillStyle = hexToCss(colors.lava);
    ctx.fill();
  }
}

const ICE_SHARDS = [
  { tipDx: -1, tipDy: -50, leftDx: -8, rightDx: 6 },
  { tipDx: -13, tipDy: -30, leftDx: -19, rightDx: -7 },
  { tipDx: 13, tipDy: -36, leftDx: 6, rightDx: 20 },
] as const;

function drawIceShard(args: DrawArgs): void {
  const { ctx, colors, rng, baseX, baseY } = args;
  for (const shard of ICE_SHARDS) {
    const tipX = baseX + shard.tipDx + (rng() - 0.5) * ROCK_JITTER_PX;
    const tipY = baseY + shard.tipDy + (rng() - 0.5) * ROCK_JITTER_PX;
    cut(ctx, colors.ice, () => {
      ctx.moveTo(baseX + shard.leftDx, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseX + shard.rightDx, baseY);
    });
    // Lit facet on the left half — same construction as ore crystals, so
    // ice reads as the same paper material family, colder color.
    ctx.beginPath();
    ctx.moveTo(baseX + shard.leftDx, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(baseX + (shard.leftDx + shard.rightDx) / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = hexToCss(colors.iceFacet);
    ctx.fill();
  }
}

const DRAWERS: Readonly<Record<DecorationKind, (args: DrawArgs) => void>> = {
  tree: drawTree,
  bush: drawBush,
  reed: drawReed,
  flower: drawFlower,
  'grass-tuft': drawGrassTuft,
  rock: drawRock,
  crystal: drawCrystal,
  snag: drawSnag,
  boulder: drawBoulder,
  'surface-crater': drawSurfaceCrater,
  'lava-vent': drawLavaVent,
  'ice-shard': drawIceShard,
};

/** Deterministic per-(kind, variant) jitter seed — NOT Date-based, so a
 * variant's shape is stable across flights and worlds. */
function variantSeed(kind: DecorationKind, variant: number): number {
  let hash = variant + 1;
  for (const char of kind) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function bakeDecorationTexture(
  scene: Phaser.Scene,
  body: CelestialBody,
  kind: DecorationKind,
  variant: number,
): string {
  const key = `decoration-${body.id}-${kind}-${variant.toString()}`;
  if (scene.textures.exists(key)) {
    return key;
  }
  const size = GLYPH_SIZES[kind];
  const colors = decorationColors(body);
  // D28: baked at supersample resolution so the 1.6-3.2x plant scales
  // stay crisp instead of blurring a small canvas up.
  bakeCanvasTexture(
    scene,
    key,
    (size.w + GLYPH_PAD * 2) * DECORATION_BAKE_SUPERSAMPLE,
    (size.h + GLYPH_PAD * 2) * DECORATION_BAKE_SUPERSAMPLE,
    (ctx) => {
      ctx.scale(DECORATION_BAKE_SUPERSAMPLE, DECORATION_BAKE_SUPERSAMPLE);
      const baseX = GLYPH_PAD + size.w / 2;
      const baseY = GLYPH_PAD + size.h - DECORATION_SHADOW_OFFSET_PX;
      // Shadow pass: the same glyph, offset, flattened dark — the paper
      // cutout's hard drop shadow.
      ctx.save();
      ctx.translate(DECORATION_SHADOW_OFFSET_PX, DECORATION_SHADOW_OFFSET_PX);
      ctx.globalAlpha = DECORATION_SHADOW_ALPHA;
      DRAWERS[kind]({
        ctx,
        colors: {
          canopy: OUTLINE_COLOR,
          canopyLit: OUTLINE_COLOR,
          trunk: OUTLINE_COLOR,
          accent: OUTLINE_COLOR,
          rock: OUTLINE_COLOR,
          rockFacet: OUTLINE_COLOR,
          crystal: OUTLINE_COLOR,
          crystalFacet: OUTLINE_COLOR,
          ground: OUTLINE_COLOR,
          groundShade: OUTLINE_COLOR,
          lava: OUTLINE_COLOR,
          lavaCore: OUTLINE_COLOR,
          ice: OUTLINE_COLOR,
          iceFacet: OUTLINE_COLOR,
        },
        rng: createSeededRandom(variantSeed(kind, variant)),
        baseX,
        baseY,
      });
      ctx.restore();
      // Main pass — same variant seed, so the silhouette matches its shadow.
      DRAWERS[kind]({
        ctx,
        colors,
        rng: createSeededRandom(variantSeed(kind, variant)),
        baseX,
        baseY,
      });
    },
  );
  return key;
}

/** Slight sink into the ground so bottoms never hover over a slope. */
const GROUND_SINK_PX = 2;

/** Smoke plume geometry (canvas space, bottom-center anchored like every
 * glyph): a rising stack of puffs drifting slightly right, per
 * temp/paper_mario_worlds' volcano scene. */
const SMOKE_GLYPH = { w: 76, h: 96 } as const;
const SMOKE_PUFFS = [
  { dx: 0, dy: -10, r: 7 },
  { dx: 5, dy: -26, r: 10 },
  { dx: 13, dy: -46, r: 13 },
  { dx: 24, dy: -68, r: 16 },
] as const;

function bakeVolcanoSmoke(scene: Phaser.Scene, body: CelestialBody): string {
  const key = `volcano-smoke-${body.id}`;
  if (scene.textures.exists(key)) {
    return key;
  }
  // Smoke is sky-stained cloud paper; a volcano world without an
  // atmosphere has no cloud color, so its plume borrows the ridge paper —
  // a deliberate data-driven choice, not an error fallback.
  const smokeColor = body.skyPalette.cloudColor ?? body.skyPalette.ridgeColor;
  bakeCanvasTexture(scene, key, SMOKE_GLYPH.w, SMOKE_GLYPH.h, (ctx) => {
    const baseX = SMOKE_GLYPH.w / 2 - 12;
    const baseY = SMOKE_GLYPH.h - 1;
    ctx.globalAlpha = VOLCANO_SMOKE_PUFF_ALPHA;
    for (const puff of SMOKE_PUFFS) {
      ctx.beginPath();
      circle(ctx, baseX + puff.dx, baseY + puff.dy, puff.r);
      ctx.fillStyle = hexToCss(darken(smokeColor, DECOR_SHADE_DARKEN_FRACTION));
      ctx.fill();
    }
  });
  return key;
}

/**
 * Plants every generated decoration on the terrain surface. On a volcano
 * world, additionally raises a smoke plume from the summit's crater notch
 * (the tallest terrain point — the cone peak by construction, see
 * `landforms.ts`). Returns the created images (callers may track them,
 * though GameScene's ordinary scene-restart teardown already covers
 * per-flight cleanup).
 */
export function buildDecorations(
  scene: Phaser.Scene,
  body: CelestialBody,
  terrain: Terrain,
  specs: readonly DecorationSpec[],
): Phaser.GameObjects.Image[] {
  const images = specs.map((spec) => {
    const key = bakeDecorationTexture(scene, body, spec.kind, spec.variant);
    const y = getTerrainHeightAt(terrain.points, spec.x) + GROUND_SINK_PX;
    return scene.add
      .image(spec.x, y, key)
      .setOrigin(0.5, 1)
      .setScale(spec.scale / DECORATION_BAKE_SUPERSAMPLE)
      .setDepth(TERRAIN_SHADOW_LAYER_DEPTH);
  });
  if (body.landform === 'volcano') {
    const summit = terrain.points.reduce((tallest, point) =>
      point.y < tallest.y ? point : tallest,
    );
    const smokeKey = bakeVolcanoSmoke(scene, body);
    images.push(
      scene.add
        .image(summit.x, summit.y + GROUND_SINK_PX, smokeKey)
        .setOrigin(0.5, 1)
        .setDepth(TERRAIN_SHADOW_LAYER_DEPTH),
    );
  }
  return images;
}
