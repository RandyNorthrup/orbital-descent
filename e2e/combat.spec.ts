import { expect, test, type Page } from '@playwright/test';
import { clickButton, waitForActiveScene, waitForSceneText } from './test-helpers';

const BOOT_TIMEOUT_MS = 10000;
const SCENE_TRANSITION_TIMEOUT_MS = 10000;
// A real piloted flight through a live combat encounter (hover-ish
// maneuvering plus repeated weapon fire) -- generous ceiling matching this
// project's established practice for real physics-timing-dependent tests
// under parallel worker contention (see obstacles.spec.ts's own comment for
// the precedent).
const COMBAT_TEST_TIMEOUT_MS = 60000;
const POLL_MS = 100;

// Mirrors src/game/persistence/base-progress.ts's BASE_PROGRESS_STORAGE_KEY
// and src/game/persistence/equipment-progress.ts's
// EQUIPMENT_PROGRESS_STORAGE_KEY -- duplicated here deliberately, this
// suite's established black-box-testing convention (see world-map.spec.ts's
// own comment for why).
const BASE_PROGRESS_STORAGE_KEY = 'orbital-descent:base-progress:v1';
const EQUIPMENT_PROGRESS_STORAGE_KEY = 'orbital-descent:equipment-progress:v1';

async function waitForBooted(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
}

/** Seeds an already-equipped loadout directly (bypassing Loadout scene's own
 * equip-click flow), same established shortcut `loadout.spec.ts` documents
 * for reaching `GameScene` with a pre-equipped loadout. `activeWeaponId`
 * defaults to `null` (no weapon equipped) for the shield-only test below. */
async function seedEquippedItems(
  page: Page,
  equippedItemIds: readonly string[],
  activeWeaponId: string | null = null,
): Promise<void> {
  await page.evaluate(
    ({ key, equippedItemIds, activeWeaponId }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          purchasedEquipmentIds: equippedItemIds,
          equippedItemIds,
          activeWeaponId,
          activeUtilityId: null,
        }),
      );
    },
    { key: EQUIPMENT_PROGRESS_STORAGE_KEY, equippedItemIds, activeWeaponId },
  );
}

async function readData<T>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (key) => window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get(key) as T | undefined,
    key,
  );
}

/** Seeds Meridian Yard as `established` (Resupply's "no minimum cargo
 * required" single-trip mission is the simplest way to reach `GameScene`
 * there, same technique as `obstacles.spec.ts`'s own `launchAtScarpOutpost`)
 * and navigates Menu -> World Map -> Verdalis -> Resupply -> Loadout ->
 * LAUNCH. Verdalis is a single-base world (Decision D17), so clicking it
 * opens Meridian Yard's own mission-select screen directly, with no
 * intermediate base-select step. */
async function launchAtMeridianYard(
  page: Page,
  equippedItemIds: readonly string[],
  activeWeaponId: string | null,
): Promise<void> {
  await page.goto('/');
  await waitForBooted(page);
  await page.evaluate(
    ({ key, seeded }) => {
      localStorage.setItem(key, JSON.stringify(seeded));
    },
    {
      key: BASE_PROGRESS_STORAGE_KEY,
      seeded: {
        'meridian-yard': { status: 'established', establishedAt: 1000, resupplyCounts: 0 },
      },
    },
  );
  await seedEquippedItems(page, equippedItemIds, activeWeaponId);
  await page.reload();
  await waitForBooted(page);

  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'WORLD MAP');
  await waitForActiveScene(page, 'WorldMap', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'VERDALIS');
  await waitForSceneText(page, 'WorldMap', 'MERIDIAN YARD — MISSIONS', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'WorldMap', 'RESUPPLY (SINGLE TRIP)');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
  await clickButton(page, 'Loadout', 'LAUNCH');
  await waitForActiveScene(page, 'Game', SCENE_TRANSITION_TIMEOUT_MS);
}

/**
 * Sweeps rotation left/right while firing continuously (bounded by the
 * weapon's own cooldown) and holding thrust -- a homing target closing in
 * from an unknown angle is likelier to cross a swept firing line than one
 * held perfectly still. Verified directly (real browser runs) to reliably
 * connect at least one shot against Meridian Yard's swarm well before the
 * ship's own descent carries it past the encounter.
 */
async function engageEncounter(page: Page, durationMs: number): Promise<void> {
  const deadline = Date.now() + durationMs;
  let rotateRight = true;
  while (Date.now() < deadline) {
    const rotateKey = rotateRight ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(rotateKey);
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('Space');
    await page.waitForTimeout(90);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('Space');
    await page.waitForTimeout(160);
    await page.keyboard.up(rotateKey);
    rotateRight = !rotateRight;
  }
}

/**
 * Holds full thrust (no rotation -- heading stays "up") for just long
 * enough to reverse the ship's post-trigger fall speed and start climbing
 * back toward the swarm (spawned just above `MERIDIAN_YARD_ENCOUNTER`'s
 * own `triggerAltitude`), then releases and coasts -- verified directly
 * (real browser runs) that the swarm's own homing then reliably closes the
 * remaining gap and contacts the ship within a few seconds, unlike a pure
 * free-fall or sweep maneuver, either of which quickly outpaces the
 * swarm's fixed speed (`combat/combatant.ts`'s `VERDALIS_WASP.movement.
 * speed`, 50 px/s) and is never caught.
 */
