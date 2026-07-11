/* eslint-disable @typescript-eslint/no-magic-numbers -- this module is
 * glyph geometry: every literal is a local coordinate, radius, or arc
 * fraction inside one glyph's own canvas box, the same data class as
 * ships/silhouette.ts's vertex tables (which the rule already permits as
 * object literals). Naming each would bury the drawings under dozens of
 * one-use constants; real tunables (sizes, colors, shared fractions)
 * still live in constants.ts. */
import Phaser from 'phaser';
import {
  DECORATION_OUTLINE_WIDTH,
  DECORATION_SHADOW_ALPHA,
  DECORATION_SHADOW_OFFSET_PX,
  ICON_ACCENT_ACID_COLOR,
  ICON_ACCENT_COLD_COLOR,
  ICON_ACCENT_FLAME_COLOR,
  ICON_ACCENT_MEDIC_COLOR,
  ICON_ACCENT_SHIELD_COLOR,
  ICON_METAL_COLOR,
  ICON_METAL_DARK_COLOR,
  ICON_SIZE_PX,
  OUTLINE_COLOR,
} from '../constants';
import { bakeCanvasTexture, hexToCss } from './canvas-texture-utils';
import { ITEM_ICON_IDS } from './item-icon-ids';

/**
 * Paper icon glyphs for everything the STORE and LOADOUT sell or equip
 * (PLAN.md Milestone 16, D24 — "no visible art for the store or
 * upgrades"): every equipment item and permanent upgrade gets its own
 * small cutout, drawn in the same fill + piece-outline + hard-shadow
 * language as the rest of the game. Registry-completeness is pinned by
 * `item-icons.test.ts` against EQUIPMENT_ITEMS/UPGRADES, and an unknown
 * id throws (the findShipById convention), so a new item can't silently
 * ship iconless.
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

/** Each glyph draws inside a unit box [0..S, 0..S] (S = ICON_SIZE_PX). */
const S = ICON_SIZE_PX;
const MID = S / 2;
const Q = S / 4;

const drawPulseCannon = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.rect(Q / 2, MID - 3, S - Q, 6);
  });
  outlined(ctx, ICON_METAL_DARK_COLOR, () => {
    ctx.rect(Q / 2, MID - 5, Q, 10);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.arc(S - Q / 2, MID, 3.5, 0, Math.PI * 2);
  });
};

const drawAutocannon = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.rect(Q / 2, MID - 7, S - Q, 5);
    ctx.rect(Q / 2, MID + 2, S - Q, 5);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.arc(S - Q / 2, MID - 4.5, 3, 0, Math.PI * 2);
    ctx.moveTo(S - Q / 2 + 3, MID + 4.5);
    ctx.arc(S - Q / 2, MID + 4.5, 3, 0, Math.PI * 2);
  });
};

const drawFuelTank = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.moveTo(Q, Q);
    ctx.arc(MID, Q, Q, Math.PI, 0);
    ctx.lineTo(MID + Q, S - Q / 2);
    ctx.lineTo(Q, S - Q / 2);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.rect(MID - 3, Q / 2 - 2, 6, 5);
  });
};

const drawCorrosionCoating = (ctx: Ctx): void => {
  outlined(ctx, ICON_ACCENT_ACID_COLOR, () => {
    ctx.moveTo(MID, Q / 2);
    ctx.quadraticCurveTo(S - Q / 2, MID + Q / 2, MID, S - Q / 2);
    ctx.quadraticCurveTo(Q / 2, MID + Q / 2, MID, Q / 2);
  });
  outlined(ctx, ICON_METAL_DARK_COLOR, () => {
    ctx.arc(MID, MID + 2, 3.5, 0, Math.PI * 2);
  });
};

const drawThermalLining = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.rect(Q / 2, Q / 2, S - Q, S - Q);
  });
  ctx.beginPath();
  for (const offset of [-5, 0, 5]) {
    ctx.moveTo(Q, MID + offset);
    ctx.quadraticCurveTo(MID, MID + offset - 4, S - Q, MID + offset);
  }
  ctx.lineWidth = DECORATION_OUTLINE_WIDTH;
  ctx.strokeStyle = hexToCss(ICON_ACCENT_COLD_COLOR);
  ctx.stroke();
};

const drawBarrierShield = (ctx: Ctx): void => {
  outlined(ctx, ICON_ACCENT_SHIELD_COLOR, () => {
    ctx.moveTo(MID, Q / 2);
    ctx.lineTo(S - Q / 2, Q);
    ctx.lineTo(S - Q / 2, MID);
    ctx.quadraticCurveTo(S - Q / 2, S - Q / 2, MID, S - Q / 3);
    ctx.quadraticCurveTo(Q / 2, S - Q / 2, Q / 2, MID);
    ctx.lineTo(Q / 2, Q);
  });
};

const drawRepairKit = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.rect(Q / 2, Q / 2 + 2, S - Q, S - Q - 2);
  });
  outlined(ctx, ICON_ACCENT_MEDIC_COLOR, () => {
    ctx.rect(MID - 3, MID - 8, 6, 18);
    ctx.rect(MID - 9, MID - 2, 18, 6);
  });
};

const drawThrustBooster = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.moveTo(Q, Q / 2);
    ctx.lineTo(S - Q, Q / 2);
    ctx.lineTo(S - Q / 2, MID);
    ctx.lineTo(Q / 2, MID);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.moveTo(MID, S - Q / 3);
    ctx.quadraticCurveTo(MID - Q, MID + 2, MID, MID);
    ctx.quadraticCurveTo(MID + Q, MID + 2, MID, S - Q / 3);
  });
};

