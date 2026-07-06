import Phaser from 'phaser';
import { SCENE_KEY_BOOT, SCENE_KEY_GAME } from './scene-keys';

/** Must match the static loading element's id in index.html. */
const LOADING_LABEL_ELEMENT_ID = 'loading-label';

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
    // index.html ships a static "LUNAR LANDER" DOM text node so Lighthouse
    // has a Largest Contentful Paint candidate before Phaser boots — canvas
    // painting is invisible to LCP detection (confirmed: every Performance
    // audit errors NO_LCP without this, see PLAN.md §5). Once Phaser's own
    // canvas is up, the static node has served its purpose and is removed.
    document.getElementById(LOADING_LABEL_ELEMENT_ID)?.remove();
    this.scene.start(SCENE_KEY_GAME);
  }
}
