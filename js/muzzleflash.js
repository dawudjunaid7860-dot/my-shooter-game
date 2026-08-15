import { cloneModel } from "./models.js";

// Brief "muzzle smoke" puff (the Blaster Kit has no dedicated flash/spark
// model, so its smoke puff stands in) spawned at the barrel tip whenever
// the player or an enemy fires. Grows quickly then fades out.
export class MuzzleFlashSystem {
  constructor(scene, template) {
    this.scene = scene;
    this.template = template;
    this.active = [];
  }

  spawn(position, direction, scale = 1) {
    const mesh = cloneModel(this.template);
    const baseScale = 0.6 * scale;
    mesh.scale.setScalar(baseScale * 0.3);
    mesh.position.set(position.x + direction.x * 0.7, 0.5, position.z + direction.z * 0.7);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.active.push({ mesh, t: 0, duration: 0.16, baseScale });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      entry.t += dt;
      const progress = entry.t / entry.duration;

      if (progress >= 1) {
        this.scene.remove(entry.mesh);
        this.active.splice(i, 1);
        continue;
      }

      const growPhase = Math.min(progress / 0.35, 1);
      entry.mesh.scale.setScalar(entry.baseScale * (0.35 + 0.65 * growPhase));
      entry.mesh.rotation.y += dt * 5;

      const opacity = 1 - progress;
      entry.mesh.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = opacity;
          obj.material.depthWrite = false;
        }
      });
    }
  }

  clear() {
    for (const entry of this.active) this.scene.remove(entry.mesh);
    this.active = [];
  }
}
