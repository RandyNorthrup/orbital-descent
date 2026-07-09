import { expect, test, type Page } from '@playwright/test';
import { clickButton, waitForActiveScene } from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// A real piloted flight (steer, then free-fall into a curated obstacle) --
// generous ceiling matching this project's established practice for real
// physics-timing-dependent tests under parallel worker contention (see
// landing.spec.ts's own comment for the precedent).
const OBSTACLE_TEST_TIMEOUT_MS = 60000;
const OUTCOME_POLL_MS = 150;
const OUTCOME_POLL_TIMEOUT_MS = 20000;

// Mirrors src/game/persistence/base-progress.ts's BASE_PROGRESS_STORAGE_KEY
// -- duplicated here deliberately, this suite's established black-box-
// testing convention (see world-map.spec.ts's own comment for why).
const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';
// Same bounded-retry rationale as missions.spec.ts's own
// MAX_ORIGIN_ATTEMPTS: a real, timed keyboard maneuver aimed at a
// comparatively narrow (24px) target is sensitive to per-frame timing
// jitter under real worker contention (confirmed directly -- an isolated
// run passes reliably, a full 3-browser parallel run occasionally drifts
// just wide of the spire on one attempt). Retrying the whole flight fresh
// is cheap relative to this test's own generous timeout budget.
const MAX_STEER_ATTEMPTS = 3;

async function readOutcome(page: Page): Promise<string | undefined> {
  return page.evaluate(
    () =>
      window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') as
        string | undefined,
  );
}

async function readCrashedOnObstacle(page: Page): Promise<boolean | undefined> {
  return page.evaluate(
    () =>
      window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('crashedOnObstacle') as
        boolean | undefined,
  );
}

/** Seeds Scarp Outpost as `established` (Resupply's "no minimum cargo
 * required" single-trip mission is the simplest way to reach `GameScene`
 * at this base without also needing to load a garrison) and navigates
 * Menu -> World Map -> Scarp Outpost -> Resupply -> Loadout -> LAUNCH,
 * landing on a freshly-started `Game` scene. */
async function launchAtScarpOutpost(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await page.evaluate(
    ({ key, seeded }) => {
      localStorage.setItem(key, JSON.stringify(seeded));
    },
    {
      key: BASE_PROGRESS_STORAGE_KEY,
      seeded: {
        'scarp-outpost': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
      },
    },
  );
  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', "KESSEL'S REACH");
  await clickButton(page, 'WorldMap', 'SCARP OUTPOST (CLEARED)');
  await clickButton(page, 'WorldMap', 'RESUPPLY (SINGLE TRIP)');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'Loadout', 'LAUNCH');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);
}

/** Polls `outcome` until the flight resolves (or this function's own
 * timeout elapses), same "poll live scene state, don't race a fixed
 * delay" discipline as `missions.spec.ts`'s autopilot. */
async function waitForOutcome(page: Page): Promise<string | undefined> {
  const deadline = Date.now() + OUTCOME_POLL_TIMEOUT_MS;
  let outcome = await readOutcome(page);
  while (outcome === undefined || outcome === 'flying') {
    if (Date.now() >= deadline) {
      return outcome;
    }
    await page.waitForTimeout(OUTCOME_POLL_MS);
    outcome = await readOutcome(page);
  }
  return outcome;
}

test('flying directly into a curated obstacle crashes the ship, distinctly from an ordinary off-pad crash', async ({
  page,
}) => {
  test.setTimeout(OBSTACLE_TEST_TIMEOUT_MS);

  // Scarp Outpost's own curated spire (src/game/bases/bases.ts,
  // SCARP_OUTPOST_OBSTACLES) sits at x=[1470, 1494], y=[180, 430] -- just
  // right of the fixed lander spawn point (x=1440, y=80) and left of the
  // base's own landing pad (x=[1368, 1416]). Steering *right* (away from
  // the pad) is what deliberately aims at it.
  let hitObstacle = false;
  for (let attempt = 1; attempt <= MAX_STEER_ATTEMPTS && !hitObstacle; attempt += 1) {
    await launchAtScarpOutpost(page);

    // Two-phase maneuver, tuned empirically (repeated real runs) to land
    // at x~1477-1483 -- close to the spire's true horizontal center (1482,
    // span [1470, 1494]) and comfortably clear of both edges, rather than
    // just grazing one: rotate right first, without thrust, to build tilt
    // quickly without wasting early thrust mostly pointed straight up;
    // then hold thrust while still rotating, which is when real rightward
    // drift accumulates. Falcon's own handling/thrust stats (the default
    // starter ship, no equipment needed for this test).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');

    const outcome = await waitForOutcome(page);
    expect(outcome).toBe('crashed');
    hitObstacle = (await readCrashedOnObstacle(page)) === true;
  }

  // The distinguishing assertion: an ordinary off-pad crash also resolves
  // to 'crashed', but only a real obstacle hit sets this.
  expect(hitObstacle).toBe(true);
});

test('a normal descent straight down from spawn crashes off-pad without ever touching the obstacle', async ({
  page,
}) => {
  test.setTimeout(OBSTACLE_TEST_TIMEOUT_MS);

  // Control case for the test above: no steering at all (straight fall
  // from spawn, x=1440) stays well clear of the spire (x=[1470, 1494]),
  // so this must be an ordinary crash with crashedOnObstacle staying
  // false -- proves the flag genuinely discriminates, rather than
  // happening to be true for every crash at this base.
  await launchAtScarpOutpost(page);

  expect(await waitForOutcome(page)).toBe('crashed');
  expect(await readCrashedOnObstacle(page)).toBe(false);
});
