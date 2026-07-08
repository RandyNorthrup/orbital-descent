import Phaser from 'phaser';
import {
  CRASHED_COLOR_BOTTOM,
  CRASHED_COLOR_TOP,
  ENGINE_GLOW_COLOR,
  ENGINE_GLOW_MAX_ALPHA,
  ENGINE_GLOW_RADIUS,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIGH_SCORE_LIST_MAX_ENTRIES,
  HUD_LAYER_DEPTH,
  HUD_MARGIN,
  LANDED_COLOR_BOTTOM,
  LANDED_COLOR_TOP,
  LANDER_ETCH_LINE_COUNT,
  LANDER_FILL_COLOR_BOTTOM,
  LANDER_FILL_COLOR_TOP,
  LANDER_LAYER_DEPTH,
  LANDER_RADIUS,
  LANDER_START_X,
  LANDER_START_Y,
  LANDING_MAX_SAFE_ANGLE_DEG,
  LANDING_MAX_SAFE_SPEED,
  LANDING_PAD_FILL_COLOR_BOTTOM,
  LANDING_PAD_FILL_COLOR_TOP,
  RESULT_TRANSITION_DELAY_MS,
  SCORE_BASE_LANDING_BONUS,
  SCORE_MAX_FUEL_BONUS,
  SCORE_MAX_PRECISION_BONUS,
  SCORE_MAX_TIME_BONUS,
  SCORE_TIME_PAR_MS,
  TERRAIN_ETCH_LINE_COUNT,
  TERRAIN_MAX_HEIGHT_FRACTION,
  TERRAIN_MIN_HEIGHT_FRACTION,
  TERRAIN_MAX_STEP_FRACTION,
  TERRAIN_SEGMENTS,
  TERRAIN_SHADOW_LAYER_DEPTH,
  LANDING_PAD_SEGMENT_COUNT,
  UI_BODY_FONT_SIZE_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  WORLD_WIDTH,
} from '../constants';
import { FlightState } from '../flight/flight-state';
import { degreesToRadians } from '../physics/lander-physics';
import { recordHighScore } from '../persistence/high-scores';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { loadShipProgress } from '../persistence/ship-progress';
import {
  creditCurrency,
  loadCurrencyState,
  saveCurrencyState,
} from '../persistence/currency-progress';
import { scoreToCurrency } from '../economy/currency';
import type { Base } from '../bases/base';
import { BODIES } from '../planets/bodies';
import { findBodyById } from '../bases/bases';
import type { CelestialBody } from '../planets/celestial-body';
import type { ShipClass } from '../ships/ship';
import { SHIPS, findShipById } from '../ships/ships';
import { calculateScore } from '../scoring/score';
import { isOnLandingPad, isSafeLanding } from '../terrain/landing';
import {
  generateTerrain,
  getTerrainHeightAt,
  type GenerateTerrainOptions,
  type Terrain,
} from '../terrain/terrain-generator';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createPaperShape, type PaperShape } from '../rendering/paper-shape';
import { createRadialGlowImage } from '../rendering/radial-glow';
import { buildBackground } from '../rendering/background';
import { SCENE_KEY_GAME, SCENE_KEY_RESULT, SCENE_KEY_SETTINGS } from './scene-keys';
import {
  outcomeColor,
  outcomeLabel,
  type FlightOutcome,
  type ResultSceneData,
} from './result-scene';
import type { SettingsSceneData } from './settings-scene';
import { ArmedKeyGuard, requireKeyboard } from './scene-utils';

const MILLISECONDS_PER_SECOND = 1000;
const FUEL_PERCENT_MULTIPLIER = 100;
const ORIGIN_CENTER = 0.5;
const LANDER_TEXTURE_KEY = 'paper-fill-lander';
const TERRAIN_TEXTURE_KEY = 'paper-fill-terrain';
const LANDING_PAD_TEXTURE_KEY = 'paper-fill-landing-pad';
const ENGINE_GLOW_TEXTURE_KEY = 'lander-engine-glow';

type GameOutcome = 'flying' | FlightOutcome;

export interface GameSceneData {
  /** The curated base to fly (Milestone 6) — its own `terrainOptions`
   * generate the terrain (a fixed seed, unlike free flight's per-restart
   * `Date.now()` reseed, so a curated puzzle presents the same layout
   * every time), and its `worldId` resolves the target `CelestialBody`.
   * Omitted by every caller today (MenuScene's START, ResultScene's
   * RESTART) — a generic procedural flight on BODIES[0] (Kessel's Reach),
   * exactly this project's pre-Milestone-6 behavior. WorldMapScene is the
   * first real caller that passes this. */
  readonly base?: Base;
}

