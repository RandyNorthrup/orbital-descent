import Phaser from 'phaser';
import {
  AIRLESS_STAR_COUNT_MULTIPLIER,
  CLOUD_BAND_BACK_ROW_RISE_PX,
  CLOUD_BAND_BASELINE_MAX_FRACTION,
  CLOUD_BAND_BASELINE_MIN_FRACTION,
  CLOUD_BAND_JITTER_Y_PX,
  CLOUD_BAND_LAYER_DEPTH,
  CLOUD_BAND_MAX_RADIUS_PX,
  CLOUD_BAND_MIN_RADIUS_PX,
  CLOUD_BAND_OVERLAP_FRACTION,
  CLOUD_BAND_SCROLL_FACTOR,
  CLOUD_BAND_SEED,
  CLOUD_LIT_LIGHTEN_FRACTION,
  CLOUD_PUFF_CORE_RADIUS_PX,
  CLOUD_PUFF_MAX_COUNT,
  CLOUD_PUFF_MIN_COUNT,
  CLOUD_PUFF_LAYER_DEPTH,
  CLOUD_PUFF_MAX_SCALE,
  CLOUD_PUFF_MAX_Y_FRACTION,
  CLOUD_PUFF_MIN_SCALE,
  CLOUD_PUFF_MIN_Y_FRACTION,
  CLOUD_PUFF_SCROLL_FACTOR,
  CLOUD_PUFF_SEED,
  CLOUD_RIM_LIGHTEN_FRACTION,
  CLOUD_RIM_OFFSET_PX,
  CLOUD_SHADE_DARKEN_FRACTION,
  COMPANION_MOON_CENTER_X_FRACTION,
  COMPANION_MOON_CENTER_Y_FRACTION,
  COMPANION_MOON_CRATER_COUNT,
  COMPANION_MOON_RADIUS,
  COMPANION_MOON_SKY_MIX_FRACTION,
  DUSK_STAR_COUNT_FRACTION,
  FAR_RIDGE_ALPHA,
  FAR_RIDGE_BLUR_PX,
  FAR_RIDGE_LAYER_DEPTH,
  FAR_RIDGE_MAX_HEIGHT_FRACTION,
  FAR_RIDGE_MAX_STEP_FRACTION,
  FAR_RIDGE_MIN_HEIGHT_FRACTION,
  FAR_RIDGE_SCROLL_FACTOR,
  FAR_RIDGE_SEED,
  FAR_RIDGE_SEGMENTS,
  FAR_RIDGE_SKY_MIX_FRACTION,
  GAME_HEIGHT,
  GAME_WIDTH,
  MID_RIDGE_ALPHA,
  MID_RIDGE_BLUR_PX,
  MID_RIDGE_DARKEN_FRACTION,
  MID_RIDGE_LAYER_DEPTH,
  MID_RIDGE_MAX_HEIGHT_FRACTION,
  MID_RIDGE_MAX_STEP_FRACTION,
  MID_RIDGE_MIN_HEIGHT_FRACTION,
  MID_RIDGE_SCROLL_FACTOR,
  MID_RIDGE_SEED,
  MID_RIDGE_SEGMENTS,
  MOON_CENTER_X_MAX_FRACTION,
  MOON_CENTER_X_MIN_FRACTION,
  MOON_CENTER_Y_MAX_FRACTION,
  MOON_CENTER_Y_MIN_FRACTION,
  MOON_SCALE_MAX,
  MOON_SCALE_MIN,
  MOON_CRATER_COUNT,
  MOON_CRATER_DARKEN_FRACTION,
  MOON_CRATER_MAX_RADIUS_FRACTION,
  MOON_CRATER_MIN_RADIUS_FRACTION,
  MOON_CRATER_SEED,
  MOON_GLOW_MAX_ALPHA,
  MOON_GLOW_RADIUS,
  MOON_RADIUS,
  MOON_SHADE_DARKEN_FRACTION,
  RIDGE_HEIGHT_JITTER_FRACTION,
  RIDGE_RIM_LIGHTEN_FRACTION,
  RIDGE_RIM_WIDTH_PX,
  SKY_LAYER_DEPTH,
  SKY_SCROLL_FACTOR,
  STAR_COUNT,
  STAR_MAX_ALPHA,
  STAR_MAX_RADIUS,
  STAR_SPARKLE_FRACTION,
  STAR_SPARKLE_RADIUS_MULTIPLIER,
  STAR_SPARKLE_WAIST_FRACTION,
  SKY_LAYOUT_SEED,
  STARFIELD_SEED,
  SUN_GLOW_MAX_ALPHA,
  SUN_GLOW_RADIUS,
  WORLD_WIDTH,
} from '../constants';
import type { CelestialBody } from '../planets/celestial-body';
import { createSeededRandom } from '../random/seeded-random';
import { generateStarfield } from './starfield';
import { generateRidgeline, type RidgePoint } from './ridgeline';
import { generateCloudBank, generateCloudPuff, generatePuffPlacements } from './cloud-bank';
import { generateMoonCraters } from './moon-craters';
import { darken, lighten, mixColors } from './color-mix';
import { createRadialGlowImage } from './radial-glow';
import { bakeCanvasTexture, hexToCss, hexToRgba } from './canvas-texture-utils';

