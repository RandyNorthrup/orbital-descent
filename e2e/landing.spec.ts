import { expect, test } from '@playwright/test';

const BOOT_TIMEOUT_MS = 5000;
const GROUND_CONTACT_TIMEOUT_MS = 15000;

test('gravity eventually brings the lander into contact with the terrain, showing a landed-or-crashed outcome', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

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
