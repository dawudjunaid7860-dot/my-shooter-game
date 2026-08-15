import { createGroundSprite } from "./sprites.js";

// Small puffs that pop under the player's feet at a walk-cadence interval
// while moving, using the tank pack's explosion-smoke sprites as dust.
export class FootstepDustSystem {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;
    this.active = [];
    this.stepInterval = 0.28;
    this._stepTimer = 0;
  }

  update(dt, position, isMoving) {
    if (isMoving) {
      this._stepTimer -= dt;
      if (this._stepTimer <= 0) {
        this._stepTimer = this.stepInterval;
        this._spawn(position);
      }
    } else {
      this._stepTimer = 0;
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      entry.t += dt;
      const progress = entry.t / entry.duration;

      if (progress >= 1) {
        this.scene.remove(entry.sprite);
        this.active.splice(i, 1);
        continue;
      }

      const scale = entry.baseScale * (0.6 + progress * 0.8);
      entry.sprite.scale.set(scale, scale, 1);
      entry.sprite.material.opacity = (1 - progress) * 0.45;
    }
  }

  _spawn(position) {
    const texture = this.textures[`footstepDust_${Math.floor(Math.random() * 3)}`];
    const sprite = createGroundSprite(texture, 0.9, 0.04);
    const offsetX = (Math.random() - 0.5) * 0.3;
    const offsetZ = (Math.random() - 0.5) * 0.3;
    sprite.position.set(position.x + offsetX, 0.04, position.z + offsetZ);
    sprite.rotation.z = Math.random() * Math.PI * 2;
    sprite.material.transparent = true;
    sprite.material.opacity = 0.45;
    this.scene.add(sprite);
    this.active.push({ sprite, t: 0, duration: 0.5, baseScale: 0.9 });
  }

  clear() {
    for (const entry of this.active) this.scene.remove(entry.sprite);
    this.active = [];
  }
}
