export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function distance2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// Returns a random point just outside the given half-extent square, so
// enemies spawn off-screen around the play area and walk in.
export function randomEdgePoint(halfExtent, margin) {
  const side = Math.floor(Math.random() * 4);
  const extent = halfExtent + margin;
  const along = randRange(-extent, extent);
  switch (side) {
    case 0:
      return { x: along, z: -extent };
    case 1:
      return { x: extent, z: along };
    case 2:
      return { x: along, z: extent };
    default:
      return { x: -extent, z: along };
  }
}

// Simple trauma-based camera shake: add() bumps trauma up (clamped to 1),
// it decays over time, and getOffset() returns a world-space jitter that
// eases in with trauma^2 so small knocks stay subtle and big ones snap hard.
export class ScreenShake {
  constructor({ decayPerSecond = 2.5, maxOffset = 1.4 } = {}) {
    this.trauma = 0;
    this.decayPerSecond = decayPerSecond;
    this.maxOffset = maxOffset;
  }

  add(amount) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  update(dt) {
    this.trauma = clamp(this.trauma - this.decayPerSecond * dt, 0, 1);
  }

  getOffset() {
    const shake = this.trauma * this.trauma;
    return {
      x: randRange(-1, 1) * this.maxOffset * shake,
      z: randRange(-1, 1) * this.maxOffset * shake,
    };
  }
}

// A soft round shadow blob used under mobile sprites to ground them
// visually without the cost/complexity of real shadow mapping.
export function makeBlobShadowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.35)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
