import { GRID } from "./tilemap.js";

// Several fixed buildings baked into the outdoor ground texture: small
// rooms with a wall ring (one tile thick), a 2-tile-wide door gap in the
// south wall, and furniture scattered inside. Placed in open ground well
// clear of every road (see tilemap.js's road layout) — one in the grass
// biome's middle lane, one in the sand biome's middle lane, and one south
// of the main road in the grass biome.
export const BUILDINGS = [
  { centerX: -40, centerZ: -30, cols: 6, rows: 6, doorCol: 2, doorWidth: 2 },
  { centerX: 40, centerZ: -30, cols: 6, rows: 6, doorCol: 2, doorWidth: 2 },
  { centerX: -40, centerZ: 30, cols: 6, rows: 6, doorCol: 2, doorWidth: 2 },
];

const TILE = GRID.tileWorld;

function layout(building) {
  const originX = building.centerX - (building.cols * TILE) / 2;
  const originZ = building.centerZ - (building.rows * TILE) / 2;
  return { originX, originZ };
}

function cellCenter(building, origin, c, r) {
  return { x: origin.originX + (c + 0.5) * TILE, z: origin.originZ + (r + 0.5) * TILE };
}

function isDoorCell(building, c, r) {
  return r === building.rows - 1 && c >= building.doorCol && c < building.doorCol + building.doorWidth;
}

function isWallCell(building, c, r) {
  const onRing = r === 0 || r === building.rows - 1 || c === 0 || c === building.cols - 1;
  return onRing && !isDoorCell(building, c, r);
}

// Bakes every building's floor + walls directly onto the outdoor ground
// canvas, using the same world<->pixel scale as tilemap.js's road/biome
// bake, so they line up seamlessly with the rest of the map in one texture.
export function stampBuilding(canvas, textures) {
  const ctx = canvas.getContext("2d");
  const pxPerWorldUnit = GRID.tilePx / GRID.tileWorld;
  const canvasHalf = (GRID.cols * GRID.tileWorld) / 2;

  for (const building of BUILDINGS) {
    const origin = layout(building);
    for (let r = 0; r < building.rows; r++) {
      for (let c = 0; c < building.cols; c++) {
        const { x, z } = cellCenter(building, origin, c, r);
        const cx = (x - TILE / 2 + canvasHalf) * pxPerWorldUnit;
        const cy = (z - TILE / 2 + canvasHalf) * pxPerWorldUnit;
        const img = isWallCell(building, c, r) ? textures.buildingWall.image : textures.buildingFloor.image;
        ctx.drawImage(img, cx, cy, GRID.tilePx, GRID.tilePx);
      }
    }
  }
}

// Keeps the outdoor prop scatter from placing crates/trees/etc. on top of
// any building.
export function isInsideBuilding(x, z) {
  return BUILDINGS.some((building) => {
    const halfW = (building.cols * TILE) / 2;
    const halfH = (building.rows * TILE) / 2;
    return Math.abs(x - building.centerX) < halfW && Math.abs(z - building.centerZ) < halfH;
  });
}

// Invisible colliders for every wall cell of every building (the wall's
// visual is already baked into the ground texture, so these have no
// accompanying sprite). Radius is slightly larger than a half-tile so
// neighboring wall circles overlap and leave no gap a player/bullet could
// slip through at a seam.
export function buildingColliders() {
  const colliders = [];
  for (const building of BUILDINGS) {
    const origin = layout(building);
    for (let r = 0; r < building.rows; r++) {
      for (let c = 0; c < building.cols; c++) {
        if (!isWallCell(building, c, r)) continue;
        const { x, z } = cellCenter(building, origin, c, r);
        colliders.push({ x, z, radius: TILE / 2 + 0.5 });
      }
    }
  }
  return colliders;
}

// Furniture placed inside each room — visible, collidable obstacles using
// the same treatment as outdoor props (see world.js's scatterProps). Every
// building uses the same relative interior layout, offset to its own
// center.
export function buildingFurniture() {
  const items = [];
  for (const building of BUILDINGS) {
    const cx = building.centerX;
    const cz = building.centerZ;
    items.push(
      { key: "furnitureTable", x: cx, z: cz - 3, size: 1.8, radius: 0.9 },
      { key: "furnitureChair", x: cx - 2, z: cz - 1, size: 1.1, radius: 0.5 },
      { key: "furnitureChair", x: cx + 2, z: cz - 1, size: 1.1, radius: 0.5, rotation: Math.PI },
      { key: "furnitureCouch", x: cx - 4, z: cz + 2, size: 2.2, radius: 1, rotation: Math.PI / 2 },
      { key: "furnitureCounter", x: cx + 4, z: cz + 6, size: 1.8, radius: 0.9 }
    );
  }
  return items;
}
