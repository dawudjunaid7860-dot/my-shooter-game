import * as THREE from "three";
import { createGroundSprite, createBlobShadow } from "./world.js";
import { randomEdgePoint } from "./utils.js";
import { ENEMY_TYPES, getLevelConfig, pickEnemyType } from "./levels.js";
import { WEAPON_TYPES, pickRandomWeapon } from "./weapons.js";

export class Enemy {
  // typeKey is a key into ENEMY_TYPES; levelConfig supplies the difficulty
  // multiplier applied on top of that type's base stats.
  constructor(scene, textures, x, z, typeKey, levelConfig) {
    const def = ENEMY_TYPES[typeKey];
    const mult = levelConfig.difficultyMultiplier;

    this.type = typeKey;
    this.behavior = def.behavior; // "melee" | "ranged" | "boss"
    this.spriteConvention = def.spriteConvention; // "tank" | "person"
    this.speed = def.speed * mult.speed;
    this.maxHealth = Math.round(def.health * mult.health);
    this.health = this.maxHealth;
    this.radius = def.radius;
    this.attackRange = def.attackRange;
    this.attackDamage = Math.round(def.damage * mult.damage);
    this.attackCooldown = def.attackCooldown;
    this.currencyValue = def.currencyValue;
    this.alive = true;

    if (this.behavior === "ranged" || this.behavior === "boss") {
      this.preferredRange = def.preferredRange;
      this.retreatRange = def.retreatRange;
      this.bulletSpeed = def.bulletSpeed;
    }

    // Ranged people carry a randomly-picked gun (see weapons.js) — each has
    // its own damage/fire-rate/ammo/reload, so ranged enemies vary instead
    // of all sharing one fixed weapon, and now have to reload like the
    // player does.
    if (this.behavior === "ranged") {
      this.weaponKey = pickRandomWeapon();
      const weapon = WEAPON_TYPES[this.weaponKey];
      this.attackDamage = Math.round(weapon.damage * mult.damage);
      this.attackCooldown = weapon.attackCooldown;
      this.maxAmmo = weapon.ammoCapacity;
      this.ammo = weapon.ammoCapacity;
      this.reloadDuration = weapon.reloadDuration;
      this.isReloading = false;
      this._reloadTimer = 0;
    }

    if (this.behavior === "boss") {
      this.burstCount = def.burstCount;
      this.burstShotInterval = def.burstShotInterval;
      this.burstPauseDuration = def.burstPauseDuration;
      this._burstState = "pause";
      this._burstShotsLeft = 0;
      // Give the player a moment to see the boss before the first burst.
      this._burstTimer = this.burstPauseDuration * 0.6;
    }

    this._attackTimer = this.attackCooldown * 0.5;
    // Fixed per-enemy left/right bias for obstacle avoidance below — keeping
    // it constant (rather than recomputed each frame) stops the steering
    // from flip-flopping between sides when the desired path points nearly
    // straight at an obstacle's center.
    this._avoidSide = Math.random() < 0.5 ? 1 : -1;
    // Stuck-escape bookkeeping: periodically checks whether the enemy has
    // actually moved despite wanting to (tangent-slide steering alone can
    // still wedge into a concave corner or doorway gap where the nearest
    // wall segment keeps flipping); if not, forceEscapeTimer briefly
    // overrides steering with a hard push away from whatever's closest.
    this._stuckCheckTimer = 0.5;
    this._stuckCheckPos = { x, z };
    this._escapeTimer = 0;

    this.mesh = createGroundSprite(textures[def.textureKey], def.spriteSize, 0.09);
    this.mesh.position.set(x, 0.09, z);
    scene.add(this.mesh);

    this.shadow = createBlobShadow(def.spriteSize * 0.85);
    this.shadow.position.set(x, 0.03, z);
    scene.add(this.shadow);
  }

  get position() {
    return this.mesh.position;
  }

