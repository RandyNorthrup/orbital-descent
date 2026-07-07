import Phaser from 'phaser';
import {
  FAR_RIDGE_ALPHA,
  FAR_RIDGE_BLUR_PX,
  FAR_RIDGE_COLOR,
  FAR_RIDGE_LAYER_DEPTH,
  FAR_RIDGE_MAX_HEIGHT_FRACTION,
  FAR_RIDGE_MAX_STEP_FRACTION,
  FAR_RIDGE_MIN_HEIGHT_FRACTION,
  FAR_RIDGE_SEED,
  FAR_RIDGE_SEGMENTS,
  GAME_HEIGHT,
  GAME_WIDTH,
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
  SKY_TOP_COLOR,
  STAR_COLOR,
  STAR_COUNT,
  STAR_MAX_ALPHA,
  STAR_MAX_RADIUS,
  STARFIELD_SEED,
} from '../constants';
import { generateStarfield } from './starfield';
import { generateRidgeline } from './ridgeline';
import { createRadialGlowImage } from './radial-glow';
import { bakeCanvasTexture, hexToCss, hexToRgba } from './canvas-texture-utils';

const SKY_TEXTURE_KEY = 'background-sky';
const FAR_RIDGE_TEXTURE_KEY = 'background-far-ridge';
const MOON_GLOW_TEXTURE_KEY = 'background-moon-glow';
const MOON_DISC_TEXTURE_KEY = 'background-moon-disc';

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
  moonGlow.setDepth(SKY_LAYER_DEPTH);

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
  scene.add.image(moonX, moonY, MOON_DISC_TEXTURE_KEY).setDepth(SKY_LAYER_DEPTH);
}

function buildStars(scene: Phaser.Scene): void {
  const stars = generateStarfield({
    seed: STARFIELD_SEED,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    count: STAR_COUNT,
    maxRadius: STAR_MAX_RADIUS,
    maxAlpha: STAR_MAX_ALPHA,
  });

  const starGraphics = scene.add.graphics();
  starGraphics.setDepth(SKY_LAYER_DEPTH);
  for (const star of stars) {
    starGraphics.fillStyle(STAR_COLOR, star.alpha);
    starGraphics.fillCircle(star.x, star.y, star.radius);
  }
}

function buildFarRidge(scene: Phaser.Scene): void {
  const ridge = generateRidgeline({
    seed: FAR_RIDGE_SEED,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    segments: FAR_RIDGE_SEGMENTS,
    minHeightFraction: FAR_RIDGE_MIN_HEIGHT_FRACTION,
    maxHeightFraction: FAR_RIDGE_MAX_HEIGHT_FRACTION,
    maxStepFraction: FAR_RIDGE_MAX_STEP_FRACTION,
  });
  const ridgePoints = [...ridge, { x: GAME_WIDTH, y: GAME_HEIGHT }, { x: 0, y: GAME_HEIGHT }];

  bakeCanvasTexture(scene, FAR_RIDGE_TEXTURE_KEY, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    // Blurred + reduced-alpha vs. the crisp, fully-saturated gameplay
    // terrain in front of it — the atmospheric-perspective depth cue the
    // chosen "Ship-Forward / Atmospheric Depth" direction is named for.
    ctx.filter = `blur(${FAR_RIDGE_BLUR_PX.toString()}px)`;
    ctx.fillStyle = hexToRgba(FAR_RIDGE_COLOR, FAR_RIDGE_ALPHA);
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

  scene.add.image(0, 0, FAR_RIDGE_TEXTURE_KEY).setOrigin(0, 0).setDepth(FAR_RIDGE_LAYER_DEPTH);
}

/**
 * Builds the static background behind the gameplay terrain: a sky gradient,
 * a glowing moon, a starfield, and a blurred/desaturated far parallax ridge —
 * the "Ship-Forward / Atmospheric Depth" art direction (PLAN.md §4) applied
 * to everything the player isn't actively flying over.
 */
export function buildBackground(scene: Phaser.Scene): void {
  // Baked via Canvas2D's own createLinearGradient, not
  // Graphics#fillGradientStyle: that API is WebGL-only in Phaser 4.2.0 —
  // GraphicsCanvasRenderer's Canvas fallback path silently skips the
  // GRADIENT_FILL_STYLE command entirely (confirmed against
  // node_modules/phaser/src/gameobjects/graphics/GraphicsCanvasRenderer.js),
  // so it would render as an undefined flat fill under a Canvas-renderer
  // fallback. A baked texture works identically under both renderers.
  bakeCanvasTexture(scene, SKY_TEXTURE_KEY, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, hexToCss(SKY_TOP_COLOR));
    gradient.addColorStop(1, hexToCss(SKY_BOTTOM_COLOR));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  });
  scene.add.image(0, 0, SKY_TEXTURE_KEY).setOrigin(0, 0).setDepth(SKY_LAYER_DEPTH);

  buildMoon(scene);
  buildStars(scene);
  buildFarRidge(scene);
}
