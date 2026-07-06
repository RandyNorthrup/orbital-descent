import Phaser from 'phaser';
import {
  FUEL_BURN_RATE,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY_ACCEL,
  HUD_MARGIN,
  LANDER_FILL_COLOR,
  LANDER_RADIUS,
  LANDER_START_X,
  LANDER_START_Y,
  MAX_FUEL,
  ROTATION_SPEED_DEG,
  THRUST_ACCEL,
  WORLD_FLOOR_MARGIN,
} from '../constants';
import { FlightState } from '../flight/flight-state';
import { degreesToRadians } from '../physics/lander-physics';
import { SCENE_KEY_GAME } from './scene-keys';

const MILLISECONDS_PER_SECOND = 1000;
const FUEL_PERCENT_MULTIPLIER = 100;
const ORIGIN_CENTER = 0.5;
const SUBTITLE_Y_FRACTION = 0.06;

export class GameScene extends Phaser.Scene {
  private flightState!: FlightState;
  private lander!: Phaser.GameObjects.Triangle;
  private fuelText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;

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

    this.flightState = new FlightState({
      initial: {
        position: { x: LANDER_START_X, y: LANDER_START_Y },
        velocity: { x: 0, y: 0 },
        rotationRadians: 0,
        fuel: MAX_FUEL,
      },
      bounds: { width: GAME_WIDTH, height: GAME_HEIGHT, floorMargin: WORLD_FLOOR_MARGIN },
      gravityAccel: GRAVITY_ACCEL,
      thrustAccel: THRUST_ACCEL,
      rotationSpeedRadPerSec: degreesToRadians(ROTATION_SPEED_DEG),
      fuelBurnRate: FUEL_BURN_RATE,
    });

    this.lander = this.add.triangle(
      LANDER_START_X,
      LANDER_START_Y,
      0,
      -LANDER_RADIUS,
      -LANDER_RADIUS,
      LANDER_RADIUS,
      LANDER_RADIUS,
      LANDER_RADIUS,
      LANDER_FILL_COLOR,
    );

    this.add
      .text(GAME_WIDTH / 2, HUD_MARGIN, 'LUNAR LANDER', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e0e0e0',
      })
      .setOrigin(ORIGIN_CENTER, 0);

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
      .setOrigin(ORIGIN_CENTER, 0);

    this.fuelText = this.add.text(HUD_MARGIN, HUD_MARGIN, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e0e0e0',
    });
    this.updateFuelText(MAX_FUEL);
  }

  override update(_time: number, deltaMs: number): void {
    const rotateLeft = this.cursors.left.isDown || this.keyA.isDown;
    const rotateRight = this.cursors.right.isDown || this.keyD.isDown;
    let rotate: -1 | 0 | 1 = 0;
    if (rotateLeft !== rotateRight) {
      rotate = rotateLeft ? -1 : 1;
    }
    const thrust = this.cursors.up.isDown || this.keyW.isDown;

    const snapshot = this.flightState.tick({ thrust, rotate }, deltaMs / MILLISECONDS_PER_SECOND);

    this.lander.setPosition(snapshot.position.x, snapshot.position.y);
    this.lander.setRotation(snapshot.rotationRadians);
    this.updateFuelText(snapshot.fuel);
  }

  private updateFuelText(fuel: number): void {
    const percent = Math.round((fuel / MAX_FUEL) * FUEL_PERCENT_MULTIPLIER);
    this.fuelText.setText(`FUEL: ${percent.toString()}%`);
  }
}