  // Moves toward/away from the player depending on behavior, blocked by
  // static obstacles and separated from other enemies. Returns true the
  // instant a melee attack lands (caller applies damage to the player).
  // onEnemyFire(position, direction, damage, bulletSpeed) is invoked when a
  // ranged enemy shoots.
  update(dt, playerPos, others, colliders, onEnemyFire) {
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const dist = Math.max(Math.sqrt(dx * dx + dz * dz), 1e-4);
    const nx = dx / dist;
    const nz = dz / dist;

    this._attackTimer -= dt;

    let moveX = 0;
    let moveZ = 0;
    let wantsToMove = false;

    if (this.behavior === "ranged" || this.behavior === "boss") {
      if (dist > this.attackRange || dist > this.preferredRange) {
        moveX = nx;
        moveZ = nz;
        wantsToMove = true;
      } else if (dist < this.retreatRange) {
        moveX = -nx;
        moveZ = -nz;
        wantsToMove = true;
      }
      // else: within the preferred band — hold position and shoot.
    } else if (dist > this.attackRange) {
      moveX = nx;
      moveZ = nz;
      wantsToMove = true;
    }

    if (wantsToMove) {
      // Stuck-escape check: every 0.5s, verify the enemy actually covered
      // some distance despite wanting to move. Tangent-slide steering
      // (below) handles a single wall fine, but can still wedge an enemy
      // into a concave corner or doorway gap where the nearest blocking
      // segment keeps flipping and the two competing slide directions
      // cancel out. When that happens, force a hard push away from
      // whatever's closest for a short window, ignoring the chase target
      // entirely, which reliably breaks it free.
      this._stuckCheckTimer -= dt;
      if (this._stuckCheckTimer <= 0) {
        const moved = Math.hypot(
          this.mesh.position.x - this._stuckCheckPos.x,
          this.mesh.position.z - this._stuckCheckPos.z
        );
        if (moved < 0.3) this._escapeTimer = 0.6;
        this._stuckCheckPos = { x: this.mesh.position.x, z: this.mesh.position.z };
        this._stuckCheckTimer = 0.5;
      }

      let mx = moveX;
      let mz = moveZ;
      let escaping = false;

      if (this._escapeTimer > 0) {
        escaping = true;
        this._escapeTimer -= dt;
        let nearestC = null;
        let nearestD = Infinity;
        for (const c of colliders) {
          const cdx = this.mesh.position.x - c.x;
          const cdz = this.mesh.position.z - c.z;
          const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
          if (cdist < nearestD) {
            nearestD = cdist;
            nearestC = { cdx, cdz, cdist };
          }
        }
        if (nearestC && nearestC.cdist > 1e-4) {
          const awayX = nearestC.cdx / nearestC.cdist;
          const awayZ = nearestC.cdz / nearestC.cdist;
          mx = awayX * 0.7 - awayZ * this._avoidSide * 0.7;
          mz = awayZ * 0.7 + awayX * this._avoidSide * 0.7;
        }
      } else {
        // Steer around anything blocking the desired path instead of
        // walking straight into it — only the single nearest blocker is
        // considered, since building walls are a dense run of overlapping
        // per-tile colliders and summing a slide contribution from every
        // one of them in range over-corrects (each pushes the same
        // direction, stacking into a vector that overwhelms the pull
        // toward the target instead of just deflecting around the wall).
        let nearestBlocker = null;
        let nearestDist = Infinity;
        for (const c of colliders) {
          const cdx = c.x - this.mesh.position.x;
          const cdz = c.z - this.mesh.position.z;
          const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
          const lookahead = this.radius + c.radius + 1.5;
          if (cdist > 1e-4 && cdist < lookahead && cdist < nearestDist) {
            const towardObstacle = (cdx / cdist) * mx + (cdz / cdist) * mz;
            if (towardObstacle > 0.3) {
              nearestBlocker = { cdx, cdz, cdist, radius: c.radius };
              nearestDist = cdist;
            }
          }
        }
        if (nearestBlocker) {
          const { cdx, cdz, cdist, radius } = nearestBlocker;
          const tangentX = (-cdz / cdist) * this._avoidSide;
          const tangentZ = (cdx / cdist) * this._avoidSide;
          const strength = 1 - (cdist - this.radius - radius) / 1.5;
          mx += tangentX * strength * 1.2;
          mz += tangentZ * strength * 1.2;
        }
      }

      for (const other of others) {
        if (other === this || !other.alive) continue;
        const odx = this.mesh.position.x - other.mesh.position.x;
        const odz = this.mesh.position.z - other.mesh.position.z;
        const odist = Math.sqrt(odx * odx + odz * odz);
        if (odist < 1.6 && odist > 1e-4) {
          mx += (odx / odist) * 0.6;
          mz += (odz / odist) * 0.6;
        }
      }

      const mlen = Math.sqrt(mx * mx + mz * mz) || 1;
      mx /= mlen;
      mz /= mlen;

      let nextX = this.mesh.position.x + mx * this.speed * dt;
      let nextZ = this.mesh.position.z + mz * this.speed * dt;

      // Skip the overlap correction below while escaping: if the enemy is
      // wedged in a pocket tighter than its own diameter (a tight concave
      // corner where multiple wall-tile colliders overlap), this correction
      // would just shove the escape push straight back where it came from,
      // same as the chase-direction freeze this whole system exists to fix.
      // Letting it briefly clip through geometry for this short window is
      // unnoticeable and guarantees it actually gets clear.
      if (!escaping) {
        for (const c of colliders) {
          const cdx = nextX - c.x;
          const cdz = nextZ - c.z;
          const minDist = this.radius + c.radius;
          const cdist = Math.sqrt(cdx * cdx + cdz * cdz);
          if (cdist < minDist && cdist > 1e-4) {
            const push = minDist - cdist;
            nextX += (cdx / cdist) * push;
            nextZ += (cdz / cdist) * push;
          }
        }
      }

      this.mesh.position.x = nextX;
      this.mesh.position.z = nextZ;
    }

    // Heading must be written to rotation.z, not .y — see the comment in
    // player.js's aimAt() for why (XYZ Euler order + the flat-lay tilt).
    // Tank art's barrel points toward image-bottom (forward = (sin,cos));
    // person art holds its gun toward image-right (forward = (cos,-sin)) —
    // see player.js's aimAt() for the full derivation of both.
    this.mesh.rotation.z =
      this.spriteConvention === "person" ? Math.atan2(-nz, nx) : Math.atan2(nx, nz);
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.position.z = this.mesh.position.z;

    if (this.behavior === "boss") {
      this._burstTimer -= dt;
      if (dist <= this.attackRange) {
        if (this._burstState === "pause" && this._burstTimer <= 0) {
          this._burstState = "burst";
          this._burstShotsLeft = this.burstCount;
          this._burstTimer = 0; // fire the first shot this frame
        }
        if (this._burstState === "burst" && this._burstTimer <= 0 && this._burstShotsLeft > 0) {
          onEnemyFire(this.mesh.position, { x: nx, z: nz }, this.attackDamage, this.bulletSpeed);
          this._burstShotsLeft -= 1;
          this._burstTimer = this._burstShotsLeft > 0 ? this.burstShotInterval : this.burstPauseDuration;
          if (this._burstShotsLeft <= 0) this._burstState = "pause";
        }
      }
      return false;
    }

    if (this.behavior === "ranged") {
      if (this.isReloading) {
        this._reloadTimer -= dt;
        if (this._reloadTimer <= 0) {
          this.isReloading = false;
          this.ammo = this.maxAmmo;
        }
      } else if (dist <= this.attackRange && this._attackTimer <= 0 && this.ammo > 0) {
        this._attackTimer = this.attackCooldown;
        this.ammo -= 1;
        onEnemyFire(this.mesh.position, { x: nx, z: nz }, this.attackDamage, this.bulletSpeed);
        if (this.ammo <= 0) {
          this.isReloading = true;
          this._reloadTimer = this.reloadDuration;
        }
      }
      return false;
    }

    if (dist <= this.attackRange && this._attackTimer <= 0) {
      this._attackTimer = this.attackCooldown;
      return true;
    }
    return false;
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  dispose(scene) {
    scene.remove(this.mesh);
    scene.remove(this.shadow);
  }
}

// Level structure: each level has a fixed quota of regular enemies (drawn
// from a weighted mix of types) to spawn and clear. Once that quota is
// fully dispatched and killed, a single boss spawns; the level is only
// complete once the boss is dead too.
export class EnemySpawner {
  constructor(scene, textures, bounds) {
    this.scene = scene;
    this.textures = textures;
    this.bounds = bounds;
    this.enemies = [];
    this.level = 1;
    this.config = getLevelConfig(1);
    this.spawnedCount = 0;
    this.killedCount = 0;
    this.bossSpawned = false;
    this.boss = null;
    this._spawnTimer = 0.8;
  }