async function reverseAndCoastForContact(page: Page, coastDurationMs: number): Promise<void> {
  const REVERSE_THRUST_MS = 2400;
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(REVERSE_THRUST_MS);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(coastDurationMs);
}

// Same bounded-retry rationale as obstacles.spec.ts's own
// MAX_STEER_ATTEMPTS: a real, timed keyboard maneuver aimed at homing
// targets whose exact approach path depends on real-browser frame timing
// is sensitive to that timing under worker contention. Retrying the whole
// flight fresh is cheap relative to this test's own generous timeout
// budget.
const MAX_ENGAGE_ATTEMPTS = 3;

/** Waits for `MERIDIAN_YARD_ENCOUNTER` to actually trigger (its swarm
 * spawns) -- polling the same live scene state the rest of each test reads,
 * not a fixed guessed delay. Returns `undefined` if the flight concludes
 * (or this function's own deadline elapses) before that ever happens. */
async function waitForEncounterTrigger(page: Page): Promise<number | undefined> {
  const deadline = Date.now() + 20000;
  let liveCount = await readData<number>(page, 'liveCombatantCount');
  while ((liveCount === undefined || liveCount === 0) && Date.now() < deadline) {
    await page.waitForTimeout(POLL_MS);
    liveCount = await readData<number>(page, 'liveCombatantCount');
    const outcome = await readData<string>(page, 'outcome');
    if (outcome !== undefined && outcome !== 'flying') {
      return undefined;
    }
  }
  return liveCount === 0 ? undefined : liveCount;
}

test('triggering the equipped weapon damages and eventually defeats a hostile at Meridian Yard’s swarm encounter', async ({
  page,
}) => {
  test.setTimeout(COMBAT_TEST_TIMEOUT_MS);

  let weaponConfirmedTheKill = false;
  for (let attempt = 1; attempt <= MAX_ENGAGE_ATTEMPTS && !weaponConfirmedTheKill; attempt += 1) {
    await launchAtMeridianYard(page, ['pulse-cannon'], 'pulse-cannon');

    const initialCount = await waitForEncounterTrigger(page);
    if (initialCount === undefined) {
      continue;
    }

    await engageEncounter(page, 10000);

    const finalCount = await readData<number>(page, 'liveCombatantCount');
    const finalHull = await readData<number>(page, 'shipHull');

    // The swarm's own contact damage (Verdalis Wasp) would also remove a
    // combatant from `liveCombatantCount`, but always alongside a hull
    // reduction too -- a defeated combatant with hull still completely
    // full (Falcon's `SHIP_BASE_HULL_POINTS`, 30) can only be explained by
    // the weapon's own fire connecting first.
    weaponConfirmedTheKill =
      finalCount !== undefined && finalCount < initialCount && finalHull === 30;
  }

  expect(weaponConfirmedTheKill).toBe(true);
});

// Mirrors combat/combatant.ts's VERDALIS_WASP.contactDamage -- duplicated
// here deliberately, this suite's established black-box-testing
// convention (see world-map.spec.ts's own comment for why).
const WASP_CONTACT_DAMAGE = 6;

test('a shielded ship absorbs a contact hit from the swarm before taking hull damage', async ({
  page,
}) => {
  test.setTimeout(COMBAT_TEST_TIMEOUT_MS);

  let shieldConfirmedAbsorption = false;
  for (
    let attempt = 1;
    attempt <= MAX_ENGAGE_ATTEMPTS && !shieldConfirmedAbsorption;
    attempt += 1
  ) {
    // No weapon equipped -- a Verdalis Wasp can only be resolved via
    // contact against this loadout, isolating the shield's own effect
    // from any possible weapon kill.
    await launchAtMeridianYard(page, ['barrier-shield'], null);

    const initialCount = await waitForEncounterTrigger(page);
    if (initialCount === undefined) {
      continue;
    }
    const initialShieldHits = await readData<number>(page, 'shieldHitsRemaining');

    await reverseAndCoastForContact(page, 8000);

    const finalShieldHits = await readData<number>(page, 'shieldHitsRemaining');
    const finalHull = await readData<number>(page, 'shipHull');
    const finalCount = await readData<number>(page, 'liveCombatantCount');
    const removedCount = finalCount === undefined ? 0 : initialCount - finalCount;

    // At least one contact happened (a wasp was removed) and the shield's
    // own one-hit pool is exhausted -- if more than one wasp contacted in
    // the same tick (a real, valid outcome; `advanceCombatants`'s own
    // per-tick loop can resolve several in one pass), the shield absorbs
    // only the first, so hull absorbs `contactDamage` for every contact
    // beyond that one -- exactly this formula, not necessarily untouched.
    shieldConfirmedAbsorption =
      removedCount >= 1 &&
      initialShieldHits === 1 &&
      finalShieldHits === 0 &&
      finalHull === 30 - WASP_CONTACT_DAMAGE * (removedCount - 1);
  }

  expect(shieldConfirmedAbsorption).toBe(true);
});
