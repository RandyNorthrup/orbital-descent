import Phaser from 'phaser';
import {
  PAPER_GRAIN_SPECKLE_COUNT,
  PAPER_GRAIN_SPECKLE_MAX_ALPHA,
  PAPER_GRAIN_SPECKLE_MAX_RADIUS,
  PAPER_GRAIN_TEXTURE_SIZE,
} from '../constants';

export const PAPER_GRAIN_TEXTURE_KEY = 'paper-grain';

/**
 * Generates a small speckled-noise texture once per game (not per shape) so
 * every paper-cutout fill can tile the same grain — real cutout paper looks
 * like one material throughout, not a different texture per piece. Safe to
 * call from multiple scenes; a no-op after the first call since Phaser's
 * TextureManager is shared game-wide.
 */
export function ensurePaperGrainTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PAPER_GRAIN_TEXTURE_KEY)) {
    return;
  }

  const canvasTexture = scene.textures.createCanvas(
    PAPER_GRAIN_TEXTURE_KEY,
    PAPER_GRAIN_TEXTURE_SIZE,
    PAPER_GRAIN_TEXTURE_SIZE,
  );
  if (!canvasTexture) {
    return;
  }

  const context = canvasTexture.getContext();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PAPER_GRAIN_TEXTURE_SIZE, PAPER_GRAIN_TEXTURE_SIZE);

  for (let i = 0; i < PAPER_GRAIN_SPECKLE_COUNT; i += 1) {
    const x = Math.random() * PAPER_GRAIN_TEXTURE_SIZE;
    const y = Math.random() * PAPER_GRAIN_TEXTURE_SIZE;
    const radius = Math.random() * PAPER_GRAIN_SPECKLE_MAX_RADIUS;
    const alpha = Math.random() * PAPER_GRAIN_SPECKLE_MAX_ALPHA;
    context.fillStyle = `rgba(0, 0, 0, ${alpha.toString()})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  canvasTexture.refresh();
}
