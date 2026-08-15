import * as THREE from "three";
import { cloneModel } from "./models.js";

const trailTextureCache = new Map();

function makeTrailTexture(color) {
  const w = 64;
  const h = 16;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // Bright at the leading (+X/right) edge, fading to transparent at the tail.
  const gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, `${color}00`);
  gradient.addColorStop(1, `${color}cc`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}

function createTrail(color, length, width) {
  let texture = trailTextureCache.get(color);
  if (!texture) {
    texture = makeTrailTexture(color);
    trailTextureCache.set(color, texture);
  }
  const geometry = new THREE.PlaneGeometry(length, width);
  geometry.translate(length / 2, 0, 0); // pivot at the trailing edge's opposite (leading) end
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Same heading convention as player.js's aimAt() for flat ground sprites
// (see the comment there): rotation.z = atan2(-dz, dx) points local +X
// (the trail's bright leading edge) along (dx, dz).
function headingFor(dirX, dirZ) {
  return Math.atan2(-dirZ, dirX);
}

// Bullet pool using a real 3D model (Kenney Blaster Kit's foam-tip dart)
// instead of a flat sprite, each towing a short fading motion trail. Shared
// by the player's gun and every enemy ranged attack — each gets its own
// instance (different model tint/team) but both use this same logic.
export class BulletSystem {
  constructor(scene, template, { speed = 42, maxRange = 55, damage = 34, scale = 0.6, trailColor = "#ffcf7a" } = {}) {
    this.scene = scene;
    this.template = template;
    this.pool = [];
    this.active = [];
    this.defaultSpeed = speed;
    this.maxRange = maxRange;
    this.defaultDamage = damage;
    this.scale = scale;
    this.trailColor = trailColor;
  }

  spawn(position, direction, { speed, damage } = {}) {
    let entry = this.pool.pop();
    if (!entry) {
      const mesh = cloneModel(this.template);
      mesh.scale.setScalar(this.scale);
      const trail = createTrail(this.trailColor, 1.6, 0.35);
      entry = { mesh, trail };
    }

    entry.mesh.position.set(position.x, 0.5, position.z);
    // The bullet mesh is a normal (non-flattened) 3D model, so orient it
    // with lookAt — three.js's standard local -Z-is-forward convention —
    // rather than the flat-sprite rotation.z trick used elsewhere.
    entry.mesh.lookAt(position.x + direction.x, 0.5, position.z + direction.z);
    entry.mesh.visible = true;
    entry.trail.visible = true;
    entry.trail.rotation.z = headingFor(direction.x, direction.z);
    entry.trail.position.set(position.x, 0.06, position.z);
    entry.trail.material.opacity = 1;

    entry.dir = direction;
    entry.speed = speed ?? this.defaultSpeed;
    entry.damage = damage ?? this.defaultDamage;
    entry.traveled = 0;

    this.scene.add(entry.mesh);
    this.scene.add(entry.trail);
    this.active.push(entry);
  }

  // targets: array of objects with {position, radius, alive}. colliders:
  // static obstacles ({x, z, radius}) that block and consume the bullet.
  update(dt, targets, colliders, onHitTarget) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      const step = entry.speed * dt;
      entry.mesh.position.x += entry.dir.x * step;
      entry.mesh.position.z += entry.dir.z * step;
      entry.traveled += step;

      entry.trail.position.x = entry.mesh.position.x;
      entry.trail.position.z = entry.mesh.position.z;
      entry.trail.material.opacity = Math.max(0, 1 - entry.traveled / (this.maxRange * 0.4));

      let consumed = false;

      for (const c of colliders) {
        const dx = entry.mesh.position.x - c.x;
        const dz = entry.mesh.position.z - c.z;
        const hitDist = c.radius + 0.25;
        if (dx * dx + dz * dz < hitDist * hitDist) {
          consumed = true;
          break;
        }
      }

      if (!consumed) {
        for (const target of targets) {
          if (!target.alive) continue;
          const dx = entry.mesh.position.x - target.position.x;
          const dz = entry.mesh.position.z - target.position.z;
          const hitDist = target.radius + 0.35;
          if (dx * dx + dz * dz < hitDist * hitDist) {
            onHitTarget(target, entry.damage);
            consumed = true;
            break;
          }
        }
      }

      if (consumed || entry.traveled > this.maxRange) {
        this._recycle(entry, i);
      }
    }
  }

  _recycle(entry, index) {
    this.scene.remove(entry.mesh);
    this.scene.remove(entry.trail);
    entry.mesh.visible = false;
    entry.trail.visible = false;
    this.active.splice(index, 1);
    this.pool.push(entry);
  }

  clear() {
    for (const entry of this.active) {
      this.scene.remove(entry.mesh);
      this.scene.remove(entry.trail);
    }
    this.active = [];
  }
}
