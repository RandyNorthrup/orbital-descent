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
// Multiple equip/unequip clicks plus two full reload passes -- in line with
// store.spec.ts's own reload-heavy ceiling, not landing.spec.ts's real-time
// flight one (this suite never flies).
const TEST_TIMEOUT_MS = 60000;

// Mirrors src/game/persistence/equipment-progress.ts's
// EQUIPMENT_PROGRESS_STORAGE_KEY and src/game/persistence/upgrade-progress.ts's
// UPGRADE_PROGRESS_STORAGE_KEY -- duplicated here deliberately, this suite's
// established black-box-testing convention (see world-map.spec.ts's own
// comment for why: real e2e coverage of the actual browser Storage API, not
// a re-import of the app's own internals).
const EQUIPMENT_PROGRESS_STORAGE_KEY = 'orbital-descent:equipment-progress:v1';
const UPGRADE_PROGRESS_STORAGE_KEY = 'orbital-descent:upgrade-progress:v1';

interface StoredEquipmentProgress {
  purchasedEquipmentIds?: string[];
  equippedItemIds?: string[];
}

/** Optional pre-equipped state for `seedOwnedEquipment` -- everything
 * defaults to "owned but nothing equipped/active yet" (the shape the
 * fresh-save-style seeding tests below need); the in-flight cycle/trigger
 * test further down is the one caller that actually populates
 * `equippedItemIds`, since it needs GameScene's `init()` to pick up an
 * already-equipped loadout without going through LoadoutScene's own click
 * flow first. */
interface EquipmentLoadoutSeed {
  readonly equippedItemIds?: readonly string[];
  readonly activeWeaponId?: string | null;
  readonly activeUtilityId?: string | null;
}

async function waitForBooted(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
}

async function openLoadoutFromMenu(page: Page): Promise<void> {
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'LOADOUT');
  await waitForActiveScene(page, 'Loadout', SCENE_TRANSITION_TIMEOUT_MS);
}

async function seedOwnedEquipment(
  page: Page,
  purchasedEquipmentIds: string[],
  loadout: EquipmentLoadoutSeed = {},
): Promise<void> {
  await page.evaluate(
    ({ key, purchasedEquipmentIds, loadout }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          purchasedEquipmentIds,
          equippedItemIds: loadout.equippedItemIds ?? [],
          activeWeaponId: loadout.activeWeaponId ?? null,
          activeUtilityId: loadout.activeUtilityId ?? null,
        }),
      );
    },
    { key: EQUIPMENT_PROGRESS_STORAGE_KEY, purchasedEquipmentIds, loadout },
  );
}

async function seedOwnedUpgrades(page: Page, purchasedUpgradeIds: string[]): Promise<void> {
  await page.evaluate(
    ({ key, purchasedUpgradeIds }) => {
      localStorage.setItem(key, JSON.stringify({ purchasedUpgradeIds }));
    },
    { key: UPGRADE_PROGRESS_STORAGE_KEY, purchasedUpgradeIds },
  );
}

test.describe('loadout: fresh save', () => {
  test('shows every equipment item locked with its own purchase/unlock reason, a "no upgrades" summary, and BACK/ESC return to menu', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);
    await openLoadoutFromMenu(page);

    await waitForSceneText(page, 'Loadout', 'LOADOUT', SCENE_TRANSITION_TIMEOUT_MS);
    expect(await sceneHasText(page, 'Loadout', 'FALCON · SLOTS 0/3 · MASS 0/150 MU')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'NO UPGRADES OWNED -- VISIT STORE')).toBe(true);

    // A purchase-type item and an unlock-type item are both locked on a
    // fresh save, each with its own stated reason (mirrors
    // ship-select.spec.ts's identical purchase/unlock assertions).
    expect(await sceneHasText(page, 'Loadout', 'PULSE CANNON (LOCKED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'PRICE: 200 CREDITS (VISIT STORE)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'AUTOCANNON (LOCKED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'UNLOCK: ESTABLISH SCARP OUTPOST')).toBe(true);

    // A real click landing on a locked entry's own on-screen position must
    // be a genuine no-op: no plain text is `.setInteractive()`.
    await clickLockedEntryAndConfirmInert(
      page,
      'Loadout',
      'PULSE CANNON (LOCKED)',
      'FALCON · SLOTS 0/3 · MASS 0/150 MU',
    );

    await clickButton(page, 'Loadout', 'BACK');
    await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

    // ESC is BACK's keyboard equivalent (ArmedKeyGuard, same pattern as
    // every other scene) -- re-enter Loadout and confirm the key path
    // returns to Menu too, not just the on-screen BACK button.
    await openLoadoutFromMenu(page);
    await tapKey(page, 'Escape');
    await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);
  });
});

