import Phaser from 'phaser';
import {
  ACHIEVEMENT_TOAST_DEPTH,
  ACHIEVEMENT_TOAST_DISPLAY_MS,
  ACHIEVEMENT_TOAST_Y_FRACTION,
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BODY_FONT_SIZE_PX,
  UI_BUTTON_BG_COLOR,
  UI_BUTTON_FONT_SIZE_PX,
  UI_BUTTON_PADDING_X,
  UI_BUTTON_PADDING_Y,
  UI_BUTTON_ROW_HEIGHT_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
} from '../constants';
import type { Base, BaseDifficultyProfile, BaseProgress } from '../bases/base';
import { BASES, findBodyById } from '../bases/bases';
import {
  establishBase,
  initialBaseProgress,
  loadBaseProgress,
  resupplyBase,
  saveBaseProgress,
  type BaseProgressMap,
} from '../persistence/base-progress';
import {
  evaluateNewlyUnlockedAchievements,
  type AchievementDefinition,
} from '../achievements/achievements';
import {
  loadUnlockedAchievements,
  recordUnlockedAchievements,
} from '../persistence/achievement-progress';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { ACHIEVEMENT_UNLOCK_CUE } from '../audio/sfx-cues';
import { playSfxCue } from '../rendering/audio-player';
import { isAudioMuted } from '../persistence/audio-settings';
import { initialShipProgress, loadShipProgress } from '../persistence/ship-progress';
import {
  creditCurrency,
  loadCurrencyState,
  saveCurrencyState,
} from '../persistence/currency-progress';
import { scoreToCurrency } from '../economy/currency';
import {
  initialUpgradeProgress,
  loadUpgradeProgress,
  ownedUpgrades,
} from '../persistence/upgrade-progress';
import { initialEquipmentProgress, loadEquipmentProgress } from '../persistence/equipment-progress';
import { applyPermanentUpgrades, UPGRADES } from '../ships/upgrades';
import { EQUIPMENT_ITEMS, summarizePassiveEffects, totalCarriedMass } from '../equipment/equipment';
import { resolveEquippedItems } from '../equipment/loadout';
import { SHIPS, findShipById } from '../ships/ships';
import type { ShipClass } from '../ships/ship';
import type { CargoManifest, MinManifest } from '../missions/cargo';
import type { MissionDefinition, MissionState, MissionStatus } from '../missions/mission';
import { missionReward } from '../missions/reward';
import { relayFeasibility, transitDistanceTU } from '../missions/relay';
import {
  RELAY_ROUTES,
  buildMultiTripResupplyMission,
  buildRelayMission,
  buildSingleTripMission,
  deriveMissionFlavor,
  isRelaySelectable,
  type RelayRoute,
} from '../missions/mission-offers';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createUiButton } from '../rendering/ui-button';
import type { LoadoutMissionContext, LoadoutSceneData } from './loadout-scene';
import {
  SCENE_KEY_LOADOUT,
  SCENE_KEY_MENU,
  SCENE_KEY_TRANSIT,
  SCENE_KEY_WORLD_MAP,
} from './scene-keys';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const ORIGIN_CENTER = 0.5;
const TITLE_Y_FRACTION = 0.12;
const LIST_START_Y_FRACTION = 0.28;
const BACK_BUTTON_Y_FRACTION = 0.85;

/** Detail line / CONTINUE button positions for the active-mission and
 * concluded-mission screens (Milestone 9.5) — both are simple 3-element
 * screens (title, one detail line, one button), so fixed fractions are
 * enough without a running y cursor. */
const MISSION_DETAIL_Y_FRACTION = 0.32;
const MISSION_CONTINUE_BUTTON_Y_FRACTION = 0.45;

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

/** Milestone 9.5's mission-option rows reuse this equipment-row-style
 * "button/plain-text main line + one or more detail lines below" shape,
 * computed the same way `loadout-scene.ts`'s own row-height constants are
 * (each scene derives its own copy of this magnitude rather than importing
 * a sibling scene's private constant — matches this project's existing
 * per-file layout-constant convention, e.g. `ship-select-scene.ts`'s
 * `ROW_HEIGHT_PX` independently reproducing `UI_BUTTON_ROW_HEIGHT_PX`). */
