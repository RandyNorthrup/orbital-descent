import Phaser from 'phaser';

/** Every scene that reads keyboard input needs this same guard —
 * centralized so the error message (and behavior) can't drift between
 * scenes copy-pasting it individually. */
export function requireKeyboard(scene: Phaser.Scene): Phaser.Input.Keyboard.KeyboardPlugin {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error('Keyboard input plugin is not available.');
  }
  return keyboard;
}

/**
 * Wraps a Phaser Key so its first "just pressed" signal only fires after
 * the key has genuinely been released at least once while being watched.
 *
 * Without this, a scene that starts (or resumes) while the physical key
 * is still held down from the very action that triggered the transition
 * sees a false first press: OS keyboard auto-repeat re-fires 'keydown'
 * for as long as a key is held (commonly every 20-30ms, after an initial
 * 250-660ms delay — both well within an ordinary press-and-hold), and a
 * freshly created Key object (or one just reset by Phaser's own
 * pause-triggered `resetKeys()`) has no way to know the key didn't just
 * transition from up to down. The result: holding Escape a little past
 * an instant tap makes the pause overlay flicker open-and-closed instead
 * of staying open until the player deliberately presses again — found by
 * adversarial review, reading node_modules/phaser/src/input/keyboard/
 * KeyboardPlugin.js's PAUSE-triggered `resetKeys()` and Key.js's
 * `onDown`/`onUp`, not observed as a test flake.
 */
export class ArmedKeyGuard {
  private armed = false;

  constructor(private readonly key: Phaser.Input.Keyboard.Key) {}

  /** Call once per frame in place of `Phaser.Input.Keyboard.JustDown(key)`. */
  consumeJustPressed(): boolean {
    if (!this.armed) {
      if (!this.key.isDown) {
        this.armed = true;
      }
      return false;
    }
    return Phaser.Input.Keyboard.JustDown(this.key);
  }
}
