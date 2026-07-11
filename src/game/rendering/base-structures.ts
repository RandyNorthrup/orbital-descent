/* eslint-disable @typescript-eslint/no-magic-numbers -- this module is
 * glyph geometry: every literal is a local coordinate, radius, or arc
 * fraction inside one glyph's own canvas box, the same data class as
 * ships/silhouette.ts's vertex tables (which the rule already permits as
 * object literals). Naming each would bury the drawings under dozens of
 * one-use constants; real tunables (sizes, colors, shared fractions)
 * still live in constants.ts. */
import Phaser from 'phaser';
import {
  BASE_STRUCTURE_PAD_GAP_PX,
  CREW_SUIT_COLORS,
  CREW_VISOR_COLOR,
  DECORATION_OUTLINE_WIDTH,
  DECORATION_SHADOW_ALPHA,
  DECORATION_SHADOW_OFFSET_PX,
  ENEMY_CAMP_CANDIDATE_OFFSETS_PX,
  ENEMY_CAMP_OBSTACLE_CLEARANCE_PX,
  ENEMY_HIVE_COLOR,
  ENEMY_HIVE_ENTRANCE_COLOR,
  FRIENDLY_STRUCTURE_COLOR,
  FRIENDLY_STRUCTURE_TRIM_COLOR,
  OUTLINE_COLOR,
  RAIDER_ACCENT_COLOR,
  RAIDER_HULL_COLOR,
  TERRAIN_SHADOW_LAYER_DEPTH,
  WORLD_WIDTH,
} from '../constants';
import { getTerrainHeightAt, type Terrain } from '../terrain/terrain-generator';
import { darken, lighten } from './color-mix';
import { bakeCanvasTexture, hexToCss } from './canvas-texture-utils';

/**
 * Base-side structures and inhabitants (PLAN.md Milestone 16, D24): every
 * curated base gets a friendly settlement beside its pad — habitat dome,
 * antenna tower, and two Duck-Detective-style crew standees (flat rounded
 * cardboard characters, one big visor eye) — and the two encounter bases
 * additionally get their enemy's own home: Meridian Yard's wasp hive,
 * Frostgate's abandoned raider camp with a crashed raider skiff (the
 * game's first enemy-ship art). Set dressing only: nothing here collides,
 * spawns, or fights — the diorama just finally shows who lives where.
 *
 * Texture-key discipline: every texture is baked at most once behind an
 * exists() guard (the M11/M13 lesson). Friendly/raider art is
 * faction-colored (world-independent), so those keys carry no body id;
 * the hive tints toward no world either (wasp purple matches the wasps).
 */

type Ctx = CanvasRenderingContext2D;

function outlined(ctx: Ctx, fill: number, path: () => void): void {
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.fillStyle = hexToCss(fill);
  ctx.fill();
  ctx.lineWidth = DECORATION_OUTLINE_WIDTH;
  ctx.strokeStyle = hexToCss(OUTLINE_COLOR);
  ctx.stroke();
}

/** Bakes via a shadow-then-main double pass, like decoration glyphs. */
function bakeWithShadow(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx, shadowPass: boolean) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  bakeCanvasTexture(scene, key, width, height, (ctx) => {
    ctx.save();
    ctx.translate(DECORATION_SHADOW_OFFSET_PX, DECORATION_SHADOW_OFFSET_PX);
    ctx.globalAlpha = DECORATION_SHADOW_ALPHA;
    draw(ctx, true);
    ctx.restore();
    draw(ctx, false);
  });
}

const DOME = { width: 76, height: 50, radius: 32, portholeRadius: 7 } as const;

function bakeDome(scene: Phaser.Scene): string {
  const key = 'base-friendly-dome';
  bakeWithShadow(scene, key, DOME.width, DOME.height, (ctx, shadowPass) => {
    const cx = DOME.width / 2;
    const baseY = DOME.height - DECORATION_SHADOW_OFFSET_PX;
    const fill = shadowPass ? OUTLINE_COLOR : FRIENDLY_STRUCTURE_COLOR;
    outlined(ctx, fill, () => {
      ctx.moveTo(cx - DOME.radius, baseY);
      ctx.arc(cx, baseY, DOME.radius, Math.PI, 0);
    });
    if (!shadowPass) {
      // Trim band along the dome's foot + a porthole — the man-made read.
      ctx.beginPath();
      ctx.rect(
        cx - DOME.radius,
        baseY - DECORATION_SHADOW_OFFSET_PX * 2,
        DOME.radius * 2,
        DECORATION_SHADOW_OFFSET_PX * 2,
      );
      ctx.fillStyle = hexToCss(FRIENDLY_STRUCTURE_TRIM_COLOR);
      ctx.fill();
      outlined(ctx, CREW_VISOR_COLOR, () => {
        ctx.arc(cx, baseY - DOME.radius / 2, DOME.portholeRadius, 0, Math.PI * 2);
      });
    }
  });
  return key;
}

