import { createGroundSprite, createGlowRing } from "./world.js";
import { randRange, distance2D } from "./utils.js";

export const POWERUP_DEFS = {
  health: {
    textureKey: "powerupHealth",
    color: "#3ddc5b",
    size: 1.4,
    healAmount: 40,
  },
  speed: {
    textureKey: "powerupSpeed",
    color: "#3d9bdc",
    size: 1.4,
    multiplier: 1.6,
    duration: 7,
  },
  rapidFire: {
    textureKey: "powerupRapidFire",
    color: "#ffb03d",
    size: 1.1,
    multiplier: 2.2,
    duration: 7,
  },
};

const TYPE_KEYS = Object.keys(POWERUP_DEFS);
const PICKUP_RADIUS = 1.3;

// Spawns health/speed/rapid-fire pickups at random valid ground positions
// (clear of obstacles and the spawn point), collected by driving over them.
export class PowerUpSystem {
  constructor(scene, textures, bounds, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.bounds = bounds;
    this.colliders = colliders;
    this.active = [];
    this.maxActive = 3;
    this.spawnInterval = 9;
    this._spawnTimer = 4;
  }

  reset() {
    for (const p of this.active) {
      this.scene.remove(p.mesh);
      this.scene.remove(p.glow);
    }
    this.active = [];
    this._spawnTimer = 4;
  }

  update(dt, playerPos, onPickup) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0 && this.active.length < this.maxActive) {
      this._spawnTimer = this.spawnInterval;
      this._trySpawn();
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.bobT += dt;
      p.mesh.rotation.z += dt * 1.1;
      p.mesh.position.y = 0.4 + Math.sin(p.bobT * 3) * 0.08;

      if (distance2D(playerPos.x, playerPos.z, p.x, p.z) < PICKUP_RADIUS) {
        onPickup(p.type);
        this.scene.remove(p.mesh);
        this.scene.remove(p.glow);
        this.active.splice(i, 1);
      }
    }
  }

  _trySpawn() {
    let x = 0;
    let z = 0;
    let attempts = 0;
    let placed = false;
    while (attempts < 20) {
      x = randRange(-this.bounds + 3, this.bounds - 3);
      z = randRange(-this.bounds + 3, this.bounds - 3);
      attempts += 1;
      if (!this._blocked(x, z)) {
        placed = true;
        break;
      }
    }
    if (!placed) return;

    const type = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
    const def = POWERUP_DEFS[type];

    const glow = createGlowRing(def.color, def.size * 1.8);
    glow.position.set(x, 0.04, z);
    this.scene.add(glow);

    const mesh = createGroundSprite(this.textures[def.textureKey], def.size, 0.4);
    mesh.position.set(x, 0.4, z);
    this.scene.add(mesh);

    this.active.push({ type, mesh, glow, x, z, bobT: Math.random() * 10 });
  }

  _blocked(x, z) {
    if (Math.hypot(x, z) < 8) return true; // keep the spawn point clear
    for (const c of this.colliders) {
      if (distance2D(x, z, c.x, c.z) < c.radius + 1.2) return true;
    }
    for (const p of this.active) {
      if (distance2D(x, z, p.x, p.z) < 4) return true;
    }
    return false;
  }
}
