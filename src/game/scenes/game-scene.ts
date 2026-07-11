import Phaser from 'phaser';
import {
  COMBATANT_ACCENT_DARKEN_FRACTION,
  COMBATANT_COLLISION_RADIUS,
  COMBATANT_FILL_COLOR_BOTTOM,
  COMBATANT_FILL_COLOR_TOP,
  CRASHED_COLOR_BOTTOM,
  CRASHED_COLOR_TOP,
  ENCOUNTER_SPAWN_HALF_WIDTH_PX,
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
  LANDER_LAYER_DEPTH,
  LANDER_RADIUS,
  LANDER_START_X,
  LANDER_START_Y,
  LANDING_MAX_SAFE_ANGLE_DEG,
  LANDING_MAX_SAFE_SPEED,
  LANDING_PAD_FILL_COLOR_BOTTOM,
  LANDING_PAD_FILL_COLOR_TOP,
  OBSTACLE_FILL_COLOR_BOTTOM,
  OBSTACLE_FILL_COLOR_TOP,
  PARTICLE_BURST_ALPHA_END,
  PARTICLE_BURST_ALPHA_START,
  PARTICLE_BURST_ANGLE_MAX_DEG,
  PARTICLE_BURST_ANGLE_MIN_DEG,
  PARTICLE_DOT_MAX_ALPHA,
  PARTICLE_DOT_RADIUS_PX,
  PROJECTILE_COLOR,
  PROJECTILE_GLOW_MAX_ALPHA,
  PROJECTILE_GLOW_RADIUS,
  PROJECTILE_RADIUS,
  RESULT_TRANSITION_DELAY_MS,
  SCORE_BASE_LANDING_BONUS,
  SCORE_MAX_FUEL_BONUS,
  SCORE_MAX_PRECISION_BONUS,
  SCORE_MAX_TIME_BONUS,
  SCORE_TIME_PAR_MS,
  SHIP_BASE_HULL_POINTS,
  TERRAIN_ETCH_LINE_COUNT,
  TERRAIN_MAX_HEIGHT_FRACTION,
  TERRAIN_MIN_HEIGHT_FRACTION,
  TERRAIN_MAX_STEP_FRACTION,
  TERRAIN_SEGMENTS,
  TERRAIN_SHADOW_LAYER_DEPTH,
  LANDING_PAD_SEGMENT_COUNT,
  THRUST_PARTICLE_ALPHA_END,
  THRUST_PARTICLE_ALPHA_START,
  THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG,
  THRUST_PARTICLE_ANGLE_SPREAD_DEG,
  THRUST_PARTICLE_FREQUENCY_MS,
  THRUST_PARTICLE_LIFESPAN_MS,
  THRUST_PARTICLE_QUANTITY_PER_EMIT,
  THRUST_PARTICLE_SCALE_END,
  THRUST_PARTICLE_SCALE_START,
  THRUST_PARTICLE_SPEED_MAX_PX_PER_SEC,
  THRUST_PARTICLE_SPEED_MIN_PX_PER_SEC,
  UI_BODY_FONT_SIZE_PX,
  UI_MUTED_TEXT_COLOR,
  UI_TEXT_COLOR,
  UI_TITLE_FONT_SIZE_PX,
  WEAPON_PROJECTILE_RANGE,
  WEAPON_PROJECTILE_SPEED,
  WORLD_WIDTH,
} from '../constants';
import { FlightState } from '../flight/flight-state';
import { degreesToRadians, headingVector, type Vector2 } from '../physics/lander-physics';
import { CRASH_CUE, LANDING_CUE, THRUST_CUE, WEAPON_FIRE_CUE } from '../audio/sfx-cues';
import { playSfxCue, type SfxCueHandle } from '../rendering/audio-player';
import { isAudioMuted } from '../persistence/audio-settings';
import { particleBurstForImpact, type ImpactKind } from '../effects/particle-burst';
import { screenShakeForImpact, type ScreenShakeKind } from '../effects/screen-shake';
import { advanceCombatantState, type CombatantState } from '../combat/combatant';
import { encounterSpawnY, spawnEncounterCombatants } from '../combat/encounter';
import {
  advanceProjectile,
  isProjectileExpired,
  spawnProjectile,
  type Projectile,
} from '../combat/projectile';
import { absorbHit, effectiveDamage, type ShipCombatState } from '../combat/damage';
import { isWithinRadius } from '../combat/collision';
import { recordHighScore } from '../persistence/high-scores';
import { getSafeLocalStorage } from '../persistence/safe-local-storage';
import { loadShipProgress } from '../persistence/ship-progress';
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
import {
  cycleActiveUtility,
  cycleActiveWeapon,
  initialEquipmentProgress,
  loadEquipmentProgress,
  type EquipmentProgressState,
} from '../persistence/equipment-progress';
import { applyPermanentUpgrades, UPGRADES } from '../ships/upgrades';
import {
  effectiveThrustAccel,
  findEquipmentById,
  summarizePassiveEffects,
  totalCarriedMass,
  EQUIPMENT_ITEMS,
  type EquipmentItem,
} from '../equipment/equipment';
import { resolveEquippedItems } from '../equipment/loadout';
import type { Base } from '../bases/base';
import { BODIES } from '../planets/bodies';
import { findBodyById } from '../bases/bases';
import type { CelestialBody, Hazard } from '../planets/celestial-body';
import type { ShipClass } from '../ships/ship';
import { SHIPS, findShipById } from '../ships/ships';
import { calculateScore } from '../scoring/score';
import { isOnLandingPad, isSafeLanding } from '../terrain/landing';
import { isCollidingWithObstacle } from '../terrain/obstacles';
import {
  generateTerrain,
  getTerrainHeightAt,
  type GenerateTerrainOptions,
  type Obstacle,
  type Terrain,
} from '../terrain/terrain-generator';
import { hexToCss } from '../rendering/canvas-texture-utils';
import { createPaperShape, type PaperShape } from '../rendering/paper-shape';
import { createShipVisual, type ShipVisual } from '../rendering/ship-visual';
import { darken } from '../rendering/color-mix';
import { findCombatantSilhouette } from '../combat/combatant-silhouette';
import { createRadialGlowImage, bakeRadialGlowTexture } from '../rendering/radial-glow';
import { buildBackground } from '../rendering/background';
import {
  SCENE_KEY_GAME,
  SCENE_KEY_RESULT,
  SCENE_KEY_SETTINGS,
  SCENE_KEY_WORLD_MAP,
} from './scene-keys';
import { cargoMass, EMPTY_MANIFEST, type CargoManifest } from '../missions/cargo';
import { massUtilization, perTripCargoReward, riskBonus } from '../missions/reward';
import { resolveTripOutcome } from '../missions/mission-trip';
import type { MissionState } from '../missions/mission';
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
const HULL_PERCENT_MULTIPLIER = 100;
/** Vertical spacing between stacked top-left HUD text lines (Milestone 11
 * adds the second one, `hullText`, below `fuelText`). */
const HUD_ROW_HEIGHT_PX = UI_BODY_FONT_SIZE_PX + HUD_MARGIN;
const ORIGIN_CENTER = 0.5;
const LANDER_TEXTURE_KEY = 'paper-fill-lander';
const TERRAIN_TEXTURE_KEY = 'paper-fill-terrain';
const LANDING_PAD_TEXTURE_KEY = 'paper-fill-landing-pad';
const ENGINE_GLOW_TEXTURE_KEY = 'lander-engine-glow';
const PROJECTILE_GLOW_TEXTURE_KEY = 'projectile-glow';
const OBSTACLE_TEXTURE_KEY_PREFIX = 'paper-fill-obstacle-';
/** Fewer etched strokes than the full terrain ground (`TERRAIN_ETCH_LINE_COUNT`)
 * — an obstacle's silhouette is much smaller, so the same density would
 * read as visual noise rather than texture. */