test.describe('loadout: equip/unequip persistence', () => {
  test('equipping owned items updates the live slots/mass line, a full loadout blocks a further item with "SLOTS FULL", and every change survives a real reload', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);

    // Falcon (the default ship) has 3 equipmentSlots / 150 massBudget.
    // Own four purchase-type items up front: pulse-cannon (20 MU),
    // repair-kit (10 MU), thrust-booster (15 MU) get equipped below,
    // filling all 3 slots at 45/150 mass -- comfortably under the mass
    // budget, so the slot count (not the mass budget) is what blocks the
    // 4th (fuel-tank).
    await seedOwnedEquipment(page, ['pulse-cannon', 'repair-kit', 'thrust-booster', 'fuel-tank']);
    await seedOwnedUpgrades(page, ['stronger-engines', 'extended-fuel-cells']);
    await page.reload();
    await waitForBooted(page);
    await openLoadoutFromMenu(page);

    await waitForSceneText(page, 'Loadout', 'LOADOUT', SCENE_TRANSITION_TIMEOUT_MS);
    expect(
      await sceneHasText(page, 'Loadout', 'UPGRADES OWNED: STRONGER ENGINES, EXTENDED FUEL CELLS'),
    ).toBe(true);

    // All four are owned, none equipped yet -- each is a real clickable
    // button under its own plain name (not "(LOCKED)"/"(EQUIPPED)").
    for (const name of ['PULSE CANNON', 'REPAIR KIT', 'THRUST BOOSTER', 'FUEL TANK']) {
      await expect(findButtonPosition(page, 'Loadout', name)).resolves.toBeDefined();
    }

    await clickButton(page, 'Loadout', 'PULSE CANNON');
    await waitForSceneText(page, 'Loadout', 'PULSE CANNON (EQUIPPED)', SCENE_TRANSITION_TIMEOUT_MS);
    expect(await sceneHasText(page, 'Loadout', 'FALCON · SLOTS 1/3 · MASS 20/150 MU')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'MASS 20 · DMG 15 (WEAPON T1)')).toBe(true);

    await clickButton(page, 'Loadout', 'REPAIR KIT');
    await waitForSceneText(page, 'Loadout', 'REPAIR KIT (EQUIPPED)', SCENE_TRANSITION_TIMEOUT_MS);
    expect(await sceneHasText(page, 'Loadout', 'FALCON · SLOTS 2/3 · MASS 30/150 MU')).toBe(true);

    await clickButton(page, 'Loadout', 'THRUST BOOSTER');
    await waitForSceneText(
      page,
      'Loadout',
      'THRUST BOOSTER (EQUIPPED)',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await sceneHasText(page, 'Loadout', 'FALCON · SLOTS 3/3 · MASS 45/150 MU')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'MASS 15 · +20 THR for 3s (UTILITY)')).toBe(true);

    // All 3 slots are now full -- the still-owned, still-unequipped 4th item
    // (fuel-tank) renders under the exact same plain name text a real
    // button would use, so `findButtonPosition` alone can't distinguish the
    // two; `clickLockedEntryAndConfirmInert` instead proves it directly by
    // clicking that exact on-screen position and confirming nothing changed
    // (no `.setInteractive()` means no `pointerdown` handler is wired) --
    // equipping it would otherwise silently no-op, which this project's
    // "never offer a button for an action that would no-op" convention
    // requires it not to be.
    expect(await sceneHasText(page, 'Loadout', 'SLOTS FULL')).toBe(true);
    await clickLockedEntryAndConfirmInert(page, 'Loadout', 'FUEL TANK', 'SLOTS FULL');

    const storedAfterEquip = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as StoredEquipmentProgress | null,
      EQUIPMENT_PROGRESS_STORAGE_KEY,
    );
    expect(storedAfterEquip?.equippedItemIds).toEqual(
      expect.arrayContaining(['pulse-cannon', 'repair-kit', 'thrust-booster']),
    );
    expect(storedAfterEquip?.equippedItemIds).toHaveLength(3);

    // Survives a real full-page reload -- a genuine UI-driven
    // write -> reload -> re-render round trip, not just an in-session check.
    await page.reload();
    await waitForBooted(page);
    await openLoadoutFromMenu(page);
    await waitForSceneText(page, 'Loadout', 'PULSE CANNON (EQUIPPED)', SCENE_TRANSITION_TIMEOUT_MS);
    expect(await sceneHasText(page, 'Loadout', 'REPAIR KIT (EQUIPPED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'THRUST BOOSTER (EQUIPPED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'FALCON · SLOTS 3/3 · MASS 45/150 MU')).toBe(true);
    expect(
      await sceneHasText(page, 'Loadout', 'UPGRADES OWNED: STRONGER ENGINES, EXTENDED FUEL CELLS'),
    ).toBe(true);

    // Unequipping (REPAIR KIT (EQUIPPED) is a real button, per LoadoutScene's
    // own branch for an owned+equipped item) frees a slot, moves the usage
    // line, and that removal also survives a reload.
    await clickButton(page, 'Loadout', 'REPAIR KIT (EQUIPPED)');
    await waitForSceneText(
      page,
      'Loadout',
      'FALCON · SLOTS 2/3 · MASS 35/150 MU',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    await expect(findButtonPosition(page, 'Loadout', 'REPAIR KIT')).resolves.toBeDefined();

    await page.reload();
    await waitForBooted(page);
    await openLoadoutFromMenu(page);
    await waitForSceneText(
      page,
      'Loadout',
      'FALCON · SLOTS 2/3 · MASS 35/150 MU',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await sceneHasText(page, 'Loadout', 'PULSE CANNON (EQUIPPED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'THRUST BOOSTER (EQUIPPED)')).toBe(true);
    expect(await sceneHasText(page, 'Loadout', 'REPAIR KIT (EQUIPPED)')).toBe(false);

    const storedAfterUnequip = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as StoredEquipmentProgress | null,
      EQUIPMENT_PROGRESS_STORAGE_KEY,
    );
    expect(storedAfterUnequip?.equippedItemIds).toEqual(
      expect.arrayContaining(['pulse-cannon', 'thrust-booster']),
    );
    expect(storedAfterUnequip?.equippedItemIds).toHaveLength(2);
  });
});

