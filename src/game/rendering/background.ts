import Phaser from 'phaser';
import {
  FAR_RIDGE_ALPHA,
  FAR_RIDGE_BLUR_PX,
  FAR_RIDGE_COLOR,
  FAR_RIDGE_LAYER_DEPTH,
  FAR_RIDGE_MAX_HEIGHT_FRACTION,
  FAR_RIDGE_MAX_STEP_FRACTION,
  FAR_RIDGE_MIN_HEIGHT_FRACTION,
  FAR_RIDGE_SCROLL_FACTOR,
  FAR_RIDGE_SEED,
  FAR_RIDGE_SEGMENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MID_RIDGE_ALPHA,
  MID_RIDGE_BLUR_PX,
  MID_RIDGE_COLOR,
  MID_RIDGE_LAYER_DEPTH,
  MID_RIDGE_MAX_HEIGHT_FRACTION,
  MID_RIDGE_MAX_STEP_FRACTION,
  MID_RIDGE_MIN_HEIGHT_FRACTION,
  MID_RIDGE_SCROLL_FACTOR,
  MID_RIDGE_SEED,
  MID_RIDGE_SEGMENTS,
  MOON_CENTER_X_FRACTION,
  MOON_CENTER_Y_FRACTION,
  MOON_COLOR,
  MOON_GLOW_COLOR,
  MOON_GLOW_MAX_ALPHA,
  MOON_GLOW_RADIUS,
  MOON_RADIUS,
  MOON_SHADE_COLOR,
  SKY_BOTTOM_COLOR,
  SKY_LAYER_DEPTH,
  SKY_SCROLL_FACTOR,
  SKY_TOP_COLOR,
  STAR_COLOR,
  STAR_COUNT,
  STAR_MAX_ALPHA,
  STAR_MAX_RADIUS,
  STARFIELD_SEED,
  WORLD_WIDTH,
} from '../constants';
import { generateStarfield } from './starfield';
import { generateRidgeline } from './ridgeline';
import { createRadialGlowImage } from './radial-glow';
import { bakeCanvasTexture, hexToCss, hexToRgba } from './canvas-texture-utils';

const SKY_TEXTURE_KEY = 'background-sky';
const FAR_RIDGE_TEXTURE_KEY = 'background-far-ridge';
const MID_RIDGE_TEXTURE_KEY = 'background-mid-ridge';
const MOON_GLOW_TEXTURE_KEY = 'background-moon-glow';
const MOON_DISC_TEXTURE_KEY = 'background-moon-disc';

/**
 * The moon and starfield are positioned relative to GAME_WIDTH (the
 * viewport), not WORLD_WIDTH — they're singular/scattered distant features
 * meant to sit in view from the start and drift only slightly as the very
 * low SKY_SCROLL_FACTOR interacts with camera movement, the same way a
 * real moon barely appears to move as you travel. The sky and both ridge
 * silhouettes, by contrast, are baked WORLD_WIDTH-wide and positioned at
 * world x=0, since they must visually span the entire scrollable world
 * with no gap at either end regardless of their own (low) scroll factor.
 */