const OBSTACLE_ETCH_LINE_COUNT = 5;
/** One texture key per spawned combatant instance (Milestone 11), keyed by
 * `combatantSpawnCounter` below, not shared across instances — a single
 * shared key rebaked once per simultaneously-spawned combatant (this
 * milestone's first attempt) corrupts Phaser's WebGL texture state when
 * two or more images reference a key still being rebaked the same frame
 * (confirmed directly: a real browser run crashed the render loop with
 * "Cannot read properties of null (reading 'resolution')" the instant a
 * 4-combatant swarm spawned). Mirrors `OBSTACLE_TEXTURE_KEY_PREFIX`'s own
 * per-index-key precedent, just keyed by spawn order instead of array
 * index since combatants are created/destroyed throughout a flight, not
 * all up front. */
const COMBATANT_TEXTURE_KEY_PREFIX = 'paper-fill-combatant-';
const COMBATANT_ETCH_LINE_COUNT = 3;
/** Small-piece cut-edge treatment for combatant pieces — same reasoning
 * as ship-visual.ts's PIECE_OUTLINE_WIDTH/PIECE_SHADOW_OFFSET (the global
 * outline/shadow proportions swallow fills at this scale). */
const COMBATANT_PIECE_OUTLINE_WIDTH = 2;
const COMBATANT_PIECE_SHADOW_OFFSET = 3;
/** Milestone 13's particle-dot textures — one baked color per emitter (see
 * `PARTICLE_DOT_RADIUS_PX`'s own doc comment in constants.ts for why baking
 * beats Phaser's runtime tint). `combatantHit`/`combatantDefeated` share
 * this one key: same color, two different `ParticleEmitterConfig`s built
 * from `particleBurstForImpact`'s own distinct count/speed/lifespan/scale
 * per kind. */
const THRUST_PARTICLE_TEXTURE_KEY = 'particle-dot-thrust';
const OBSTACLE_PARTICLE_TEXTURE_KEY = 'particle-dot-obstacle';
const COMBATANT_PARTICLE_TEXTURE_KEY = 'particle-dot-combatant';
const SHIP_DAMAGE_PARTICLE_TEXTURE_KEY = 'particle-dot-ship-damage';

type GameOutcome = 'flying' | FlightOutcome;

/** One live projectile in flight plus the Phaser display object tracking it
 * — `state` is reassigned each tick (immutable data, mutable box), matching
 * this scene's existing `equipmentProgress`-style plain-field convention.
 * The visual is a container since Milestone 14: a soft radial glow behind
 * the bolt circle, so a shot reads as an energy bolt, not a flat dot —
 * destroying the container destroys both pieces. */
interface LiveProjectile {
  state: Projectile;
  readonly visual: Phaser.GameObjects.Container;
}

/** One live combatant plus its paper-shape visual — same mutable-box
 * convention as `LiveProjectile` above. */
interface LiveCombatant {
  state: CombatantState;
  readonly visual: PaperShape;
}

/**
 * Milestone 9.5's per-trip mission payload — deliberately just the one
 * field this scene can't derive itself. Everything else about the mission
 * (its id, structure, flavor, cumulative progress so far) lives in the
 * live `MissionState` the caller must already have set on `this.registry`
 * under the `'missionState'` key *before* launching this scene (PLAN.md
 * §9.5.3 point 6 — `this.registry` survives the `scene.start()` this scene
 * performs on landing/crash, unlike `this.data`).
 */
export interface MissionContext {
  /** How much cargo this specific trip is carrying, chosen at the
   * loadout/mission-select screen — `{troops: 0, supplies: 0}` for a
   * relay's origin (pickup) leg, since nothing is delivered/credited until
   * its destination leg (PLAN.md §9.5.2). */
  readonly manifestThisTrip: CargoManifest;
  /** Relay's destination leg only — fuel remaining after the origin leg's
   * landing, minus the abstracted transit's own fuel cost (computed by the
   * world-map/transit flow, `missions/relay.ts`'s `transitFuelCost`,
   * *before* this scene ever launches; a transit that would leave less than
   * zero here is the "stranded" failure mode, PLAN.md §9.5.2, and never
   * reaches this scene at all). Absent for every other trip/leg, which
   * start at a full tank instead (PLAN.md §9.5.3 point 7: "you refuel at
   * base/menu between trips"). */
  readonly startingFuel?: number;
}

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
  /** Present only for a trip/leg flown in service of a Milestone 9.5
   * mission — absent reproduces certified pre-9.5 behavior exactly (this
   * scene never reads `this.registry`'s mission keys, and always exits to
   * `ResultScene` on landing/crash, same as every milestone before 9.5). */
  readonly mission?: MissionContext;
}

