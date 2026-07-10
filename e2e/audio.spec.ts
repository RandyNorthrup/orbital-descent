import { expect, test } from '@playwright/test';
import {
  clickButton,
  sceneHasText,
  tapKey,
  waitForActiveScene,
  waitForSceneText,
} from './test-helpers';

const BOOT_TIMEOUT_MS = 5000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// Long enough to span at least one full THRUST_CUE retrigger pass
// (SFX_THRUST_DURATION_MS, 220ms — constants.ts) plus real per-frame
// timing margin under parallel test-worker contention. The point of
// holding thrust at all (rather than just booting and asserting silence)
// is to actually exercise audio-player.ts's real oscillator/gain-node
// scheduling path against a real browser AudioContext, not merely prove
// the surrounding boot sequence is inert.
const THRUST_HOLD_MS = 400;
// Gives whatever pass was still in flight when thrust released (its own
// attack/decay/sustain/release tail) a real chance to finish, and any
// would-be unhandled rejection a chance to surface, before the final
// assertion.
const SETTLE_MS = 300;

/**
 * Milestone 13's own binding acceptance criteria, restated as one flow:
 * "audio boot does not throw or produce an unhandled rejection when the
 * browser's autoplay policy blocks sound" and "audio initializes on first
 * user interaction if blocked at boot". `game-boot.spec.ts` already covers
 * the zero-console-errors assertion through boot alone with no audio
 * system present yet (Milestone 1) — this spec extends that exact pattern
 * through a real first user interaction now that Milestone 13's Web Audio
 * system exists, per this milestone's own "Required tests" list.
 */
test('boots and, after a real first user interaction, engages the Web Audio system with zero console errors or unhandled rejections', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  // Confirm boot alone (BootScene.initializeAudio()'s own resume() nudge,
  // whether the autoplay policy already blocked it or not) never throws or
  // rejects, before any interaction happens at all.
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  // The first real user gesture this whole page ever receives — a
  // keydown, exactly the event type Phaser's own
  // WebAudioSoundManager.unlock() listens for (verified directly from
  // node_modules/phaser/src/sound/webaudio/WebAudioSoundManager.js — see
  // boot-scene.ts's own doc comment for the full citation) to resume a
  // still-suspended AudioContext. Also this project's own normal "start a
  // flight" action (MenuScene's Enter shortcut), not a synthetic no-op
  // event manufactured only for this test.
  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Hold thrust for real: GameScene.update() starts the looping THRUST_CUE
  // on this exact keydown.
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(THRUST_HOLD_MS);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(SETTLE_MS);

  // Phaser.Game exposes the same shared SoundManager every Scene's own
  // `this.sound` resolves to — reading it off the game instance (already
  // exposed for e2e via global.d.ts) rather than reaching into GameScene's
  // private fields.
  const audioContextState = await page.evaluate(() => {
    const sound = window.__ORBITAL_DESCENT_GAME__?.sound as unknown as
      { context?: { state: string } } | undefined;
    return sound?.context?.state;
  });
  // 'running' once Phaser's own unlock() resumes it on the gesture above
  // (a nudge already idempotent/harmless if the context was never actually
  // blocked in this environment to begin with) — the concrete, observable
  // proof that "initializes on first user interaction if blocked at boot"
  // actually held in a real browser, not just that nothing threw.
  expect(audioContextState).toBe('running');

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

/**
 * SettingsScene's own text used to tell the player "check back once audio
 * is added" — Milestone 13 added real audio, so this is the toggle that
 * text promised: proves the SOUND button genuinely flips state (not just
 * its own label) by checking the flip survives a real page reload, the
 * same proof-of-persistence convention `world-map.spec.ts` already uses for
 * base-progress.
 */
test('the Settings SOUND toggle flips and persists across a real reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);

  await clickButton(page, 'Menu', 'SETTINGS');
  await waitForActiveScene(page, 'Settings', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'Settings', 'SOUND: ON')).toBe(true);

  await clickButton(page, 'Settings', 'SOUND: ON');
  await waitForSceneText(page, 'Settings', 'SOUND: OFF', SCENE_TRANSITION_TIMEOUT_MS);

  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'SETTINGS');
  await waitForActiveScene(page, 'Settings', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'Settings', 'SOUND: OFF')).toBe(true);
});
