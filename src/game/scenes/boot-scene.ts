import Phaser from 'phaser';
import { SCENE_KEY_BOOT, SCENE_KEY_MENU } from './scene-keys';

/** Must match the static loading element's id in index.html. */
const LOADING_LABEL_ELEMENT_ID = 'loading-label';

/**
 * This project has no external asset pipeline (see PLAN.md §4/Milestone
 * 13 — every visual and, as of this milestone, every sound is generated
 * procedurally at runtime, not loaded from disk), so there is nothing for
 * a traditional Phaser `preload()` loader to fetch. This scene's real job
 * is the audio-system equivalent: give the AudioContext Phaser already
 * created (`this.sound`) its earliest possible chance to be running
 * before handing off to Menu.
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
    this.initializeAudio();
    this.scene.start(SCENE_KEY_MENU);
  }

  /**
   * Nudges the AudioContext awake as early as possible so a cue has the
   * best chance of being audible the instant a real trigger point
   * (thrust, landing, a weapon shot, ...) fires, without ever blocking or
   * throwing over it.
   *
   * Verified directly against node_modules/phaser/src/sound/webaudio/
   * WebAudioSoundManager.js (Phaser 4.2.0): its constructor already
   * registers its own `unlock()` — a one-shot touchstart/touchend/
   * mousedown/mouseup/keydown listener on `document.body` that calls
   * `context.resume()` the instant the browser's autoplay policy leaves
   * the context `locked` (`context.state === 'suspended'`) — before this
   * scene's own `create()` ever runs (Phaser wires it at
   * `new Phaser.Game(...)` construction time, in main.ts, or on the
   * engine's own BOOT event if the game isn't booted yet). So this method
   * deliberately does *not* add a second first-gesture listener of its
   * own — that would double-handle the same unlock. The `resume()` call
   * below is just a plain, idempotent nudge (harmless if the context is
   * already running); its rejection is swallowed exactly like every other
   * "this browser API might be blocked" case in this codebase (see
   * `persistence/safe-local-storage.ts`'s `getSafeLocalStorage()`) —
   * audio is enhancement, never a hard dependency, and this is the
   * concrete, binding acceptance criterion that boot must never throw or
   * produce an unhandled rejection when the autoplay policy blocks sound.
   */
  private initializeAudio(): void {
    try {
      const sound = this.sound;
      if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) {
        return;
      }
      sound.context.resume().catch(() => {
        // Blocked by the browser's autoplay policy — Phaser's own
        // unlock() listener (see this method's own doc comment) resumes
        // it on the first real user gesture instead.
      });
    } catch {
      // Never let an unusual browser audio quirk block the boot sequence.
    }
  }
}
