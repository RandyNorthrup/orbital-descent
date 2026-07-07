import { expect, test } from '@playwright/test';
import { tapKey, waitForActiveScene } from './test-helpers';

// Generous: covers page/module-load and the post-Enter scene-transition
// wait, which depends on a synthetic keypress landing correctly under
// whatever parallel test-worker contention is happening.
const BOOT_TIMEOUT_MS = 10000;
// Generous: real physics timing under parallel test-worker contention,
// which grew with Milestone 3's added e2e suites (24 tests total now,
// vs. fewer before) — matches this project's established precedent of
// widening timeouts for physics-timing-dependent assertions rather than
// treating environmental slowdown as a logic bug (see world-scrolling.
// spec.ts's own history for the same reasoning).
const GROUND_CONTACT_TIMEOUT_MS = 25000;
// Boot + menu-nav + the ground-contact wait above can approach
// Playwright's 30s default on its own under contention; give real margin.
const TEST_TIMEOUT_MS = 60000;

test('gravity eventually brings the lander into contact with the terrain, showing a landed-or-crashed outcome', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  // Boots into MenuScene now (Milestone 3) — Enter starts a fresh flight.
  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', BOOT_TIMEOUT_MS);

  // No input at all: gravity alone must eventually bring the ship down onto
  // the randomly generated terrain, exercising the real collision +
  // landed/crashed decision — not just "the game boots with no errors".
  // The outcome is read from the Scene's data manager (see GameScene),
  // not canvas-rendered text, which isn't visible to DOM-based locators.
  // Phaser's DataManager#get is untyped (any) by design; this cast to the
  // known outcome union is the one deliberate escape hatch for that.
  await page.waitForFunction(
    () => {
      const outcome = window.__ORBITAL_DESCENT_GAME__?.scene
        .getScene('Game')
        .data.get('outcome') as 'flying' | 'landed' | 'crashed' | undefined;
      return outcome === 'landed' || outcome === 'crashed';
    },
    { timeout: GROUND_CONTACT_TIMEOUT_MS },
  );

  const outcome = await page.evaluate(
    () =>
      window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') as
        'flying' | 'landed' | 'crashed' | undefined,
  );
  expect(['landed', 'crashed']).toContain(outcome);
});
