import { expect, test, type Page } from '@playwright/test';
import { tapKey, waitForActiveScene } from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
// waitForMenuBooted budgets up to 2x BOOT_TIMEOUT_MS per call (an isBooted
// check, then a Menu-scene check), and this test calls it 3 times (initial
// load + two reloads): 60000ms worst case. Matching game-flow.spec.ts's own
// established ceiling for this suite's heaviest tests for real margin over
// that sum, rather than the tighter budget this constant originally had,
// which left this test's sibling in this same file under-margined enough
// to time out for real once under full-suite contention (see
// CRASH_TEST_TIMEOUT_MS's own comment below).
const TEST_TIMEOUT_MS = 90000;

// Holding rotate for this long at the default ship's handling (Falcon's
// 150 deg/s -- `ships/ships.ts`, Milestone 7; a fresh browser context has
// no persisted ship selection yet, so Falcon is what's flying here) turns
// the ship ~120 degrees -- comfortably past LANDING_MAX_SAFE_ANGLE_DEG
// (15 deg) with margin for frame-timing variance, and integrateRotation
// has no angular momentum, so releasing the key freezes rotation exactly
// there for the rest of the fall.
const ROTATE_HOLD_MS = 800;
// Wider than landing.spec.ts's own GROUND_CONTACT_TIMEOUT_MS (25000): this
// test's ground-contact wait runs after an additional ROTATE_HOLD_MS of
// real-time input first, and lands in the same full-suite worker pool as
// every other physics-timing-dependent e2e test, so it needs more margin
// under contention, not just parity (see landing.spec.ts's own comment for
// the general "widen the timeout" precedent this follows).
const GROUND_CONTACT_TIMEOUT_MS = 35000;
// waitForMenuBooted alone budgets 2x BOOT_TIMEOUT_MS (an isBooted check,
// then a Menu-scene check), plus another BOOT_TIMEOUT_MS for the Game
// transition, plus ROTATE_HOLD_MS, plus GROUND_CONTACT_TIMEOUT_MS: 65800ms
// worst case. A first version of this constant (50000) was under that sum
// and was observed to time out under full-suite contention on a real run.
// Matching game-flow.spec.ts's own established ceiling for this suite's
// heaviest tests instead, for real margin over the 65800ms worst case.
const CRASH_TEST_TIMEOUT_MS = 90000;

// Mirrors src/game/persistence/high-scores.ts's HIGH_SCORES_STORAGE_KEY and
// HighScoreEntry shape — duplicated here deliberately, this suite's
// established black-box-testing convention (see world-scrolling.spec.ts's
// own comment for why: real e2e coverage of the actual browser Storage API
// and reload behavior, not a re-import of the app's own internals).
const HIGH_SCORES_STORAGE_KEY = 'orbital-descent:high-scores:v1';

async function waitForMenuBooted(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await page.waitForFunction(
    (key) =>
      window.__ORBITAL_DESCENT_GAME__?.scene.getScenes(true).some((s) => s.scene.key === key),
    'Menu',
    { timeout: BOOT_TIMEOUT_MS },
  );
}

/** MenuScene's "BEST: N" text has no fixed label to match on exactly (see
 * test-helpers.ts's findButtonPosition, which matches buttons by their
 * exact, known text) — same deliberate escape-hatch cast pattern as
 * pause-resume.spec.ts's own local readFlightSnapshot helper. */
async function readMenuBestScoreText(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Menu');
    const match = scene?.children.list
      .map((child) => child as unknown as { text?: string })
      .find((child) => child.text?.startsWith('BEST'));
    return match?.text;
  });
}

test('a persisted high score survives a real page reload, and corrupted storage is rejected gracefully', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);

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
  await waitForMenuBooted(page);

  // First-ever visit: nothing persisted yet, so the menu shows no BEST line
  // at all (not "BEST: 0") — a deliberately clean first impression.
  expect(await readMenuBestScoreText(page)).toBeUndefined();

  // Seed a valid entry directly into the real browser's localStorage,
  // exactly matching the schema high-scores.ts writes.
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify([{ score: 742, achievedAt: 1000 }]));
  }, HIGH_SCORES_STORAGE_KEY);

  await page.reload();
  await waitForMenuBooted(page);

  // Proves the real read path: MenuScene's own loadHighScores() call, run
  // fresh against the real localStorage a reload produces, surfaces exactly
  // what was persisted — not just that raw bytes survive a reload, which
  // the browser already guarantees on its own.
  expect(await readMenuBestScoreText(page)).toBe('BEST: 742');

  // A manually corrupted entry (Milestone 4's other acceptance criterion)
  // must be rejected gracefully in a real browser, not crash the boot.
  await page.evaluate((key) => {
    localStorage.setItem(key, 'not valid json{{{');
  }, HIGH_SCORES_STORAGE_KEY);

  await page.reload();
  await waitForMenuBooted(page);

  expect(await readMenuBestScoreText(page)).toBeUndefined();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a crash never produces a score or writes to the high-score leaderboard', async ({ page }) => {
  test.setTimeout(CRASH_TEST_TIMEOUT_MS);

  await page.goto('/');
  await waitForMenuBooted(page);

  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', BOOT_TIMEOUT_MS);

  // Rotate hard past the safe-landing angle threshold and hold it there
  // (see ROTATE_HOLD_MS above), then do nothing else. isSafeLanding's
  // uprightness check fails no matter where on the randomly generated
  // terrain the ship eventually touches down or how fast it's going,
  // which makes the resulting crash deterministic without needing to
  // control terrain/pad generation at all.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(ROTATE_HOLD_MS);
  await page.keyboard.up('ArrowLeft');

  await page.waitForFunction(
    () => window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') !== 'flying',
    { timeout: GROUND_CONTACT_TIMEOUT_MS },
  );

  // Phaser's DataManager#get is untyped (any) by design; this cast to the
  // known outcome/score shapes is the same deliberate escape hatch
  // landing.spec.ts uses for 'outcome' alone.
  const state = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game');
    return {
      outcome: scene?.data.get('outcome') as 'landed' | 'crashed' | undefined,
      score: scene?.data.get('score') as number | undefined,
    };
  });

  expect(state.outcome).toBe('crashed');
  expect(state.score).toBeUndefined();

  // The write path (recordHighScore) lives entirely inside GameScene's
  // `if (safe)` branch -- a crash must never reach it, so the real
  // browser's localStorage under this key must still be exactly what a
  // fresh profile starts with: nothing written at all.
  const storedHighScores = await page.evaluate(
    (key) => localStorage.getItem(key),
    HIGH_SCORES_STORAGE_KEY,
  );
  expect(storedHighScores).toBeNull();
});
