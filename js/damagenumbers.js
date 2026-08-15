import * as THREE from "three";

const textureCache = new Map();

function makeNumberTexture(text, color) {
  const key = text + color;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 40px Rajdhani, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

// Floating "-15"-style damage numbers that pop up over a hit enemy, rise,
// and fade out.
export class DamageNumberSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  spawn(position, amount, { crit = false } = {}) {
    const text = `-${Math.round(amount)}`;
    const color = crit ? "#ffe27a" : "#ff8f6b";
    const texture = makeNumberTexture(text, color);
    const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true });
    const sprite = new THREE.Sprite(material);
    const scale = crit ? 1.6 : 1.2;
    sprite.scale.set(scale * 1.4, scale * 0.7, 1);
    sprite.position.set(position.x + (Math.random() - 0.5) * 0.6, 1.6, position.z + (Math.random() - 0.5) * 0.6);
    this.scene.add(sprite);
    this.active.push({ sprite, t: 0, duration: 0.7, startY: sprite.position.y });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      entry.t += dt;
      const progress = entry.t / entry.duration;

      if (progress >= 1) {
        this.scene.remove(entry.sprite);
        this.active.splice(i, 1);
        continue;
      }

      entry.sprite.position.y = entry.startY + progress * 1.4;
      entry.sprite.material.opacity = 1 - Math.max(0, progress - 0.4) / 0.6;
    }
  }

  clear() {
    for (const entry of this.active) this.scene.remove(entry.sprite);
    this.active = [];
  }
}
