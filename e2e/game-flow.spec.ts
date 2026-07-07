import { expect, test } from '@playwright/test';
import { tapKey, waitForActiveScene } from './test-helpers';

const BOOT_TIMEOUT_MS = 5000;
// Generous: each scene transition depends on a synthetic keypress landing
// correctly under whatever parallel test-worker contention is happening —
// observed occasionally flaky at 5000ms under this suite's full 24-test
// parallel run (not a logic bug; real key presses always register).
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
const OUTCOME_TIMEOUT_MS = 15000;
// Two full landed/crashed cycles plus four scene transitions, each at
// worst case — comfortably over Playwright's 30s default.
const TEST_TIMEOUT_MS = 90000;

async function waitForOutcomeResolved(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') !== 'flying',
    { timeout: OUTCOME_TIMEOUT_MS },
  );
}

test('full play session reaches every screen with no dead ends: menu -> start -> fly -> result -> restart -> fly -> result -> main menu', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);

  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);

  // Menu -> Game
  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Fly (gravity alone) -> outcome recorded -> auto-transition to Result
  await waitForOutcomeResolved(page);
  await waitForActiveScene(page, 'Result', SCENE_TRANSITION_TIMEOUT_MS);

  // Result -> RESTART -> a fresh Game
  await tapKey(page, 'R');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Fly a second time -> Result again, proving restart produces a real,
  // independently-playable flight, not a dead end.
  await waitForOutcomeResolved(page);
  await waitForActiveScene(page, 'Result', SCENE_TRANSITION_TIMEOUT_MS);

  // Result -> MAIN MENU
  await tapKey(page, 'Escape');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  const finalActiveScenes = await page.evaluate(() =>
    window.__ORBITAL_DESCENT_GAME__?.scene.getScenes(true).map((s) => s.scene.key),
  );
  expect(finalActiveScenes).toEqual(['Menu']);
});
