import { createGroundSprite, createBlobShadow } from "./world.js";
import { clamp } from "./utils.js";
import { WEAPON_TYPES, GRENADE_TYPE } from "./weapons.js";

const DEFAULT_STATS = { ammoCapacity: 0, fireRate: 0, moveSpeed: 9, maxHealth: 100, damage: 0 };
const STARTER_WEAPON = "pistol";

export class Player {
  // texture is the chosen character skin's sprite (see js/characters.js).
  // stats come from SaveState.getStats() — moveSpeed/maxHealth are absolute,
  // while ammoCapacity/fireRate/damage are bonuses layered on top of
  // whichever weapon (see js/weapons.js) is currently equipped, since guns
  // are now found on the map rather than being a single fixed loadout.
  constructor(scene, texture, bounds, stats = {}) {
    const { ammoCapacity, fireRate, moveSpeed, maxHealth, damage } = { ...DEFAULT_STATS, ...stats };

    this.bounds = bounds;
    this.speed = moveSpeed;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.ammoBonus = ammoCapacity;
    this.fireRateBonus = fireRate;
    this.damageBonus = damage;
    this.reloadDuration = 1.6;
    this.isReloading = false;
    this.invulnTimer = 0;
    this.radius = 0.8;
    this.alive = true;

    this._fireCooldown = 0;
    this._reloadTimer = 0;
    this._reloadAmount = 0;

    // Temporary power-up buffs.
    this.speedMultiplier = 1;
    this.speedBoostTimer = 0;
    this.fireRateMultiplier = 1;
    this.rapidFireTimer = 0;

    this.weapons = {};
    this.currentWeaponId = STARTER_WEAPON;
    this.grenades = 0;
    this._grenadeCooldown = 0;
    this._initWeapons();

    this.mesh = createGroundSprite(texture, 1.8, 0.09);
    this.mesh.position.set(0, 0.09, 0);
    scene.add(this.mesh);

    this.shadow = createBlobShadow(1.6);
    scene.add(this.shadow);
  }

  _initWeapons() {
    this.weapons = {};
    const starter = WEAPON_TYPES[STARTER_WEAPON];
    this.weapons[STARTER_WEAPON] = { ammo: starter.ammoCapacity, reserve: starter.startingReserve };
    this.currentWeaponId = STARTER_WEAPON;
    this.grenades = 0;
    this._grenadeCooldown = 0;
  }

  get position() {
    return this.mesh.position;
  }

  get heading() {
    return this.mesh.rotation.z;
  }

  // Current weapon's stat block, including upgrade bonuses.
  get weaponDef() {
    return WEAPON_TYPES[this.currentWeaponId];
  }

  get maxAmmo() {
    return this.weaponDef.ammoCapacity + this.ammoBonus;
  }

  get ammo() {
    return this.weapons[this.currentWeaponId].ammo;
  }

  get reserveAmmo() {
    return this.weapons[this.currentWeaponId].reserve;
  }

  get damage() {
    return this.weaponDef.damage + this.damageBonus;
  }

  get fireRate() {
    return this.weaponDef.fireRate + this.fireRateBonus;
  }

  get ownedWeaponIds() {
    return Object.keys(this.weapons);
  }

  reset() {
    this.health = this.maxHealth;
    this.isReloading = false;
    this.invulnTimer = 0;
    this.alive = true;
    this._fireCooldown = 0;
    this._reloadTimer = 0;
    this.speedMultiplier = 1;
    this.speedBoostTimer = 0;
    this.fireRateMultiplier = 1;
    this.rapidFireTimer = 0;
    this._initWeapons();
    this.mesh.position.set(0, 0.09, 0);
    this.mesh.rotation.z = 0;
    this.shadow.position.set(0, 0.03, 0);
  }

  aimAt(point) {
    const dx = point.x - this.mesh.position.x;
    const dz = point.z - this.mesh.position.z;
    if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return;
    // The mesh is laid flat via rotation.x = -PI/2. With three.js's default
    // XYZ (intrinsic) Euler order, that tilt is applied first, which turns
    // the mesh's local Y axis into world -Z — so writing rotation.y would
    // spin it about a horizontal axis and tip it up on edge. The local Z
    // axis, however, ends up aligned with world +Y (vertical) after the
    // tilt, so heading must be written to rotation.z to stay flat.
    // Unlike the tank art (barrel toward image-bottom), these character
    // sprites hold their gun toward image-right (local +X), which maps to
    // world +X at heading 0 — so the formula differs from a tank's.
    this.mesh.rotation.z = Math.atan2(-dz, dx);
  }