  startLevel(level) {
    for (const enemy of this.enemies) enemy.dispose(this.scene);
    this.enemies = [];
    this.level = level;
    this.config = getLevelConfig(level);
    this.spawnedCount = 0;
    this.killedCount = 0;
    this.bossSpawned = false;
    this.boss = null;
    this._spawnTimer = 0.8;
  }

  get remainingToSpawn() {
    return this.config.enemyQuota - this.spawnedCount;
  }

  get isLevelComplete() {
    return this.bossSpawned && this.enemies.length === 0;
  }

  // onEnemyAttack(enemy) fires on a melee hit; onEnemyFire(pos, dir, damage,
  // bulletSpeed) fires when a ranged enemy or the boss shoots.
  update(dt, playerPos, colliders, onEnemyAttack, onEnemyFire) {
    this._spawnTimer -= dt;
    const aliveCount = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    if (this._spawnTimer <= 0 && this.remainingToSpawn > 0 && aliveCount < this.config.maxConcurrent) {
      this._spawnTimer = this.config.spawnInterval;
      this._spawnEnemy();
    } else if (this.remainingToSpawn <= 0 && !this.bossSpawned && this.enemies.length === 0) {
      this._spawnBoss();
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const attacked = enemy.update(dt, playerPos, this.enemies, colliders, onEnemyFire);
      if (attacked) onEnemyAttack(enemy);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.killedCount += 1;
        this.enemies[i].dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }
  }

