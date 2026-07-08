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
// Multiple full boot+reload passes plus store navigation and a purchase --
// no real-time flight in this test, so this stays in line with this
// suite's "menu/UI-only" tests (e.g. ship-select.spec.ts's own ceiling),
// not its physics-timing ones.
const TEST_TIMEOUT_MS = 60000;

// Mirrors src/game/persistence/currency-progress.ts's CURRENCY_STORAGE_KEY
// and src/game/persistence/ship-progress.ts's SHIP_PROGRESS_STORAGE_KEY --
// duplicated here deliberately, this suite's established black-box-testing
// convention (see world-map.spec.ts's own comment for why: real e2e
// coverage of the actual browser Storage API, not a re-import of the app's
// own internals).
const CURRENCY_STORAGE_KEY = 'orbital-descent:currency:v1';
const SHIP_PROGRESS_STORAGE_KEY = 'orbital-descent:ship-progress:v1';

// Vanguard's real price (economy/store.ts's shipListings, ships/ships.ts) --
// duplicated as a literal for the same black-box reason as the storage
// keys above: this test should catch a real regression in either number,
// not silently track whichever value the source currently happens to have.
const VANGUARD_PRICE_CREDITS = 750;

async function waitForBooted(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
}

async function seedCurrencyBalance(page: Page, balance: number): Promise<void> {
  await page.evaluate(
    ({ key, balance }) => {
      localStorage.setItem(key, JSON.stringify({ balance }));
    },
    { key: CURRENCY_STORAGE_KEY, balance },
  );
}

async function openStoreFromMenu(page: Page): Promise<void> {
  await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);
  await clickButton(page, 'Menu', 'STORE');
  await waitForActiveScene(page, 'Store', SCENE_TRANSITION_TIMEOUT_MS);
}

test.describe('store: purchase gating', () => {
  test('a locked listing is inert below price, becomes buyable above it, and the purchase survives a real reload', async ({
    page,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);

    // Seed a LOW (0) balance explicitly -- a fresh save already starts at
    // 0, but seeding it directly keeps this test's own precondition
    // explicit rather than relying on that being true incidentally.
    await seedCurrencyBalance(page, 0);
    await page.reload();
    await waitForBooted(page);
    await openStoreFromMenu(page);

    await waitForSceneText(page, 'Store', 'VANGUARD', SCENE_TRANSITION_TIMEOUT_MS);
    expect(await sceneHasText(page, 'Store', 'BALANCE: 0 CREDITS')).toBe(true);
    expect(await sceneHasText(page, 'Store', 'VANGUARD (LOCKED)')).toBe(true);
    expect(
      await sceneHasText(page, 'Store', `PRICE: ${VANGUARD_PRICE_CREDITS.toString()} CREDITS`),
    ).toBe(true);

    // A real click landing on the locked entry's own on-screen position
    // must be a genuine no-op: no balance deducted, nothing marked owned --
    // same no-op-confirmation technique world-map.spec.ts/ship-select.spec.ts
    // already use for their own locked entries, reused as-is here.
    await clickLockedEntryAndConfirmInert(page, 'Store', 'VANGUARD (LOCKED)', 'BALANCE: 0 CREDITS');

    // Get to a sufficient balance and confirm the listing is now a real,
    // clickable button (not just visually different).
    await seedCurrencyBalance(page, 1000);
    await page.reload();
    await waitForBooted(page);
    await openStoreFromMenu(page);
    await waitForSceneText(page, 'Store', 'BALANCE: 1000 CREDITS', SCENE_TRANSITION_TIMEOUT_MS);
    await expect(findButtonPosition(page, 'Store', 'VANGUARD')).resolves.toBeDefined();

    await clickButton(page, 'Store', 'VANGUARD');

    const expectedBalanceAfterPurchase = 1000 - VANGUARD_PRICE_CREDITS;
    await waitForSceneText(
      page,
      'Store',
      `BALANCE: ${expectedBalanceAfterPurchase.toString()} CREDITS`,
      SCENE_TRANSITION_TIMEOUT_MS,
    );
    expect(await sceneHasText(page, 'Store', 'VANGUARD (OWNED)')).toBe(true);

    // Survives a real full-page reload -- a genuine UI-driven
    // write -> reload -> re-render round trip, not just an in-session check.
    await page.reload();
    await waitForBooted(page);
    await openStoreFromMenu(page);
    await waitForSceneText(page, 'Store', 'VANGUARD (OWNED)', SCENE_TRANSITION_TIMEOUT_MS);
    expect(
      await sceneHasText(
        page,
        'Store',
        `BALANCE: ${expectedBalanceAfterPurchase.toString()} CREDITS`,
      ),
    ).toBe(true);

    const storedCurrency = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as { balance?: number } | null,
      CURRENCY_STORAGE_KEY,
    );
    expect(storedCurrency?.balance).toBe(expectedBalanceAfterPurchase);

    const storedShipProgress = await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key) ?? 'null') as {
          selectedShipId?: string;
          purchasedShipIds?: string[];
        } | null,
      SHIP_PROGRESS_STORAGE_KEY,
    );
    expect(storedShipProgress?.purchasedShipIds).toContain('vanguard');
    // Buying doesn't equip -- selectedShipId is untouched by the purchase.
    expect(storedShipProgress?.selectedShipId).not.toBe('vanguard');

    // BACK returns to Menu -- same on-screen button as every other scene.
    await clickButton(page, 'Store', 'BACK');
    await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);

    // ESC is BACK's keyboard equivalent (ArmedKeyGuard, same pattern as
    // ShipSelectScene/WorldMapScene) -- re-enter Store and confirm the key
    // path returns to Menu too, not just the on-screen BACK button.
    await openStoreFromMenu(page);
    await tapKey(page, 'Escape');
    await waitForActiveScene(page, 'Menu', SCENE_TRANSITION_TIMEOUT_MS);
  });
});