const TOWER = { width: 44, height: 64, mastHalfWidth: 3, dishRadius: 11 } as const;

function bakeTower(scene: Phaser.Scene): string {
  const key = 'base-friendly-tower';
  bakeWithShadow(scene, key, TOWER.width, TOWER.height, (ctx, shadowPass) => {
    const cx = TOWER.width / 2;
    const baseY = TOWER.height - DECORATION_SHADOW_OFFSET_PX;
    const mastTop = DECORATION_SHADOW_OFFSET_PX + TOWER.dishRadius;
    const fill = shadowPass ? OUTLINE_COLOR : FRIENDLY_STRUCTURE_COLOR;
    outlined(ctx, fill, () => {
      ctx.moveTo(cx - TOWER.mastHalfWidth * 2, baseY);
      ctx.lineTo(cx - TOWER.mastHalfWidth, mastTop);
      ctx.lineTo(cx + TOWER.mastHalfWidth, mastTop);
      ctx.lineTo(cx + TOWER.mastHalfWidth * 2, baseY);
    });
    const dishFill = shadowPass ? OUTLINE_COLOR : FRIENDLY_STRUCTURE_TRIM_COLOR;
    outlined(ctx, dishFill, () => {
      ctx.arc(cx, mastTop, TOWER.dishRadius, Math.PI * 0.75, Math.PI * 0.25, true);
    });
  });
  return key;
}

const CREW = { width: 20, height: 26, bodyHalfWidth: 6, helmetRadius: 7, eyeRadius: 3.2 } as const;

