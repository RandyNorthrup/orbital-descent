import type Phaser from 'phaser';

export {};

declare global {
  interface Window {
    /**
     * Exposes the booted Phaser game instance for the Playwright e2e smoke
     * test (e2e/game-boot.spec.ts) to inspect — canvas pixel content isn't
     * otherwise observable from outside Phaser. Assigned in src/main.ts.
     * Shared here (rather than inline in main.ts) so both the app
     * (tsconfig.app.json) and e2e (tsconfig.node.json) TS programs see it.
     */
    __LUNAR_LANDER_GAME__?: Phaser.Game;
  }
}
