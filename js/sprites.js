import * as THREE from "three";
import { makeBlobShadowTexture } from "./utils.js";

// Generic flat-sprite helpers shared by world.js (ground props), player.js,
// enemy.js, powerups.js, and building.js. Pulled into their own module (out
// of world.js) so building.js can use them without creating a circular
// import between world.js and building.js.

const BLOB_TEXTURE = new THREE.CanvasTexture(makeBlobShadowTexture());

export function createBlobShadow(scale = 1.6) {
  const geometry = new THREE.PlaneGeometry(scale, scale);
  const material = new THREE.MeshBasicMaterial({
    map: BLOB_TEXTURE,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

// Creates a flat, top-down-facing sprite plane (used for tanks, people,
// bullets, and props whose art is drawn as if viewed from directly above).
export function createGroundSprite(texture, size = 2, y = 0.08) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.4,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

const glowTextureCache = new Map();

function makeGlowTexture(color) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `${color}cc`);
  gradient.addColorStop(0.55, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Soft additive glow disc used under power-up pickups to make them read
// clearly and hint at their type by color, from a distance.
export function createGlowRing(color, scale = 2.2) {
  let texture = glowTextureCache.get(color);
  if (!texture) {
    texture = makeGlowTexture(color);
    glowTextureCache.set(color, texture);
  }

  const geometry = new THREE.PlaneGeometry(scale, scale);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  return mesh;
}