export class GameScene extends Phaser.Scene {
  private base: Base | null = null;
  private body!: CelestialBody;
  private ship!: ShipClass;
  /** `ship` with every owned Milestone 9 permanent upgrade folded in
   * (`ships/upgrades.ts`'s `applyPermanentUpgrades`) — every stat read
   * during this flight (thrust, mass, fuel capacity, burn rate, handling)
   * reads from this, never from `ship` directly, so an owned upgrade can't
   * silently fail to apply on some call sites but not others. */
  private effectiveShip!: ShipClass;
  /** This flight's actually-carried equipment, already trimmed to
   * `effectiveShip`'s live slot count/mass budget (`equipment/loadout.ts`'s
   * `resolveEquippedItems`) — resolved once in `init()`, not re-resolved
   * every frame, since neither the ship nor the persisted loadout changes
   * mid-flight. */
  private carriedItems: readonly EquipmentItem[] = [];
  private equipmentProgress!: EquipmentProgressState;
  /** Present only for a trip/leg flown in service of a Milestone 9.5
   * mission — see `MissionContext`'s own doc comment. */
  private missionContext: MissionContext | null = null;
  /** Equipment mass plus this trip's cargo mass (Milestone 9.5's amended,
   * shared mass-budget formula, PLAN.md §9.5.1) — `0` cargo mass whenever
   * `missionContext` is `null`, so this reduces to Milestone 9's plain
   * equipment-only carried mass for every non-mission flight. Computed
   * once in `init()`; feeds both `baseEffectiveThrustAccel` below and this
   * trip's `riskBonus` in `resolveMissionTrip()`. */
  private totalCarriedMassThisFlight = 0;
  /** `effectiveThrustAccel(effectiveShip, carriedMass)` — the thrust
   * acceleration this flight uses absent an active thrust-burst utility
   * item; `update()` adds `thrustBoostBonusAccel` on top while
   * `thrustBoostRemainingMs` is positive. */
  private baseEffectiveThrustAccel = 0;
  private effectiveFuelCapacity = 0;
  /** `body.hazard`, unless an equipped Corrosion Coating/Thermal Lining
   * utility item negates it (`equipment/equipment.ts`'s
   * `summarizePassiveEffects`) — computed once in `init()` and passed to
   * `FlightState` unchanged for the rest of the flight. */
  private effectiveHazard: Hazard = null;
  private thrustBoostRemainingMs = 0;
  private thrustBoostBonusAccel = 0;
  private flightState!: FlightState;
  private terrain!: Terrain;
  private lander!: ShipVisual;
  private outcome: GameOutcome = 'flying';
  /** Real flight duration so far, in ms — one of calculateScore's three
   * factors. Only accumulates while this scene's update() actually runs,
   * so pausing (Phaser stops calling update() on a paused scene entirely)
   * doesn't count against it. */
  private elapsedMs = 0;
  private fuelText!: Phaser.GameObjects.Text;
  /** Only created for a base with real `encounters` (Milestone 11) — `null`
   * for every pre-Milestone-11 base and free flight, which never take
   * combat damage at all. */
  private hullText: Phaser.GameObjects.Text | null = null;
  private outcomeText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  /** Milestone 9's cycle/trigger input (PLAN.md's "as input/UI, not combat
   * resolution — that's M11" scope note): Q/E cycle the active weapon/
   * utility item among whatever's actually carried; Space/F trigger
   * whichever is currently active. Plain `JustDown` (not `ArmedKeyGuard`)
   * is correct here — unlike Escape, none of these keys ever causes a
   * scene transition into GameScene, so there's no "held over from the
   * action that triggered this scene" case to guard against. */
  private keyCycleWeapon!: Phaser.Input.Keyboard.Key;
  private keyCycleUtility!: Phaser.Input.Keyboard.Key;
  private keyTriggerWeapon!: Phaser.Input.Keyboard.Key;
  private keyTriggerUtility!: Phaser.Input.Keyboard.Key;
  private pauseGuard!: ArmedKeyGuard;
  /** Sum of every equipped shield item's `hitsAbsorbed`
   * (`equipment/equipment.ts`'s `summarizePassiveEffects`) — resolved once
   * in `init()`, seeded into `shipCombat.shieldHitsRemaining` fresh in
   * `create()` each flight. */
  private shieldHitsAvailable = 0;
  /** Milestone 11's per-flight combat state — hull starts at the flat,
   * ship-independent `SHIP_BASE_HULL_POINTS` every flight (`constants.ts`'s
   * own doc comment on why hull isn't a per-ship stat). */
  private shipCombat: ShipCombatState = { hull: 0, shieldHitsRemaining: 0 };
  private weaponCooldownRemainingMs = 0;
  /** Non-null exactly while the continuous thrust cue (`audio/sfx-cues.ts`'s
   * `THRUST_CUE`) is currently playing — started the frame thrust input
   * first goes down, stopped (via `stopThrustSound()`, which also resets
   * this field to null) the frame it's released, at outcome resolution,
   * and when pausing. Explicitly stopped-and-reset in `create()` too, not
   * just reset — an orphaned retriggering loop (`rendering/
   * audio-player.ts`'s own setTimeout-driven scheduling) has no other way
   * to ever stop once its only handle reference is dropped, the same
   * "never just reset a per-flight field, stop what it's holding first"
   * lesson `shipCombat`/`hullText` already learned in Milestones 11/12. */
  private thrustSoundHandle: SfxCueHandle | null = null;
  /** Milestone 13's thrust exhaust — a continuous flow emitter, built fresh
   * (like `this.lander`) in `create()` each flight, so unlike
   * `thrustSoundHandle` above it needs no separate per-flight reset field:
   * the previous flight's own emitter instance is torn down by Phaser's own
   * scene-restart display-list teardown, the same reasoning `hullText`'s own
   * doc comment already gives for why that field alone doesn't need
   * stop-and-reset in `create()`. Repositioned/re-angled every frame while
   * thrust is held (`updateThrustParticles`) and explicitly `.stop()`-ed at
   * outcome resolution — an emitter left `emitting` after the flight ends
   * would otherwise keep spawning particles from its last position forever,
   * the exact "never just reset a per-flight field, stop what it's holding
   * first" lesson `thrustSoundHandle` itself already learned. */
  private thrustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Milestone 13's impact/weapon particle bursts — one explode-only emitter
   * per `ImpactKind` (`effects/particle-burst.ts`), built fresh in
   * `create()` alongside `thrustParticles` above for the same reason. Never
   * enters a continuous `emitting` flow state (`ParticleEmitter.explode()`
   * always leaves `frequency === -1`, see that method's own Phaser source
   * doc comment), so — unlike `thrustParticles` — there is no "still
   * running after the flight ends" case to guard against. */
  private impactParticles!: Readonly<
    Record<ImpactKind, Phaser.GameObjects.Particles.ParticleEmitter>
  >;
  private liveProjectiles: LiveProjectile[] = [];
  private liveCombatants: LiveCombatant[] = [];
  /** `EncounterSpec.id`s already spawned this flight — an encounter
   * triggers exactly once, the moment the player first descends to its own
   * `triggerAltitude` (checked every frame, since altitude only ever
   * crosses that threshold moving downward). */
  private triggeredEncounterIds = new Set<string>();
  /** Runtime-only "has this obstacle been weapon-cleared this flight"
   * tracking — kept separate from `this.terrain.obstacles` itself (the
   * same array reference `bases.ts`'s curated `Obstacle[]` constants
   * export) so clearing one in a live flight never mutates that shared,
   * module-level authored data. */
  private clearedObstacleIndices = new Set<number>();
  private obstacleVisuals: PaperShape[] = [];
  /** Monotonically increasing, never reused within a flight -- see
   * `COMBATANT_TEXTURE_KEY_PREFIX`'s own doc comment for why each spawned
   * combatant needs a distinct texture key. */
  private combatantSpawnCounter = 0;

  constructor() {
    super(SCENE_KEY_GAME);
  }