export class GameScene extends Phaser.Scene {
  private base: Base | null = null;
  private body!: CelestialBody;
  private ship!: ShipClass;
  private flightState!: FlightState;
  private terrain!: Terrain;
  private lander!: PaperShape;
  private outcome: GameOutcome = 'flying';
  /** Real flight duration so far, in ms — one of calculateScore's three
   * factors. Only accumulates while this scene's update() actually runs,
   * so pausing (Phaser stops calling update() on a paused scene entirely)
   * doesn't count against it. */
  private elapsedMs = 0;
  private fuelText!: Phaser.GameObjects.Text;
  private outcomeText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private pauseGuard!: ArmedKeyGuard;

  constructor() {
    super(SCENE_KEY_GAME);
  }

  init(data: GameSceneData = {}): void {
    this.base = data.base ?? null;
    this.body = this.base === null ? BODIES[0] : findBodyById(this.base.worldId);
    this.ship = this.resolveSelectedShip();
  }

  /** Equipping a ship (`ShipSelectScene`) is a persistent loadout choice,
   * not a per-launch parameter like `base` — every flight (free flight, a
   * curated base, a restart) picks up whatever ship was most recently
   * selected without every caller needing to thread a `shipId` through
   * their own scene data. `getSafeLocalStorage()` returns null when
   * storage access itself is blocked (sandboxed iframe, privacy setting)
   * -- flight still starts normally on the default ship in that case, same
   * degradation as every other localStorage read in this scene. */
  private resolveSelectedShip(): ShipClass {
    const storage = getSafeLocalStorage();
    if (storage === null) {
      return SHIPS[0];
    }
    return findShipById(loadShipProgress(storage, SHIPS).selectedShipId);
  }

  create(): void {
    const keyboard = requireKeyboard(this);

    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pauseGuard = new ArmedKeyGuard(this.keyEscape);

    this.outcome = 'flying';
    this.data.set('outcome', this.outcome);
    // GameScene is one long-lived Phaser instance reused across restarts
    // (only create() re-runs, not the constructor), so a stale 'score' from
    // a previous landing must be explicitly cleared — otherwise a crash
    // following an earlier safe landing would still report that old score.
    this.data.remove('score');
    this.elapsedMs = 0;

    buildBackground(this);

    // A curated base's own terrainOptions generate a fixed, repeatable
    // layout (the puzzle this specific base authors); free flight (no
    // base selected) keeps this project's pre-Milestone-6 behavior
    // exactly: a fresh procedural reseed every restart. Every base
    // authored so far uses WORLD_WIDTH/GAME_HEIGHT for width/height, so
    // camera bounds/ground-closing points/lander spawn X below (all still
    // WORLD_WIDTH-based) stay correct for both branches without further
    // change — a base wanting a genuinely different world width is a
    // real, currently out-of-scope extension, not a case this scene
    // silently mishandles today.
    const terrainOptions: GenerateTerrainOptions = this.base?.terrainOptions ?? {
      seed: Date.now(),
      width: WORLD_WIDTH,
      height: GAME_HEIGHT,
      segments: TERRAIN_SEGMENTS,
      minHeightFraction: TERRAIN_MIN_HEIGHT_FRACTION,
      maxHeightFraction: TERRAIN_MAX_HEIGHT_FRACTION,
      maxStepFraction: TERRAIN_MAX_STEP_FRACTION,
      padSegmentCount: LANDING_PAD_SEGMENT_COUNT,
    };
    this.terrain = generateTerrain(terrainOptions);
    this.buildTerrainVisual();

    this.flightState = new FlightState({
      initial: {
        position: { x: LANDER_START_X, y: LANDER_START_Y },
        velocity: { x: 0, y: 0 },
        rotationRadians: 0,
        fuel: this.ship.fuelCapacity,
      },
      gravityAccel: this.body.gravityAccel,
      // Zero equipment/cargo mass on every flight before Milestone 9 ships,
      // so realized thrust acceleration is exactly baseThrustAccel (see
      // ShipClass.dryMass's own doc comment on the engineForce model).
      thrustAccel: this.ship.baseThrustAccel,
      rotationSpeedRadPerSec: degreesToRadians(this.ship.handling),
      fuelBurnRate: this.ship.burnRate,
      dragCoefficient: this.body.atmosphereDensity,
      hazard: this.body.hazard,
    });

    this.lander = createPaperShape(this, {
      points: [
        { x: 0, y: -LANDER_RADIUS },
        { x: -LANDER_RADIUS, y: LANDER_RADIUS },
        { x: LANDER_RADIUS, y: LANDER_RADIUS },
      ],
      textureKey: LANDER_TEXTURE_KEY,
      fillTopColor: LANDER_FILL_COLOR_TOP,
      fillBottomColor: LANDER_FILL_COLOR_BOTTOM,
      etchLineCount: LANDER_ETCH_LINE_COUNT,
    });
    this.lander.container.setPosition(LANDER_START_X, LANDER_START_Y);
    this.lander.container.setDepth(LANDER_LAYER_DEPTH);

    // A static glow accent at the engine base — part of the ship's own
    // artwork per the approved art direction, not a thrust-reactive
    // particle effect (that "juice" is Milestone 13's scope).
    // createPaperShape builds the container as [shadow, fill, outline];
    // addAt(engineGlow, 1) below inserts it directly above the opaque hard
    // shadow but below the hull fill/outline, so the halo reads around the
    // hull instead of being crushed underneath the shadow silhouette.
    const engineGlow = createRadialGlowImage(
      this,
      ENGINE_GLOW_TEXTURE_KEY,
      0,
      LANDER_RADIUS,
      ENGINE_GLOW_RADIUS,
      ENGINE_GLOW_COLOR,
      ENGINE_GLOW_MAX_ALPHA,
    );
    this.lander.container.addAt(engineGlow, 1);

    // Camera follows the lander across the full WORLD_WIDTH (Milestone
    // 2.5) instead of the whole world always being exactly one static
    // screen. roundPixels avoids sub-pixel texture shimmer; no deadzone/
    // lerp smoothing — a lander game needs the camera locked precisely to
    // the ship for landing judgment, not a cinematic lag.
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.lander.container, true);

