import Phaser from 'phaser';
import { SCENE_KEY_BOOT, SCENE_KEY_GAME } from './scene-keys';

/**
 * Placeholder for Milestone 2, when this will preload real texture/audio
 * assets before handing off to GameScene. Kept as its own scene now so
 * adding a loader later doesn't require restructuring the scene list.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY_BOOT);
  }

  create(): void {
    this.scene.start(SCENE_KEY_GAME);
  }
}