const SKY_TEXTURE_KEY = 'background-sky';
const FAR_RIDGE_TEXTURE_KEY = 'background-far-ridge';
const MID_RIDGE_TEXTURE_KEY = 'background-mid-ridge';
const MOON_GLOW_TEXTURE_KEY = 'background-moon-glow';
const MOON_DISC_TEXTURE_KEY = 'background-moon-disc';
const COMPANION_MOON_TEXTURE_KEY = 'background-companion-moon';
const CLOUD_BAND_TEXTURE_KEY = 'background-cloud-band';
const CLOUD_PUFF_TEXTURE_KEY = 'background-cloud-puff';

/**
 * Draws one cratered paper-moon disc into a fresh canvas texture: a radial
 * gradient from the face color to a derived darker edge, flat darker
 * crater blobs (seeded), clipped to the disc.
 */
function bakeMoonDisc(
  scene: Phaser.Scene,
  textureKey: string,
  radius: number,
  faceColor: number,
  craterCount: number,
  craterSeed: number,
): void {
  const diameter = radius * 2;
  const shadeColor = darken(faceColor, MOON_SHADE_DARKEN_FRACTION);
  const craterColor = darken(faceColor, MOON_CRATER_DARKEN_FRACTION);
  const craters = generateMoonCraters({
    seed: craterSeed,
    moonRadius: radius,
    count: craterCount,
    minRadiusFraction: MOON_CRATER_MIN_RADIUS_FRACTION,
    maxRadiusFraction: MOON_CRATER_MAX_RADIUS_FRACTION,
  });

  bakeCanvasTexture(scene, textureKey, diameter, diameter, (ctx) => {
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.clip();

    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, hexToCss(faceColor));
    gradient.addColorStop(1, hexToCss(shadeColor));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, diameter, diameter);

    ctx.fillStyle = hexToCss(craterColor);
    for (const crater of craters) {
      ctx.beginPath();
      ctx.arc(radius + crater.x, radius + crater.y, crater.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Per-world seed offset: `distance` is unique across BODIES (pinned by its
 * registry tests being distance-keyed), so every world gets its own stable
 * moon face, cloud row, ridge silhouette, and star layout without needing
 * a second hand-maintained seed table. */
function worldSeed(baseSeed: number, body: CelestialBody): number {
  return baseSeed + body.distance;
}

interface SkyLayout {
  readonly moonXFraction: number;
  readonly moonYFraction: number;
  readonly moonScale: number;
  readonly cloudBaselineFraction: number;
  readonly puffCount: number;
  readonly farRidgeShift: number;
  readonly midRidgeShift: number;
}

/** Per-world sky composition (Milestone 16, D24): one seeded stream of
 * bounded draws — consumed in a FIXED order, so adding a new draw must
 * append, never reorder, or every world's layout silently reshuffles. */
function skyLayout(body: CelestialBody): SkyLayout {
  const draw = createSeededRandom(worldSeed(SKY_LAYOUT_SEED, body));
  const between = (min: number, max: number): number => min + draw() * (max - min);
  return {
    moonXFraction: between(MOON_CENTER_X_MIN_FRACTION, MOON_CENTER_X_MAX_FRACTION),
    moonYFraction: between(MOON_CENTER_Y_MIN_FRACTION, MOON_CENTER_Y_MAX_FRACTION),
    moonScale: between(MOON_SCALE_MIN, MOON_SCALE_MAX),
    cloudBaselineFraction: between(
      CLOUD_BAND_BASELINE_MIN_FRACTION,
      CLOUD_BAND_BASELINE_MAX_FRACTION,
    ),
    puffCount: Math.round(between(CLOUD_PUFF_MIN_COUNT, CLOUD_PUFF_MAX_COUNT)),
    farRidgeShift: between(-RIDGE_HEIGHT_JITTER_FRACTION, RIDGE_HEIGHT_JITTER_FRACTION),
    midRidgeShift: between(-RIDGE_HEIGHT_JITTER_FRACTION, RIDGE_HEIGHT_JITTER_FRACTION),
  };
}

function buildMoons(scene: Phaser.Scene, body: CelestialBody, layout: SkyLayout): void {
  const palette = body.skyPalette;
  const moonX = GAME_WIDTH * layout.moonXFraction;
  const moonY = GAME_HEIGHT * layout.moonYFraction;

  // A day world's disc is a sun, not a moon (Milestone 15): crater-free,
  // with a wider and stronger halo so it reads as the light source the
  // bright sky implies rather than an object hanging in it.
  const isSun = palette.daylight === 'day';
  const moonGlow = createRadialGlowImage(
    scene,
    MOON_GLOW_TEXTURE_KEY,
    moonX,
    moonY,
    Math.round((isSun ? SUN_GLOW_RADIUS : MOON_GLOW_RADIUS) * layout.moonScale),
    palette.moonColor,
    isSun ? SUN_GLOW_MAX_ALPHA : MOON_GLOW_MAX_ALPHA,
  );
  moonGlow.setDepth(SKY_LAYER_DEPTH).setScrollFactor(SKY_SCROLL_FACTOR);

  bakeMoonDisc(
    scene,
    MOON_DISC_TEXTURE_KEY,
    Math.round(MOON_RADIUS * layout.moonScale),
    palette.moonColor,
    isSun ? 0 : MOON_CRATER_COUNT,
    worldSeed(MOON_CRATER_SEED, body),
  );
  scene.add
    .image(moonX, moonY, MOON_DISC_TEXTURE_KEY)
    .setDepth(SKY_LAYER_DEPTH)
    .setScrollFactor(SKY_SCROLL_FACTOR);

  // Airless worlds trade their cloud layers for a second, smaller moon —
  // its face faded toward the horizon sky so it reads farther away than
  // the primary.
  if (body.atmosphereDensity === 0) {
    const companionColor = mixColors(
      palette.moonColor,
      palette.skyBottomColor,
      COMPANION_MOON_SKY_MIX_FRACTION,
    );
    bakeMoonDisc(
      scene,
      COMPANION_MOON_TEXTURE_KEY,
      COMPANION_MOON_RADIUS,
      companionColor,
      COMPANION_MOON_CRATER_COUNT,
      worldSeed(MOON_CRATER_SEED, body) + 1,
    );
    scene.add
      .image(
        GAME_WIDTH * COMPANION_MOON_CENTER_X_FRACTION,
        GAME_HEIGHT * COMPANION_MOON_CENTER_Y_FRACTION,
        COMPANION_MOON_TEXTURE_KEY,
      )
      .setDepth(SKY_LAYER_DEPTH)
      .setScrollFactor(SKY_SCROLL_FACTOR);
  }
}

/** One 4-point paper sparkle: two thin crossed rhombi. */
function fillSparkle(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
): void {
  const waist = radius * STAR_SPARKLE_WAIST_FRACTION;
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(x, y - radius),
      new Phaser.Math.Vector2(x + waist, y),
      new Phaser.Math.Vector2(x, y + radius),
      new Phaser.Math.Vector2(x - waist, y),
    ],
    true,
  );
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(x - radius, y),
      new Phaser.Math.Vector2(x, y - waist),
      new Phaser.Math.Vector2(x + radius, y),
      new Phaser.Math.Vector2(x, y + waist),
    ],
    true,
  );
}

