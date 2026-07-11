import { expect, test, type Page } from '@playwright/test';
import { tapKey, waitForActiveScene } from './test-helpers';

// Generous: covers both real page/module-load time and the post-Enter
// scene-transition wait, which depends on a synthetic keypress landing
// correctly under whatever parallel test-worker contention is happening —
// observed flaky at 5000ms under this suite's full 24-test parallel run.
const BOOT_TIMEOUT_MS = 10000;

// Mirrors src/game/constants.ts's GAME_WIDTH/WORLD_WIDTH (960, and
// GAME_WIDTH * a 3x multiplier) and its scene z-order depth / parallax
// scroll-factor constants — duplicated here deliberately, the same black-
// box-testing style game-boot.spec.ts already uses for GAME_WIDTH/
// GAME_HEIGHT, rather than importing src/game/constants into an e2e spec.
const GAME_WIDTH = 960;
const WORLD_WIDTH = 2880;
// Milestone 14 renumbered the depth planes to make room for the two cloud
// layers (band behind the far ridge, puffs in front of the mid ridge).
// The cloud planes themselves only exist on worlds with an atmosphere —
// this spec's free flight runs on the airless default world, so only the
// always-present planes are asserted non-empty below; the cloud factors
// still participate in the monotonicity chain.
const SKY_LAYER_DEPTH = -5;
const FAR_RIDGE_LAYER_DEPTH = -3;
const MID_RIDGE_LAYER_DEPTH = -2;
const HUD_LAYER_DEPTH = 2;
const SKY_SCROLL_FACTOR = 0.05;
const CLOUD_BAND_SCROLL_FACTOR = 0.12;
const FAR_RIDGE_SCROLL_FACTOR = 0.2;
const MID_RIDGE_SCROLL_FACTOR = 0.5;
const CLOUD_PUFF_SCROLL_FACTOR = 0.7;
const DEFAULT_SCROLL_FACTOR = 1;

async function bootGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });
  // Boots into MenuScene now (Milestone 3) — Enter starts a fresh flight.
  await tapKey(page, 'Enter');
  await waitForActiveScene(page, 'Game', BOOT_TIMEOUT_MS);
}

/** Phaser's generic GameObject type doesn't declare `depth`/scrollFactorX/Y
 * itself (mixed into concrete subclasses like Text/Image/Graphics
 * individually) — read back via the same kind of deliberate escape-hatch
 * cast landing.spec.ts already uses for DataManager#get, which is untyped
 * (any) by design. */
async function scrollFactorsAtDepth(page: Page, depth: number): Promise<number[]> {
  const factors = await page.evaluate((d: number) => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game');
    return scene?.children.list
      .map((child) => child as unknown as { depth: number; scrollFactorX: number })
      .filter((child) => child.depth === d)
      .map((child) => child.scrollFactorX);
  }, depth);
  return factors ?? [];
}

test('camera is bounded to and centered within the wider world, and terrain spans it (Milestone 2.5)', async ({
  page,
}) => {
  await bootGame(page);

  // Deterministic, not timing-dependent: the lander spawns at the world's
  // horizontal center (LANDER_START_X = WORLD_WIDTH / 2), and
  // Camera#startFollow with no lerp snaps to center on it immediately, on
  // the very first frame — before any simulated flight. This directly
  // proves both setBounds(WORLD_WIDTH, ...) and startFollow(lander) are
  // wired correctly, without needing to simulate real keyboard-driven
  // acceleration and wait for it to accumulate (which proved flaky under
  // parallel test-worker contention — Chromium and Firefox each failed a
  // run of that approach at different times, pointing to environmental
  // dt variance under load, not a logic bug).
  const cameraState = await page.evaluate(() => {
    const camera = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game').cameras.main;
    if (!camera) {
      return undefined;
    }
    const bounds = camera.getBounds();
    return {
      scrollX: camera.scrollX,
      boundsX: bounds.x,
      boundsY: bounds.y,
      boundsWidth: bounds.width,
      boundsHeight: bounds.height,
    };
  });

  expect(cameraState).toBeDefined();
  expect(cameraState?.boundsX).toBe(0);
  expect(cameraState?.boundsY).toBe(0);
  expect(cameraState?.boundsWidth).toBe(WORLD_WIDTH);
  expect(cameraState?.scrollX).toBeCloseTo(WORLD_WIDTH / 2 - GAME_WIDTH / 2, 0);

  // Guards against a WORLD_WIDTH -> GAME_WIDTH regression in
  // generateTerrain's own width argument specifically (a distinct call
  // site from the camera bounds above, and from FlightState, which no
  // longer takes a worldWidth at all since horizontal wraparound was
  // removed — see flight-state.ts/lander-physics.ts's history in PLAN.md
  // §4/Milestone 2.5): the generated terrain's last point must reach the
  // true world edge, not stop at one screen width.
  const terrainRightEdgeX = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      terrain?: { points: { x: number }[] };
    };
    const points = scene.terrain?.points ?? [];
    return points.at(-1)?.x;
  });
  expect(terrainRightEdgeX).toBe(WORLD_WIDTH);
});

