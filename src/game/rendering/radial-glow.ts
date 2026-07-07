import Phaser from 'phaser';
import { bakeCanvasTexture, hexToRgba } from './canvas-texture-utils';

const TRANSPARENT = 0;

/**
 * Bakes a soft radial-gradient glow (`color` at `maxAlpha` at the center,
 * fading to fully transparent at `radius`) into a texture and adds it as an
 * Image centered on (x, y). Shared by the background moon's halo and the
 * lander's engine glow — both are "a colored light source fading outward,"
 * just at different scales.
 */
export function createRadialGlowImage(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  radius: number,
  color: number,
  maxAlpha: number,
): Phaser.GameObjects.Image {
  const diameter = radius * 2;

  bakeCanvasTexture(scene, key, diameter, diameter, (ctx) => {
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, hexToRgba(color, maxAlpha));
    gradient.addColorStop(1, hexToRgba(color, TRANSPARENT));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, diameter, diameter);
  });

  return scene.add.image(x, y, key);
}