const OPTION_BUTTON_HALF_HEIGHT_PX = UI_BUTTON_FONT_SIZE_PX / 2 + UI_BUTTON_PADDING_Y;
const OPTION_BODY_HALF_HEIGHT_PX = UI_BODY_FONT_SIZE_PX / 2;
const OPTION_DETAIL_LINE_GAP_PX = 6;
/** Offset from a button-main-line row's own y to its first detail line. */
const OPTION_BUTTON_DETAIL_OFFSET_PX =
  OPTION_BUTTON_HALF_HEIGHT_PX + OPTION_DETAIL_LINE_GAP_PX + OPTION_BODY_HALF_HEIGHT_PX;
/** Offset from a plain-text-main-line row's own y to its first detail line
 * — shorter than the button variant since a plain-text label is itself
 * `UI_BODY_FONT_SIZE_PX` (not the taller button font). */
const OPTION_TEXT_DETAIL_OFFSET_PX = OPTION_BODY_HALF_HEIGHT_PX * 2 + OPTION_DETAIL_LINE_GAP_PX;
/** Vertical step between a row's own successive detail lines — an
 * infeasible relay option can show up to three independent gate reasons
 * (PLAN.md §9.5.6: "a relay may fail on cargo capacity alone, fuel range
 * alone, both, or neither") stacked one per line rather than joined into a
 * single potentially very wide string (this project's most common real
 * layout bug, per Milestones 8/9's own certification notes, is exactly
 * this kind of unbounded-text-width overflow). */
const OPTION_DETAIL_LINE_STEP_PX = OPTION_BODY_HALF_HEIGHT_PX * 2 + OPTION_DETAIL_LINE_GAP_PX;
/** Gap between one option row's last detail line and the next row's main
 * line. */
const OPTION_ROW_GAP_PX = 12;
/** Gap between the last mission-option row and the BACK button below it —
 * matches every other list scene's identical `BACK_BUTTON_GAP_PX`
 * convention. */
const OPTION_BACK_BUTTON_GAP_PX = 24;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** One decimal place is enough precision for a relay's TU distance to read
 * as meaningful without implying false accuracy (PLAN.md §9.5.7's own
 * worked examples quote distances to one decimal, e.g. "2.4 TU"). */
const DISTANCE_DECIMAL_PLACES = 1;

/**
 * Which "screen" of the world map is showing. A discriminated union (not
 * separate optional fields) so each mode narrows its own payload directly —
 * no null check or non-null assertion needed to read it (this project's
 * eslint config disallows the latter). `'missions'` (Milestone 9.5) is this
 * base's mission-select/in-progress/concluded screen — reached instead of
 * an instant flight launch now that a base visit is a real mission, not a
 * bare "land safely" clear.
 */
type ViewState =
  | { readonly mode: 'worlds' }
  | { readonly mode: 'bases'; readonly worldId: string }
  | { readonly mode: 'missions'; readonly base: Base };

/** One mission option's row content — either a real button (`onClick`
 * present) or an inert, greyed-out row stating why it isn't selectable
 * (this project's "never offer a button for an action that would silently
 * no-op" convention, e.g. `ship-select-scene.ts`'s locked ships,
 * `loadout-scene.ts`'s locked/no-fit equipment). */
interface MissionOptionRow {
  readonly label: string;
  readonly detailLines: readonly string[];
  readonly onClick?: () => void;
}

/**
 * Looks up a `Base` by id in the Milestone 6 registry. A caller referencing
 * a nonexistent base id (a relay route naming a bad id, a stale
 * `MissionDefinition`) is a real data-integrity bug, not a reachable
 * runtime condition — throws rather than silently falling back, matching
 * `bases/bases.ts`'s own `findBodyById` convention.
 */
function findBaseById(id: string): Base {
  const base = BASES.find((candidate) => candidate.id === id);
  if (!base) {
    throw new Error(`findBaseById: no Base registered with id '${id}'`);
  }
  return base;
}

/**
 * Which base a `MissionState`/`MissionDefinition` is "about" for world-map
 * display purposes: the base being established/resupplied. For
 * `'single-trip'`/`'multi-trip-same-base'` that's `originBaseId` (the only
 * base involved); for `'relay'` it's the *destination* (the base the
 * cargo is actually being delivered to establish/resupply) — the origin is
 * just a waypoint. The one place both `WorldMapScene.create()`'s
 * auto-resume jump and `renderMissionView`'s own "does this registry
 * mission belong to the base I'm looking at" check derive this, so the two
 * can't silently disagree.
 */