function bakeCrew(scene: Phaser.Scene, suitColor: number, index: number): string {
  const key = `base-crew-${index.toString()}`;
  bakeWithShadow(scene, key, CREW.width, CREW.height, (ctx, shadowPass) => {
    const cx = CREW.width / 2;
    const baseY = CREW.height - DECORATION_SHADOW_OFFSET_PX;
    const helmetY = DECORATION_SHADOW_OFFSET_PX + CREW.helmetRadius;
    const suit = shadowPass ? OUTLINE_COLOR : suitColor;
    // Capsule body — a flat cardboard standee, per the Duck Detective
    // research verdict (bold rounded shape readable at tiny sizes).
    outlined(ctx, suit, () => {
      ctx.moveTo(cx - CREW.bodyHalfWidth, baseY);
      ctx.lineTo(cx - CREW.bodyHalfWidth, helmetY + CREW.helmetRadius / 2);
      ctx.arc(cx, helmetY + CREW.helmetRadius / 2, CREW.bodyHalfWidth, Math.PI, 0);
      ctx.lineTo(cx + CREW.bodyHalfWidth, baseY);
    });
    const helmet = shadowPass ? OUTLINE_COLOR : lighten(suitColor, DECORATION_SHADOW_ALPHA);
    outlined(ctx, helmet, () => {
      ctx.arc(cx, helmetY, CREW.helmetRadius, 0, Math.PI * 2);
    });
    if (!shadowPass) {
      // The one big eye/visor.
      ctx.beginPath();
      ctx.arc(cx + CREW.eyeRadius / 2, helmetY, CREW.eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = hexToCss(CREW_VISOR_COLOR);
      ctx.fill();
    }
  });
  return key;
}

const HIVE = { width: 64, height: 56 } as const;
const HIVE_LOBES = [
  { dx: 0, dy: -10, r: 22 },
  { dx: -12, dy: -28, r: 15 },
  { dx: 11, dy: -30, r: 13 },
  { dx: 0, dy: -42, r: 10 },
] as const;
const HIVE_ENTRANCE = { dy: -12, rx: 7, ry: 9 } as const;

function bakeHive(scene: Phaser.Scene): string {
  const key = 'enemy-hive';
  bakeWithShadow(scene, key, HIVE.width, HIVE.height, (ctx, shadowPass) => {
    const cx = HIVE.width / 2;
    const baseY = HIVE.height - DECORATION_SHADOW_OFFSET_PX;
    const fill = shadowPass ? OUTLINE_COLOR : ENEMY_HIVE_COLOR;
    outlined(ctx, fill, () => {
      for (const lobe of HIVE_LOBES) {
        ctx.moveTo(cx + lobe.dx + lobe.r, baseY + lobe.dy);
        ctx.arc(cx + lobe.dx, baseY + lobe.dy, lobe.r, 0, Math.PI * 2);
      }
    });
    if (!shadowPass) {
      ctx.beginPath();
      for (const lobe of HIVE_LOBES) {
        ctx.moveTo(
          cx + lobe.dx - DECORATION_SHADOW_OFFSET_PX + lobe.r * 0.55,
          baseY + lobe.dy - DECORATION_SHADOW_OFFSET_PX,
        );
        ctx.arc(
          cx + lobe.dx - DECORATION_SHADOW_OFFSET_PX,
          baseY + lobe.dy - DECORATION_SHADOW_OFFSET_PX,
          lobe.r * 0.55,
          0,
          Math.PI * 2,
        );
      }
      ctx.fillStyle = hexToCss(lighten(ENEMY_HIVE_COLOR, DECORATION_SHADOW_ALPHA));
      ctx.fill();
      outlined(ctx, ENEMY_HIVE_ENTRANCE_COLOR, () => {
        ctx.ellipse(
          cx,
          baseY + HIVE_ENTRANCE.dy,
          HIVE_ENTRANCE.rx,
          HIVE_ENTRANCE.ry,
          0,
          0,
          Math.PI * 2,
        );
      });
    }
  });
  return key;
}

const SKIFF = { width: 96, height: 46 } as const;
/** Crashed raider skiff: angular hostile hull, nose buried in the ground
 * at a tilt — unmistakably a ship, unmistakably not one of ours. */
const SKIFF_HULL = [
  { x: 6, y: 40 },
  { x: 26, y: 16 },
  { x: 58, y: 6 },
  { x: 88, y: 14 },
  { x: 74, y: 28 },
  { x: 40, y: 40 },
] as const;
const SKIFF_FIN = [
  { x: 58, y: 6 },
  { x: 66, y: -2 },
  { x: 76, y: 10 },
] as const;
const SKIFF_STRIPE = [
  { x: 30, y: 15 },
  { x: 44, y: 10 },
  { x: 48, y: 18 },
  { x: 34, y: 23 },
] as const;

function bakeSkiff(scene: Phaser.Scene): string {
  const key = 'enemy-raider-skiff';
  bakeWithShadow(
    scene,
    key,
    SKIFF.width,
    SKIFF.height + DECORATION_SHADOW_OFFSET_PX * 2,
    (ctx, shadowPass) => {
      const drawPoly = (points: readonly { x: number; y: number }[], fill: number): void => {
        outlined(ctx, fill, () => {
          const first = points[0];
          if (!first) {
            return;
          }
          ctx.moveTo(first.x, first.y + DECORATION_SHADOW_OFFSET_PX);
          for (const point of points.slice(1)) {
            ctx.lineTo(point.x, point.y + DECORATION_SHADOW_OFFSET_PX);
          }
        });
      };
      drawPoly(
        SKIFF_FIN,
        shadowPass ? OUTLINE_COLOR : darken(RAIDER_HULL_COLOR, DECORATION_SHADOW_ALPHA),
      );
      drawPoly(SKIFF_HULL, shadowPass ? OUTLINE_COLOR : RAIDER_HULL_COLOR);
      if (!shadowPass) {
        drawPoly(SKIFF_STRIPE, RAIDER_ACCENT_COLOR);
      }
    },
  );
  return key;
}

const CRATE = { size: 20 } as const;

function bakeCrate(scene: Phaser.Scene): string {
  const key = 'enemy-crate';
  bakeWithShadow(
    scene,
    key,
    CRATE.size + DECORATION_SHADOW_OFFSET_PX * 2,
    CRATE.size + DECORATION_SHADOW_OFFSET_PX * 2,
    (ctx, shadowPass) => {
      const fill = shadowPass
        ? OUTLINE_COLOR
        : darken(RAIDER_ACCENT_COLOR, DECORATION_SHADOW_ALPHA);
      outlined(ctx, fill, () => {
        ctx.rect(
          DECORATION_SHADOW_OFFSET_PX / 2,
          DECORATION_SHADOW_OFFSET_PX / 2,
          CRATE.size,
          CRATE.size,
        );
      });
      if (!shadowPass) {
        ctx.beginPath();
        ctx.rect(
          DECORATION_SHADOW_OFFSET_PX / 2,
          DECORATION_SHADOW_OFFSET_PX / 2 + CRATE.size / 2 - 1,
          CRATE.size,
          2,
        );
        ctx.fillStyle = hexToCss(OUTLINE_COLOR);
        ctx.fill();
      }
    },
  );
  return key;
}

/** Layout of the friendly settlement, pad-relative: dome nearest the pad,
 * tower behind it, crew standing between them. */
const FRIENDLY_LAYOUT = [
  { texture: 'dome', offset: 40 },
  { texture: 'tower', offset: 96 },
  { texture: 'crew-0', offset: 66 },
  { texture: 'crew-1', offset: 80 },
] as const;

function plant(
  scene: Phaser.Scene,
  terrain: Terrain,
  key: string,
  x: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, getTerrainHeightAt(terrain.points, x) + 2, key)
    .setOrigin(0.5, 1)
    .setDepth(TERRAIN_SHADOW_LAYER_DEPTH);
}

