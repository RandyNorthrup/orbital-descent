import Phaser from 'phaser';
import { bakeCanvasTexture, hexToRgba } from './canvas-texture-utils';

const TRANSPARENT = 0;

/**
 * Bakes a soft radial-gradient glow (`color` at `maxAlpha` at the center,
 * fading to fully transparent at `radius`) into a named texture, without
 * adding any display object for it — the shared half of `createRadialGlowImage`
 * below, split out (Milestone 13) so `scenes/game-scene.ts`'s particle
 * emitters can bake their own small colored "dot" textures the exact same
 * way (a Phaser `ParticleEmitter` is built from a bare texture key, not a
 * live `Image` GameObject, so that function's own `scene.add.image` call
 * would be the wrong shape for this second caller).
 */
export function bakeRadialGlowTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number,
  color: number,
  maxAlpha: number,
): void {
  const diameter = radius * 2;

  bakeCanvasTexture(scene, key, diameter, diameter, (ctx) => {
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, hexToRgba(color, maxAlpha));
    gradient.addColorStop(1, hexToRgba(color, TRANSPARENT));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, diameter, diameter);
  });
}

/**
 * Bakes a soft radial-gradient glow (see `bakeRadialGlowTexture` above) and
 * adds it as an Image centered on (x, y). Used by the background moon's
 * halo and the lander's static engine glow — both are "a colored light
 * source fading outward," just at different scales.
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
  bakeRadialGlowTexture(scene, key, radius, color, maxAlpha);

  return scene.add.image(x, y, key);
}
