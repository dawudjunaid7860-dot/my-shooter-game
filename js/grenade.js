import { createGroundSprite } from "./world.js";
import { GRENADE_TYPE } from "./weapons.js";

const FUSE_TIME = 1.6;

// Thrown grenades: a flat sprite lobbed toward the aim point (colliders are
// ignored in flight — a tossed grenade sailing over low cover reads fine in
// a top-down view), detonating on arrival, at max range, or when the fuse
// runs out, whichever comes first. Explosion resolution (AoE damage, visual,
// sound) is left to the caller via onExplode, matching BulletSystem's
// callback-driven hit pattern.
export class GrenadeSystem {
  constructor(scene, texture) {
    this.scene = scene;
    this.texture = texture;
    this.active = [];
  }

  spawn(origin, targetPoint) {
    let dx = targetPoint.x - origin.x;
    let dz = targetPoint.z - origin.z;
    let dist = Math.hypot(dx, dz);
    if (dist < 1e-4) {
      dx = 1;
      dz = 0;
      dist = 1;
    }
    const range = Math.min(dist, GRENADE_TYPE.maxRange);
    const dir = { x: dx / dist, z: dz / dist };

    const mesh = createGroundSprite(this.texture, 0.9, 0.35);
    mesh.position.set(origin.x, 0.35, origin.z);
    this.scene.add(mesh);

    this.active.push({ mesh, dir, traveled: 0, range, fuse: FUSE_TIME, x: origin.x, z: origin.z });
  }

  update(dt, onExplode) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i];
      g.fuse -= dt;
      const step = GRENADE_TYPE.throwSpeed * dt;
      g.x += g.dir.x * step;
      g.z += g.dir.z * step;
      g.traveled += step;
      g.mesh.position.x = g.x;
      g.mesh.position.z = g.z;
      g.mesh.rotation.z += dt * 10;

      if (g.traveled >= g.range || g.fuse <= 0) {
        this.scene.remove(g.mesh);
        this.active.splice(i, 1);
        onExplode({ x: g.x, z: g.z });
      }
    }
  }

  clear() {
    for (const g of this.active) this.scene.remove(g.mesh);
    this.active = [];
  }
}