function buildMoon(scene: Phaser.Scene): void {
  const moonX = GAME_WIDTH * MOON_CENTER_X_FRACTION;
  const moonY = GAME_HEIGHT * MOON_CENTER_Y_FRACTION;

  const moonGlow = createRadialGlowImage(
    scene,
    MOON_GLOW_TEXTURE_KEY,
    moonX,
    moonY,
    MOON_GLOW_RADIUS,
    MOON_GLOW_COLOR,
    MOON_GLOW_MAX_ALPHA,
  );
  moonGlow.setDepth(SKY_LAYER_DEPTH).setScrollFactor(SKY_SCROLL_FACTOR);

  const moonDiameter = MOON_RADIUS * 2;
  bakeCanvasTexture(scene, MOON_DISC_TEXTURE_KEY, moonDiameter, moonDiameter, (ctx) => {
    const gradient = ctx.createRadialGradient(
      MOON_RADIUS,
      MOON_RADIUS,
      0,
      MOON_RADIUS,
      MOON_RADIUS,
      MOON_RADIUS,
    );
    gradient.addColorStop(0, hexToCss(MOON_COLOR));
    gradient.addColorStop(1, hexToCss(MOON_SHADE_COLOR));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(MOON_RADIUS, MOON_RADIUS, MOON_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  scene.add
    .image(moonX, moonY, MOON_DISC_TEXTURE_KEY)
    .setDepth(SKY_LAYER_DEPTH)
    .setScrollFactor(SKY_SCROLL_FACTOR);
}

function buildStars(scene: Phaser.Scene): void {
  const stars = generateStarfield({
    seed: STARFIELD_SEED,
    width: WORLD_WIDTH,
    height: GAME_HEIGHT,
    count: STAR_COUNT,
    maxRadius: STAR_MAX_RADIUS,
    maxAlpha: STAR_MAX_ALPHA,
  });

  const starGraphics = scene.add.graphics();
  starGraphics.setDepth(SKY_LAYER_DEPTH).setScrollFactor(SKY_SCROLL_FACTOR);
  for (const star of stars) {
    starGraphics.fillStyle(STAR_COLOR, star.alpha);
    starGraphics.fillCircle(star.x, star.y, star.radius);
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

/**
 * One parallax ridge silhouette, baked WORLD_WIDTH-wide. Shared by the far
 * and mid ridge layers — same construction (blurred/reduced-alpha fill of a
 * seeded skyline), different depth/color/blur/scroll-speed per layer.
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
  const ridgePoints = [...ridge, { x: WORLD_WIDTH, y: GAME_HEIGHT }, { x: 0, y: GAME_HEIGHT }];

  bakeCanvasTexture(scene, options.textureKey, WORLD_WIDTH, GAME_HEIGHT, (ctx) => {
    // Blurred + reduced-alpha vs. the crisp, fully-saturated gameplay
    // terrain in front of it — the atmospheric-perspective depth cue the
    // "Ship-Forward / Atmospheric Depth" direction is named for.
    ctx.filter = `blur(${options.blurPx.toString()}px)`;
    ctx.fillStyle = hexToRgba(options.color, options.alpha);
    ctx.beginPath();
    ridgePoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fill();
  });

  scene.add
    .image(0, 0, options.textureKey)
    .setOrigin(0, 0)
    .setDepth(options.depth)
    .setScrollFactor(options.scrollFactor);
}

/**
 * Builds the static background behind the gameplay terrain: a sky gradient,
 * a glowing moon, a starfield, and two blurred/desaturated parallax ridges
 * (far and mid) — the "Ship-Forward / Atmospheric Depth" art direction
 * (PLAN.md §4) applied to everything the player isn't actively flying over,
 * each layer scrolling at its own speed (Milestone 2.5) for real motion
 * parallax rather than just a static layered look.
 */
export function buildBackground(scene: Phaser.Scene): void {
  // Baked via Canvas2D's own createLinearGradient, not
  // Graphics#fillGradientStyle: that API is WebGL-only in Phaser 4.2.0 —
  // GraphicsCanvasRenderer's Canvas fallback path silently skips the
  // GRADIENT_FILL_STYLE command entirely (confirmed against
  // node_modules/phaser/src/gameobjects/graphics/GraphicsCanvasRenderer.js),
  // so it would render as an undefined flat fill under a Canvas-renderer
  // fallback. A baked texture works identically under both renderers.
  bakeCanvasTexture(scene, SKY_TEXTURE_KEY, WORLD_WIDTH, GAME_HEIGHT, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, hexToCss(SKY_TOP_COLOR));
    gradient.addColorStop(1, hexToCss(SKY_BOTTOM_COLOR));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);
  });
  scene.add
    .image(0, 0, SKY_TEXTURE_KEY)
    .setOrigin(0, 0)
    .setDepth(SKY_LAYER_DEPTH)
    .setScrollFactor(SKY_SCROLL_FACTOR);

  buildMoon(scene);
  buildStars(scene);
  buildRidgeLayer(scene, {
    textureKey: FAR_RIDGE_TEXTURE_KEY,
    seed: FAR_RIDGE_SEED,
    segments: FAR_RIDGE_SEGMENTS,
    minHeightFraction: FAR_RIDGE_MIN_HEIGHT_FRACTION,
    maxHeightFraction: FAR_RIDGE_MAX_HEIGHT_FRACTION,
    maxStepFraction: FAR_RIDGE_MAX_STEP_FRACTION,
    color: FAR_RIDGE_COLOR,
    alpha: FAR_RIDGE_ALPHA,
    blurPx: FAR_RIDGE_BLUR_PX,
    depth: FAR_RIDGE_LAYER_DEPTH,
    scrollFactor: FAR_RIDGE_SCROLL_FACTOR,
  });
  buildRidgeLayer(scene, {
    textureKey: MID_RIDGE_TEXTURE_KEY,
    seed: MID_RIDGE_SEED,
    segments: MID_RIDGE_SEGMENTS,
    minHeightFraction: MID_RIDGE_MIN_HEIGHT_FRACTION,
    maxHeightFraction: MID_RIDGE_MAX_HEIGHT_FRACTION,
    maxStepFraction: MID_RIDGE_MAX_STEP_FRACTION,
    color: MID_RIDGE_COLOR,
    alpha: MID_RIDGE_ALPHA,
    blurPx: MID_RIDGE_BLUR_PX,
    depth: MID_RIDGE_LAYER_DEPTH,
    scrollFactor: MID_RIDGE_SCROLL_FACTOR,
  });
}
