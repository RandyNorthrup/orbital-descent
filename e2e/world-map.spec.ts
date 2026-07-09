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
// Two full navigation passes (fresh + re-entry) plus a real flight launch,
// now routed through the Milestone 9.5 mission-select/loadout screens too.
const TEST_TIMEOUT_MS = 60000;

// Mirrors src/game/persistence/base-progress.ts's BASE_PROGRESS_STORAGE_KEY
// and BaseProgress shape — duplicated here deliberately, this suite's
// established black-box-testing convention (see world-scrolling.spec.ts's
// own comment for why: real e2e coverage of the actual browser Storage API,
// not a re-import of the app's own internals).
const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';
// Mirrors src/game/persistence/ship-progress.ts's SHIP_PROGRESS_STORAGE_KEY
// -- same convention, used only by the single-base-world test below to seed
// a ship whose cargo-bay capacity can actually carry Meridian Yard's own
// 15-troop garrison requirement (150 MU, over the default Falcon's 100 MU
// cargoBayCapacity -- a real, intentional progression gate, not a bug).
const SHIP_PROGRESS_STORAGE_KEY = 'orbital-descent:ship-progress:v1';

async function openWorldMapFromMenu(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
}

/** Clicks a Loadout cargo stepper's "+" button `count` times, waiting for
 * the amount label to reflect each click before the next -- proves each
 * click actually landed and re-rendered (same "poll, don't race" discipline
 * `waitForSceneText` already establishes) rather than firing `count` clicks
 * blind against a screen that may still be mid-render. */
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

test('a fresh save gates locked worlds/bases, lets BACK navigate both levels, and a reachable base leads through mission-select/loadout to a real launch', async ({
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

  // Re-enter and click Anchor Station -- Milestone 9.5's intentional
  // behavior change: this no longer launches GameScene directly, it opens
  // this base's own mission-select screen instead (a base visit is a real
  // mission now, not a bare "land safely" clear).
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

  // Anchor Station is discovered-unclaimed on a fresh save -- its only
  // mission option is Establish Presence, requiring its own
  // garrisonRequirement (6) in troops (bases.ts's own authored value).
  expect(await sceneHasText(page, 'WorldMap', 'REQUIRES: 6 TROOPS')).toBe(true);
  await clickButton(page, 'WorldMap', 'ESTABLISH PRESENCE');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);

  // LAUNCH is inert until the 6-troop requirement is met -- the stepper is
  // this project's first real caller of `GameSceneData.mission`.
  await waitForSceneText(page, 'Loadout', 'REQUIRES: 6 TROOPS', SCENE_TRANSITION_TIMEOUT_MS);
  await incrementCargoStepper(page, 'TROOPS', 6);
  await clickButton(page, 'Loadout', 'LAUNCH');
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

  // Scarp Outpost is now genuinely clickable, leading to its own
  // mission-select screen (not a direct flight launch, Milestone 9.5).
  await clickButton(page, 'WorldMap', 'SCARP OUTPOST');
  await waitForSceneText(page, 'WorldMap', 'SCARP OUTPOST — MISSIONS', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', 'REQUIRES: 10 TROOPS')).toBe(true);

  await clickButton(page, 'WorldMap', 'ESTABLISH PRESENCE');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'Loadout', 'REQUIRES: 10 TROOPS', SCENE_TRANSITION_TIMEOUT_MS);
  await incrementCargoStepper(page, 'TROOPS', 10);
  await clickButton(page, 'Loadout', 'LAUNCH');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  const launchedBaseId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
    };
    return scene.base?.id;
  });
  expect(launchedBaseId).toBe('scarp-outpost');
});

test("a reachable single-base world opens its one base's mission-select screen directly, skipping the base-select screen", async ({
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
  // Also seeds Courier as the selected ship: Meridian Yard's own 15-troop
  // garrison requirement (150 MU) exceeds the default Falcon's
  // cargoBayCapacity (100 MU) -- a real, intentional ship-progression gate
  // (PLAN.md §9.5.7), not something this test should route around by
  // picking an easier base; Courier's 160 MU cargo bay clears it.
  await page.evaluate(
    ({ baseKey, shipKey }) => {
      const seededBase = {
        'anchor-station': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
        'scarp-outpost': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
        'meridian-yard': { status: 'discovered-unclaimed', establishedAt: null, resupplyCounts: 0 },
        'rustwell-landing': { status: 'locked', establishedAt: null, resupplyCounts: 0 },
        frostgate: { status: 'locked', establishedAt: null, resupplyCounts: 0 },
      };
      localStorage.setItem(baseKey, JSON.stringify(seededBase));
      localStorage.setItem(
        shipKey,
        JSON.stringify({ selectedShipId: 'courier', purchasedShipIds: [] }),
      );
    },
    { baseKey: BASE_PROGRESS_STORAGE_KEY, shipKey: SHIP_PROGRESS_STORAGE_KEY },
  );

  await page.reload();
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'WorldMap', 'VERDALIS', SCENE_TRANSITION_TIMEOUT_MS);

  // Clicking Verdalis must open Meridian Yard's own mission-select screen
  // immediately — a single-base world never shows an intermediate
  // base-select screen (D17/PLAN.md's own Goal text: that screen exists
  // only for multi-base worlds), and (Milestone 9.5) never launches a
  // flight directly either.
  await clickButton(page, 'WorldMap', 'VERDALIS');
  await waitForSceneText(page, 'WorldMap', 'MERIDIAN YARD — MISSIONS', SCENE_TRANSITION_TIMEOUT_MS);
  expect(await sceneHasText(page, 'WorldMap', 'REQUIRES: 15 TROOPS')).toBe(true);

  await clickButton(page, 'WorldMap', 'ESTABLISH PRESENCE');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
  await waitForSceneText(page, 'Loadout', 'REQUIRES: 15 TROOPS', SCENE_TRANSITION_TIMEOUT_MS);
  await incrementCargoStepper(page, 'TROOPS', 15);
  await clickButton(page, 'Loadout', 'LAUNCH');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);

  const launchedBaseId = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      base: { id?: string } | null;
    };
    return scene.base?.id;
  });
  expect(launchedBaseId).toBe('meridian-yard');
});