  init(data: GameSceneData = {}): void {
    this.base = data.base ?? null;
    this.body = this.base === null ? BODIES[0] : findBodyById(this.base.worldId);
    this.ship = this.resolveSelectedShip();
    this.missionContext = data.mission ?? null;

    const storage = getSafeLocalStorage();
    const upgradeProgress =
      storage === null ? initialUpgradeProgress() : loadUpgradeProgress(storage, UPGRADES);
    this.equipmentProgress =
      storage === null
        ? initialEquipmentProgress()
        : loadEquipmentProgress(storage, EQUIPMENT_ITEMS);

    this.effectiveShip = applyPermanentUpgrades(
      this.ship,
      ownedUpgrades(upgradeProgress, UPGRADES),
    );
    this.carriedItems = resolveEquippedItems(
      this.effectiveShip,
      this.equipmentProgress.equippedItemIds,
      EQUIPMENT_ITEMS,
    );

    const passiveEffects = summarizePassiveEffects(this.carriedItems);
    this.effectiveFuelCapacity = this.effectiveShip.fuelCapacity + passiveEffects.fuelCapacityBonus;
    this.shieldHitsAvailable = passiveEffects.shieldHitsAvailable;
    this.totalCarriedMassThisFlight =
      totalCarriedMass(this.carriedItems) +
      cargoMass(this.missionContext?.manifestThisTrip ?? EMPTY_MANIFEST);
    this.baseEffectiveThrustAccel = effectiveThrustAccel(
      this.effectiveShip,
      this.totalCarriedMassThisFlight,
    );

    const rawHazard = this.body.hazard;
    const hazardNegated =
      (rawHazard?.type === 'corrosive' && passiveEffects.corrosionResistant) ||
      (rawHazard?.type === 'cold' && passiveEffects.coldResistant);
    this.effectiveHazard = hazardNegated ? null : rawHazard;

    this.thrustBoostRemainingMs = 0;
    this.thrustBoostBonusAccel = 0;
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
    this.keyCycleWeapon = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyCycleUtility = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyTriggerWeapon = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyTriggerUtility = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this.outcome = 'flying';
    this.data.set('outcome', this.outcome);
    // GameScene is one long-lived Phaser instance reused across restarts
    // (only create() re-runs, not the constructor), so stale keys from a
    // previous flight must be explicitly cleared — otherwise a crash
    // following an earlier safe landing would still report that old score,
    // and (Milestone 10) a flight that never reaches an obstacle would
    // still read a previous flight's crashedOnObstacle=true while it's
    // still mid-air, before this flight's own resolution overwrites it.
    this.data.remove('score');
    this.data.remove('crashedOnObstacle');
    this.data.remove('destroyedInCombat');
    this.data.remove('shipHull');
    this.data.remove('shieldHitsRemaining');
    this.data.remove('liveCombatantCount');
    this.data.set('activeWeaponId', this.equipmentProgress.activeWeaponId);
    this.data.set('activeUtilityId', this.equipmentProgress.activeUtilityId);
    this.elapsedMs = 0;

    // Milestone 11: fresh per-flight combat state -- see this class's own
    // field doc comments (`shipCombat`/`weaponCooldownRemainingMs`/
    // `liveProjectiles`/`liveCombatants`/`triggeredEncounterIds`/
    // `clearedObstacleIndices`) for why each must be reset explicitly
    // rather than left over from a previous flight, same rationale as the
    // `this.data.remove` calls above.
    this.shipCombat = {
      hull: SHIP_BASE_HULL_POINTS,
      shieldHitsRemaining: this.shieldHitsAvailable,
    };
    this.weaponCooldownRemainingMs = 0;
    this.liveProjectiles = [];
    this.liveCombatants = [];
    this.triggeredEncounterIds = new Set();
    this.clearedObstacleIndices = new Set();
    this.combatantSpawnCounter = 0;
    this.stopThrustSound();
    // The Text object itself (if any) was already destroyed by Phaser's own
    // scene-shutdown display-list teardown when the previous flight ended
    // (confirmed directly: GameObject.destroy() doesn't throw on a later
    // .setText() call, so this wasn't a crash -- just a stale reference
    // quietly doing wasted, undefined-behavior-adjacent work against a torn
    // -down object). Resetting the field itself here, unconditionally, is
    // what every sibling combat field above already does; the conditional
    // block further down in this method recreates a fresh one only for a
    // base with real encounters.
    this.hullText = null;

    buildBackground(this, this.body);

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
    this.buildObstacleVisuals();

    this.flightState = new FlightState({
      initial: {
        position: { x: LANDER_START_X, y: LANDER_START_Y },
        velocity: { x: 0, y: 0 },
        rotationRadians: 0,
        // A relay's destination leg starts with whatever fuel the transit
        // left it (MissionContext.startingFuel's own doc comment) instead
        // of a full tank — every other flight, mission or not, still
        // starts full.
        fuel: this.missionContext?.startingFuel ?? this.effectiveFuelCapacity,
      },
      gravityAccel: this.body.gravityAccel,
      // Folds in owned permanent upgrades and equipped mass (Milestone 9) —
      // see effectiveShip/carriedItems's own doc comments in init().
      thrustAccel: this.baseEffectiveThrustAccel,
      rotationSpeedRadPerSec: degreesToRadians(this.effectiveShip.handling),
      fuelBurnRate: this.effectiveShip.burnRate,
      dragCoefficient: this.body.atmosphereDensity,
      hazard: this.effectiveHazard,
    });

    // Milestone 14: the ship renders as its archetype's own multi-piece
    // papercraft silhouette (ships/silhouette.ts + rendering/ship-visual.ts)
    // in its own hull colors — collision stays the fixed LANDER_RADIUS
    // circle, unchanged; only artwork changed.
    this.lander = createShipVisual(this, {
      ship: this.ship,
      textureKeyPrefix: LANDER_TEXTURE_KEY,
    });
    this.lander.container.setPosition(LANDER_START_X, LANDER_START_Y);
    this.lander.container.setDepth(LANDER_LAYER_DEPTH);

    // A static glow accent at the engine base — part of the ship's own
    // artwork per the approved art direction, always present regardless of
    // whether thrust is actually held. `buildParticleEmitters()` below adds
    // Milestone 13's thrust-*reactive* particle exhaust on top of this same
    // static halo, not instead of it. addAt(0) keeps the halo behind every
    // paper piece of the craft, so it reads as glow *around* the hull base.
    const engineGlow = createRadialGlowImage(
      this,
      ENGINE_GLOW_TEXTURE_KEY,
      0,
      LANDER_RADIUS,
      ENGINE_GLOW_RADIUS,
      ENGINE_GLOW_COLOR,
      ENGINE_GLOW_MAX_ALPHA,
    );
    this.lander.container.addAt(engineGlow, 0);

    this.buildParticleEmitters();

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
    this.updateFuelText(this.effectiveFuelCapacity);

    // Milestone 11: only a base with real encounters ever moves this value
    // away from full, so the readout only exists at all when it can mean
    // something -- every pre-Milestone-11 base/free flight renders exactly
    // the HUD it always has.
    if ((this.base?.encounters.length ?? 0) > 0) {
      this.hullText = this.add
        .text(HUD_MARGIN, HUD_MARGIN + HUD_ROW_HEIGHT_PX, '', {
          fontFamily: 'monospace',
          fontSize: `${UI_BODY_FONT_SIZE_PX.toString()}px`,
          color: hexToCss(UI_TEXT_COLOR),
        })
        .setDepth(HUD_LAYER_DEPTH)
        .setScrollFactor(0);
      this.updateHullText();
    }

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
      // Phaser stops calling this scene's update() while paused, but the
      // thrust loop's own retriggering (rendering/audio-player.ts's
      // setTimeout scheduling) is not driven by update() at all, so it
      // would otherwise keep chugging in the background for the whole
      // time Settings is up if thrust happened to be held on this exact
      // frame. The particle emitter itself doesn't need this same rescue —
      // Phaser's own Scene Systems (verified directly:
      // node_modules/phaser/src/scene/SceneManager.js's update() only
      // steps scenes whose status is <= RUNNING, and PAUSED sorts above
      // it) stop calling every GameObject's preUpdate, including a live
      // ParticleEmitter's, the instant this scene pauses — but stopping it
      // explicitly here too costs nothing and keeps its `emitting` flag
      // truthful rather than relying on that engine behavior implicitly.
      this.stopThrustSound();
      this.thrustParticles.stop();
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
    if (thrust && this.thrustSoundHandle === null) {
      this.thrustSoundHandle = playSfxCue(this, THRUST_CUE, isAudioMuted());
    } else if (!thrust && this.thrustSoundHandle !== null) {
      this.stopThrustSound();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyCycleWeapon)) {
      this.equipmentProgress = cycleActiveWeapon(
        this.equipmentProgress,
        this.effectiveShip,
        EQUIPMENT_ITEMS,
      );
      this.data.set('activeWeaponId', this.equipmentProgress.activeWeaponId);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyCycleUtility)) {
      this.equipmentProgress = cycleActiveUtility(
        this.equipmentProgress,
        this.effectiveShip,
        EQUIPMENT_ITEMS,
      );
      this.data.set('activeUtilityId', this.equipmentProgress.activeUtilityId);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyTriggerWeapon)) {
      this.triggerActiveWeapon();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyTriggerUtility)) {
      this.triggerActiveUtility();
    }

    if (this.thrustBoostRemainingMs > 0) {
      this.thrustBoostRemainingMs = Math.max(0, this.thrustBoostRemainingMs - deltaMs);
    }
    if (this.weaponCooldownRemainingMs > 0) {
      this.weaponCooldownRemainingMs = Math.max(0, this.weaponCooldownRemainingMs - deltaMs);
    }
    const thrustAccelThisTick =
      this.thrustBoostRemainingMs > 0
        ? this.baseEffectiveThrustAccel + this.thrustBoostBonusAccel
        : this.baseEffectiveThrustAccel;

    const snapshot = this.flightState.tick(
      { thrust, rotate },
      deltaMs / MILLISECONDS_PER_SECOND,
      thrustAccelThisTick,
    );
    this.elapsedMs += deltaMs;
    this.updateFuelText(snapshot.fuel);
    this.advanceCombat(snapshot.position, deltaMs / MILLISECONDS_PER_SECOND);
    this.updateThrustParticles(thrust, snapshot.position, snapshot.rotationRadians);

    const groundY = getTerrainHeightAt(this.terrain.points, snapshot.position.x);
    // Milestone 10: checked every frame regardless of ground proximity — a
    // spire/debris obstacle can sit well above ground level, so a hit can
    // happen before the ground-contact check below would ever trigger.
    // Colliding with any *live* (not weapon-cleared, Milestone 11) obstacle
    // is unconditionally a crash, so it always short-circuits
    // `onPad`/`isSafeLanding` below rather than being folded into their
    // inputs. Milestone 11: a ship whose combat hull just reached 0
    // (`advanceCombat` above) is the same kind of forced, unconditional
    // crash, from a different cause.
    const hitObstacle = this.findLiveObstacleIndexAt(snapshot.position, LANDER_RADIUS) !== -1;
    const destroyedInCombat = this.shipCombat.hull <= 0;
    const forcedCrash = hitObstacle || destroyedInCombat;
    if (!forcedCrash && snapshot.position.y + LANDER_RADIUS < groundY) {
      this.lander.container.setPosition(snapshot.position.x, snapshot.position.y);
      this.lander.container.setRotation(snapshot.rotationRadians);
      return;
    }

    const onPad = !forcedCrash && isOnLandingPad(snapshot.position.x, this.terrain.landingPad);
    const safe =
      !forcedCrash &&
      isSafeLanding(snapshot, onPad, {
        maxSafeSpeed: LANDING_MAX_SAFE_SPEED,
        maxSafeAngleRadians: degreesToRadians(LANDING_MAX_SAFE_ANGLE_DEG),
      });

    const outcome: FlightOutcome = safe ? 'landed' : 'crashed';
    this.outcome = outcome;
    // Exposed via Phaser's data manager (not a bare property read) so the
    // Playwright e2e suite can observe the outcome without reaching into
    // canvas-rendered text, which isn't visible to DOM-based locators.
    this.data.set('outcome', outcome);
    // The thrust loop/particles must stop the instant flight ends, even if
    // thrust was still held on the exact frame the outcome resolved —
    // update() returns early for every subsequent frame once
    // `this.outcome !== 'flying'` (top of this method), so this is the
    // only point left that will ever run for this flight. Unlike the pause
    // branch above, the scene keeps fully running here (it isn't paused),
    // so `thrustParticles` would otherwise keep silently emitting from its
    // last position forever — the exact "never just reset a per-flight
    // field, stop what it's holding first" lesson `thrustSoundHandle`
    // itself already learned.
    this.stopThrustSound();
    this.thrustParticles.stop();
    playSfxCue(this, safe ? LANDING_CUE : CRASH_CUE, isAudioMuted());
    // A crash shakes the camera (a real off-pad/obstacle/combat crash, not
    // a normal safe landing) — screenShakeForImpact('crash') is this
    // milestone's strongest/longest profile, matching this being the
    // flight-ending event.
    if (!safe) {
      this.triggerScreenShake('crash');
    }
    // Milestone 10/11: an obstacle hit, a combat destruction, and an
    // ordinary off-pad crash all resolve to the same 'crashed' outcome
    // above — these two keys are what let the e2e suite tell them apart
    // without reaching into canvas-rendered color, same rationale as
    // 'outcome' itself.
    this.data.set('crashedOnObstacle', hitObstacle);
    this.data.set('destroyedInCombat', destroyedInCombat);
    // A forced crash (obstacle or combat) freezes the lander exactly where
    // it happened (often mid-air) — snapping it to `groundY - LANDER_RADIUS`
    // would be wrong/misleading for a crash that never touched the ground.
    const touchdownY = forcedCrash ? snapshot.position.y : groundY - LANDER_RADIUS;
    this.lander.container.setPosition(snapshot.position.x, touchdownY);
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
    // Milestone 9.5: this trip/leg's own calculateScore output, summed into
    // the mission's scoreAccumulated regardless of outcome (0 for a crash,
    // matching `resolveTripOutcome`'s own "credited only on safe landing"
    // rule -- passing 0 here is harmless since a crash's resolution branch
    // never reaches `recordDelivery` at all).
    let scoreThisTrip = 0;
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
          maxFuel: this.effectiveFuelCapacity,
          baseLandingBonus: SCORE_BASE_LANDING_BONUS,
          maxFuelBonus: SCORE_MAX_FUEL_BONUS,
          maxPrecisionBonus: SCORE_MAX_PRECISION_BONUS,
          maxTimeBonus: SCORE_MAX_TIME_BONUS,
          timeParMs: SCORE_TIME_PAR_MS,
        },
      );
      scoreThisTrip = score;
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

    if (this.missionContext !== null) {
      this.resolveMissionTrip(safe, scoreThisTrip, snapshot.fuel);
      return;
    }

    this.time.delayedCall(RESULT_TRANSITION_DELAY_MS, () => {
      this.scene.start(SCENE_KEY_RESULT, resultData);
    });
  }

  /**
   * Milestone 9.5: resolves this trip/leg's mission consequences
   * (`missions/mission-trip.ts`'s `resolveTripOutcome` — this method only
   * renders whatever it returns, per this project's "scenes render state,
   * they don't compute it" rule) and always exits to the world-map/mission
   * screen afterward — never `ResultScene`, and never waiting on `R`,
   * regardless of how the mission itself resolves (PLAN.md §9.5.3's
   * corrected "always return to the menu" model, §9.5.8 item 9).
   */
  private resolveMissionTrip(safe: boolean, scoreThisTrip: number, fuelRemaining: number): void {
    const missionContext = this.missionContext;
    if (missionContext === null) {
      throw new Error('resolveMissionTrip: called without a missionContext.');
    }
    // `this.registry` (Phaser's game-global DataManager, unlike `this.data`)
    // survives the `scene.start()` below -- the caller that launched this
    // trip (Milestone 9.5's world-map/mission screen) must already have set
    // this key; a missing key here is a real caller-programming-error, not
    // a reachable state this scene should silently paper over.
    const missionState = this.registry.get('missionState') as MissionState | undefined;
    if (missionState === undefined) {
      throw new Error(
        'resolveMissionTrip: this.registry is missing "missionState" -- the caller must set it before launching a mission-context flight.',
      );
    }

    const cargoRewardThisTrip = perTripCargoReward(
      missionContext.manifestThisTrip,
      riskBonus(massUtilization(this.totalCarriedMassThisFlight, this.effectiveShip.massBudget)),
    );
    const resolution = resolveTripOutcome(
      missionState,
      safe,
      missionContext.manifestThisTrip,
      cargoRewardThisTrip,
      scoreThisTrip,
      Date.now(),
    );
    // The authoritative, cross-scene mission progress record the world-map
    // screen reads after this scene shuts down.
    this.registry.set('missionState', resolution.missionState);
    this.registry.set('missionStatus', resolution.missionStatus);
    // Mirrored onto this scene's own DataManager too, alongside 'outcome',
    // so the e2e suite can observe this trip's mission consequence during
    // the same brief pause window it already polls 'outcome' in, without
    // reaching into a scene that may already be shutting down.
    this.data.set('missionStatus', resolution.missionStatus);
    // A relay's origin (pickup) leg hands this off to the world-map/transit
    // flow, which deducts `missions/relay.ts`'s `transitFuelCost` from it to
    // compute the destination leg's `MissionContext.startingFuel` (or
    // concludes the relay as "stranded" if that would go negative, PLAN.md
    // §9.5.2) -- irrelevant, and harmless to still set, for every other
    // structure, which always starts its next trip at a full tank instead.
    this.registry.set('fuelRemainingAtTouchdown', safe ? fuelRemaining : null);

    this.time.delayedCall(RESULT_TRANSITION_DELAY_MS, () => {
      this.scene.start(SCENE_KEY_WORLD_MAP);
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

  /** Milestone 10: renders every static obstacle this base's `terrainOptions`
   * authors (empty for every pre-Milestone-10 base and for free flight,
   * which never sets `obstacles` — this loop is then simply a no-op). A
   * 'spire' draws as an upward-pointing triangle from its own footprint
   * (ground-attached rock); 'debris' draws as a plain rectangle (a floating
   * chunk, not attached to anything). Depth matches the ground/pad's own
   * `TERRAIN_SHADOW_LAYER_DEPTH` — obstacles are part of the same terrain
   * layer, not a separate foreground/background plane. Milestone 11: shapes
   * are kept in `this.obstacleVisuals`, indexed the same as
   * `this.terrain.obstacles`, so a weapon-cleared obstacle
   * (`advanceProjectiles`) can destroy its own visual by index. */
  private buildObstacleVisuals(): void {
    this.obstacleVisuals = this.terrain.obstacles.map((obstacle: Obstacle, index: number) => {
      const midX = (obstacle.xStart + obstacle.xEnd) / 2;
      const points =
        obstacle.kind === 'spire'
          ? [
              { x: obstacle.xStart, y: obstacle.yBottom },
              { x: midX, y: obstacle.yTop },
              { x: obstacle.xEnd, y: obstacle.yBottom },
            ]
          : [
              { x: obstacle.xStart, y: obstacle.yTop },
              { x: obstacle.xEnd, y: obstacle.yTop },
              { x: obstacle.xEnd, y: obstacle.yBottom },
              { x: obstacle.xStart, y: obstacle.yBottom },
            ];
      const shape = createPaperShape(this, {
        points,
        textureKey: `${OBSTACLE_TEXTURE_KEY_PREFIX}${index.toString()}`,
        fillTopColor: OBSTACLE_FILL_COLOR_TOP,
        fillBottomColor: OBSTACLE_FILL_COLOR_BOTTOM,
        etchLineCount: OBSTACLE_ETCH_LINE_COUNT,
        etchStyle: 'rock',
      });
      shape.container.setDepth(TERRAIN_SHADOW_LAYER_DEPTH);
      return shape;
    });
  }

  /** Milestone 11: renders one live combatant — a small diamond silhouette,
   * distinct from the lander/obstacles/terrain shapes, positioned at its
   * initial spawn point (`advanceCombatants` repositions it every frame
   * after). Depth matches the lander's own layer — a combatant is airborne,
   * not part of the ground plane. */
  private buildCombatantVisual(state: CombatantState): PaperShape {
    // Milestone 14: each hostile type renders as its own multi-piece
    // papercraft silhouette (combat/combatant-silhouette.ts) — wing/armor
    // accents in a darkened hostile violet behind the body — instead of
    // the one shared diamond. Per-instance unique texture keys, unchanged
    // (Milestone 11's shared-texture-key lesson).
    const silhouette = findCombatantSilhouette(state.definition.id);
    const keyBase = `${COMBATANT_TEXTURE_KEY_PREFIX}${(this.combatantSpawnCounter++).toString()}`;
    const accentTop = darken(COMBATANT_FILL_COLOR_TOP, COMBATANT_ACCENT_DARKEN_FRACTION);
    const accentBottom = darken(COMBATANT_FILL_COLOR_BOTTOM, COMBATANT_ACCENT_DARKEN_FRACTION);

    const accents = silhouette.accentPolygons.map((points, index) =>
      createPaperShape(this, {
        points,
        textureKey: `${keyBase}-accent-${index.toString()}`,
        fillTopColor: accentTop,
        fillBottomColor: accentBottom,
        outlineWidth: COMBATANT_PIECE_OUTLINE_WIDTH,
        shadowOffset: COMBATANT_PIECE_SHADOW_OFFSET,
      }),
    );
    const body = createPaperShape(this, {
      points: silhouette.bodyPoints,
      textureKey: `${keyBase}-body`,
      fillTopColor: COMBATANT_FILL_COLOR_TOP,
      fillBottomColor: COMBATANT_FILL_COLOR_BOTTOM,
      etchLineCount: COMBATANT_ETCH_LINE_COUNT,
      etchStyle: 'rock',
      outlineWidth: COMBATANT_PIECE_OUTLINE_WIDTH,
      shadowOffset: COMBATANT_PIECE_SHADOW_OFFSET,
    });

    const container = this.add.container(state.position.x, state.position.y, [
      ...accents.map((accent) => accent.container),
      body.container,
    ]);
    container.setDepth(LANDER_LAYER_DEPTH);

    // Same {container, setFillColors} contract every call site already
    // uses — a recolor (none exists for combatants today) would recolor
    // the body; accents keep their fixed darkened shade.
    return { container, setFillColors: body.setFillColors };
  }

  /**
   * Milestone 13: builds this flight's thrust-exhaust emitter (started/
   * stopped/repositioned every frame by `updateThrustParticles`) and one
   * explode-only burst emitter per `ImpactKind` (triggered by
   * `spawnImpactBurst`). Called once per flight from `create()`, right
   * after the lander/engine-glow it visually extends — every emitter here
   * is a fresh GameObject each flight, the same "rebuilt in create(), no
   * separate reset needed" pattern `this.lander` itself already uses (see
   * `thrustParticles`'s own field doc comment).
   */
  private buildParticleEmitters(): void {
    bakeRadialGlowTexture(
      this,
      THRUST_PARTICLE_TEXTURE_KEY,
      PARTICLE_DOT_RADIUS_PX,
      ENGINE_GLOW_COLOR,
      PARTICLE_DOT_MAX_ALPHA,
    );
    this.thrustParticles = this.add
      .particles(0, 0, THRUST_PARTICLE_TEXTURE_KEY, {
        speed: {
          min: THRUST_PARTICLE_SPEED_MIN_PX_PER_SEC,
          max: THRUST_PARTICLE_SPEED_MAX_PX_PER_SEC,
        },
        angle: {
          min: THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG - THRUST_PARTICLE_ANGLE_SPREAD_DEG,
          max: THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG + THRUST_PARTICLE_ANGLE_SPREAD_DEG,
        },
        lifespan: THRUST_PARTICLE_LIFESPAN_MS,
        frequency: THRUST_PARTICLE_FREQUENCY_MS,
        quantity: THRUST_PARTICLE_QUANTITY_PER_EMIT,
        scale: { start: THRUST_PARTICLE_SCALE_START, end: THRUST_PARTICLE_SCALE_END },
        alpha: { start: THRUST_PARTICLE_ALPHA_START, end: THRUST_PARTICLE_ALPHA_END },
        emitting: false,
      })
      .setDepth(LANDER_LAYER_DEPTH);

    // Each distinct texture key is baked exactly once, up front — NOT
    // inside buildImpactEmitter (its own earlier version baked on every
    // call, which meant combatantHit and combatantDefeated, the one pair
    // that deliberately share COMBATANT_PARTICLE_TEXTURE_KEY, silently
    // destroyed each other's already-in-use texture: bakeCanvasTexture
    // removes-then-recreates any existing texture under the same key, and
    // Phaser's TextureManager#remove() calls the existing Texture's own
    // destroy(), which the FIRST emitter's already-constructed
    // ParticleEmitter had already cached a live reference to via its own
    // constructor -- the next time that emitter fired, its stale texture
    // reference's now-empty frame table crashed GameScene.update()
    // synchronously. Confirmed directly by tracing Phaser 4.2.0's own
    // TextureManager.js/Texture.js/ParticleEmitter.js/Particle.js source.
    // This is the exact same shared/rebaked-texture-key defect class
    // Milestone 11's own COMBATANT_TEXTURE_KEY_PREFIX comment above already
    // documents having crashed the render loop once before -- that fix
    // gave each spawned combatant a unique key; this fix instead bakes a
    // shared key once and reuses it, since these two emitters are static
    // (built once in create(), unlike per-instance combatant visuals).
    bakeRadialGlowTexture(
      this,
      OBSTACLE_PARTICLE_TEXTURE_KEY,
      PARTICLE_DOT_RADIUS_PX,
      OBSTACLE_FILL_COLOR_TOP,
      PARTICLE_DOT_MAX_ALPHA,
    );
    bakeRadialGlowTexture(
      this,
      COMBATANT_PARTICLE_TEXTURE_KEY,
      PARTICLE_DOT_RADIUS_PX,
      COMBATANT_FILL_COLOR_TOP,
      PARTICLE_DOT_MAX_ALPHA,
    );
    bakeRadialGlowTexture(
      this,
      SHIP_DAMAGE_PARTICLE_TEXTURE_KEY,
      PARTICLE_DOT_RADIUS_PX,
      CRASHED_COLOR_TOP,
      PARTICLE_DOT_MAX_ALPHA,
    );

    this.impactParticles = {
      obstacleCleared: this.buildImpactEmitter('obstacleCleared', OBSTACLE_PARTICLE_TEXTURE_KEY),
      combatantHit: this.buildImpactEmitter('combatantHit', COMBATANT_PARTICLE_TEXTURE_KEY),
      combatantDefeated: this.buildImpactEmitter(
        'combatantDefeated',
        COMBATANT_PARTICLE_TEXTURE_KEY,
      ),
      shipDamage: this.buildImpactEmitter('shipDamage', SHIP_DAMAGE_PARTICLE_TEXTURE_KEY),
    };
  }

  /** One explode-only emitter for `kind`, sized/paced by its own
   * `particleBurstForImpact(kind)` config — left at the emitter's default
   * (0, 0) position forever, since every trigger site calls
   * `ParticleEmitter.explode(count, x, y)` with an explicit world position
   * rather than relying on the emitter's own transform (see
   * `spawnImpactBurst`'s own doc comment for why that matters). Assumes
   * `textureKey` is already baked (see `buildParticleEmitters`'s own
   * comment for why baking must happen exactly once per key, before any
   * emitter referencing it is constructed). */
  private buildImpactEmitter(
    kind: ImpactKind,
    textureKey: string,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const burst = particleBurstForImpact(kind);
    return this.add
      .particles(0, 0, textureKey, {
        speed: { min: burst.speedMin, max: burst.speedMax },
        angle: { min: PARTICLE_BURST_ANGLE_MIN_DEG, max: PARTICLE_BURST_ANGLE_MAX_DEG },
        lifespan: burst.lifespanMs,
        scale: { start: burst.scaleStart, end: burst.scaleEnd },
        alpha: { start: PARTICLE_BURST_ALPHA_START, end: PARTICLE_BURST_ALPHA_END },
        emitting: false,
      })
      .setDepth(LANDER_LAYER_DEPTH);
  }

  /**
   * Milestone 13: starts/stops/repositions the continuous thrust-exhaust
   * emitter — called once per frame from `update()` (`updateFuelText`'s own
   * call site), mirroring where the thrust *sound* cue is instead toggled
   * directly inline near the top of `update()` (before `flightState.tick()`
   * runs); this needs the just-ticked `position`/`rotationRadians`, so it
   * can't run that early.
   *
   * The engine base's rotated world offset reuses `physics/
   * lander-physics.ts`'s own `headingVector` — `headingVector(rotation,
   * -LANDER_RADIUS)` is exactly the ship's local "down" (engine-base) point
   * rotated into world space, the same point `ENGINE_GLOW_RADIUS`'s static
   * halo sits at (`{x: 0, y: LANDER_RADIUS}` in the lander's own local
   * frame) — see `THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG`'s own doc
   * comment in constants.ts for the matching emission-angle conversion.
   */
  private updateThrustParticles(
    thrustActive: boolean,
    position: Vector2,
    rotationRadians: number,
  ): void {
    if (!thrustActive) {
      if (this.thrustParticles.emitting) {
        this.thrustParticles.stop();
      }
      return;
    }

    const engineOffset = headingVector(rotationRadians, -LANDER_RADIUS);
    this.thrustParticles.setPosition(position.x + engineOffset.x, position.y + engineOffset.y);

    const emissionAngleDeg =
      Phaser.Math.RadToDeg(rotationRadians) + THRUST_PARTICLE_ANGLE_DOWNWARD_OFFSET_DEG;
    this.thrustParticles.particleAngle = {
      min: emissionAngleDeg - THRUST_PARTICLE_ANGLE_SPREAD_DEG,
      max: emissionAngleDeg + THRUST_PARTICLE_ANGLE_SPREAD_DEG,
    };

    if (!this.thrustParticles.emitting) {
      this.thrustParticles.start();
    }
  }

  /** Fires an instant `ImpactKind` burst at world position (x, y) — every
   * call site (obstacle-clear, combatant-hit, combatant-defeated, ship
   * contact/ranged damage) passes the exact position that event occurred
   * at. `explode()`'s own explicit `(x, y)` argument bypasses the emitter's
   * own transform entirely (verified directly against `node_modules/
   * phaser/src/gameobjects/particles/Particle.js`'s `fire()`: an explicit
   * spawn position is stored as the particle's own local coordinate and
   * then run through the emitter's transform matrix, which stays identity
   * for these never-repositioned emitters — see `buildImpactEmitter`'s own
   * doc comment), so this is unaffected by the emitter's own (0, 0)
   * position, unlike the continuous `thrustParticles` emitter above, which
   * relies on `setPosition` precisely because its particles spawn from
   * wherever the emitter itself currently sits. */
  private spawnImpactBurst(kind: ImpactKind, x: number, y: number): void {
    this.impactParticles[kind].explode(particleBurstForImpact(kind).count, x, y);
  }

  /** Shakes the main camera per `kind`'s own `screenShakeForImpact` profile
   * — every call site (a real crash, the ship taking a contact hit, the
   * ship taking a ranged hit) already knows which `ScreenShakeKind`
   * applies; this only ever renders whatever that pure function decides. */
  private triggerScreenShake(kind: ScreenShakeKind): void {
    const { durationMs, intensity } = screenShakeForImpact(kind);
    this.cameras.main.shake(durationMs, intensity);
  }

  private updateFuelText(fuel: number): void {
    const percent = Math.round((fuel / this.effectiveFuelCapacity) * FUEL_PERCENT_MULTIPLIER);
    this.fuelText.setText(`FUEL: ${percent.toString()}%`);
  }

  /** Stops the continuous thrust cue if it's currently playing — shared by
   * `create()`'s per-flight reset, the pause branch, `update()`'s own
   * thrust-key-released case, and outcome resolution, so "stop it, if
   * playing" has exactly one implementation. */
  private stopThrustSound(): void {
    this.thrustSoundHandle?.stop();
    this.thrustSoundHandle = null;
  }

  private updateHullText(): void {
    const percent = Math.round(
      (this.shipCombat.hull / SHIP_BASE_HULL_POINTS) * HULL_PERCENT_MULTIPLIER,
    );
    this.hullText?.setText(`HULL: ${percent.toString()}%`);
  }

  /** Finds the index of a still-live (not weapon-cleared) obstacle
   * colliding with a circle at `position`/`radius` — shared by the lander's
   * own crash check and `advanceProjectiles`'s weapon-hit check, so both
   * read `this.clearedObstacleIndices` through the exact same test. Returns
   * -1 when nothing live collides (mirrors `Array.prototype.findIndex`). */
  private findLiveObstacleIndexAt(position: Vector2, radius: number): number {
    return this.terrain.obstacles.findIndex(
      (obstacle, index) =>
        !this.clearedObstacleIndices.has(index) &&
        isCollidingWithObstacle(position, radius, obstacle),
    );
  }

  /**
   * Milestone 11's real-time combat step, run once per frame (from
   * `update()`, after this frame's `flightState.tick`) with the lander's
   * freshly-ticked position: spawns any encounter the flight has just
   * descended past its own `triggerAltitude`, advances every live
   * projectile (resolving a hit against an obstacle or a combatant), then
   * advances every live combatant (movement, contact, and ranged attacks
   * against the player). Order matters: a projectile landing a killing
   * blow this frame must remove that combatant before it gets a chance to
   * also attack/contact the player this same frame.
   */
  private advanceCombat(playerPosition: Vector2, deltaSeconds: number): void {
    this.spawnTriggeredEncounters(playerPosition);
    this.advanceProjectiles(deltaSeconds);
    this.advanceCombatants(playerPosition, deltaSeconds);
    this.updateHullText();
    // Exposed via Phaser's data manager (same rationale as 'outcome'/
    // 'crashedOnObstacle') so the e2e suite can observe live combat state
    // without reaching into canvas-rendered text or private scene fields.
    this.data.set('shipHull', this.shipCombat.hull);
    this.data.set('shieldHitsRemaining', this.shipCombat.shieldHitsRemaining);
    this.data.set('liveCombatantCount', this.liveCombatants.length);
  }

  private spawnTriggeredEncounters(playerPosition: Vector2): void {
    for (const encounter of this.base?.encounters ?? []) {
      if (this.triggeredEncounterIds.has(encounter.id)) {
        continue;
      }
      if (playerPosition.y < encounter.triggerAltitude) {
        continue;
      }
      this.triggeredEncounterIds.add(encounter.id);
      const spawned = spawnEncounterCombatants(
        encounter,
        playerPosition.x,
        ENCOUNTER_SPAWN_HALF_WIDTH_PX,
        encounterSpawnY(encounter),
      );
      for (const state of spawned) {
        this.liveCombatants.push({ state, visual: this.buildCombatantVisual(state) });
      }
    }
  }

  private advanceProjectiles(deltaSeconds: number): void {
    const survivors: LiveProjectile[] = [];
    for (const entry of this.liveProjectiles) {
      const advanced = advanceProjectile(entry.state, deltaSeconds);
      entry.visual.setPosition(advanced.position.x, advanced.position.y);

      const obstacleIndex = this.findLiveObstacleIndexAt(advanced.position, PROJECTILE_RADIUS);
      if (obstacleIndex !== -1) {
        const obstacle = this.terrain.obstacles[obstacleIndex];
        if (
          obstacle?.armorRating !== undefined &&
          effectiveDamage(advanced.damage, obstacle.armorRating) > 0
        ) {
          this.clearedObstacleIndices.add(obstacleIndex);
          this.obstacleVisuals[obstacleIndex]?.container.destroy();
          this.spawnImpactBurst('obstacleCleared', advanced.position.x, advanced.position.y);
        }
        entry.visual.destroy();
        continue;
      }

      const hitCombatant = this.liveCombatants.find((combatant) =>
        isWithinRadius(
          advanced.position,
          combatant.state.position,
          COMBATANT_COLLISION_RADIUS + PROJECTILE_RADIUS,
        ),
      );
      if (hitCombatant) {
        const damage = effectiveDamage(advanced.damage, hitCombatant.state.definition.armorRating);
        hitCombatant.state = { ...hitCombatant.state, health: hitCombatant.state.health - damage };
        entry.visual.destroy();
        this.spawnImpactBurst('combatantHit', advanced.position.x, advanced.position.y);
        continue;
      }

      if (isProjectileExpired(advanced, WEAPON_PROJECTILE_RANGE)) {
        entry.visual.destroy();
        continue;
      }

      entry.state = advanced;
      survivors.push(entry);
    }
    this.liveProjectiles = survivors;
  }

  private advanceCombatants(playerPosition: Vector2, deltaSeconds: number): void {
    const survivors: LiveCombatant[] = [];
    for (const entry of this.liveCombatants) {
      if (entry.state.health <= 0) {
        this.spawnImpactBurst('combatantDefeated', entry.state.position.x, entry.state.position.y);
        entry.visual.container.destroy();
        continue;
      }

      const state = advanceCombatantState(entry.state, playerPosition, deltaSeconds);
      const { definition } = state;

      if (
        definition.contactDamage > 0 &&
        isWithinRadius(playerPosition, state.position, COMBATANT_COLLISION_RADIUS + LANDER_RADIUS)
      ) {
        this.shipCombat = absorbHit(this.shipCombat, definition.contactDamage);
        this.spawnImpactBurst('shipDamage', playerPosition.x, playerPosition.y);
        this.triggerScreenShake('shipContactDamage');
        entry.visual.container.destroy();
        continue;
      }

      let attackCooldownRemainingMs = Math.max(
        0,
        state.attackCooldownRemainingMs - deltaSeconds * MILLISECONDS_PER_SECOND,
      );
      if (
        definition.attack !== null &&
        attackCooldownRemainingMs <= 0 &&
        isWithinRadius(playerPosition, state.position, definition.attack.range)
      ) {
        this.shipCombat = absorbHit(this.shipCombat, definition.attack.damagePerHit);
        this.spawnImpactBurst('shipDamage', playerPosition.x, playerPosition.y);
        this.triggerScreenShake('shipRangedDamage');
        attackCooldownRemainingMs = definition.attack.cooldownMs;
      }

      entry.state = { ...state, attackCooldownRemainingMs };
      entry.visual.container.setPosition(state.position.x, state.position.y);
      survivors.push(entry);
    }
    this.liveCombatants = survivors;
  }

  /** Space fires the currently-active weapon (Milestone 9's cycle/trigger
   * input, PLAN.md's own scope note: "hands off to M11"). Gated on the
   * weapon's own `cooldownMs` (its "fire rate") -- a press while still on
   * cooldown is a silent no-op, matching a real semi-/burst-fire weapon
   * rather than every keypress guaranteeing a shot. */
  private triggerActiveWeapon(): void {
    const weaponId = this.equipmentProgress.activeWeaponId;
    if (weaponId === null || this.weaponCooldownRemainingMs > 0) {
      return;
    }
    const item = findEquipmentById(weaponId);
    if (item.slotType !== 'weapon') {
      return;
    }
    const { position, rotationRadians } = this.flightState.snapshot;
    const projectile = spawnProjectile(
      position,
      rotationRadians,
      WEAPON_PROJECTILE_SPEED,
      item.damage,
    );
    // Milestone 14: a soft glow halo behind the bolt. The glow texture is
    // parameter-identical for every shot, so it's baked at most ONCE and
    // then only referenced — never rebaked while earlier shots' live
    // images still hold the old texture (the shared/rebaked-texture-key
    // defect class Milestones 11 and 13 each hit once already; a
    // rebake-per-shot here would destroy every in-flight bolt's glow).
    if (!this.textures.exists(PROJECTILE_GLOW_TEXTURE_KEY)) {
      bakeRadialGlowTexture(
        this,
        PROJECTILE_GLOW_TEXTURE_KEY,
        PROJECTILE_GLOW_RADIUS,
        PROJECTILE_COLOR,
        PROJECTILE_GLOW_MAX_ALPHA,
      );
    }
    const glow = this.add.image(0, 0, PROJECTILE_GLOW_TEXTURE_KEY);
    const bolt = this.add.circle(0, 0, PROJECTILE_RADIUS, PROJECTILE_COLOR);
    const visual = this.add.container(projectile.position.x, projectile.position.y, [glow, bolt]);
    visual.setDepth(LANDER_LAYER_DEPTH);
    this.liveProjectiles.push({ state: projectile, visual });
    this.weaponCooldownRemainingMs = item.cooldownMs;
    this.data.set('lastTriggeredWeaponId', weaponId);
    playSfxCue(this, WEAPON_FIRE_CUE, isAudioMuted());
  }

  /** F activates the currently-active utility item. Only the two
   * *active-use* effects (`repairKit`/`thrustBurst`) have anything to apply
   * here — the *passive* effects (`fuelCapacityBonus`/`corrosionResistance`/
   * `coldResistance`) are already continuously in effect for the whole
   * flight (folded in once, in `init()`), so triggering one of those is a
   * no-op beyond exposing the event below. See `equipment/equipment.ts`'s
   * `UtilityEffect` doc comment for the full passive/active split. */
  private triggerActiveUtility(): void {
    const utilityId = this.equipmentProgress.activeUtilityId;
    if (utilityId === null) {
      return;
    }
    const item = findEquipmentById(utilityId);
    if (item.slotType === 'utility') {
      if (item.effect.kind === 'repairKit') {
        this.flightState.restoreFuel(item.effect.fuelRestored, this.effectiveFuelCapacity);
      } else if (item.effect.kind === 'thrustBurst') {
        this.thrustBoostRemainingMs = item.effect.durationMs;
        this.thrustBoostBonusAccel = item.effect.bonusThrustAccel;
      }
    }
    this.data.set('lastTriggeredUtilityId', utilityId);
  }
}
