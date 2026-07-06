import { expect, test } from '@playwright/test';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;
const BOOT_TIMEOUT_MS = 5000;

test('boots Phaser, renders the canvas at the configured size, and reaches GameScene with no console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('/');

  await page.waitForFunction(() => window.__ORBITAL_DESCENT_GAME__?.isBooted === true, {
    timeout: BOOT_TIMEOUT_MS,
  });

  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width', String(GAME_WIDTH));
  await expect(canvas).toHaveAttribute('height', String(GAME_HEIGHT));

  const activeSceneKey = await page.evaluate(() => {
    const game = window.__ORBITAL_DESCENT_GAME__;
    return game?.scene.getScenes(true).at(0)?.scene.key ?? null;
  });
  expect(activeSceneKey).toBe('Game');

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