/**
 * The friendly settlement every curated base carries. Tries pad-adjacent
 * anchors on both sides (nearest first, then pushed farther out) and
 * takes the first whose whole layout clears the world edges AND every
 * curated obstacle — Frostgate's rock spire stands right beside its pad,
 * and the first version of this function planted the dome straight into
 * it (caught by screenshot). Individual pieces each plant at their own
 * ground height so a sloped neighborhood can't float them.
 */
export function buildFriendlyBase(scene: Phaser.Scene, terrain: Terrain): void {
  const pad = terrain.landingPad;
  const maxOffset = FRIENDLY_LAYOUT[FRIENDLY_LAYOUT.length - 1]?.offset ?? 0;
  const clearOfObstacles = (x: number): boolean =>
    terrain.obstacles.every(
      (obstacle) =>
        x < obstacle.xStart - ENEMY_CAMP_OBSTACLE_CLEARANCE_PX ||
        x > obstacle.xEnd + ENEMY_CAMP_OBSTACLE_CLEARANCE_PX,
    );
  const candidates: readonly { anchor: number; direction: 1 | -1 }[] = [
    { anchor: pad.xEnd + BASE_STRUCTURE_PAD_GAP_PX, direction: 1 },
    { anchor: pad.xStart - BASE_STRUCTURE_PAD_GAP_PX, direction: -1 },
    { anchor: pad.xEnd + BASE_STRUCTURE_PAD_GAP_PX + maxOffset * 2, direction: 1 },
    { anchor: pad.xStart - BASE_STRUCTURE_PAD_GAP_PX - maxOffset * 2, direction: -1 },
  ];
  const placement =
    candidates.find(({ anchor, direction }) =>
      FRIENDLY_LAYOUT.every((piece) => {
        const x = anchor + piece.offset * direction;
        return x > 0 && x < WORLD_WIDTH && clearOfObstacles(x);
      }),
    ) ?? candidates[0];
  if (!placement) {
    return;
  }

  const textures: Record<string, string> = {
    dome: bakeDome(scene),
    tower: bakeTower(scene),
    'crew-0': bakeCrew(scene, CREW_SUIT_COLORS[0] ?? FRIENDLY_STRUCTURE_COLOR, 0),
    'crew-1': bakeCrew(scene, CREW_SUIT_COLORS[1] ?? FRIENDLY_STRUCTURE_COLOR, 1),
  };
  for (const piece of FRIENDLY_LAYOUT) {
    const key = textures[piece.texture];
    if (key !== undefined) {
      plant(scene, terrain, key, placement.anchor + piece.offset * placement.direction);
    }
  }
}

/** Enemy camps keyed by base id — only the encounter bases have one
 * (their hostiles' own home). An id with no camp is the normal case, not
 * an error: most bases are peaceful. */
const ENEMY_CAMPS: Readonly<Record<string, 'hive' | 'raider-camp'>> = {
  'meridian-yard': 'hive',
  frostgate: 'raider-camp',
};

const RAIDER_CAMP_SPREAD_PX = 58;

export function buildEnemyCamp(scene: Phaser.Scene, baseId: string, terrain: Terrain): void {
  const camp = ENEMY_CAMPS[baseId];
  if (camp === undefined) {
    return;
  }
  const pad = terrain.landingPad;
  const padCenter = (pad.xStart + pad.xEnd) / 2;
  const clearOfObstacles = (x: number): boolean =>
    terrain.obstacles.every(
      (obstacle) =>
        x < obstacle.xStart - ENEMY_CAMP_OBSTACLE_CLEARANCE_PX ||
        x > obstacle.xEnd + ENEMY_CAMP_OBSTACLE_CLEARANCE_PX,
    );
  const campX =
    ENEMY_CAMP_CANDIDATE_OFFSETS_PX.map((offset) => padCenter + offset).find(
      (x) =>
        x > RAIDER_CAMP_SPREAD_PX && x < WORLD_WIDTH - RAIDER_CAMP_SPREAD_PX && clearOfObstacles(x),
    ) ?? padCenter + (ENEMY_CAMP_CANDIDATE_OFFSETS_PX[0] ?? 0);

  if (camp === 'hive') {
    plant(scene, terrain, bakeHive(scene), campX);
    return;
  }
  plant(scene, terrain, bakeSkiff(scene), campX);
  plant(scene, terrain, bakeCrate(scene), campX - RAIDER_CAMP_SPREAD_PX);
}
