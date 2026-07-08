import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import type { Base, BaseDifficultyProfile, BaseProgress } from '../bases/base';
import { BASES, findBodyById } from '../bases/bases';
import {
  initialBaseProgress,
  loadBaseProgress,
  type BaseProgressMap,
} from '../persistence/base-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import type { GameSceneData } from './game-scene';
import { SCENE_KEY_GAME, SCENE_KEY_MENU, SCENE_KEY_WORLD_MAP } from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.12;
const LIST_START_Y_FRACTION = 0.28;
const BACK_BUTTON_Y_FRACTION = 0.85;

/** One list entry's worth of vertical space, matching every other scene's
 * stacked-button rhythm (see `UI_BUTTON_ROW_HEIGHT_PX`'s own doc comment). */
const ROW_HEIGHT_PX = UI_BUTTON_ROW_HEIGHT_PX;

/** Extra vertical room below each base's own name/button for its
 * difficulty-badge line, shown separately underneath rather than appended
 * to the clickable label itself — keeps each button's own label a stable,
 * tuning-number-independent click target (e2e tests match buttons by
 * exact label text; embedding a computed difficulty score in that same
 * string would silently break their click targeting on every rebalance). */
const BADGE_LINE_OFFSET_PX = 24;
const BASE_ROW_HEIGHT_PX = ROW_HEIGHT_PX + BADGE_LINE_OFFSET_PX;

/** Vertical gap between the last base row's difficulty-badge line and the
 * axis-legend caption below it (see `AXIS_LEGEND_TEXT`) — sized off the
 * actual base count rather than a fixed fraction so it can't collide with a
 * longer list once D20's up-to-3-bases-per-world content lands. */
const AXIS_LEGEND_GAP_PX = 40;

/** Plain-language expansion of the "MECH"/"NAV" abbreviations in
 * `formatDifficultyBadge`'s output — the badge itself stays terse
 * (`formatDifficultyBadge`'s own doc comment explains why), so this caption
 * is the one place a first-time player can learn what the letters mean
 * without reading source. */
const AXIS_LEGEND_TEXT = 'MECH = mechanical/hazard demand  ·  NAV = terrain-precision demand';

/**
 * Which "screen" of the world map is showing. A discriminated union (not
 * two separate optional fields) so `mode === 'bases'` narrows `worldId` to
 * a real `string` directly — no null check or non-null assertion needed
 * to read it (this project's eslint config disallows the latter).
 */
type ViewState = { readonly mode: 'worlds' } | { readonly mode: 'bases'; readonly worldId: string };

/**
 * The world-select / base-select screen (Milestone 6, Decision D17):
 * discovered worlds/bases are selectable, locked ones are visible but not
 * — reading unlock state from Milestone 4's validated-`localStorage`
 * pattern (via `persistence/base-progress.ts`). Selecting a reachable
 * base is this project's first real caller of `GameSceneData.base`
 * (Milestone 5 built the plumbing; nothing before this scene ever passed
 * one).
 */