test.describe('loadout: in-flight cycle and trigger', () => {
  // Scene/Phaser glue, not unit-testable elsewhere (GameScene.update()'s
  // Q/E/Space/F handling is the one place this mechanic actually runs) --
  // matches landing.spec.ts's own generous "real physics timing under
  // parallel test-worker contention" reasoning, this test's own sequence
  // (boot, reload, menu nav, a real 1s thrust hold, several data-manager
  // reads) comfortably fits inside the same 60000ms ceiling store.spec.ts's
  // reload-heavy tests already use.
  const FLIGHT_TEST_TIMEOUT_MS = 60000;
  // How long to hold the real thrust key to burn a measurable, non-zero
  // amount of fuel before triggering the repair kit -- Falcon's burnRate
  // (18 fuel/s) over ~1 real second burns ~18 of its 100 base fuel, safely
  // under the Repair Kit's own 25-fuel restore (equipment/equipment.ts),
  // so the post-trigger read is expected to fully clamp back to 100%
  // fuel, not just partially recover -- see the assertion below for why
  // this is checked as "increased" rather than "returned to exactly 100"
  // (real per-frame delta timing under sandbox contention could burn a bit
  // more or less than the ideal 18).
  const THRUST_HOLD_MS = 1000;

  type EquipmentDataKey = 'activeUtilityId' | 'lastTriggeredUtilityId';

  /** Reads one of GameScene's Milestone-9 data-manager keys.
   * `Phaser.Data.DataManager#get` is untyped (`any`) by design -- this cast
   * to the known id-or-null shape is the one deliberate escape hatch for
   * that, matching landing.spec.ts's identical `outcome` cast. */
  async function readEquipmentDataKey(
    page: Page,
    key: EquipmentDataKey,
  ): Promise<string | null | undefined> {
    return page.evaluate(
      (key) =>
        window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get(key) as
          string | null | undefined,
      key,
    );
  }

  /** Waits until a data-manager key genuinely reflects `expected` -- proves
   * `GameScene.update()`'s `JustDown` handling for that key's input has
   * actually run, the same "poll, don't assume a single synchronous read
   * lands after the state change" discipline `waitForSceneText`/
   * `waitForActiveScene` already use elsewhere in this suite, rather than
   * racing a bare read against `tapKey`'s own async key-down/wait/key-up
   * sequence. */
  async function waitForEquipmentDataKey(
    page: Page,
    key: EquipmentDataKey,
    expected: string,
    timeoutMs: number,
  ): Promise<void> {
    await page.waitForFunction(
      ({ key, expected }) =>
        window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get(key) === expected,
      { key, expected },
      { timeout: timeoutMs },
    );
  }

  /** Reads the flying HUD's own "FUEL: <n>%" text directly off the real
   * rendered `Text` object (same `children.list` technique
   * `sceneHasText`/`findButtonPosition` already use) -- this is the one
   * place a Repair Kit's actual in-flight effect (not just the
   * `lastTriggeredUtilityId` event marker) is observable at all, since
   * `FlightState`'s own fuel value has no data-manager key exposed. */
  async function readFuelPercent(page: Page): Promise<number> {
    const text = await page.evaluate(() => {
      const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game');
      const fuelText = scene?.children.list
        .map((child) => child as unknown as { text?: string })
        .find((child) => child.text?.startsWith('FUEL:'));
      return fuelText?.text;
    });
    if (text === undefined) {
      throw new Error('FUEL HUD text not found in Game scene.');
    }
    const match = /^FUEL: (\d+)%$/.exec(text);
    if (!match?.[1]) {
      throw new Error(`Unexpected FUEL HUD text format: "${text}"`);
    }
    return Number(match[1]);
  }

  test('E cycles the active utility item, F triggers it, and a repair-kit trigger measurably restores fuel', async ({
    page,
  }) => {
    test.setTimeout(FLIGHT_TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);

    // Own (not equip via LoadoutScene -- GameScene.init() reads
    // equippedItemIds straight from persisted state) two utility items so
    // E actually has something to cycle between: Repair Kit (the
    // active-use effect this test measures) and Thrust Booster (the other
    // active-use effect, giving cycling a real second stop instead of a
    // trivial one-item wrap). Both are purchase-type and comfortably fit
    // Falcon's 3-slot/150-mass budget (25 MU combined) -- the same pairing
    // already exercised, un-equipped, by the persistence test above.
    await seedOwnedEquipment(page, ['repair-kit', 'thrust-booster'], {
      equippedItemIds: ['repair-kit', 'thrust-booster'],
    });
    await page.reload();
    await waitForBooted(page);

    await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
    await tapKey(page, 'Enter');
    await waitForActiveScene(page, 'Game', BOOT_TIMEOUT_MS);

    // Nothing has been cycled yet this flight -- activeUtilityId starts
    // null (equip order alone doesn't imply an active selection; only a
    // real cycle input does, per cycleActiveItem's own doc comment).
    expect(await readEquipmentDataKey(page, 'activeUtilityId')).toBeNull();

    // First E: null -> the first equipped utility id (repair-kit, per
    // equipItemIds' own order).
    await tapKey(page, 'E');
    await waitForEquipmentDataKey(
      page,
      'activeUtilityId',
      'repair-kit',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await readEquipmentDataKey(page, 'activeUtilityId')).toBe('repair-kit');

    // Second E: advances to the other equipped utility item.
    await tapKey(page, 'E');
    await waitForEquipmentDataKey(
      page,
      'activeUtilityId',
      'thrust-booster',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await readEquipmentDataKey(page, 'activeUtilityId')).toBe('thrust-booster');

    // Third E: wraps back around to the first -- proves this is a real
    // cycle, not a one-shot advance.
    await tapKey(page, 'E');
    await waitForEquipmentDataKey(
      page,
      'activeUtilityId',
      'repair-kit',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await readEquipmentDataKey(page, 'activeUtilityId')).toBe('repair-kit');

    // Burn a real, measurable amount of fuel via the real thrust key
    // before triggering the repair kit -- fuel starts at 100% (full
    // effectiveFuelCapacity), so triggering immediately would clamp to an
    // already-full tank and prove nothing.
    const fuelBeforeBurn = await readFuelPercent(page);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(THRUST_HOLD_MS);
    await page.keyboard.up('ArrowUp');
    const fuelAfterBurn = await readFuelPercent(page);
    expect(fuelAfterBurn).toBeLessThan(fuelBeforeBurn);

    // F triggers whichever utility item is currently active (repair-kit,
    // per the third E press above) -- confirm both the event marker and
    // the actual measurable fuel effect.
    await tapKey(page, 'F');
    await waitForEquipmentDataKey(
      page,
      'lastTriggeredUtilityId',
      'repair-kit',
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await readEquipmentDataKey(page, 'lastTriggeredUtilityId')).toBe('repair-kit');
    const fuelAfterRepair = await readFuelPercent(page);
    expect(fuelAfterRepair).toBeGreaterThan(fuelAfterBurn);

    // Sanity: gravity alone (Kessel's Reach, free flight's default world)
    // takes several real seconds longer than this whole sequence to bring
    // the lander into ground contact (see landing.spec.ts's own generous
    // ground-contact timeouts) -- confirm the flight was still genuinely
    // in progress the entire time these reads happened, not landed/crashed
    // partway through with stale data-manager values left over from the
    // last frame that actually ran.
    const outcome = await page.evaluate(
      () =>
        window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').data.get('outcome') as
          'flying' | 'landed' | 'crashed' | undefined,
    );
    expect(outcome).toBe('flying');
  });
});
