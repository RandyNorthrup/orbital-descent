import { expect, test } from '@playwright/test';
import { clickButton, tapKey, waitForActiveScene } from './test-helpers';

const BOOT_TIMEOUT_MS = 5000;
// Generous: each click-driven scene transition below waits on the same
// kind of real-world contention as the keyboard-driven tests in this
// suite (see game-flow.spec.ts/pause-resume.spec.ts for the same note).
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
const OUTCOME_TIMEOUT_MS = 15000;
// Two full landed/crashed cycles plus six click-driven scene transitions.
const TEST_TIMEOUT_MS = 90000;

async function waitForOutcomeResolved(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') !== 'flying',
    { timeout: OUTCOME_TIMEOUT_MS },
  );
}

test('every button responds to a real mouse click, not just its keyboard shortcut', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);

  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);

  // Menu's SETTINGS button -> Settings overlay
  await clickButton(page, 'Menu', 'SETTINGS');
  await waitForActiveScene(page, 'Settings', SCENE_TRANSITION_TIMEOUT_MS);

  // Settings' BACK button (opened from Menu) -> back to Menu
  await clickButton(page, 'Settings', 'BACK');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  // Menu's START button -> a real flight
  await clickButton(page, 'Menu', 'START');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Pause (keyboard, no on-screen button for this) opens the *other*
  // Settings variant (returnTo: 'Game') -- its own BACK button, a
  // separate instance from the one already clicked above, must also
  // respond to a real click and resume the correct scene.
  await tapKey(page, 'Escape');
  await waitForActiveScene(page, 'Settings', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'Settings', 'BACK');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Fly to a result -> Result scene appears automatically
  await waitForOutcomeResolved(page);
  await waitForActiveScene(page, 'Result', SCENE_TRANSITION_TIMEOUT_MS);

  // Result's RESTART button -> a fresh flight
  await clickButton(page, 'Result', 'RESTART');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Fly to a second result
  await waitForOutcomeResolved(page);
  await waitForActiveScene(page, 'Result', SCENE_TRANSITION_TIMEOUT_MS);

  // Result's MAIN MENU button -> back to the menu, no dead end
  await clickButton(page, 'Result', 'MAIN MENU');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  const finalActiveScenes = await page.evaluate(() =>
    window.__ORBITAL_DESCENT_GAME__?.scene.getScenes(true).map((s) => s.scene.key),
  );
  expect(finalActiveScenes).toEqual(['Menu']);
});