test.describe('store: currency crediting on a real landing', () => {
  // Free-flight technique itself ("let gravity bring the ship down, real
  // time, no piloting") matches landing.spec.ts's own -- reused as-is here
  // rather than inventing a precision-piloted maneuver to a specific
  // curated base. GameScene's currency-crediting code (see game-scene.ts)
  // runs identically regardless of free flight vs. a curated base, so a
  // free flight exercises the exact same code path with far fewer moving
  // parts: no navigation, no base-specific terrain dependency, no piloting
  // precision requirement at all -- gravity alone decides landed vs.
  // crashed, and this test asserts the right thing for either outcome,
  // rather than requiring one specific outcome to occur.
  //
  // Timeouts widened past landing.spec.ts's own ceiling (25000/60000),
  // matching high-scores.spec.ts's identical widening and identical
  // reasoning: this file has two sibling tests of its own (the reload-heavy
  // purchase-gating test above, the menu-display test below) sharing the
  // same worker pool, on top of the full e2e suite's contention --
  // landing.spec.ts is the sole test in its own file, so it never carries
  // that extra load. A real run during this fix reproduced this exact test
  // completing in 45-53s against the old 60000ms ceiling -- real margin,
  // not hypothetical.
  const GROUND_CONTACT_TIMEOUT_MS = 35000;
  const FLIGHT_TEST_TIMEOUT_MS = 90000;

  test('a real flight credits currency exactly matching the landing score on a safe landing, and leaves the balance untouched on a crash', async ({
    page,
  }) => {
    test.setTimeout(FLIGHT_TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);
    // Fresh save: currency starts at 0 (untouched -- this is exactly what
    // makes "credited == score" unambiguous below).

    // Boots into MenuScene -- Enter starts a fresh free flight (same
    // trigger landing.spec.ts uses).
    await tapKey(page, 'Enter');
    await waitForActiveScene(page, 'Game', BOOT_TIMEOUT_MS);

    // No input at all: gravity alone eventually brings the ship down,
    // landed or crashed -- outcome read from the scene's data manager, the
    // same public, intentional escape hatch landing.spec.ts/
    // high-scores.spec.ts already use.
    await page.waitForFunction(
      () => {
        const outcome = window.__ORBITAL_DESCENT_GAME__?.scene
          .getScene('Game')
          .data.get('outcome') as 'flying' | 'landed' | 'crashed' | undefined;
        return outcome === 'landed' || outcome === 'crashed';
      },
      { timeout: GROUND_CONTACT_TIMEOUT_MS },
    );

    const { outcome, score } = await page.evaluate(() => {
      const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game');
      return {
        outcome: scene?.data.get('outcome') as 'landed' | 'crashed' | undefined,
        score: scene?.data.get('score') as number | undefined,
      };
    });

    const storedCurrency = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as { balance?: number } | null,
      CURRENCY_STORAGE_KEY,
    );

    if (outcome === 'landed') {
      expect(score).toBeDefined();
      expect(storedCurrency?.balance).toBe(score);
    } else {
      // A crash never scores (Decision D8) and, per game-scene.ts, never
      // reaches the currency-crediting code at all -- the key may not even
      // have been written yet on a fresh save, hence the ?? 0.
      expect(outcome).toBe('crashed');
      expect(storedCurrency?.balance ?? 0).toBe(0);
    }
  });
});

test.describe('store: menu credits display', () => {
  test('MenuScene shows a seeded currency balance on load', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await page.goto('/');
    await waitForBooted(page);

    await seedCurrencyBalance(page, 1234);
    await page.reload();
    await waitForBooted(page);
    await waitForActiveScene(page, 'Menu', BOOT_TIMEOUT_MS);

    expect(await sceneHasText(page, 'Menu', 'BALANCE: 1234 CREDITS')).toBe(true);
  });
});
