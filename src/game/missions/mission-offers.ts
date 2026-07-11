import type { Base, BaseProgress } from '../bases/base';
import type { WorldKind } from '../planets/celestial-body';
import type { BaseProgressMap } from '../persistence/base-progress';
import {
  MULTI_TRIP_RESUPPLY_TARGET_SUPPLIES,
  MULTI_TRIP_RESUPPLY_TIME_LIMIT_MS,
} from '../constants';
import type { MissionDefinition, MissionFlavor } from './mission';

export interface RelayRoute {
  readonly id: string;
  readonly originBaseId: string;
  readonly destinationBaseId: string;
}

/**
 * PLAN.md §9.5.7's worked relay routes — the one piece of mission content
 * this project hand-authors (which base pairs a relay connects), mirroring
 * `bases/bases.ts`/`ships/ships.ts`'s own registry convention. Every other
 * mission (single-trip, multi-trip) is derived on demand from whichever
 * base the player already reached, not separately registered here.
 * `rustwell-landing--frostgate` is this project's one required
 * "infeasible for the entire ship roster" relay (PLAN.md §9.5.7 Example F,
 * `missions/relay.test.ts` pins this).
 */
export const RELAY_ROUTES: readonly RelayRoute[] = [
  {
    id: 'anchor-station--scarp-outpost',
    originBaseId: 'anchor-station',
    destinationBaseId: 'scarp-outpost',
  },
  {
    id: 'meridian-yard--rustwell-landing',
    originBaseId: 'meridian-yard',
    destinationBaseId: 'rustwell-landing',
  },
  {
    id: 'rustwell-landing--frostgate',
    originBaseId: 'rustwell-landing',
    destinationBaseId: 'frostgate',
  },
];

/**
 * Looks up a `RelayRoute` by id. A caller referencing a nonexistent route
 * id is a real data-integrity bug, not a reachable runtime condition —
 * throws rather than silently falling back, matching `findShipById`/
 * `findEquipmentById`'s identical convention. Production currently
 * derives its relay offers by filtering `RELAY_ROUTES` per origin base
 * (`world-map-scene.ts`), never by single id, so today's callers are this
 * module's own tests — kept as the registry's blessed throw-on-unknown
 * lookup rather than each test reinventing it.
 */
export function findRelayRoute(id: string): RelayRoute {
  const route = RELAY_ROUTES.find((candidate) => candidate.id === id);
  if (!route) {
    throw new Error(`findRelayRoute: no RelayRoute registered with id '${id}'`);
  }
  return route;
}

/**
 * A relay is only selectable once both endpoints are at least
 * `discovered-unclaimed` (PLAN.md §9.5.6) — composes for free with
 * Milestone 6's existing unlock graph, no new unlock mechanism. Returns
 * `false` (rather than throwing) for a route naming a base id not present
 * in `bases`, since a caller iterating every registered route against a
 * partial/test roster shouldn't need to pre-filter first.
 */
export function isRelaySelectable(
  route: RelayRoute,
  bases: readonly Base[],
  progress: BaseProgressMap,
): boolean {
  const origin = bases.find((base) => base.id === route.originBaseId);
  const destination = bases.find((base) => base.id === route.destinationBaseId);
  if (!origin || !destination) {
    return false;
  }
  const originStatus = progress[origin.id]?.status ?? origin.status;
  const destinationStatus = progress[destination.id]?.status ?? destination.status;
  return originStatus !== 'locked' && destinationStatus !== 'locked';
}

/**
 * Which mission flavor a base currently offers (PLAN.md §9.5.4): Establish
 * Presence only at `discovered-unclaimed`, Resupply only at `established`.
 * `null` for `locked` — a normal, expected "no mission offered here" state
 * for the UI to render around, not an error.
 */
export function deriveMissionFlavor(status: BaseProgress['status']): MissionFlavor | null {
  switch (status) {
    case 'discovered-unclaimed':
      return 'establish-presence';
    case 'established':
      return 'resupply';
    case 'locked':
      return null;
  }
}