function missionTargetBaseId(definition: MissionDefinition): string {
  if (definition.structure === 'relay' && definition.destinationBaseId !== null) {
    return definition.destinationBaseId;
  }
  return definition.originBaseId;
}

/** "REQUIRES: 6 TROOPS" / "REQUIRES: 20 SUPPLIES" / "NO MINIMUM CARGO
 * REQUIRED" — every mission-option row's own cargo-requirement line,
 * shared by single-trip and relay options alike (both read `minManifest`
 * the same way). A Resupply mission's `minManifest` is always `{}` (no
 * named minimum, PLAN.md §9.5.4), which is exactly the "no minimum" branch
 * below. */
function minManifestRequirementText(minManifest: MinManifest): string {
  const parts: string[] = [];
  if (minManifest.troops !== undefined && minManifest.troops > 0) {
    parts.push(`${minManifest.troops.toString()} TROOPS`);
  }
  if (minManifest.supplies !== undefined && minManifest.supplies > 0) {
    parts.push(`${minManifest.supplies.toString()} SUPPLIES`);
  }
  return parts.length === 0 ? 'NO MINIMUM CARGO REQUIRED' : `REQUIRES: ${parts.join(' · ')}`;
}

/** "4:32" — a live countdown display for a multi-trip mission's remaining
 * clock, or a mission template's own static time limit. */
function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / MILLISECONDS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes.toString()}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The world-select / base-select / mission-select screen (Milestone 6,
 * Decision D17; extended by Milestone 9.5, PLAN.md §9.5's mission/cargo
 * system): discovered worlds/bases are selectable, locked ones are visible
 * but not — reading unlock state from Milestone 4's validated-`localStorage`
 * pattern (via `persistence/base-progress.ts`). Selecting a reachable base
 * no longer starts a flight directly (Milestone 9.5's intentional behavior
 * change) — it opens that base's mission-select screen instead, since a
 * base visit is now a real mission carrying cargo, not a bare "land safely"
 * clear. An in-progress or just-concluded mission already sitting on
 * `this.registry` (set by `GameScene`/`LoadoutScene`/`TransitScene`) takes
 * over this scene's very first render, jumping straight to that mission's
 * own base instead of the world list — the player is always funneled
 * through resolving it (CONTINUE, or acknowledging the outcome) before
 * they can freely navigate elsewhere again.
 */
export class WorldMapScene extends Phaser.Scene {
  private progress!: BaseProgressMap;
  private view: ViewState = { mode: 'worlds' };
  private viewObjects: Phaser.GameObjects.GameObject[] = [];
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private backGuard!: ArmedKeyGuard;

  /** Every achievement id ever unlocked this save, loaded once in
   * `create()` -- `evaluateNewlyUnlockedAchievements` filters against this
   * on every mission conclusion so an already-unlocked achievement never
   * re-queues its toast. */
  private unlockedAchievementIds!: Set<string>;
  /** Definitions queued for toast display, oldest first -- drained one at a
   * time by `showNextAchievementToastIfIdle` rather than shown all at once,
   * so a burst of simultaneous unlocks (see that method's own doc comment)
   * reads as a sequence of distinct notifications, not overlapping text. */
  private pendingAchievementToasts: AchievementDefinition[] = [];
  /** Deliberately NOT tracked via `track()`/`viewObjects` -- a toast must
   * keep showing across a `renderView()` teardown/rebuild triggered by the
   * player navigating to a different "screen" while it's still up (see
   * `showNextAchievementToastIfIdle`'s own comment on `setDepth`). */
  private activeToast: Phaser.GameObjects.Text | null = null;

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
    // Same null-storage-degrades-to-fresh-defaults rule as `this.progress`
    // above -- a sandboxed/blocked storage means "no achievement ever
    // unlocked yet," not a thrown error.
    this.unlockedAchievementIds =
      storage === null
        ? new Set()
        : new Set(loadUnlockedAchievements(storage).map((achievement) => achievement.id));
    // WorldMapScene is a long-lived instance reused for the page's whole
    // lifetime (registered by class reference in main.ts) -- create()
    // reruns on every re-entry, but a class-field initializer only ever
    // runs once, at construction. Without this reset, navigating away
    // (this.scene.start() to Loadout or Menu) while a toast was still
    // showing or queued would leave `activeToast` as a permanently
    // non-null dangling reference (Phaser's own DisplayList#shutdown
    // already destroyed the Text object itself, and Clock#shutdown kills
    // the pending delayedCall that would have nulled this field --
    // confirmed directly against node_modules/phaser/src/time/Clock.js and
    // DisplayList.js, same verification standard as
    // showNextAchievementToastIfIdle's own comment below), permanently
    // tripping the "one at a time" idle-gate and silently swallowing every
    // future achievement toast for the rest of the session (found by this
    // milestone's own adversarial review -- the exact same "per-scene
    // field never reset in create()" mistake as Milestone 11's hullText
    // bug, recurring here). The achievement itself is never lost (already
    // persisted to localStorage by the time it's queued) -- only its
    // celebratory toast could be silently dropped without this reset.
    this.pendingAchievementToasts = [];
    this.activeToast = null;

