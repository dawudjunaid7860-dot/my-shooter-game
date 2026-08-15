const ENEMY_DOT_COLORS = {
  grunt: "#e05050",
  scout: "#e0a336",
  tank: "#c23c3c",
  sniper: "#8a5fd6",
  boss: "#ff2e2e",
};

// Static full-map 2D canvas minimap (not a second 3D viewport): plots the
// player (with heading) and every current enemy against a simplified
// biome-tinted background matching the grass/sand split from tilemap.js.
export class Minimap {
  constructor(canvas, bounds) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bounds = bounds;
    this.size = canvas.width; // square canvas
  }

  _worldToMap(x, z) {
    const half = this.size / 2;
    return {
      mx: (x / this.bounds) * half + half,
      my: (z / this.bounds) * half + half,
    };
  }

  update(playerPos, playerHeading, enemies) {
    const ctx = this.ctx;
    const size = this.size;
    const half = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Biome background (boundary sits at world x = 0, i.e. canvas x = half).
    ctx.fillStyle = "#274a2a";
    ctx.fillRect(0, 0, half, size);
    ctx.fillStyle = "#5a4a30";
    ctx.fillRect(half, 0, half, size);

    // Enemies (boss drawn bigger and on top).
    const sorted = [...enemies].sort((a, b) => (a.type === "boss" ? 1 : 0) - (b.type === "boss" ? 1 : 0));
    for (const enemy of sorted) {
      if (!enemy.alive) continue;
      const { mx, my } = this._worldToMap(enemy.position.x, enemy.position.z);
      const isBoss = enemy.type === "boss";
      ctx.fillStyle = ENEMY_DOT_COLORS[enemy.type] || "#e05050";
      ctx.beginPath();
      ctx.arc(mx, my, isBoss ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (isBoss) {
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Player marker: a small triangle pointing along its facing direction.
    const { mx, my } = this._worldToMap(playerPos.x, playerPos.z);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-playerHeading);
    ctx.fillStyle = "#eaf5ea";
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Border.
    ctx.strokeStyle = "rgba(234, 245, 234, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
}
