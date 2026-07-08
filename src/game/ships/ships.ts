import type { ShipClass } from './ship';

/**
 * Milestone 7's hand-authored ship roster (Decision D13). Exactly 5
 * `'starter'` ships plus 2 more split across `'purchase'` and `'unlock'` —
 * every `ShipAcquisition` variant is represented at least once (required by
 * this milestone's own registry tests). `Falcon` is first and is this
 * project's default ship: its four flight-relevant stats
 * (`baseThrustAccel`/`fuelCapacity`/`burnRate`/`handling`) are exactly the
 * values this project's certified Milestones 1-6 already shipped as global
 * constants (`THRUST_ACCEL`/`MAX_FUEL`/`FUEL_BURN_RATE`/`ROTATION_SPEED_DEG`,
 * removed from `constants.ts` by this milestone) — every e2e test written
 * before ship selection existed keeps passing unmodified against whichever
 * ship is currently selected, since a fresh save's persisted selection
 * (`persistence/ship-progress.ts`) defaults to `SHIPS[0]`, i.e. Falcon.
 *
 * `Scout`/`Courier`/`Hauler`'s seven shared fields
 * (`dryMass`/`baseThrustAccel`/`massBudget`/`cargoBayCapacity`/
 * `equipmentSlots`/`fuelCapacity`/`fuelPerDistanceUnit`) reproduce
 * PLAN.md §9.5.7's own worked-example table verbatim — that section's
 * relay/cargo arithmetic (Examples A-F) depends on these exact numbers, the
 * same reason `bases/bases.ts`'s registry reproduces §9.5.7's base roster
 * verbatim instead of picking its own. `burnRate`/`handling` aren't part of
 * that table (irrelevant to §9.5.7's cargo/relay math) and are authored
 * here for the first time, chosen to fit each ship's archetype.
 *
 * Typed as a non-empty tuple, like `planets/bodies.ts`'s `BODIES`, so
 * `SHIPS[0]` (the default-ship fallback) is statically known non-`undefined`
 * under this project's `noUncheckedIndexedAccess`.
 */
export const SHIPS: readonly [ShipClass, ...ShipClass[]] = [
  {
    id: 'falcon',
    name: 'Falcon',
    archetype: 'balanced',
    dryMass: 100,
    baseThrustAccel: 46,
    fuelCapacity: 100,
    burnRate: 18,
    handling: 150,
    equipmentSlots: 3,
    massBudget: 150,
    cargoBayCapacity: 100,
    fuelPerDistanceUnit: 1.2,
    acquisition: { type: 'starter' },
  },
  {
    id: 'scout',
    name: 'Scout',
    archetype: 'scout',
    dryMass: 250,
    baseThrustAccel: 54,
    fuelCapacity: 140,
    burnRate: 14,
    handling: 200,
    equipmentSlots: 2,
    massBudget: 90,
    cargoBayCapacity: 60,
    fuelPerDistanceUnit: 1.4,
    acquisition: { type: 'starter' },
  },
  {
    id: 'courier',
    name: 'Courier',
    archetype: 'courier',
    dryMass: 400,
    baseThrustAccel: 46,
    fuelCapacity: 180,
    burnRate: 17,
    handling: 130,
    equipmentSlots: 3,
    massBudget: 200,
    cargoBayCapacity: 160,
    fuelPerDistanceUnit: 1.0,
    acquisition: { type: 'starter' },
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    archetype: 'gunship',
    dryMass: 180,
    baseThrustAccel: 50,
    fuelCapacity: 120,
    burnRate: 20,
    handling: 160,
    equipmentSlots: 4,
    massBudget: 130,
    cargoBayCapacity: 40,
    fuelPerDistanceUnit: 1.3,
    acquisition: { type: 'starter' },
  },
  {
    id: 'hauler',
    name: 'Hauler',
    archetype: 'hauler',
    dryMass: 650,
    baseThrustAccel: 40,
    fuelCapacity: 260,
    burnRate: 22,
    handling: 85,
    equipmentSlots: 4,
    massBudget: 380,
    cargoBayCapacity: 340,
    fuelPerDistanceUnit: 0.75,
    acquisition: { type: 'starter' },
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    archetype: 'interceptor',
    dryMass: 140,
    baseThrustAccel: 64,
    fuelCapacity: 90,
    burnRate: 24,
    handling: 210,
    equipmentSlots: 3,
    massBudget: 110,
    cargoBayCapacity: 20,
    fuelPerDistanceUnit: 1.6,
    acquisition: { type: 'purchase', price: 750 },
  },
  {
    id: 'cryohauler',
    name: 'Cryohauler',
    archetype: 'specialist',
    dryMass: 600,
    baseThrustAccel: 42,
    fuelCapacity: 240,
    burnRate: 19,
    handling: 100,
    equipmentSlots: 5,
    massBudget: 360,
    cargoBayCapacity: 280,
    fuelPerDistanceUnit: 0.8,
    acquisition: {
      type: 'unlock',
      requiredBaseId: 'frostgate',
      description: 'Establish Frostgate',
    },
  },
];

/**
 * Looks up a `ShipClass` by id in this registry. A caller referencing a
 * nonexistent ship id (a typo'd persisted `selectedShipId`, a stale
 * `requiredBaseId`) is a real data-integrity bug, not a reachable runtime
 * condition otherwise — throwing surfaces it loudly instead of silently
 * falling back, the same convention as `bases/bases.ts`'s `findBodyById`.
 */
export function findShipById(id: string): ShipClass {
  const ship = SHIPS.find((candidate) => candidate.id === id);
  if (!ship) {
    throw new Error(`findShipById: no ShipClass registered with id '${id}'`);
  }
  return ship;
}