  getForward() {
    const theta = this.mesh.rotation.z;
    return { x: Math.cos(theta), z: -Math.sin(theta) };
  }

  move(moveVec, dt, colliders) {
    if (moveVec.x === 0 && moveVec.z === 0) return;

    const effectiveSpeed = this.speed * this.speedMultiplier;
    let nx = this.mesh.position.x + moveVec.x * effectiveSpeed * dt;
    let nz = this.mesh.position.z + moveVec.z * effectiveSpeed * dt;

    nx = clamp(nx, -this.bounds, this.bounds);
    nz = clamp(nz, -this.bounds, this.bounds);

    for (const c of colliders) {
      const dx = nx - c.x;
      const dz = nz - c.z;
      const minDist = this.radius + c.radius;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist && dist > 1e-4) {
        const push = minDist - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      }
    }

    this.mesh.position.x = nx;
    this.mesh.position.z = nz;
    this.shadow.position.x = nx;
    this.shadow.position.z = nz;
  }

  update(dt) {
    if (this._fireCooldown > 0) this._fireCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this._grenadeCooldown > 0) this._grenadeCooldown -= dt;

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) this.speedMultiplier = 1;
    }
    if (this.rapidFireTimer > 0) {
      this.rapidFireTimer -= dt;
      if (this.rapidFireTimer <= 0) this.fireRateMultiplier = 1;
    }

    if (this.isReloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0) {
        this.isReloading = false;
        const slot = this.weapons[this.currentWeaponId];
        slot.ammo += this._reloadAmount;
        slot.reserve -= this._reloadAmount;
        this._reloadAmount = 0;
      }
    }
  }

  canFire() {
    return this.alive && !this.isReloading && this.ammo > 0 && this._fireCooldown <= 0;
  }

  fire() {
    this.weapons[this.currentWeaponId].ammo -= 1;
    this._fireCooldown = 1 / (this.fireRate * this.fireRateMultiplier);
    if (this.ammo <= 0) this.startReload();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  applySpeedBoost(multiplier, duration) {
    this.speedMultiplier = multiplier;
    this.speedBoostTimer = duration;
  }

  applyRapidFire(multiplier, duration) {
    this.fireRateMultiplier = multiplier;
    this.rapidFireTimer = duration;
  }

  startReload() {
    if (this.isReloading) return;
    const slot = this.weapons[this.currentWeaponId];
    if (slot.ammo >= this.maxAmmo || slot.reserve <= 0) return;
    this.isReloading = true;
    this._reloadTimer = this.weaponDef.reloadDuration;
    this._reloadAmount = Math.min(this.maxAmmo - slot.ammo, slot.reserve);
  }

  get reloadProgress() {
    if (!this.isReloading) return 1;
    return 1 - this._reloadTimer / this.weaponDef.reloadDuration;
  }

  // Adds a weapon to the collection (topping up its reserve if already
  // owned) — called when the player walks over a weapon pickup. Does not
  // auto-equip; switching is done via the weapon wheel.
  addWeapon(id) {
    const def = WEAPON_TYPES[id];
    if (!def) return;
    if (this.weapons[id]) {
      this.weapons[id].reserve += def.ammoCapacity;
    } else {
      this.weapons[id] = { ammo: def.ammoCapacity, reserve: def.startingReserve };
    }
  }

  // Refills the reserve of whichever weapon is currently equipped.
  addAmmo(amount) {
    this.weapons[this.currentWeaponId].reserve += amount;
  }

  addGrenades(amount) {
    this.grenades += amount;
  }

  switchWeapon(id) {
    if (!this.weapons[id] || id === this.currentWeaponId) return;
    this.currentWeaponId = id;
    this.isReloading = false;
    this._reloadAmount = 0;
    this._fireCooldown = Math.max(this._fireCooldown, 0.15); // brief switch delay
  }

  canThrowGrenade() {
    return this.alive && this.grenades > 0 && this._grenadeCooldown <= 0;
  }

  throwGrenade() {
    this.grenades -= 1;
    this._grenadeCooldown = GRENADE_TYPE.cooldown;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0 || !this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnTimer = 0.4;
    if (this.health <= 0) this.alive = false;
    return true;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    scene.remove(this.shadow);
  }
}