test('every background parallax layer scrolls at its configured depth-plane speed (Milestone 2.5)', async ({
  page,
}) => {
  await bootGame(page);

  // Each depth plane's own scroll factor, gameplay-layer default (1,
  // unmodified) included as a sanity check that the depth-based lookup
  // itself works (nothing is misfiled under the wrong depth).
  const sky = await scrollFactorsAtDepth(page, SKY_LAYER_DEPTH);
  const farRidge = await scrollFactorsAtDepth(page, FAR_RIDGE_LAYER_DEPTH);
  const midRidge = await scrollFactorsAtDepth(page, MID_RIDGE_LAYER_DEPTH);

  expect(sky.length).toBeGreaterThan(0);
  expect(farRidge.length).toBeGreaterThan(0);
  expect(midRidge.length).toBeGreaterThan(0);
  for (const factor of sky) {
    expect(factor).toBe(SKY_SCROLL_FACTOR);
  }
  for (const factor of farRidge) {
    expect(factor).toBe(FAR_RIDGE_SCROLL_FACTOR);
  }
  for (const factor of midRidge) {
    expect(factor).toBe(MID_RIDGE_SCROLL_FACTOR);
  }
  // Each plane's factor must actually increase with proximity — catches a
  // copy/paste slip swapping two layers' scroll-factor constants even if
  // each individually matched some *other* real constant. The cloud
  // planes' factors join the chain here even though this airless-world
  // flight renders no cloud objects to sample.
  expect(SKY_SCROLL_FACTOR).toBeLessThan(CLOUD_BAND_SCROLL_FACTOR);
  expect(CLOUD_BAND_SCROLL_FACTOR).toBeLessThan(FAR_RIDGE_SCROLL_FACTOR);
  expect(FAR_RIDGE_SCROLL_FACTOR).toBeLessThan(MID_RIDGE_SCROLL_FACTOR);
  expect(MID_RIDGE_SCROLL_FACTOR).toBeLessThan(CLOUD_PUFF_SCROLL_FACTOR);
  expect(CLOUD_PUFF_SCROLL_FACTOR).toBeLessThan(DEFAULT_SCROLL_FACTOR);
});

test('HUD stays screen-fixed regardless of camera position (Milestone 2.5)', async ({ page }) => {
  await bootGame(page);

  const hud = await scrollFactorsAtDepth(page, HUD_LAYER_DEPTH);
  expect(hud.length).toBeGreaterThan(0);
  for (const factor of hud) {
    expect(factor).toBe(0);
  }
});

test('camera continuously tracks the lander during flight, with no lag or deadzone (Milestone 2.5)', async ({
  page,
}) => {
  await bootGame(page);

  // Tilt right briefly, then hold thrust only (no further rotation) so the
  // lander drifts in one direction. Deliberately NOT gated on reaching a
  // specific scrollX delta within a timeout (that approach proved flaky
  // under parallel test-worker contention during development). Instead,
  // after a fixed wait, check the invariant that must hold at ANY moment
  // if the camera has zero lerp lag and no deadzone: scrollX is exactly
  // derived from the lander's current world position, clamped to the
  // camera's own bounds — true regardless of exactly how far the ship
  // actually got in the fixed wait, so it isn't sensitive to timing
  // variance the way a "wait until X" threshold is.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowUp');

  const state = await page.evaluate(() => {
    const scene = window.__ORBITAL_DESCENT_GAME__?.scene.getScene('Game') as unknown as {
      cameras: { main: { scrollX: number } };
      lander?: { container: { x: number } };
    };
    return { scrollX: scene.cameras.main.scrollX, landerX: scene.lander?.container.x };
  });

  expect(state.landerX).toBeDefined();
  const landerX = state.landerX ?? 0;
  const maxScrollX = WORLD_WIDTH - GAME_WIDTH;
  const expectedScrollX = Math.min(Math.max(landerX - GAME_WIDTH / 2, 0), maxScrollX);
  expect(state.scrollX).toBeCloseTo(expectedScrollX, 0);
  // Sanity check that the scenario actually moved the ship at all — a
  // camera frozen at its boot position would otherwise trivially satisfy
  // the invariant above (landerX unchanged, scrollX unchanged, still
  // "consistent" with each other).
  expect(landerX).not.toBe(WORLD_WIDTH / 2);
});
