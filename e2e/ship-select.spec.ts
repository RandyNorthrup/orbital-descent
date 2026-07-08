import { expect, test, type Page } from '@playwright/test';
import {
  clickButton,
  clickLockedEntryAndConfirmInert,
  findButtonPosition,
  sceneHasText,
  tapKey,
  waitForActiveScene,
  waitForSceneText,
} from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// Two full navigation passes (fresh + re-entry) plus a real flight launch.
const TEST_TIMEOUT_MS = 60000;

// Mirrors src/game/persistence/base-progress.ts's BASE_PROGRESS_STORAGE_KEY
// and src/game/persistence/ship-progress.ts's SHIP_PROGRESS_STORAGE_KEY --
// duplicated here deliberately, matching world-map.spec.ts's own established
// black-box-testing convention (real e2e coverage of the actual browser
// Storage API, not a re-import of the app's own internals).
const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';
const SHIP_PROGRESS_STORAGE_KEY = 'orbital-descent:ship-progress:v1';

async function openShipSelectFromMenu(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'SHIP SELECT');
  await waitForActiveScene(page, 'ShipSelect', SCENE_TRANSITION_TIMEOUT_MS);
}

test('a fresh save selects Falcon by default, gates the purchase/unlock ships with their reason, lets a real click no-op on a locked entry, and BACK returns to menu', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await openShipSelectFromMenu(page);

  await waitForSceneText(page, 'ShipSelect', 'FALCON', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'ShipSelect', 'FALCON (SELECTED)')).toBe(true);

  // Every other starter is available: a real clickable button exists under
  // its own exact (un-suffixed) name -- an exact-match check via
  // findButtonPosition, not a "(LOCKED)"-suffix substring check, since
  // "HAULER (LOCKED)" would otherwise also match "CRYOHAULER (LOCKED)"'s
  // own text.
  for (const starter of ['SCOUT', 'COURIER', 'SENTINEL', 'HAULER']) {
    await expect(findButtonPosition(page, 'ShipSelect', starter)).resolves.toBeDefined();
  }

  // The purchase-type and unlock-type ships are locked on a fresh save,
  // each with its own stated reason -- Milestone 8 doesn't exist yet, so
  // Vanguard can never be owned by anything in this milestone.
  expect(await sceneHasText(page, 'ShipSelect', 'VANGUARD (LOCKED)')).toBe(true);
  expect(await sceneHasText(page, 'ShipSelect', 'PRICE: 750 CREDITS')).toBe(true);
  expect(await sceneHasText(page, 'ShipSelect', 'CRYOHAULER (LOCKED)')).toBe(true);
  expect(await sceneHasText(page, 'ShipSelect', 'UNLOCK: ESTABLISH FROSTGATE')).toBe(true);

  // Clicking directly on a locked entry's own on-screen position must be a
  // genuine no-op, not just visually different from a real button.
  await clickLockedEntryAndConfirmInert(
    page,
    'ShipSelect',
    'VANGUARD (LOCKED)',
    'FALCON (SELECTED)',
  );

  // Selecting a different starter moves the "(SELECTED)" marker in place,
  // without leaving the scene.
  await clickButton(page, 'ShipSelect', 'SCOUT');
  await waitForSceneText(page, 'ShipSelect', 'SCOUT (SELECTED)', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'ShipSelect', 'FALCON (SELECTED)')).toBe(false);

  await clickButton(page, 'ShipSelect', 'BACK');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  // ESC is BACK's keyboard equivalent (ArmedKeyGuard, same pattern as
  // WorldMapScene) -- re-enter ShipSelect and confirm the key path returns
  // to Menu too, not just the on-screen BACK button.
  await clickButton(page, 'Menu', 'SHIP SELECT');
  await waitForActiveScene(page, 'ShipSelect', SCENE_TRANSITION_TIMEOUT_MS);
  await tapKey(page, 'Escape');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  // The selection is a persistent loadout choice: a generic free flight
  // (START, no base/ship data passed) now flies Scout, not the old default.
  await clickButton(page, 'Menu', 'START');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // GameScene's own `ship` field has no public accessor -- same deliberate
  // escape-hatch cast pattern used elsewhere in this suite (e.g.
  // world-map.spec.ts's `scene.base`).
  const flyingShipId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      ship: { id?: string };
    };
    return scene.ship.id;
  });
  expect(flyingShipId).toBe('scout');
});

test('a seeded frostgate-established state unlocks the unlock-gated ship', async ({ page }) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  // Mirrors what a real Frostgate establishment would leave behind --
  // seeded directly into real localStorage rather than requiring an actual
  // playthrough, since nothing before Milestone 9.5's mission system can
  // trigger this transition through real play (same convention as
  // world-map.spec.ts's own seeded-unlock test).
  await page.evaluate((key) => {
    const seeded = {
      frostgate: { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
    };
    localStorage.setItem(key, JSON.stringify(seeded));
  }, BASE_PROGRESS_STORAGE_KEY);

  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'SHIP SELECT');
  await waitForActiveScene(page, 'ShipSelect', SCENE_TRANSITION_TIMEOUT_MS);

  await waitForSceneText(page, 'ShipSelect', 'CRYOHAULER', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'ShipSelect', 'CRYOHAULER (LOCKED)')).toBe(false);

  // Genuinely clickable now, not just visually unlocked.
  await clickButton(page, 'ShipSelect', 'CRYOHAULER');
  await waitForSceneText(page, 'ShipSelect', 'CRYOHAULER (SELECTED)', SCENE_TRANSITION_TIMEOUT_MS);

  const storedSelection = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as { selectedShipId?: string } | null,
    SHIP_PROGRESS_STORAGE_KEY,
  );
  expect(storedSelection?.selectedShipId).toBe('cryohauler');

  // The write actually survives a real reload -- a genuine UI-driven
  // write -> reload -> re-render round trip, not just a same-session
  // localStorage read.
  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'SHIP SELECT');
  await waitForActiveScene(page, 'ShipSelect', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'ShipSelect', 'CRYOHAULER (SELECTED)', SCENE_TRANSITION_TIMEOUT_MS);
});
