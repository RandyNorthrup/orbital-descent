import { expect, test, type Page } from '@playwright/test';
import { tapKey, waitForActiveScene } from './test-helpers';

const BOOT_TIMEOUT_MS = 5000;
// Generous: each scene transition depends on a synthetic keypress landing
// correctly under whatever parallel test-worker contention is happening —
// observed occasionally flaky at 5000ms under this suite's full 24-test
// parallel run (not a logic bug; real key presses always register).
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// Real time to let gravity move the ship before pausing, so there's an
// actual changing position/velocity to prove frozen — and again after
// resuming, to prove it un-freezes.
const SETTLE_MS = 500;
const TEST_TIMEOUT_MS = 60000;

interface FlightSnapshot {
  readonly position: { readonly x: number; readonly y: number };
  readonly velocity: { readonly x: number; readonly y: number };
  readonly rotationRadians: number;
  readonly fuel: number;
}

/** `flightState` is a private GameScene field with no public accessor —
 * same deliberate escape-hatch cast pattern used elsewhere in this suite
 * (e.g. world-scrolling.spec.ts's `scene.terrain`), since e2e tests can
 * only observe the running game through the browser's own object graph. */
async function readFlightSnapshot(page: Page): Promise<FlightSnapshot | undefined> {
  return page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      flightState?: { snapshot: FlightSnapshot };
    };
    return scene.flightState?.snapshot;
  });
}

test('pausing mid-flight freezes the simulation exactly, and resuming continues from precisely there', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // Let gravity actually move the ship before pausing.
  await page.waitForTimeout(SETTLE_MS);

  await tapKey(page, 'Escape');
  await waitForActiveScene(page, 'Settings', SCENE_TRANSITION_TIMEOUT_MS);

  const snapshotAtPause = await readFlightSnapshot(page);
  expect(snapshotAtPause).toBeDefined();

  // Real time passes while paused — position/velocity/fuel must not
  // change at all (GameScene's update() simply never runs while Phaser
  // has this scene paused, so FlightState.tick() is never called).
  await page.waitForTimeout(SETTLE_MS);
  const snapshotStillPaused = await readFlightSnapshot(page);
  expect(snapshotStillPaused).toEqual(snapshotAtPause);

  await tapKey(page, 'Escape');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  await page.waitForTimeout(SETTLE_MS);
  const snapshotAfterResume = await readFlightSnapshot(page);
  expect(snapshotAfterResume).toBeDefined();
  expect(snapshotAfterResume).not.toEqual(snapshotAtPause);
});