function buildStars(scene: Phaser.Scene, body: CelestialBody): void {
  const daylight = body.skyPalette.daylight;
  // No stars against a daylit sky (Milestone 15); dusk keeps only the
  // brightest fraction of the night count. Airless worlds are always
  // authored 'night' (pinned by bodies.test.ts), so the airless density
  // multiplier below never fights either branch.
  if (daylight === 'day') {
    return;
  }
  const nightCount =
    body.atmosphereDensity === 0
      ? Math.round(STAR_COUNT * AIRLESS_STAR_COUNT_MULTIPLIER)
      : STAR_COUNT;
  const count =
    daylight === 'dusk' ? Math.round(nightCount * DUSK_STAR_COUNT_FRACTION) : nightCount;
  const stars = generateStarfield({
    seed: worldSeed(STARFIELD_SEED, body),
    width: WORLD_WIDTH,
    height: GAME_HEIGHT,
    count,
    maxRadius: STAR_MAX_RADIUS,
    maxAlpha: STAR_MAX_ALPHA,
    sparkleFraction: STAR_SPARKLE_FRACTION,
    sparkleRadiusMultiplier: STAR_SPARKLE_RADIUS_MULTIPLIER,
  });

  const starGraphics = scene.add.graphics();
  starGraphics.setDepth(SKY_LAYER_DEPTH).setScrollFactor(SKY_SCROLL_FACTOR);
  for (const star of stars) {
    starGraphics.fillStyle(body.skyPalette.starColor, star.alpha);
    if (star.sparkle) {
      fillSparkle(starGraphics, star.x, star.y, star.radius);
    } else {
      starGraphics.fillCircle(star.x, star.y, star.radius);
    }
  }
}

