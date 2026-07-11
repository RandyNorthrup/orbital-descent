import Phaser from 'phaser';
import { MOON_CRATER_DARKEN_FRACTION, OUTLINE_COLOR } from '../constants';
import type { CelestialBody } from '../planets/celestial-body';
import { generateMoonCraters } from './moon-craters';
import { darken } from './color-mix';
import { bakeCanvasTexture, hexToCss } from './canvas-texture-utils';

/** Presentation-only geometry for the world map's planet discs (PLAN.md
 * Milestone 14) — scoped to this file per the constants convention. */
const PLANET_DISC_RADIUS_PX = 13;
const PLANET_DISC_CRATER_COUNT = 4;
const PLANET_DISC_CRATER_MIN_RADIUS_FRACTION = 0.12;
const PLANET_DISC_CRATER_MAX_RADIUS_FRACTION = 0.26;
const PLANET_DISC_CRATER_SEED = 6060;
const PLANET_DISC_OUTLINE_WIDTH_PX = 2;

/**
 * Bakes and adds one small cratered planet disc for the world map — the
 * world's own terrain palette as a lit sphere (terrain top color at the
 * face center shading to the terrain bottom color at the limb), with
 * seeded crater blobs, ringed by the shared paper outline. Texture key is
 * per-world (`planet-disc-<id>`), so twelve discs alive at once never
 * collide; rebaking the same key on a later render pass is safe because
 * `WorldMapScene.renderView()` destroys the previous view's images first.
 */
export function createPlanetDiscImage(
  scene: Phaser.Scene,
  body: CelestialBody,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  const radius = PLANET_DISC_RADIUS_PX;
  const diameter = radius * 2;
  const faceColor = body.terrainPalette.fillTopColor;
  const limbColor = body.terrainPalette.fillBottomColor;
  const craterColor = darken(faceColor, MOON_CRATER_DARKEN_FRACTION);
  const craters = generateMoonCraters({
    // Distance is unique per world (same per-world seeding rule as
    // rendering/background.ts's worldSeed), so every disc face is its own.
    seed: PLANET_DISC_CRATER_SEED + body.distance,
    moonRadius: radius,
    count: PLANET_DISC_CRATER_COUNT,
    minRadiusFraction: PLANET_DISC_CRATER_MIN_RADIUS_FRACTION,
    maxRadiusFraction: PLANET_DISC_CRATER_MAX_RADIUS_FRACTION,
  });

  const textureKey = `planet-disc-${body.id}`;
  bakeCanvasTexture(scene, textureKey, diameter, diameter, (ctx) => {
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.clip();

    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, hexToCss(faceColor));
    gradient.addColorStop(1, hexToCss(limbColor));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, diameter, diameter);

    ctx.fillStyle = hexToCss(craterColor);
    for (const crater of craters) {
      ctx.beginPath();
      ctx.arc(radius + crater.x, radius + crater.y, crater.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = hexToCss(OUTLINE_COLOR);
    ctx.lineWidth = PLANET_DISC_OUTLINE_WIDTH_PX * 2;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  return scene.add.image(x, y, textureKey);
}
