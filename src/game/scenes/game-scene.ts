import Phaser from 'phaser';
import {
  CRASHED_COLOR,
  FUEL_BURN_RATE,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY_ACCEL,
  HUD_MARGIN,
  LANDED_COLOR,
  LANDER_FILL_COLOR,
  LANDER_RADIUS,
  LANDER_START_X,
  LANDER_START_Y,
  LANDING_MAX_SAFE_ANGLE_DEG,
  LANDING_MAX_SAFE_SPEED,
  LANDING_PAD_FILL_COLOR,
  MAX_FUEL,
  ROTATION_SPEED_DEG,
  TERRAIN_FILL_COLOR,
  TERRAIN_MAX_HEIGHT_FRACTION,
  TERRAIN_MIN_HEIGHT_FRACTION,
  TERRAIN_MAX_STEP_FRACTION,
  TERRAIN_SEGMENTS,
  LANDING_PAD_SEGMENT_COUNT,
  THRUST_ACCEL,
} from '../constants';
import { FlightState } from '../flight/flight-state';
import { degreesToRadians } from '../physics/lander-physics';
import { isOnLandingPad, isSafeLanding } from '../terrain/landing';
import { generateTerrain, getTerrainHeightAt, type Terrain } from '../terrain/terrain-generator';
import { createPaperShape, type PaperShape } from '../rendering/paper-shape';
import { SCENE_KEY_GAME } from './scene-keys';

const MILLISECONDS_PER_SECOND = 1000;
const FUEL_PERCENT_MULTIPLIER = 100;
const ORIGIN_CENTER = 0.5;
const SUBTITLE_Y_FRACTION = 0.06;
const TERRAIN_SHADOW_LAYER_DEPTH = 0;
const LANDER_LAYER_DEPTH = 1;
const HUD_LAYER_DEPTH = 2;

type GameOutcome = 'flying' | 'landed' | 'crashed';

export class GameScene extends Phaser.Scene {
  private flightState!: FlightState;
  private terrain!: Terrain;
  private lander!: PaperShape;
  private outcome: GameOutcome = 'flying';
  private fuelText!: Phaser.GameObjects.Text;
  private outcomeText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEY_GAME);
  }

  create(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin is not available.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.outcome = 'flying';
    this.data.set('outcome', this.outcome);

    this.terrain = generateTerrain({
      seed: Date.now(),
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      segments: TERRAIN_SEGMENTS,
      minHeightFraction: TERRAIN_MIN_HEIGHT_FRACTION,
      maxHeightFraction: TERRAIN_MAX_HEIGHT_FRACTION,
      maxStepFraction: TERRAIN_MAX_STEP_FRACTION,
      padSegmentCount: LANDING_PAD_SEGMENT_COUNT,
    });
    this.buildTerrainVisual();

    this.flightState = new FlightState({
      initial: {
        position: { x: LANDER_START_X, y: LANDER_START_Y },
        velocity: { x: 0, y: 0 },
        rotationRadians: 0,
        fuel: MAX_FUEL,
      },
      worldWidth: GAME_WIDTH,
      gravityAccel: GRAVITY_ACCEL,
      thrustAccel: THRUST_ACCEL,
      rotationSpeedRadPerSec: degreesToRadians(ROTATION_SPEED_DEG),
      fuelBurnRate: FUEL_BURN_RATE,
    });

    this.lander = createPaperShape(this, {
      points: [
        { x: 0, y: -LANDER_RADIUS },
        { x: -LANDER_RADIUS, y: LANDER_RADIUS },
        { x: LANDER_RADIUS, y: LANDER_RADIUS },
      ],
      fillColor: LANDER_FILL_COLOR,
    });
    this.lander.container.setPosition(LANDER_START_X, LANDER_START_Y);
    this.lander.container.setDepth(LANDER_LAYER_DEPTH);

    this.add
      .text(GAME_WIDTH / 2, HUD_MARGIN, 'ORBITAL DESCENT', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e0e0e0',
      })
      .setOrigin(ORIGIN_CENTER, 0)
      .setDepth(HUD_LAYER_DEPTH);

    this.add
      .text(
        GAME_WIDTH / 2,
        HUD_MARGIN + GAME_HEIGHT * SUBTITLE_Y_FRACTION,
        'W / UP: thrust  —  A D / ← →: rotate',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#8899aa',
        },
      )
      .setOrigin(ORIGIN_CENTER, 0)
      .setDepth(HUD_LAYER_DEPTH);

    this.fuelText = this.add
      .text(HUD_MARGIN, HUD_MARGIN, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e0e0e0',
      })
      .setDepth(HUD_LAYER_DEPTH);
    this.updateFuelText(MAX_FUEL);

    this.outcomeText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#e0e0e0',
      })
      .setOrigin(ORIGIN_CENTER, ORIGIN_CENTER)
      .setDepth(HUD_LAYER_DEPTH);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.outcome !== 'flying') {
      if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
        this.scene.restart();
      }
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

    this.outcome = safe ? 'landed' : 'crashed';
    // Exposed via Phaser's data manager (not a bare property read) so the
    // Playwright e2e suite can observe the outcome without reaching into
    // canvas-rendered text, which isn't visible to DOM-based locators.
    this.data.set('outcome', this.outcome);
    this.lander.container.setPosition(snapshot.position.x, groundY - LANDER_RADIUS);
    this.lander.setFillColor(safe ? LANDED_COLOR : CRASHED_COLOR);
    this.outcomeText.setText(`${safe ? 'LANDED SAFELY' : 'CRASHED'}\npress R to try again`);
  }

  private buildTerrainVisual(): void {
    const groundPoints = [
      ...this.terrain.points,
      { x: GAME_WIDTH, y: GAME_HEIGHT },
      { x: 0, y: GAME_HEIGHT },
    ];
    const ground = createPaperShape(this, { points: groundPoints, fillColor: TERRAIN_FILL_COLOR });
    ground.container.setDepth(TERRAIN_SHADOW_LAYER_DEPTH);

    const { landingPad } = this.terrain;
    const padPoints = [
      { x: landingPad.xStart, y: landingPad.y },
      { x: landingPad.xEnd, y: landingPad.y },
      { x: landingPad.xEnd, y: GAME_HEIGHT },
      { x: landingPad.xStart, y: GAME_HEIGHT },
    ];
    const pad = createPaperShape(this, { points: padPoints, fillColor: LANDING_PAD_FILL_COLOR });
    pad.container.setDepth(TERRAIN_SHADOW_LAYER_DEPTH);
  }

  private updateFuelText(fuel: number): void {
    const percent = Math.round((fuel / MAX_FUEL) * FUEL_PERCENT_MULTIPLIER);
    this.fuelText.setText(`FUEL: ${percent.toString()}%`);
  }
}