interface RidgeLayerOptions {
  readonly textureKey: string;
  readonly seed: number;
  readonly segments: number;
  readonly minHeightFraction: number;
  readonly maxHeightFraction: number;
  readonly maxStepFraction: number;
  readonly color: number;
  readonly alpha: number;
  readonly blurPx: number;
  readonly depth: number;
  readonly scrollFactor: number;
}

/** Traces the ridge skyline as a smooth rolling curve (quadratic segments
 * through successive midpoints) rather than jagged straight lines — the
 * rounded paper-hill silhouette every reference diorama uses. */
function traceSmoothSkyline(ctx: CanvasRenderingContext2D, points: readonly RidgePoint[]): void {
  const first = points[0];
  if (!first) {
    return;
  }
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    if (!current || !next) {
      break;
    }
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = points.at(-1);
  if (last) {
    ctx.lineTo(last.x, last.y);
  }
}

/**
 * One parallax ridge silhouette, baked WORLD_WIDTH-wide: a smooth rolling
 * skyline with a lit paper-edge rim along its top, blurred/faded for
 * atmospheric depth. Shared by the far and mid layers — same construction,
 * different color/blur/scroll-speed per layer.
 */
function buildRidgeLayer(scene: Phaser.Scene, options: RidgeLayerOptions): void {
  const ridge = generateRidgeline({
    seed: options.seed,
    width: WORLD_WIDTH,
    height: GAME_HEIGHT,
    segments: options.segments,
    minHeightFraction: options.minHeightFraction,
    maxHeightFraction: options.maxHeightFraction,
    maxStepFraction: options.maxStepFraction,
  });
  const rimColor = lighten(options.color, RIDGE_RIM_LIGHTEN_FRACTION);

  bakeCanvasTexture(scene, options.textureKey, WORLD_WIDTH, GAME_HEIGHT, (ctx) => {
    // Blurred + reduced-alpha vs. the crisp, fully-saturated gameplay
    // terrain in front of it — the atmospheric-perspective depth cue the
    // "Ship-Forward / Atmospheric Depth" direction is named for.
    ctx.filter = `blur(${options.blurPx.toString()}px)`;

    ctx.beginPath();
    traceSmoothSkyline(ctx, ridge);
    ctx.lineTo(WORLD_WIDTH, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(options.color, options.alpha);
    ctx.fill();

    // Lit paper edge along the skyline — stroked after the fill so half
    // the rim reads inside the silhouette's top edge.
    ctx.beginPath();
    traceSmoothSkyline(ctx, ridge);
    ctx.strokeStyle = hexToRgba(rimColor, options.alpha);
    ctx.lineWidth = RIDGE_RIM_WIDTH_PX * 2;
    ctx.stroke();
  });

  scene.add
    .image(0, 0, options.textureKey)
    .setOrigin(0, 0)
    .setDepth(options.depth)
    .setScrollFactor(options.scrollFactor);
}

/** Fills one scallop row (circles + the solid band below the baseline). */
function fillScallopRow(
  ctx: CanvasRenderingContext2D,
  circles: readonly { x: number; y: number; radius: number }[],
  bandBottomY: number,
  offsetY: number,
): void {
  ctx.beginPath();
  for (const circle of circles) {
    ctx.moveTo(circle.x + circle.radius, circle.y + offsetY);
    ctx.arc(circle.x, circle.y + offsetY, circle.radius, 0, Math.PI * 2);
  }
  const baselineY =
    circles.length > 0 ? Math.max(...circles.map((circle) => circle.y + offsetY)) : bandBottomY;
  ctx.rect(0, baselineY, WORLD_WIDTH, Math.max(0, bandBottomY - baselineY));
  ctx.fill();
}

/**
 * The horizon cloud band: two stacked scalloped paper rows baked into one
 * WORLD_WIDTH-wide texture — a shaded back row peeking above a lit front
 * row, each front scallop carrying a lighter rim along its top edge
 * (papercraft's "every layer catches the light" signature).
 */
function buildCloudBand(
  scene: Phaser.Scene,
  body: CelestialBody,
  cloudColor: number,
  baselineFraction: number,
): void {
  const baselineY = GAME_HEIGHT * baselineFraction;
  const litColor = lighten(cloudColor, CLOUD_LIT_LIGHTEN_FRACTION);
  const shadeColor = darken(cloudColor, CLOUD_SHADE_DARKEN_FRACTION);
  const rimColor = lighten(cloudColor, CLOUD_RIM_LIGHTEN_FRACTION);

  const seed = worldSeed(CLOUD_BAND_SEED, body);
  const backRow = generateCloudBank({
    seed,
    width: WORLD_WIDTH,
    baselineY: baselineY - CLOUD_BAND_BACK_ROW_RISE_PX,
    minRadius: CLOUD_BAND_MIN_RADIUS_PX,
    maxRadius: CLOUD_BAND_MAX_RADIUS_PX,
    overlapFraction: CLOUD_BAND_OVERLAP_FRACTION,
    jitterY: CLOUD_BAND_JITTER_Y_PX,
  });
  const frontRow = generateCloudBank({
    seed: seed + 1,
    width: WORLD_WIDTH,
    baselineY,
    minRadius: CLOUD_BAND_MIN_RADIUS_PX,
    maxRadius: CLOUD_BAND_MAX_RADIUS_PX,
    overlapFraction: CLOUD_BAND_OVERLAP_FRACTION,
    jitterY: CLOUD_BAND_JITTER_Y_PX,
  });

  bakeCanvasTexture(scene, CLOUD_BAND_TEXTURE_KEY, WORLD_WIDTH, GAME_HEIGHT, (ctx) => {
    // Shaded back row first, then the front row's lit rim, then the front
    // row's main gradient offset just below the rim pass.
    ctx.fillStyle = hexToCss(shadeColor);
    fillScallopRow(ctx, backRow, GAME_HEIGHT, 0);

    ctx.fillStyle = hexToCss(rimColor);
    fillScallopRow(ctx, frontRow, GAME_HEIGHT, 0);

    const gradient = ctx.createLinearGradient(
      0,
      baselineY - CLOUD_BAND_MAX_RADIUS_PX,
      0,
      GAME_HEIGHT,
    );
    gradient.addColorStop(0, hexToCss(litColor));
    gradient.addColorStop(1, hexToCss(shadeColor));
    ctx.fillStyle = gradient;
    fillScallopRow(ctx, frontRow, GAME_HEIGHT, CLOUD_RIM_OFFSET_PX);
  });

  scene.add
    .image(0, 0, CLOUD_BAND_TEXTURE_KEY)
    .setOrigin(0, 0)
    .setDepth(CLOUD_BAND_LAYER_DEPTH)
    .setScrollFactor(CLOUD_BAND_SCROLL_FACTOR);
}

/**
 * Floating paper cloud puffs scattered through the flight band, in front
 * of both ridges — the layer the ship actually flies past, giving close
 * parallax the reference dioramas' hanging clouds provide.
 */
function buildCloudPuffs(
  scene: Phaser.Scene,
  body: CelestialBody,
  cloudColor: number,
  puffCount: number,
): void {
  const litColor = lighten(cloudColor, CLOUD_LIT_LIGHTEN_FRACTION);
  const shadeColor = darken(cloudColor, CLOUD_SHADE_DARKEN_FRACTION);
  const rimColor = lighten(cloudColor, CLOUD_RIM_LIGHTEN_FRACTION);

  const seed = worldSeed(CLOUD_PUFF_SEED, body);
  const lobes = generateCloudPuff({ seed, coreRadius: CLOUD_PUFF_CORE_RADIUS_PX });
  const minX = Math.min(...lobes.map((lobe) => lobe.x - lobe.radius));
  const maxX = Math.max(...lobes.map((lobe) => lobe.x + lobe.radius));
  const minY = Math.min(...lobes.map((lobe) => lobe.y - lobe.radius));
  const maxY = Math.max(...lobes.map((lobe) => lobe.y + lobe.radius));
  const width = maxX - minX + CLOUD_RIM_OFFSET_PX;
  const height = maxY - minY + CLOUD_RIM_OFFSET_PX;

  bakeCanvasTexture(scene, CLOUD_PUFF_TEXTURE_KEY, width, height, (ctx) => {
    const drawLobes = (offsetY: number): void => {
      ctx.beginPath();
      for (const lobe of lobes) {
        ctx.moveTo(lobe.x - minX + lobe.radius, lobe.y - minY + offsetY);
        ctx.arc(lobe.x - minX, lobe.y - minY + offsetY, lobe.radius, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    ctx.fillStyle = hexToCss(rimColor);
    drawLobes(0);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hexToCss(litColor));
    gradient.addColorStop(1, hexToCss(shadeColor));
    ctx.fillStyle = gradient;
    drawLobes(CLOUD_RIM_OFFSET_PX);
  });

  const placements = generatePuffPlacements({
    seed: seed + 1,
    width: WORLD_WIDTH,
    minY: GAME_HEIGHT * CLOUD_PUFF_MIN_Y_FRACTION,
    maxY: GAME_HEIGHT * CLOUD_PUFF_MAX_Y_FRACTION,
    count: puffCount,
    minScale: CLOUD_PUFF_MIN_SCALE,
    maxScale: CLOUD_PUFF_MAX_SCALE,
  });
  for (const placement of placements) {
    scene.add
      .image(placement.x, placement.y, CLOUD_PUFF_TEXTURE_KEY)
      .setScale(placement.scale)
      .setDepth(CLOUD_PUFF_LAYER_DEPTH)
      .setScrollFactor(CLOUD_PUFF_SCROLL_FACTOR);
  }
}

/**
 * Builds the world-specific papercraft background behind the gameplay
 * terrain (PLAN.md Milestone 14; daylight variants Milestone 15): a sky
 * gradient, a glowing celestial disc — a crater-free sun with a wide halo
 * on `daylight: 'day'` worlds, a cratered moon otherwise (plus a companion
 * moon and denser stars on airless worlds) — a starfield with 4-point
 * sparkles (skipped at day, thinned at dusk), scalloped cloud layers on
 * atmosphere worlds, and two smooth, rim-lit parallax ridges — every color
 * drawn from `body`'s own `skyPalette`, every layout seeded per world,
 * each layer scrolling at its own depth-plane speed (Milestone 2.5).
 */
export function buildBackground(scene: Phaser.Scene, body: CelestialBody): void {
  const palette = body.skyPalette;

  // Baked via Canvas2D's own createLinearGradient, not
  // Graphics#fillGradientStyle: that API is WebGL-only in Phaser 4.2.0 —
  // GraphicsCanvasRenderer's Canvas fallback path silently skips the
  // GRADIENT_FILL_STYLE command entirely (confirmed against
  // node_modules/phaser/src/gameobjects/graphics/GraphicsCanvasRenderer.js),
  // so it would render as an undefined flat fill under a Canvas-renderer
  // fallback. A baked texture works identically under both renderers.
  bakeCanvasTexture(scene, SKY_TEXTURE_KEY, WORLD_WIDTH, GAME_HEIGHT, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, hexToCss(palette.skyTopColor));
    gradient.addColorStop(1, hexToCss(palette.skyBottomColor));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);
  });
  scene.add
    .image(0, 0, SKY_TEXTURE_KEY)
    .setOrigin(0, 0)
    .setDepth(SKY_LAYER_DEPTH)
    .setScrollFactor(SKY_SCROLL_FACTOR);

  const layout = skyLayout(body);
  buildMoons(scene, body, layout);
  buildStars(scene, body);

  const cloudColor = palette.cloudColor;
  if (cloudColor !== undefined) {
    buildCloudBand(scene, body, cloudColor, layout.cloudBaselineFraction);
  }

  buildRidgeLayer(scene, {
    textureKey: FAR_RIDGE_TEXTURE_KEY,
    seed: worldSeed(FAR_RIDGE_SEED, body),
    segments: FAR_RIDGE_SEGMENTS,
    minHeightFraction: FAR_RIDGE_MIN_HEIGHT_FRACTION + layout.farRidgeShift,
    maxHeightFraction: FAR_RIDGE_MAX_HEIGHT_FRACTION + layout.farRidgeShift,
    maxStepFraction: FAR_RIDGE_MAX_STEP_FRACTION,
    color: mixColors(palette.ridgeColor, palette.skyBottomColor, FAR_RIDGE_SKY_MIX_FRACTION),
    alpha: FAR_RIDGE_ALPHA,
    blurPx: FAR_RIDGE_BLUR_PX,
    depth: FAR_RIDGE_LAYER_DEPTH,
    scrollFactor: FAR_RIDGE_SCROLL_FACTOR,
  });
  buildRidgeLayer(scene, {
    textureKey: MID_RIDGE_TEXTURE_KEY,
    seed: worldSeed(MID_RIDGE_SEED, body),
    segments: MID_RIDGE_SEGMENTS,
    minHeightFraction: MID_RIDGE_MIN_HEIGHT_FRACTION + layout.midRidgeShift,
    maxHeightFraction: MID_RIDGE_MAX_HEIGHT_FRACTION + layout.midRidgeShift,
    maxStepFraction: MID_RIDGE_MAX_STEP_FRACTION,
    color: darken(palette.ridgeColor, MID_RIDGE_DARKEN_FRACTION),
    alpha: MID_RIDGE_ALPHA,
    blurPx: MID_RIDGE_BLUR_PX,
    depth: MID_RIDGE_LAYER_DEPTH,
    scrollFactor: MID_RIDGE_SCROLL_FACTOR,
  });

  if (cloudColor !== undefined) {
    buildCloudPuffs(scene, body, cloudColor, layout.puffCount);
  }
}
