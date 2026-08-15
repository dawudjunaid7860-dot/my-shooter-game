import * as THREE from "three";
import { randRange } from "./utils.js";
import { GRID, isRoadCell, isBoundaryCell, cellBiome, cellToWorld, buildGroundTexture } from "./tilemap.js";
import { createGroundSprite, createBlobShadow, createGlowRing } from "./sprites.js";
import { isInsideBuilding, stampBuilding, buildingColliders, buildingFurniture } from "./building.js";

export { createGroundSprite, createBlobShadow, createGlowRing };

// Keep gameplay (movement clamp, enemy spawn ring) a little inside the
// baked ground texture so nothing walks off the edge of the world.
export const PLAY_HALF_EXTENT = (GRID.cols * GRID.tileWorld) / 2 - 4;

export function createGround(scene, textures) {
  const texture = buildGroundTexture(textures);
  stampBuilding(texture.image, textures);
  texture.needsUpdate = true;

  const size = GRID.cols * GRID.tileWorld;
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  return ground;
}

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xdfefff, 0x3a4a2f, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d6, 0.7);
  sun.position.set(-20, 40, 15);
  scene.add(sun);
  scene.add(sun.target);

  scene.background = new THREE.Color(0x1c2a1c);

  return { hemi, sun };
}

const PROP_DEFS = {
  grass: [
    { key: "propOilSpillLarge", size: 2.2, radius: 0, collide: false, weight: 2 },
    { key: "propOilSpillSmall", size: 1.3, radius: 0, collide: false, weight: 2 },
    { key: "propCrateWood", size: 1.6, radius: 0.7, collide: true, weight: 2 },
    { key: "propBarrelGreen", size: 1.2, radius: 0.5, collide: true, weight: 1 },
    { key: "propBarricadeWood", size: 2, radius: 0.9, collide: true, weight: 2 },
    { key: "propTreeLarge", size: 3, radius: 1.1, collide: true, weight: 2 },
    { key: "propTreeSmall", size: 2, radius: 0.75, collide: true, weight: 2 },
    { key: "propSandbag", size: 1.3, radius: 0.55, collide: true, weight: 1 },
    { key: "propFence", size: 1.8, radius: 0.4, collide: true, weight: 1 },
  ],
  sand: [
    { key: "propOilSpillLarge", size: 2.2, radius: 0, collide: false, weight: 2 },
    { key: "propOilSpillSmall", size: 1.3, radius: 0, collide: false, weight: 2 },
    { key: "propCrateMetal", size: 1.6, radius: 0.7, collide: true, weight: 2 },
    { key: "propBarrelRust", size: 1.2, radius: 0.5, collide: true, weight: 1 },
    { key: "propBarricadeMetal", size: 2, radius: 0.9, collide: true, weight: 2 },
    { key: "propSandbag", size: 1.3, radius: 0.55, collide: true, weight: 2 },
    { key: "propFence", size: 1.8, radius: 0.4, collide: true, weight: 1 },
  ],
};

function pickWeighted(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option;
  }
  return options[options.length - 1];
}

// Scatters obstacles/decoration across non-road cells, biome-appropriate
// (grass gets wood crates/barricades/trees/sandbags/fences + green barrels,
// sand gets metal crates/barricades/sandbags/fences + rust barrels; oil
// spill splats appear on both as ground clutter). Keeps the player's spawn
// area, every road tile, and the building footprint clear. Also places the
// building's furniture (see building.js). Returns collider circles for all
// solid obstacles (used to block movement for the player/enemies and to
// stop bullets — see bullet.js/enemy.js) — oil spills are flat decals, not
// obstacles, so they don't get a collider.
export function scatterProps(scene, textures) {
  const colliders = [];

  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      if (isRoadCell(c, r) || isBoundaryCell(c)) continue;

      const { x, z } = cellToWorld(c, r);
      if (Math.hypot(x, z) < 7) continue; // keep the player spawn clear
      if (isInsideBuilding(x, z)) continue; // keep the building footprint clear
      if (Math.random() > 0.3) continue; // density

      const def = pickWeighted(PROP_DEFS[cellBiome(c)]);
      const texture = textures[def.key];
      const px = x + randRange(-1, 1);
      const pz = z + randRange(-1, 1);

      const sprite = createGroundSprite(texture, def.size, 0.06);
      sprite.position.set(px, 0.06, pz);
      sprite.rotation.z = randRange(0, Math.PI * 2);
      scene.add(sprite);

      if (def.collide) {
        const shadow = createBlobShadow(def.size * 0.85);
        shadow.position.set(px, 0.03, pz);
        scene.add(shadow);
        colliders.push({ x: px, z: pz, radius: def.radius });
      }
    }
  }

  colliders.push(...buildingColliders());

  for (const item of buildingFurniture()) {
    const sprite = createGroundSprite(textures[item.key], item.size, 0.06);
    sprite.position.set(item.x, 0.06, item.z);
    sprite.rotation.z = item.rotation || 0;
    scene.add(sprite);

    const shadow = createBlobShadow(item.size * 0.85);
    shadow.position.set(item.x, 0.03, item.z);
    scene.add(shadow);

    colliders.push({ x: item.x, z: item.z, radius: item.radius });
  }

  return colliders;
}

// Straight-down orthographic camera matching the classic Kenney top-down
// look: no perspective foreshortening, sprites always read as flat icons.
export function createTopDownCamera(aspect, viewHeight = 34) {
  const halfH = viewHeight / 2;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 200);
  camera.up.set(0, 0, -1);
  camera.viewHeight = viewHeight;
  return camera;
}

export function resizeTopDownCamera(camera, aspect) {
  const halfH = camera.viewHeight / 2;
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

// Eases the camera toward the target instead of snapping to it every frame,
// using frame-rate-independent exponential smoothing. The in-progress
// follow position is stashed on the camera itself so callers don't need to
// track extra state. Call resetCameraFollow() when the player teleports
// (level start/retry) so the camera doesn't visibly drift across the map.
export function updateTopDownCamera(camera, targetPosition, dt = 1, smoothing = 8) {
  if (camera.followX === undefined) {
    camera.followX = targetPosition.x;
    camera.followZ = targetPosition.z;
  }
  const t = 1 - Math.exp(-smoothing * dt);
  camera.followX += (targetPosition.x - camera.followX) * t;
  camera.followZ += (targetPosition.z - camera.followZ) * t;
  camera.position.set(camera.followX, 40, camera.followZ);
  camera.lookAt(camera.followX, 0, camera.followZ);
}

export function resetCameraFollow(camera, position) {
  camera.followX = position.x;
  camera.followZ = position.z;
}
