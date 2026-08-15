import { createGroundSprite, createGlowRing } from "./world.js";
import { randRange, distance2D } from "./utils.js";
import { PICKUP_WEAPON_KEYS, GRENADE_TYPE } from "./weapons.js";

const AMMO_REFILL = 10;

// kind is "weapon" | "ammo" | "grenade". Weighted so ammo/grenades (the
// recurring need) show up more often than a full new weapon.
const DROP_POOL = [
  { kind: "ammo" },
  { kind: "ammo" },
  { kind: "ammo" },
  { kind: "grenade" },
  { kind: "grenade" },
  ...PICKUP_WEAPON_KEYS.map((weaponId) => ({ kind: "weapon", weaponId })),
];

const PICKUP_RADIUS = 1.3;

const ICON_KEYS = {
  ammo: "pickupAmmo",
  grenade: "pickupGrenade",
  weapon: { rifle: "pickupRifle", shotgun: "pickupShotgun", heavy: "pickupHeavy" },
};

const COLORS = {
  ammo: "#ffd873",
  grenade: "#7ac74f",
  weapon: "#8fd6ff",
};

// Spawns weapon/ammo/grenade pickups at random valid ground positions,
// collected by walking over them. Mirrors js/powerups.js's spawn/bob/glow
// pattern but carries richer per-drop payload (which weapon, how much ammo).
export class FieldPickupSystem {
  constructor(scene, textures, bounds, colliders) {
    this.scene = scene;
    this.textures = textures;
    this.bounds = bounds;
    this.colliders = colliders;
    this.active = [];
    this.maxActive = 2;
    this.spawnInterval = 11;
    this._spawnTimer = 6;
  }

  reset() {
    for (const p of this.active) {
      this.scene.remove(p.mesh);
      this.scene.remove(p.glow);
    }
    this.active = [];
    this._spawnTimer = 6;
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
      p.mesh.rotation.z += dt * 0.8;
      p.mesh.position.y = 0.4 + Math.sin(p.bobT * 3) * 0.08;

      if (distance2D(playerPos.x, playerPos.z, p.x, p.z) < PICKUP_RADIUS) {
        onPickup(p.drop);
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

    const drop = DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)];
    const iconKey = drop.kind === "weapon" ? ICON_KEYS.weapon[drop.weaponId] : ICON_KEYS[drop.kind];
    const color = COLORS[drop.kind];
    const size = drop.kind === "weapon" ? 1.5 : 1.1;

    const glow = createGlowRing(color, size * 1.8);
    glow.position.set(x, 0.04, z);
    this.scene.add(glow);

    const mesh = createGroundSprite(this.textures[iconKey], size, 0.4);
    mesh.position.set(x, 0.4, z);
    this.scene.add(mesh);

    this.active.push({ drop, mesh, glow, x, z, bobT: Math.random() * 10 });
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

export { AMMO_REFILL };
export const GRENADE_PICKUP_AMOUNT = GRENADE_TYPE.pickupAmount;
