import * as THREE from "three";

// Grid layout for the baked ground texture: a grass biome on the west side
// and a sand biome on the east side (matching the Kenney reference image),
// joined by a horizontal road plus two vertical roads through each biome.
export const GRID = {
  cols: 40,
  rows: 40,
  tileWorld: 4, // world units per tile
  tilePx: 80, // resolution baked per tile in the composite canvas (3200x3200 total, safely under the 4096 WebGL texture cap)
};

// All road/boundary positions are derived as ratios of the grid size so the
// layout scales cleanly if GRID.cols/rows change.
const BOUNDARY_COL = Math.floor(GRID.cols / 2); // first sand column
const H_ROAD_ROW = Math.floor(GRID.rows / 2);
const V_ROADS_GRASS = [Math.floor(BOUNDARY_COL / 3), Math.floor((BOUNDARY_COL * 2) / 3)];
const sandWidth = GRID.cols - BOUNDARY_COL;
const V_ROADS_SAND = [
  BOUNDARY_COL + Math.floor(sandWidth / 3),
  BOUNDARY_COL + Math.floor((sandWidth * 2) / 3),
];

export function isGrassCol(c) {
  return c < BOUNDARY_COL;
}

export function cellBiome(c) {
  return isGrassCol(c) ? "grass" : "sand";
}

function isVerticalRoadCol(c) {
  return isGrassCol(c) ? V_ROADS_GRASS.includes(c) : V_ROADS_SAND.includes(c);
}

export function isRoadCell(c, r) {
  return r === H_ROAD_ROW || isVerticalRoadCol(c);
}

export function isBoundaryCell(c) {
  return c === BOUNDARY_COL - 1 || c === BOUNDARY_COL;
}

export function cellToWorld(c, r) {
  return {
    x: (c - GRID.cols / 2 + 0.5) * GRID.tileWorld,
    z: (r - GRID.rows / 2 + 0.5) * GRID.tileWorld,
  };
}

function pickTileImage(c, r, textures) {
  const grass = isGrassCol(c);
  const horizontal = r === H_ROAD_ROW;
  const vertical = isVerticalRoadCol(c);
  const boundaryGrassCell = c === BOUNDARY_COL - 1;

  if (horizontal && vertical) {
    return (grass ? textures.grassRoadCrossing : textures.sandRoadCrossing).image;
  }
  if (horizontal) {
    if (grass && boundaryGrassCell) return textures.grassRoadTransitionE.image;
    return (grass ? textures.grassRoadEast : textures.sandRoadEast).image;
  }
  if (vertical) {
    return (grass ? textures.grassRoadNorth : textures.sandRoadNorth).image;
  }
  if (grass && boundaryGrassCell) return textures.grassTransitionE.image;

  const variants = grass ? [textures.grass1, textures.grass2] : [textures.sand1, textures.sand2];
  const idx = (c * 31 + r * 17) % variants.length;
  return variants[idx].image;
}

// Bakes the whole tile grid into a single canvas texture so the ground
// renders as one draw call instead of hundreds of separate tile meshes.
export function buildGroundTexture(textures) {
  const canvas = document.createElement("canvas");
  canvas.width = GRID.cols * GRID.tilePx;
  canvas.height = GRID.rows * GRID.tilePx;
  const ctx = canvas.getContext("2d");

  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const img = pickTileImage(c, r, textures);
      ctx.drawImage(img, c * GRID.tilePx, r * GRID.tilePx, GRID.tilePx, GRID.tilePx);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
