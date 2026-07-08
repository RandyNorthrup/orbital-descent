import { expect, test, type Page } from '@playwright/test';
import {
  clickButton,
  clickLockedEntryAndConfirmInert,
  sceneHasText,
  waitForActiveScene,
  waitForSceneText,
} from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// Two full navigation passes (fresh + re-entry) plus a real flight launch.
const TEST_TIMEOUT_MS = 60000;

// Mirrors src/game/persistence/base-progress.ts's BASE_PROGRESS_STORAGE_KEY
// and BaseProgress shape — duplicated here deliberately, this suite's
// established black-box-testing convention (see world-scrolling.spec.ts's
// own comment for why: real e2e coverage of the actual browser Storage API,
// not a re-import of the app's own internals).
const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';

async function openWorldMapFromMenu(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
}

test('a fresh save gates locked worlds/bases, lets BACK navigate both levels, and a reachable base actually starts a flight with it', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await openWorldMapFromMenu(page);

  // Fresh save: only Kessel's Reach has a non-locked base (bases.ts's own
  // authored starting state — anchor-station discovered-unclaimed,
  // everything else locked), so it's the only reachable world.
  await waitForSceneText(page, 'WorldMap', "KESSEL'S REACH", SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', "KESSEL'S REACH (LOCKED)")).toBe(false);
  expect(await sceneHasText(page, 'WorldMap', 'VERDALIS (LOCKED)')).toBe(true);

  // Clicking directly on a locked world entry's own on-screen position must
  // be a genuine no-op, not just visually different from a real button.
  await clickLockedEntryAndConfirmInert(page, 'WorldMap', 'VERDALIS (LOCKED)', "KESSEL'S REACH");

  await clickButton(page, 'WorldMap', "KESSEL'S REACH");
  await waitForSceneText(page, 'WorldMap', 'ANCHOR STATION', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', 'SCARP OUTPOST (LOCKED)')).toBe(true);

  // Same no-op guarantee one level down, for a locked base entry.
  await clickLockedEntryAndConfirmInert(
    page,
    'WorldMap',
    'SCARP OUTPOST (LOCKED)',
    'ANCHOR STATION',
  );

  // BACK from the base list returns to the world list, not all the way to
  // the menu — the two-level navigation's own "back" must be scoped to the
  // level it was pressed from.
  await clickButton(page, 'WorldMap', 'BACK');
  await waitForSceneText(page, 'WorldMap', 'WORLD MAP', SCENE_TRANSITION_TIMEOUT_MS);

  // BACK from the world list returns to the menu.
  await clickButton(page, 'WorldMap', 'BACK');
  await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

  // Re-enter and actually launch Anchor Station — the real game's first
  // caller of GameSceneData.base (Milestone 5 built this plumbing but no
  // production code path ever exercised it until this scene).
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', "KESSEL'S REACH");
  await waitForSceneText(page, 'WorldMap', 'ANCHOR STATION', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'ANCHOR STATION');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  // GameScene's own `base` field has no public accessor — same deliberate
  // escape-hatch cast pattern used elsewhere in this suite (e.g.
  // world-scrolling.spec.ts's `scene.terrain`).
  const launchedBaseId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
    };
    return scene.base?.id;
  });
  expect(launchedBaseId).toBe('anchor-station');
});

test('a seeded unlock state makes previously-locked worlds and bases selectable', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  // Mirrors exactly what establishBase(BASES, progress, 'anchor-station', ...)
  // would produce: anchor-station established, its two unlock targets
  // (meridian-yard, scarp-outpost) flipped to discovered-unclaimed, the
  // rest untouched — seeded directly into real localStorage rather than
  // requiring an actual playthrough, since nothing before Milestone 9.5's
  // mission system can trigger this transition through real play.
  await page.evaluate((key) => {
    const seeded = {
      'anchor-station': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
      'scarp-outpost': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
      'meridian-yard': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
      'rustwell-landing': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      frostgate: { status: 'locked', establishedAt: null, resupplyCounts: 0 },
    };
    localStorage.setItem(key, JSON.stringify(seeded));
  }, BASE_PROGRESS_STORAGE_KEY);

  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);

  // Verdalis (meridian-yard's world) was locked on a fresh save — now
  // reachable, proving the seeded progress was actually read, not just
  // written.
  await waitForSceneText(page, 'WorldMap', "KESSEL'S REACH", SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', 'VERDALIS (LOCKED)')).toBe(false);

  await clickButton(page, 'WorldMap', "KESSEL'S REACH");
  await waitForSceneText(page, 'WorldMap', 'ANCHOR STATION (CLEARED)', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', 'SCARP OUTPOST (LOCKED)')).toBe(false);

  // Scarp Outpost is now genuinely clickable, not just visually unlocked.
  await clickButton(page, 'WorldMap', 'SCARP OUTPOST');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);
});

test('a reachable single-base world launches its base directly, skipping the base-select screen', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  // Verdalis (meridian-yard) is a single-base world — reachable here via
  // the same seeded unlock the other test uses, but this test's whole
  // point is clicking straight into it, not just confirming it's unlocked.
  await page.evaluate((key) => {
    const seeded = {
      'anchor-station': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
      'scarp-outpost': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      'meridian-yard': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
      'rustwell-landing': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      frostgate: { status: 'locked', establishedAt: null, resupplyCounts: 0 },
    };
    localStorage.setItem(key, JSON.stringify(seeded));
  }, BASE_PROGRESS_STORAGE_KEY);

  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'WorldMap', 'VERDALIS', SCENE_TRANSITION_TIMEOUT_MS);

  // Clicking Verdalis must launch meridian-yard immediately — a single-base
  // world never shows an intermediate base-select screen (D17/PLAN.md's
  // own Goal text: that screen exists only for multi-base worlds).
  await clickButton(page, 'WorldMap', 'VERDALIS');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  const launchedBaseId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
    };
    return scene.base?.id;
  });
  expect(launchedBaseId).toBe('meridian-yard');
});