    // A mission left on the registry (by GameScene's post-trip transition,
    // or by TransitScene's stranded-failure conclusion) always wins this
    // scene's very first render -- see this class's own doc comment.
    const missionState = this.registry.get('missionState') as MissionState | undefined;
    if (missionState !== undefined) {
      const base = findBaseById(missionTargetBaseId(missionState.definition));
      this.view = { mode: 'missions', base };
      this.renderView();
      return;
    }

    this.view = { mode: 'worlds' };
    this.renderView();
  }

  override update(): void {
    if (this.backGuard.consumeJustPressed()) {
      this.handleBack();
    }
  }

  private handleBack(): void {
    if (this.view.mode === 'missions') {
      // An active/concluded mission must be resolved via its own
      // CONTINUE/acknowledge action -- BACK/ESC is only a real "return to
      // the base list" affordance for the fresh-options sub-view (no
      // registry mission tied to this base yet).
      const missionState = this.registry.get('missionState') as MissionState | undefined;
      if (missionState === undefined) {
        this.view = { mode: 'bases', worldId: this.view.base.worldId };
        this.renderView();
      }
      return;
    }
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
    } else if (this.view.mode === 'bases') {
      this.renderBaseList(this.view.worldId);
    } else {
      this.renderMissionView(this.view.base);
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
              // single-base world (3 of today's 4) instead opens that
              // base's mission-select screen directly, skipping a
              // base-select screen that would only ever show one
              // clickable row plus BACK.
              const basesForWorld = this.basesInWorld(worldId);
              const soleBase = basesForWorld.length === 1 ? basesForWorld[0] : undefined;
              if (soleBase !== undefined) {
                this.view = { mode: 'missions', base: soleBase };
                this.renderView();
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
              this.view = { mode: 'missions', base };
              this.renderView();
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

  /** Milestone 9.5's third screen: a base's mission options, an
   * already-in-progress mission's live status, or a just-concluded
   * mission's outcome summary — whichever applies to `base` right now. */
  private renderMissionView(base: Base): void {
    const missionState = this.registry.get('missionState') as MissionState | undefined;
    const missionStatus = this.registry.get('missionStatus') as MissionStatus | null | undefined;

    if (missionState !== undefined && missionTargetBaseId(missionState.definition) === base.id) {
      if (missionStatus === undefined || missionStatus === null) {
        this.renderActiveMission(missionState);
      } else {
        this.renderConcludedMission(base, missionState, missionStatus);
      }
      return;
    }

    this.renderFreshMissionOptions(base);
  }

  private renderFreshMissionOptions(base: Base): void {
    this.track(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * TITLE_Y_FRACTION,
          `${base.name.toUpperCase()} — MISSIONS`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );

    const rows = this.buildMissionOptionRows(base);
    let y = GAME_HEIGHT * LIST_START_Y_FRACTION;
    for (const row of rows) {
      y = this.renderOptionRow(row, GAME_WIDTH / 2, y);
    }

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: y + OPTION_BACK_BUTTON_GAP_PX,
        label: 'BACK',
        onClick: () => {
          this.view = { mode: 'bases', worldId: base.worldId };
          this.renderView();
        },
      }),
    );
  }

  /** Every mission option `base` currently offers: its own
   * establish/resupply mission(s), plus a "RELAY TO <dest>" option for
   * every `RELAY_ROUTES` entry originating here that's currently
   * selectable (PLAN.md §9.5.6) — feasible ones as a real button,
   * infeasible ones (for the currently-equipped ship) as an inert row
   * stating every failed gate, mirroring `ship-select-scene.ts`'s locked-
   * ship convention. A route whose endpoints aren't both discovered yet
   * isn't rendered at all (not even greyed out) -- `isRelaySelectable`
   * already reflects the same base-status gate the world/base lists
   * themselves use, so "not selectable yet" reads the same as "not
   * unlocked yet" everywhere else in this screen. */
  private buildMissionOptionRows(base: Base): readonly MissionOptionRow[] {
    const rows: MissionOptionRow[] = [];
    const flavor = deriveMissionFlavor(this.statusOf(base));

    if (flavor === 'establish-presence') {
      const definition = buildSingleTripMission(base, 'establish-presence');
      rows.push({
        label: 'ESTABLISH PRESENCE',
        detailLines: [minManifestRequirementText(definition.minManifest)],
        onClick: () => {
          this.openLoadout(definition);
        },
      });
    } else if (flavor === 'resupply') {
      const singleDefinition = buildSingleTripMission(base, 'resupply');
      rows.push({
        label: 'RESUPPLY (SINGLE TRIP)',
        detailLines: [minManifestRequirementText(singleDefinition.minManifest)],
        onClick: () => {
          this.openLoadout(singleDefinition);
        },
      });

      const multiDefinition = buildMultiTripResupplyMission(base);
      const cargoTarget = multiDefinition.cargoTarget;
      const timeLimitMs = multiDefinition.timeLimitMs;
      // Both fields are non-null by construction for every
      // `buildMultiTripResupplyMission` result -- narrowed here (rather than
      // asserted) so a future template change that left either null would
      // fail this row's own rendering loudly instead of silently.
      if (cargoTarget !== null && timeLimitMs !== null) {
        rows.push({
          label: 'RESUPPLY (MULTI-TRIP)',
          detailLines: [
            `TARGET: ${cargoTarget.units.toString()} ${cargoTarget.type.toUpperCase()} ` +
              `· TIME LIMIT: ${formatClock(timeLimitMs)}`,
          ],
          onClick: () => {
            this.openLoadout(multiDefinition);
          },
        });
      }
    }

    const relevantRoutes = RELAY_ROUTES.filter((route) => route.originBaseId === base.id);
    if (relevantRoutes.length > 0) {
      const shipContext = this.resolveCurrentShipContext();
      for (const route of relevantRoutes) {
        if (!isRelaySelectable(route, BASES, this.progress)) {
          continue;
        }
        rows.push(this.buildRelayOptionRow(base, route, shipContext));
      }
    }

    return rows;
  }

  private buildRelayOptionRow(
    originBase: Base,
    route: RelayRoute,
    shipContext: CurrentShipContext,
  ): MissionOptionRow {
    const destinationBase = findBaseById(route.destinationBaseId);
    const destinationFlavor = deriveMissionFlavor(this.statusOf(destinationBase));
    if (destinationFlavor === null) {
      // isRelaySelectable already guarantees the destination isn't
      // 'locked' -- deriveMissionFlavor only returns null for 'locked'.
      throw new Error(
        `buildRelayOptionRow: destination base '${destinationBase.id}' is unexpectedly locked.`,
      );
    }

    const definition = buildRelayMission(route, destinationBase, destinationFlavor);

    const candidateManifest: CargoManifest = {
      troops: definition.minManifest.troops ?? 0,
      supplies: definition.minManifest.supplies ?? 0,
    };
    const originBody = findBodyById(originBase.worldId);
    const destinationBody = findBodyById(destinationBase.worldId);
    const distanceTU = transitDistanceTU(originBase, originBody, destinationBase, destinationBody);
    const feasibility = relayFeasibility(
      shipContext.effectiveShip,
      shipContext.equipmentMass,
      candidateManifest,
      originBody,
      destinationBody,
      distanceTU,
      shipContext.corrosionResistant,
    );

    const label = `RELAY TO ${destinationBase.name.toUpperCase()}`;
    const distanceText = `DISTANCE: ${distanceTU.toFixed(DISTANCE_DECIMAL_PLACES)} TU`;

    if (feasibility.feasible) {
      return {
        label,
        detailLines: [`${minManifestRequirementText(definition.minManifest)} · ${distanceText}`],
        onClick: (): void => {
          this.openLoadout(definition);
        },
      };
    }
    return {
      label: `${label} (INFEASIBLE)`,
      detailLines: [distanceText, ...feasibility.reasons.map((reason) => reason.toUpperCase())],
    };
  }

  /** Renders one mission-option row at `x, y`, returning the y the next
   * row should start at. */
  private renderOptionRow(row: MissionOptionRow, x: number, y: number): number {
    if (row.onClick) {
      this.track(createUiButton(this, { x, y, label: row.label, onClick: row.onClick }));
    } else {
      this.track(
        this.add
          .text(x, y, row.label, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
    }

    let lineY = y + (row.onClick ? OPTION_BUTTON_DETAIL_OFFSET_PX : OPTION_TEXT_DETAIL_OFFSET_PX);
    for (const line of row.detailLines) {
      this.track(
        this.add
          .text(x, lineY, line, {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          })
          .setOrigin(ORIGIN_CENTER),
      );
      lineY += OPTION_DETAIL_LINE_STEP_PX;
    }
    return lineY + OPTION_ROW_GAP_PX;
  }

  /** An in-progress mission tied to `base` (`missionStatus` absent/`null`)
   * — a live multi-trip progress readout, or a relay whose origin leg just
   * landed awaiting transit — with one CONTINUE action that resumes it. */
  private renderActiveMission(missionState: MissionState): void {
    const definition = missionState.definition;

    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, 'MISSION IN PROGRESS', {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    let detail: string;
    let continueLabel: string;
    let onContinue: () => void;

    if (definition.structure === 'multi-trip-same-base') {
      const cargoTarget = definition.cargoTarget;
      const timeLimitMs = definition.timeLimitMs;
      if (cargoTarget === null || timeLimitMs === null) {
        throw new Error(
          'renderActiveMission: multi-trip-same-base mission is missing cargoTarget/timeLimitMs.',
        );
      }
      const delivered = missionState.delivered[cargoTarget.type];
      const remainingMs = timeLimitMs - (Date.now() - missionState.startedAtMs);
      detail =
        `DELIVERED: ${delivered.toString()}/${cargoTarget.units.toString()} ` +
        `${cargoTarget.type.toUpperCase()} · TIME LEFT: ${formatClock(remainingMs)}`;
      continueLabel = 'CONTINUE MISSION';
      onContinue = (): void => {
        this.openLoadout(definition, missionState);
      };
    } else if (definition.structure === 'relay') {
      const destinationBaseId = definition.destinationBaseId;
      if (destinationBaseId === null) {
        throw new Error('renderActiveMission: relay mission is missing destinationBaseId.');
      }
      const destinationBase = findBaseById(destinationBaseId);
      detail = `CARGO PICKED UP -- AWAITING TRANSIT TO ${destinationBase.name.toUpperCase()}`;
      continueLabel = 'CONTINUE TO TRANSIT';
      onContinue = (): void => {
        this.scene.start(SCENE_KEY_TRANSIT);
      };
    } else {
      // A 'single-trip' mission always concludes after its one and only
      // trip (mission-trip.ts's resolveTripOutcome) -- it can never reach
      // this "still active" branch.
      throw new Error(
        `renderActiveMission: structure '${definition.structure}' cannot be active -- it always concludes in one trip.`,
      );
    }

    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * MISSION_DETAIL_Y_FRACTION, detail, {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_MUTED_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );

    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * MISSION_CONTINUE_BUTTON_Y_FRACTION,
        label: continueLabel,
        onClick: onContinue,
      }),
    );
  }

  /** A just-concluded mission tied to `base` (`missionStatus` a real
   * status) — its outcome and reward, with one CONTINUE action that banks
   * the base-status/currency side effects and clears the registry. */
  private renderConcludedMission(
    base: Base,
    missionState: MissionState,
    status: MissionStatus,
  ): void {
    // Rounded to a whole credit -- `missionReward` itself can return a
    // fraction (`cargoRewardAccumulated` is never rounded per-trip, PLAN.md
    // §9.5.7's own worked examples round only at display time, "≈173"), but
    // every persisted currency balance is a whole-number invariant
    // (`currency-progress.ts`'s own `isCurrencyState` validator rejects a
    // non-integer balance on the very next load) -- rounding once here,
    // before this value is either shown or credited, keeps both consistent
    // and keeps that invariant intact.
    const reward =
      status === 'failure'
        ? 0
        : Math.round(
            missionReward({
              flavor: missionState.definition.flavor,
              cargoRewardAccumulated: missionState.cargoRewardAccumulated,
              scoreAccumulated: missionState.scoreAccumulated,
            }),
          );

    const titleText =
      status === 'success'
        ? 'MISSION SUCCESS'
        : status === 'partial'
          ? 'MISSION PARTIAL'
          : 'MISSION FAILURE';

    this.track(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT * TITLE_Y_FRACTION, titleText, {
          fontFamily: 'monospace',
          fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setOrigin(ORIGIN_CENTER),
    );
    this.track(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT * MISSION_DETAIL_Y_FRACTION,
          `REWARD: ${reward.toString()} CREDITS`,
          {
            fontFamily: 'monospace',
            fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
            color: hexToCss(UI_MUTED_TEXT_COLOR),
          },
        )
        .setOrigin(ORIGIN_CENTER),
    );
    this.track(
      createUiButton(this, {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * MISSION_CONTINUE_BUTTON_Y_FRACTION,
        label: 'CONTINUE',
        onClick: () => {
          this.acknowledgeConcludedMission(base, missionState, status, reward);
        },
      }),
    );
  }

  /** Banks a concluded mission's base-status/currency side effects (PLAN.md
   * §9.5.4), persists them, then clears every Milestone 9.5 registry key
   * this scene/`GameScene`/`TransitScene` used so a stale mission can never
   * leak into the next one launched. */
  private acknowledgeConcludedMission(
    base: Base,
    missionState: MissionState,
    status: MissionStatus,
    reward: number,
  ): void {
    const definition = missionState.definition;
    const targetBaseId = missionTargetBaseId(definition);

    let progress = this.progress;
    if (status === 'success' && definition.flavor === 'establish-presence') {
      progress = establishBase(BASES, progress, targetBaseId, Date.now());
    } else if ((status === 'success' || status === 'partial') && definition.flavor === 'resupply') {
      progress = resupplyBase(progress, targetBaseId);
    }
    this.progress = progress;

    const storage = getSafeLocalStorage();
    if (storage !== null) {
      saveBaseProgress(storage, progress);
      if (reward > 0) {
        const currencyState = creditCurrency(loadCurrencyState(storage), scoreToCurrency(reward));
        saveCurrencyState(storage, currencyState);
      }
    }

    // Evaluated against `progress` (the POST-update map just assigned to
    // `this.progress` above), against BASES's full roster (not just
    // `base`) -- world-scoped/frontier-wide rules need every base's own
    // live status, not only the one this mission concluded on. This is the
    // only place in the codebase establishBase()/resupplyBase() are ever
    // called (confirmed by grepping the whole src tree), so it's the only
    // correct hook point for achievement evaluation.
    const newlyUnlocked = evaluateNewlyUnlockedAchievements(
      BASES,
      progress,
      this.unlockedAchievementIds,
    );
    if (newlyUnlocked.length > 0) {
      for (const achievement of newlyUnlocked) {
        this.unlockedAchievementIds.add(achievement.id);
      }
      if (storage !== null) {
        recordUnlockedAchievements(storage, newlyUnlocked, Date.now());
      }
      this.pendingAchievementToasts.push(...newlyUnlocked);
    }

    this.registry.remove('missionState');
    this.registry.remove('missionStatus');
    this.registry.remove('fuelRemainingAtTouchdown');
    this.registry.remove('relayManifest');

    this.view = { mode: 'bases', worldId: base.worldId };
    this.renderView();
    // Drains AFTER renderView() so a toast overlays the screen that call
    // just produced, not one about to be replaced.
    this.showNextAchievementToastIfIdle();
  }

  /**
   * Shows the next queued achievement toast, if any, and only if none is
   * currently showing (`activeToast` doubles as both the "one at a time"
   * gate and the "still draining" flag) -- safe to call redundantly, which
   * it is: once right after queuing new unlocks, and again from each
   * toast's own dismiss timer below.
   */
  private showNextAchievementToastIfIdle(): void {
    if (this.activeToast !== null) {
      return;
    }
    const next = this.pendingAchievementToasts.shift();
    if (next === undefined) {
      return;
    }

    playSfxCue(this, ACHIEVEMENT_UNLOCK_CUE, isAudioMuted());
    const toast = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT * ACHIEVEMENT_TOAST_Y_FRACTION,
        `ACHIEVEMENT UNLOCKED: ${next.displayText}`,
        {
          fontFamily: 'monospace',
          fontSize: `${UI_BUTTON_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
          // Panel look faked via backgroundColor + padding on the Text
          // object itself -- this project's established way of doing this
          // without a separate graphics object (see createUiButton, whose
          // exact colors this reuses rather than inventing new ones).
          backgroundColor: hexToCss(UI_BUTTON_BG_COLOR),
          padding: { x: UI_BUTTON_PADDING_X, y: UI_BUTTON_PADDING_Y },
        },
      )
      .setOrigin(ORIGIN_CENTER)
      // See ACHIEVEMENT_TOAST_DEPTH's own doc comment (constants.ts) for
      // why this scene needs an explicit depth here (it otherwise never
      // calls setDepth at all) -- a toast queued while, say, the base list
      // is up must still read on top even if the player navigates to a
      // different "screen" before it's dismissed, since renderView()'s
      // teardown/rebuild never touches `activeToast` (deliberately not
      // routed through this class's own track()/viewObjects convention).
      .setDepth(ACHIEVEMENT_TOAST_DEPTH);
    this.activeToast = toast;

    // Confirmed directly against node_modules/phaser/src/time/Clock.js
    // (Phaser 4.2.0): a Scene's own SHUTDOWN event -- fired when
    // this.scene.start() navigates this scene away, e.g. BACK to
    // MenuScene while a toast is still queued or showing -- runs
    // Clock#shutdown, which calls TimerEvent#destroy on every
    // active/pending/pending-removal timer event. TimerEvent#destroy sets
    // `callback = undefined` before the event could ever be processed
    // again, so a delayedCall scheduled here can never fire against an
    // already-torn-down scene. No extra this.scene.isActive() guard is
    // needed for that class of bug (unlike Milestone 11's own real Clock-
    // teardown bug elsewhere in this project) -- this comment exists so a
    // future reader doesn't have to re-derive that from scratch.
    this.time.delayedCall(ACHIEVEMENT_TOAST_DISPLAY_MS, () => {
      toast.destroy();
      this.activeToast = null;
      this.showNextAchievementToastIfIdle();
    });
  }

  private openLoadout(definition: MissionDefinition, existingState?: MissionState): void {
    const mission: LoadoutMissionContext =
      existingState === undefined ? { definition } : { definition, existingState };
    const data: LoadoutSceneData = { mission };
    this.scene.start(SCENE_KEY_LOADOUT, data);
  }

  /** The currently-equipped ship's flight-relevant stats (owned permanent
   * upgrades folded in) plus its carried equipment mass/passive effects —
   * the same ship/upgrade/equipment-progress resolution `LoadoutScene`/
   * `GameScene` each already do in their own `init()`/`create()`, reused
   * here to evaluate `relayFeasibility` against the ship the player would
   * actually fly right now. */
  private resolveCurrentShipContext(): CurrentShipContext {
    const storage = getSafeLocalStorage();
    const shipProgress =
      storage === null ? initialShipProgress(SHIPS) : loadShipProgress(storage, SHIPS);
    const upgradeProgress =
      storage === null ? initialUpgradeProgress() : loadUpgradeProgress(storage, UPGRADES);
    const equipmentProgress =
      storage === null
        ? initialEquipmentProgress()
        : loadEquipmentProgress(storage, EQUIPMENT_ITEMS);

    const baseShip = findShipById(shipProgress.selectedShipId);
    const effectiveShip = applyPermanentUpgrades(
      baseShip,
      ownedUpgrades(upgradeProgress, UPGRADES),
    );
    const carriedItems = resolveEquippedItems(
      effectiveShip,
      equipmentProgress.equippedItemIds,
      EQUIPMENT_ITEMS,
    );
    return {
      effectiveShip,
      equipmentMass: totalCarriedMass(carriedItems),
      corrosionResistant: summarizePassiveEffects(carriedItems).corrosionResistant,
    };
  }
}

interface CurrentShipContext {
  readonly effectiveShip: ShipClass;
  readonly equipmentMass: number;
  readonly corrosionResistant: boolean;
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