    // HUD text needs setScrollFactor(0) now that the camera moves — every
    // other GameObject in the scene moves with the world (the default),
    // but HUD must stay fixed on screen regardless of camera position.
    // The title/instructions block lives on MenuScene now (Milestone 3) —
    // in-flight HUD stays minimal: fuel, and a pause hint for the one
    // control this milestone actually adds.
    this.fuelText = this.add
      .text(HUD_MARGIN, HUD_MARGIN, '', {
        fontFamily: 'monospace',
        fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setDepth(HUD_LAYER_DEPTH)
      .setScrollFactor(0);
    this.updateFuelText(this.ship.fuelCapacity);

    this.add
      .text(GAME_WIDTH - HUD_MARGIN, HUD_MARGIN, 'ESC: pause', {
        fontFamily: 'monospace',
        fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_MUTED_TEXT_COLOR),
      })
      .setOrigin(1, 0)
      .setDepth(HUD_LAYER_DEPTH)
      .setScrollFactor(0);

    this.outcomeText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: 'monospace',
        fontSize: `${UI_TITLE_FONT_SIZE_PX.toString()}px`,
        color: hexToCss(UI_TEXT_COLOR),
      })
      .setOrigin(ORIGIN_CENTER, ORIGIN_CENTER)
      .setDepth(HUD_LAYER_DEPTH)
      .setScrollFactor(0);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.outcome !== 'flying') {
      return;
    }

    if (this.pauseGuard.consumeJustPressed()) {
      const data: SettingsSceneData = { returnTo: SCENE_KEY_GAME };
      this.scene.run(SCENE_KEY_SETTINGS, data);
      this.scene.pause();
      return;
    }

    const rotateLeft = this.cursors.left.isDown || this.keyA.isDown;
    const rotateRight = this.cursors.right.isDown || this.keyD.isDown;
    let rotate: -1 | 0 | 1 = 0;
    if (rotateLeft !== rotateRight) {
      rotate = rotateLeft ? -1 : 1;
    }
    const thrust = this.cursors.up.isDown || this.keyW.isDown;

    const snapshot = this.flightState.tick({ thrust, rotate }, deltaMs / MILLISECONDS_PER_SECOND);
    this.elapsedMs += deltaMs;
    this.updateFuelText(snapshot.fuel);

    const groundY = getTerrainHeightAt(this.terrain.points, snapshot.position.x);
    if (snapshot.position.y + LANDER_RADIUS < groundY) {
      this.lander.container.setPosition(snapshot.position.x, snapshot.position.y);
      this.lander.container.setRotation(snapshot.rotationRadians);
      return;
    }

    const onPad = isOnLandingPad(snapshot.position.x, this.terrain.landingPad);
    const safe = isSafeLanding(snapshot, onPad, {
      maxSafeSpeed: LANDING_MAX_SAFE_SPEED,
      maxSafeAngleRadians: degreesToRadians(LANDING_MAX_SAFE_ANGLE_DEG),
    });

    const outcome: FlightOutcome = safe ? 'landed' : 'crashed';
    this.outcome = outcome;
    // Exposed via Phaser's data manager (not a bare property read) so the
    // Playwright e2e suite can observe the outcome without reaching into
    // canvas-rendered text, which isn't visible to DOM-based locators.
    this.data.set('outcome', outcome);
    this.lander.container.setPosition(snapshot.position.x, groundY - LANDER_RADIUS);
    this.lander.setFillColors(
      safe ? LANDED_COLOR_TOP : CRASHED_COLOR_TOP,
      safe ? LANDED_COLOR_BOTTOM : CRASHED_COLOR_BOTTOM,
    );
    this.outcomeText.setText(outcomeLabel(outcome));
    this.outcomeText.setColor(hexToCss(outcomeColor(outcome)));

    // A crash never scores (Decision D8/Milestone 4) — calculateScore is
    // only meaningful for a confirmed safe touchdown, and only a landing
    // is worth persisting to the high-score leaderboard at all.
    let resultData: ResultSceneData = { outcome };
    if (safe) {
      const { landingPad } = this.terrain;
      const padCenterX = (landingPad.xStart + landingPad.xEnd) / 2;
      const padHalfWidth = (landingPad.xEnd - landingPad.xStart) / 2;
      const score = calculateScore(
        {
          fuelRemaining: snapshot.fuel,
          elapsedMs: this.elapsedMs,
          touchdownX: snapshot.position.x,
          padCenterX,
          padHalfWidth,
        },
        {
          maxFuel: this.ship.fuelCapacity,
          baseLandingBonus: SCORE_BASE_LANDING_BONUS,
          maxFuelBonus: SCORE_MAX_FUEL_BONUS,
          maxPrecisionBonus: SCORE_MAX_PRECISION_BONUS,
          maxTimeBonus: SCORE_MAX_TIME_BONUS,
          timeParMs: SCORE_TIME_PAR_MS,
        },
      );
      // getSafeLocalStorage() returns null when storage access itself is
      // blocked (sandboxed iframe, privacy setting) -- the landing still
      // scores and transitions to ResultScene normally, it just can't
      // persist, same degradation as recordHighScore's own internal
      // best-effort setItem try/catch, just one layer further out.
      const storage = getSafeLocalStorage();
      const highScores =
        storage === null
          ? []
          : recordHighScore(storage, score, Date.now(), HIGH_SCORE_LIST_MAX_ENTRIES);
      const bestScore = highScores[0]?.score ?? score;
      this.data.set('score', score);

      // Milestone 8/Decision D15: a completed mission credits currency
      // proportional to its score. Reuses the same `storage` handle already
      // fetched above for the high-score write rather than calling
      // getSafeLocalStorage() a second time; degrades the same way -- the
      // landing still scores and transitions to ResultScene normally when
      // storage is blocked, it just can't persist the credited balance.
      if (storage !== null) {
        const currencyState = creditCurrency(loadCurrencyState(storage), scoreToCurrency(score));
        saveCurrencyState(storage, currencyState);
      }

      resultData = { outcome, score, bestScore };
    }

    this.time.delayedCall(RESULT_TRANSITION_DELAY_MS, () => {
      this.scene.start(SCENE_KEY_RESULT, resultData);
    });
  }

  private buildTerrainVisual(): void {
    const groundPoints = [
      ...this.terrain.points,
      { x: WORLD_WIDTH, y: GAME_HEIGHT },
      { x: 0, y: GAME_HEIGHT },
    ];
    const ground = createPaperShape(this, {
      points: groundPoints,
      textureKey: TERRAIN_TEXTURE_KEY,
      fillTopColor: this.body.terrainPalette.fillTopColor,
      fillBottomColor: this.body.terrainPalette.fillBottomColor,
      etchLineCount: TERRAIN_ETCH_LINE_COUNT,
      etchStyle: this.body.terrainPalette.etchStyle,
    });
    ground.container.setDepth(TERRAIN_SHADOW_LAYER_DEPTH);

    const { landingPad } = this.terrain;
    const padPoints = [
      { x: landingPad.xStart, y: landingPad.y },
      { x: landingPad.xEnd, y: landingPad.y },
      { x: landingPad.xEnd, y: GAME_HEIGHT },
      { x: landingPad.xStart, y: GAME_HEIGHT },
    ];
    const pad = createPaperShape(this, {
      points: padPoints,
      textureKey: LANDING_PAD_TEXTURE_KEY,
      fillTopColor: LANDING_PAD_FILL_COLOR_TOP,
      fillBottomColor: LANDING_PAD_FILL_COLOR_BOTTOM,
    });
    pad.container.setDepth(TERRAIN_SHADOW_LAYER_DEPTH);
  }

  private updateFuelText(fuel: number): void {
    const percent = Math.round((fuel / this.ship.fuelCapacity) * FUEL_PERCENT_MULTIPLIER);
    this.fuelText.setText(`FUEL: ${percent.toString()}%`);
  }
}
