import { createGroundSprite, createBlobShadow } from "./world.js";
import { clamp } from "./utils.js";

const DEFAULT_STATS = { ammoCapacity: 30, fireRate: 6, moveSpeed: 9, maxHealth: 100, damage: 34 };

export class Player {
  // texture is the chosen character skin's sprite (see js/characters.js).
  constructor(scene, texture, bounds, stats = {}) {
    const { ammoCapacity, fireRate, moveSpeed, maxHealth, damage } = { ...DEFAULT_STATS, ...stats };

    this.bounds = bounds;
    this.speed = moveSpeed;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.maxAmmo = ammoCapacity;
    this.ammo = ammoCapacity;
    this.fireRate = fireRate; // shots per second
    this.damage = damage; // per-bullet damage
    this.reloadDuration = 1.6;
    this.isReloading = false;
    this.invulnTimer = 0;
    this.radius = 0.8;
    this.alive = true;

    this._fireCooldown = 0;
    this._reloadTimer = 0;

    // Temporary power-up buffs.
    this.speedMultiplier = 1;
    this.speedBoostTimer = 0;
    this.fireRateMultiplier = 1;
    this.rapidFireTimer = 0;

    this.mesh = createGroundSprite(texture, 1.8, 0.09);
    this.mesh.position.set(0, 0.09, 0);
    scene.add(this.mesh);

    this.shadow = createBlobShadow(1.6);
    scene.add(this.shadow);
  }

  get position() {
    return this.mesh.position;
  }

  get heading() {
    return this.mesh.rotation.z;
  }

  reset() {
    this.health = this.maxHealth;
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.invulnTimer = 0;
    this.alive = true;
    this._fireCooldown = 0;
    this._reloadTimer = 0;
    this.speedMultiplier = 1;
    this.speedBoostTimer = 0;
    this.fireRateMultiplier = 1;
    this.rapidFireTimer = 0;
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
        this.ammo = this.maxAmmo;
      }
    }
  }

  canFire() {
    return this.alive && !this.isReloading && this.ammo > 0 && this._fireCooldown <= 0;
  }

  fire() {
    this.ammo -= 1;
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
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this._reloadTimer = this.reloadDuration;
  }

  get reloadProgress() {
    if (!this.isReloading) return 1;
    return 1 - this._reloadTimer / this.reloadDuration;
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
