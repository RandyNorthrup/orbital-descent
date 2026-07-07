import Phaser from 'phaser';
import { SCENE_KEY_BOOT, SCENE_KEY_MENU } from './scene-keys';

/** Must match the static loading element's id in index.html. */
const LOADING_LABEL_ELEMENT_ID = 'loading-label';

/**
 * Placeholder for the future audio/ship/planet-asset loading milestone,
 * when this will preload real texture/audio assets before handing off.
 * Kept as its own scene now so adding a loader later doesn't require
 * restructuring the scene list.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY_BOOT);
  }

  create(): void {
    // index.html ships a static "ORBITAL DESCENT" DOM text node so
    // Lighthouse has a Largest Contentful Paint candidate before Phaser
    // boots — canvas painting is invisible to LCP detection (confirmed:
    // every Performance audit errors NO_LCP without this, see PLAN.md §5).
    // Once Phaser's own canvas is up, the static node has served its
    // purpose and is removed.
    document.getElementById(LOADING_LABEL_ELEMENT_ID)?.remove();
    this.scene.start(SCENE_KEY_MENU);
  }
}
