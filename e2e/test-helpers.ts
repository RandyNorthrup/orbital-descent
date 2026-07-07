import type { Page } from '@playwright/test';

const TAP_HOLD_MS = 50;

/**
 * Presses and releases a key with a real gap in between, instead of
 * Playwright's `keyboard.press()`. Phaser's `Key#onUp` handler clears its
 * internal `_justDown` flag, so a down+up pair landing within the same
 * frame gap (which `press()` can produce) loses the rising edge
 * `JustDown()` checks for entirely — confirmed directly: an isolated
 * repro of `press('Escape')` against a real running scene failed to
 * register ~90% of the time, while this down-wait-up sequence succeeded
 * 10/10 in the same repro. Real human key presses always span multiple
 * frames (reaction time is far longer than one frame), so this is purely
 * a synthetic-input testing concern, not a gameplay bug.
 */
export async function tapKey(page: Page, key: string): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(TAP_HOLD_MS);
  await page.keyboard.up(key);
}

/** Waits until the named scene is among the game's currently active
 * (non-paused, non-sleeping) scenes. */
export async function waitForActiveScene(
  page: Page,
  sceneKey: string,
  timeoutMs: number,
): Promise<void> {
  await page.waitForFunction(
    (key) =>
      window.__ORBITAL_DESCENT_GAME__?.scene.getScenes(true).some((s) => s.scene.key === key),
    sceneKey,
    { timeout: timeoutMs },
  );
}

/**
 * Finds a createUiButton-produced Text object's on-screen center by its
 * exact label, so tests can genuinely click it (real pointerdown, the
 * same path a player uses) instead of only ever exercising a button's
 * keyboard-shortcut equivalent. Phaser's generic GameObject type doesn't
 * declare `text`/`x`/`y` itself (mixed into the concrete Text subclass) —
 * same deliberate escape-hatch cast pattern used elsewhere in this suite.
 */
export async function findButtonPosition(
  page: Page,
  sceneKey: string,
  label: string,
): Promise<{ x: number; y: number }> {
  const position = await page.evaluate(
    ({ key, buttonLabel }) => {
      const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene(key);
      const button = scene?.children.list
        .map((child) => child as unknown as { text?: string; x: number; y: number })
        .find((child) => child.text === buttonLabel);
      return button ? { x: button.x, y: button.y } : undefined;
    },
    { key: sceneKey, buttonLabel: label },
  );
  if (!position) {
    throw new Error(`Button labeled "${label}" not found in scene "${sceneKey}".`);
  }
  return position;
}

/**
 * Clicks a createUiButton-produced button by its exact label — a real
 * mouse click at the button's actual position.
 *
 * Deliberately clicks relative to the `#app canvas` element (via
 * Playwright's `locator.click({ position })`, which resolves against the
 * element's own bounding box) rather than `page.mouse.click(x, y)` against
 * raw page coordinates. The game canvas is a fixed 960x640 centered inside
 * the real browser viewport (1280x720 for every Playwright device preset
 * this project uses, per style.css's `body { display: flex; align-items:
 * center; justify-content: center; }`), so canvas-local coordinates (what
 * findButtonPosition returns, straight from each Text object's own x/y)
 * are offset from page coordinates by the centering gap — confirmed
 * directly: `page.mouse.click` against these same coordinates failed to
 * hit any button 3/3 browsers, 100% reproducible, until switched to a
 * canvas-relative click.
 */
export async function clickButton(page: Page, sceneKey: string, label: string): Promise<void> {
  const { x, y } = await findButtonPosition(page, sceneKey, label);
  await page.locator('#app canvas').click({ position: { x, y } });
}