export class WorldMapScene extends Phaser.Scene {
  private progress!: BaseProgressMap;
  private view: ViewState = { mode: 'worlds' };
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_WORLD_MAP);
  }

  create(): void {
    const keyboard = requireKeyboard(this);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.backGuard = new ArmedKeyGuard(this.keyEscape);

    // getSafeLocalStorage() returns null when storage access itself is
    // blocked (sandboxed iframe, privacy setting) -- the map still shows
    // every base's own authored starting state in that case, same as a
    // first-time player, rather than throwing.
    const storage = getSafeLocalStorage();
    this.progress =
      storage === null ? initialBaseProgress(BASES) : loadBaseProgress(storage, BASES);
    this.view = { mode: 'worlds' };
    this.renderView();
  }

  override update(): void {
    if (this.backGuard.consumeJustPressed()) {
      this.handleBack();
    }
  }

  private handleBack(): void {
    if (this.view.mode === 'bases') {
      this.view = { mode: 'worlds' };
      this.renderView();
    } else {
      this.scene.start(SCENE_KEY_MENU);
    }
  }

  private statusOf(base: Base): BaseProgress['status'] {
    return this.progress[base.id]?.status ?? base.status;
  }

  private worldIsReachable(worldId: string): boolean {
    return BASES.some((base) => base.worldId === worldId && this.statusOf(base) !== 'locked');
  }

  /** A world's bases, in base-list display order — the one place both
   * `renderWorldList` (to decide whether a world has a base-select screen
   * at all) and `renderBaseList` (to actually render it) read this list, so
   * the two can't silently drift into two different orderings. */
  private basesInWorld(worldId: string): readonly Base[] {
    return BASES.filter((base) => base.worldId === worldId).sort((a, b) => a.order - b.order);
  }

  /** Tracks a just-created display object so the next `renderView()` call
   * can destroy exactly this screen's objects before building the other
   * one -- Phaser scenes don't recycle their own display list, so
   * switching between the world-list and base-list "screens" within one
   * long-lived scene instance needs an explicit teardown, not a second
   * scene. */
  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.viewObjects.push(object);
    return object;
  }

  private renderView(): void {
    this.viewObjects.forEach((object) => {
      object.destroy();
    });
    this.viewObjects = [];

    if (this.view.mode === 'worlds') {
      this.renderWorldList();
    } else {
      this.renderBaseList(this.view.worldId);
    }
  }

  private renderWorldList(): void {
    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'WORLD MAP', {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    // BASES is already grouped by world in authoring order (Kessel's Reach's
    // two bases adjacent, etc.) -- a Set over that order preserves each
    // world's first-appearance position without a separate sort key.
    const worldIds = [...new Set(BASES.map((base) => base.worldId))];
    const listStartY = GAME_HEIGHT * LIST_START_Y_FRACTION;

    worldIds.forEach((worldId, index) => {
      const body = findBodyById(worldId);
      const y = listStartY + index * ROW_HEIGHT_PX;
      const label = body.name.toUpperCase();

      if (this.worldIsReachable(worldId)) {
        this.track(
          createUiButton(this, {
            x: GAME_WIDTH / 2,
            y,
            label,
            onClick: () => {
              // D17/PLAN.md's own Goal text: "worlds with more than one
              // landing base show base-select within that world" — a
              // single-base world (3 of today's 4) instead launches its one
              // base directly, skipping a base-select screen that would
              // only ever show one clickable row plus BACK.
              const basesForWorld = this.basesInWorld(worldId);
              const soleBase = basesForWorld.length === 1 ? basesForWorld[0] : undefined;
              if (soleBase !== undefined) {
                this.launchBase(soleBase);
                return;
              }
              this.view = { mode: 'bases', worldId };
              this.renderView();
            },
          }),
        );
      } else {
        this.track(
          this.add
            .text(GAME_WIDTH / 2, y, `${label} (LOCKED)`, {
              fontFamily: 'monospace',
              fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
              color: hexToCss(UI_MUTED_TEXT_COLOR),
            })
            .setOrigin(ORIGIN_CENTER),
        );
      }
    });

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * BACK_BUTTON_Y_FRACTION,
        label: 'BACK',
        onClick: () => {
          this.scene.start(SCENE_KEY_MENU);
        },
      }),
    );
  }

  private renderBaseList(worldId: string): void {
    const body = findBodyById(worldId);

    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, body.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    const basesInWorld = this.basesInWorld(worldId);
    const listStartY = GAME_HEIGHT * LIST_START_Y_FRACTION;

    basesInWorld.forEach((base, index) => {
      const status = this.statusOf(base);
      const y = listStartY + index * BASE_ROW_HEIGHT_PX;
      const name = base.name.toUpperCase();

      if (status === 'locked') {
        this.track(
          this.add
            .text(GAME_WIDTH / 2, y, `${name} (LOCKED)`, {
              fontFamily: 'monospace',
              fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
              color: hexToCss(UI_MUTED_TEXT_COLOR),
            })
            .setOrigin(ORIGIN_CENTER),
        );
      } else {
        this.track(
          createUiButton(this, {
            x: GAME_WIDTH / 2,
            y,
            label: status === 'established' ? `${name} (CLEARED)` : name,
            onClick: () => {
              this.launchBase(base);
            },
          }),
        );
      }

      this.track(
        this.add
          .text(GAME_WIDTH / 2, y + BADGE_LINE_OFFSET_PX, formatDifficultyBadge(base.difficulty), {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
    });

    const legendY =
      listStartY +
      (basesInWorld.length - 1) * BASE_ROW_HEIGHT_PX +
      BADGE_LINE_OFFSET_PX +
      AXIS_LEGEND_GAP_PX;
    this.track(
      this.add
        .text(GAME_WIDTH / 2, legendY, AXIS_LEGEND_TEXT, {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * BACK_BUTTON_Y_FRACTION,
        label: 'BACK',
        onClick: () => {
          this.view = { mode: 'worlds' };
          this.renderView();
        },
      }),
    );
  }

  private launchBase(base: Base): void {
    const data: GameSceneData = { base };
    this.scene.start(SCENE_KEY_GAME, data);
  }
}

/** "MECH 5 · NAV 3 (MECHANICAL)" — omits an axis entirely at 0 rather than
 * showing a misleadingly-precise "COMBAT 0" for every base today (combat
 * stays 0 until Milestone 11), per `BaseDifficultyProfile.axes`'s own doc
 * comment. */
function formatDifficultyBadge(difficulty: BaseDifficultyProfile): string {
  const axisParts: string[] = [];
  if (difficulty.axes.mechanical > 0) {
    axisParts.push(`MECH ${difficulty.axes.mechanical.toString()}`);
  }
  if (difficulty.axes.spatial > 0) {
    axisParts.push(`NAV ${difficulty.axes.spatial.toString()}`);
  }
  if (difficulty.axes.combat > 0) {
    axisParts.push(`COMBAT ${difficulty.axes.combat.toString()}`);
  }

  const dominantLabel = difficulty.dominant.toUpperCase();
  return axisParts.length > 0
    ? `${axisParts.join(' · ')} (${dominantLabel})`
    : `(${dominantLabel})`;
}