/**
 * Whether `base` additionally offers Milestone 15's raw-material
 * Extraction mission: only at an `established` base on a `barren` world
 * (Decision D22's world-taxonomy guideline — dead planets focus on supply
 * drops and raw-material pickups; moons on supply drops alone; lush worlds
 * host the hostiles instead). Additive next to the Resupply offers an
 * established base already has, never replacing them. `worldKind` is the
 * caller's own `findBodyById(base.worldId).kind` — passed in, not looked
 * up here, keeping this a pure predicate like `deriveMissionFlavor` above.
 */
export function offersExtractionMission(
  worldKind: WorldKind,
  status: BaseProgress['status'],
): boolean {
  return worldKind === 'barren' && status === 'established';
}

/**
 * Milestone 15's raw-material pickup (PLAN.md §15): structurally an
 * ordinary single-trip mission with no cargo minimum — fly to the barren
 * world, touch down safely, and the pad crew loads the fixed materials
 * haul `reward.ts`'s `perTripReward` pays out. Offered only where
 * `offersExtractionMission` says so.
 */
export function buildExtractionMission(base: Base): MissionDefinition {
  return {
    id: `single-trip--extraction--${base.id}`,
    structure: 'single-trip',
    flavor: 'extraction',
    originBaseId: base.id,
    destinationBaseId: null,
    minManifest: {},
    cargoTarget: null,
    timeLimitMs: null,
    crashPolicy: null,
  };
}

/**
 * The direct single-trip mission for establishing or resupplying `base`
 * itself (PLAN.md §9.5.2's default structure, and the only structure an
 * Establish Presence mission can ever use — that flavor is always binary/
 * one-shot). `flavor` is the caller's own `deriveMissionFlavor(base's live
 * status)` result, not re-derived here, so this function stays a pure
 * projection with no `BaseProgressMap` dependency of its own.
 */
export function buildSingleTripMission(base: Base, flavor: MissionFlavor): MissionDefinition {
  return {
    id: `single-trip--${flavor}--${base.id}`,
    structure: 'single-trip',
    flavor,
    originBaseId: base.id,
    destinationBaseId: null,
    minManifest: flavor === 'establish-presence' ? { troops: base.garrisonRequirement } : {},
    cargoTarget: null,
    timeLimitMs: null,
    crashPolicy: null,
  };
}

/**
 * This project's one shipped multi-trip-same-base template (PLAN.md
 * §9.5.7 Example C) — Resupply only, offered alongside (not instead of)
 * the single-trip Resupply mission `buildSingleTripMission` already
 * offers at the same base.
 */
export function buildMultiTripResupplyMission(base: Base): MissionDefinition {
  return {
    id: `multi-trip--resupply--${base.id}`,
    structure: 'multi-trip-same-base',
    flavor: 'resupply',
    originBaseId: base.id,
    destinationBaseId: null,
    minManifest: {},
    cargoTarget: { type: 'supplies', units: MULTI_TRIP_RESUPPLY_TARGET_SUPPLIES },
    timeLimitMs: MULTI_TRIP_RESUPPLY_TIME_LIMIT_MS,
    crashPolicy: 'loseTripOnly',
  };
}

/**
 * A relay mission along `route`, flavored by the *destination* base's live
 * status — an Establish Presence relay requires the destination's own
 * `garrisonRequirement` in troops, same number a direct single-trip
 * mission to that base would require (PLAN.md §9.5.4/§9.5.6).
 */
export function buildRelayMission(
  route: RelayRoute,
  destination: Base,
  destinationFlavor: MissionFlavor,
): MissionDefinition {
  return {
    id: `relay--${route.id}`,
    structure: 'relay',
    flavor: destinationFlavor,
    originBaseId: route.originBaseId,
    destinationBaseId: route.destinationBaseId,
    minManifest:
      destinationFlavor === 'establish-presence' ? { troops: destination.garrisonRequirement } : {},
    cargoTarget: null,
    timeLimitMs: null,
    crashPolicy: null,
  };
}
