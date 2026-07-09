import { expect, test, type Page } from '@playwright/test';
import { clickButton, tapKey, waitForActiveScene, waitForSceneText } from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
const ROTATE_HOLD_MS = 800;
const GROUND_CONTACT_TIMEOUT_MS = 35000;
// Boot + WorldMap nav + Loadout + a real mission flight through to a forced
// crash + the delayed return to WorldMap + BACK to Menu + a second launch --
// mirrors high-scores.spec.ts's own CRASH_TEST_TIMEOUT_MS budgeting for the
// same rotate-and-crash wait, plus extra headroom for the additional
// mission-launch and navigation legs this test needs first.
const TEST_TIMEOUT_MS = 90000;

/** Clicks a Loadout cargo stepper's "+" button `count` times, waiting for
 * the amount label to reflect each click before the next -- mirrors
 * world-map.spec.ts's own `incrementCargoStepper` (duplicated rather than
 * imported: e2e specs in this project don't share helpers across files,
 * only via the common `test-helpers.ts`). */
async function incrementCargoStepper(
  page: Page,
  cargoType: 'TROOPS' | 'SUPPLIES',
  count: number,
): Promise<void> {
  for (let clicked = 1; clicked <= count; clicked += 1) {
    await clickButton(page, 'Loadout', `${cargoType} +`);
    await waitForSceneText(
      page,
      'Loadout',
      `${cargoType}: ${clicked.toString()}`,
      SCENE_TRANSITION_TIMEOUT_MS,
    );
  }
}

/**
 * Regression test for a real, pre-existing bug found by this project's own
 * Milestone 11 adversarial review (confirmed directly against Phaser
 * 4.2.0's bundled source, `Systems.start(data)`: `if (data) { settings.data
 * = data; }`): MenuScene's START button used to call `this.scene.start(
 * SCENE_KEY_GAME)` with no data argument at all, which -- because Phaser
 * only overwrites a scene's retained `settings.data` when a truthy value is
 * passed -- silently left GameScene's *previous* launch data (a curated
 * `base`/`mission` from an earlier real mission flight) in place. A player
 * who flew a real curated mission and then returned to the menu to start
 * what should be a generic free flight (Milestone 6's own certified
 * behavior) would silently keep re-flying that same curated base/mission
 * forever, with no visible indication anything was wrong, until a full
 * page reload. Both MenuScene's `startFlight()` and ResultScene's
 * `restart()` were fixed to pass an explicit `{}` instead.
 *
 * This proves the fix at the MenuScene call site specifically: it's the
 * one with a real, reachable repro (Milestone 9.5 routes every curated-base
 * launch through the mission system, which always exits a resolved trip
 * back to WorldMap -- never ResultScene -- so contaminated data can only
 * resurface via a *later, separate* Menu START, not via ResultScene's own
 * RESTART in the same session).
 */
async function launchAnchorStationMission(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', "KESSEL'S REACH");
  await waitForSceneText(page, 'WorldMap', 'ANCHOR STATION', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'ANCHOR STATION');
  await waitForSceneText(
    page,
    'WorldMap',
    'ANCHOR STATION — MISSIONS',
    SCENE_TRANSITION_TIMEOUT_MS,
  );
  await clickButton(page, 'WorldMap', 'ESTABLISH PRESENCE');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
  // LAUNCH itself is inert until Anchor Station's 6-troop garrison
  // requirement is met (meetsLaunchRequirement) -- this test doesn't care
  // whether the mission ultimately succeeds (resolveMissionTrip exits to
  // WorldMap either way), it just needs a real, clickable LAUNCH.
  await waitForSceneText(page, 'Loadout', 'REQUIRES: 6 TROOPS', SCENE_TRANSITION_TIMEOUT_MS);
  await incrementCargoStepper(page, 'TROOPS', 6);
  await clickButton(page, 'Loadout', 'LAUNCH');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  const launchedBaseId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
    };
    return scene.base?.id;
  });
  expect(launchedBaseId).toBe('anchor-station');
}

/** Forces a deterministic crash the same way high-scores.spec.ts does:
 * rotate hard past the safe-landing angle threshold and hold it, so
 * `isSafeLanding` fails no matter where or how fast the ship touches down. */
async function forceCrash(page: Page): Promise<void> {
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(ROTATE_HOLD_MS);
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(
    () => window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') !== 'flying',
    { timeout: GROUND_CONTACT_TIMEOUT_MS },
  );
}

test('MenuScene START after a real mission launch produces a genuine free flight, not the stale curated base/mission', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);

  await launchAnchorStationMission(page);
  await forceCrash(page);

  // A mission-context flight's resolution always exits to WorldMap, never
  // ResultScene (game-scene.ts's resolveMissionTrip). WorldMapScene's own
  // create() then finds the just-concluded mission's registry state and
  // opens straight into its "MISSION FAILURE"/CONTINUE acknowledgment view
  // (renderConcludedMission) rather than the top-level world list --
  // acknowledging it (banking side effects, clearing the registry) is what
  // drops back to the base list, from which BACK reaches the world list,
  // and BACK again reaches the menu (same two-level BACK chain
  // world-map.spec.ts's own tests already exercise).
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'WorldMap', 'MISSION FAILURE', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'CONTINUE');
  await waitForSceneText(page, 'WorldMap', 'ANCHOR STATION', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'BACK');
  await waitForSceneText(page, 'WorldMap', 'WORLD MAP', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'BACK');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  // The real repro: START here is meant to be a generic free flight
  // (Milestone 6's certified behavior) -- before the fix, GameScene's
  // retained settings.data still held { base: anchor-station, mission:
  // ... } from the launch above, so this would silently re-fly that same
  // curated base/mission forever instead.
  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  const freeFlightState = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
      missionContext: unknown;
    };
    return { base: scene.base, missionContext: scene.missionContext };
  });
  expect(freeFlightState.base).toBeNull();
  expect(freeFlightState.missionContext).toBeNull();
});