const drawStrongerEngines = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.moveTo(MID - 4, Q / 2);
    ctx.lineTo(MID + 4, Q / 2);
    ctx.lineTo(S - Q / 2, S - Q);
    ctx.lineTo(Q / 2, S - Q);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.moveTo(MID, S - Q / 4);
    ctx.quadraticCurveTo(MID - 5, S - Q, MID, S - Q + 2);
    ctx.moveTo(MID, S - Q / 4);
    ctx.quadraticCurveTo(MID + 5, S - Q, MID, S - Q + 2);
  });
};

const drawLighterHull = (ctx: Ctx): void => {
  outlined(ctx, ICON_ACCENT_COLD_COLOR, () => {
    ctx.moveTo(Q / 2, S - Q / 2);
    ctx.quadraticCurveTo(Q, Q / 2, S - Q / 2, Q / 2);
    ctx.quadraticCurveTo(S - Q, S - Q, Q / 2, S - Q / 2);
  });
  ctx.beginPath();
  ctx.moveTo(Q, S - Q);
  ctx.lineTo(S - Q / 2 - 2, Q / 2 + 2);
  ctx.lineWidth = DECORATION_OUTLINE_WIDTH;
  ctx.strokeStyle = hexToCss(OUTLINE_COLOR);
  ctx.stroke();
};

const drawExtendedFuelCells = (ctx: Ctx): void => {
  outlined(ctx, ICON_METAL_COLOR, () => {
    ctx.rect(Q / 2, Q, Q, S - Q * 2);
    ctx.rect(MID + 1, Q, Q, S - Q * 2);
  });
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.rect(Q / 2 + 2, Q / 2, Q - 4, Q / 2);
    ctx.rect(MID + 3, Q / 2, Q - 4, Q / 2);
  });
};

const drawEfficientInjectors = (ctx: Ctx): void => {
  outlined(ctx, ICON_ACCENT_FLAME_COLOR, () => {
    ctx.moveTo(MID, Q / 2);
    ctx.quadraticCurveTo(S - Q / 2, MID + Q / 2, MID, S - Q / 2);
    ctx.quadraticCurveTo(Q / 2, MID + Q / 2, MID, Q / 2);
  });
  ctx.beginPath();
  ctx.arc(MID, MID + 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = hexToCss(ICON_METAL_COLOR);
  ctx.fill();
};

/** Every store-visible equipment item and permanent upgrade, by id —
 * completeness against both registries is pinned by item-icons.test.ts. */
const ICON_DRAWERS: Readonly<Record<string, (ctx: Ctx) => void>> = {
  'pulse-cannon': drawPulseCannon,
  autocannon: drawAutocannon,
  'fuel-tank': drawFuelTank,
  'corrosion-coating': drawCorrosionCoating,
  'thermal-lining': drawThermalLining,
  'barrier-shield': drawBarrierShield,
  'repair-kit': drawRepairKit,
  'thrust-booster': drawThrustBooster,
  'stronger-engines': drawStrongerEngines,
  'lighter-hull-alloy': drawLighterHull,
  'extended-fuel-cells': drawExtendedFuelCells,
  'efficient-injectors': drawEfficientInjectors,
};

// Load-time drift check against the pure id list the completeness test
// pins — a drawer without an id entry (or vice versa) fails the first
// import, not the first render.
for (const id of ITEM_ICON_IDS) {
  if (!(id in ICON_DRAWERS)) {
    throw new Error(`item-icons: ITEM_ICON_IDS lists '${id}' but no drawer exists for it.`);
  }
}
for (const id of Object.keys(ICON_DRAWERS)) {
  if (!ITEM_ICON_IDS.includes(id)) {
    throw new Error(`item-icons: drawer '${id}' is missing from ITEM_ICON_IDS.`);
  }
}

/**
 * Adds one item/upgrade icon image at (x, y). Bakes the glyph at most
 * once per id behind an exists() guard (the M11/M13 texture-key lesson —
 * store/loadout re-render after every purchase/equip, and a rebake would
 * be wasted work at best). Throws on an unknown id.
 */
export function createItemIconImage(
  scene: Phaser.Scene,
  id: string,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  const draw = ICON_DRAWERS[id];
  if (!draw) {
    throw new Error(`createItemIconImage: no icon registered for id '${id}'`);
  }
  const key = `item-icon-${id}`;
  if (!scene.textures.exists(key)) {
    bakeCanvasTexture(
      scene,
      key,
      S + DECORATION_SHADOW_OFFSET_PX,
      S + DECORATION_SHADOW_OFFSET_PX,
      (ctx) => {
        ctx.save();
        ctx.translate(DECORATION_SHADOW_OFFSET_PX, DECORATION_SHADOW_OFFSET_PX);
        ctx.globalAlpha = DECORATION_SHADOW_ALPHA;
        ctx.fillStyle = hexToCss(OUTLINE_COLOR);
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
        // Paper card behind the glyph, so every icon reads as the same
        // cut square of stock whatever its glyph shape.
        outlined(ctx, ICON_METAL_DARK_COLOR, () => {
          ctx.rect(0, 0, S, S);
        });
        draw(ctx);
      },
    );
  }
  return scene.add.image(x, y, key);
}