  _spawnEnemy() {
    const p = randomEdgePoint(this.bounds, 4);
    const typeKey = pickEnemyType(this.config);
    this.enemies.push(new Enemy(this.scene, this.textures, p.x, p.z, typeKey, this.config));
    this.spawnedCount += 1;
  }

  _spawnBoss() {
    const p = randomEdgePoint(this.bounds, 4);
    const boss = new Enemy(this.scene, this.textures, p.x, p.z, "boss", this.config);
    this.enemies.push(boss);
    this.boss = boss;
    this.bossSpawned = true;
  }
}

export class ExplosionSystem {
  constructor(scene, frameTextures) {
    this.scene = scene;
    this.frames = frameTextures;
    this.frameDuration = 0.05;
    this.active = [];
  }

  spawn(position, scale = 2.6) {
    const material = new THREE.SpriteMaterial({
      map: this.frames[0],
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, scale);
    sprite.position.set(position.x, 0.5, position.z);
    this.scene.add(sprite);
    this.active.push({ sprite, t: 0, frame: 0 });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      entry.t += dt;
      const frame = Math.floor(entry.t / this.frameDuration);

      if (frame >= this.frames.length) {
        this.scene.remove(entry.sprite);
        this.active.splice(i, 1);
        continue;
      }

      if (frame !== entry.frame) {
        entry.frame = frame;
        entry.sprite.material.map = this.frames[frame];
        entry.sprite.material.needsUpdate = true;
      }
    }
  }

  clear() {
    for (const entry of this.active) this.scene.remove(entry.sprite);
    this.active = [];
  }
}
