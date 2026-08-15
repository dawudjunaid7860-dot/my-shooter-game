// In-play HUD only (health/ammo/currency/level bars + crosshair + hit
// flash). Full-screen menus (home/upgrades/level-complete/game-over) are
// owned by screens.js.
export class HUD {
  constructor() {
    this.healthFill = document.getElementById("health-fill");
    this.ammoCount = document.getElementById("ammo-count");
    this.reloadHint = document.getElementById("reload-hint");
    this.reloadTrack = document.getElementById("reload-track");
    this.reloadFill = document.getElementById("reload-fill");
    this.scoreEl = document.getElementById("score");
    this.waveEl = document.getElementById("wave");
    this.enemiesLeftEl = document.getElementById("enemies-left");
    this.hitFlash = document.getElementById("hit-flash");
    this.crosshair = document.getElementById("crosshair");
    this.buffSpeed = document.getElementById("buff-speed");
    this.buffRapidFire = document.getElementById("buff-rapidfire");
    this.bossPanel = document.getElementById("boss-panel");
    this.bossHealthFill = document.getElementById("boss-health-fill");

    this._flashTimeout = null;
    this._hitMarkerTimeout = null;
  }

  updateHealth(current, max) {
    this.healthFill.style.width = `${Math.max(0, (current / max) * 100)}%`;
  }

  updateAmmo(current, max, reloading, progress) {
    this.ammoCount.textContent = `${current} / ${max}`;
    if (reloading) {
      this.reloadHint.textContent = "Reloading...";
      this.reloadTrack.classList.add("active");
      this.reloadFill.style.width = `${progress * 100}%`;
    } else if (current === 0) {
      this.reloadHint.textContent = "OUT OF AMMO — press R";
      this.reloadTrack.classList.remove("active");
    } else {
      this.reloadHint.textContent = "R to reload";
      this.reloadTrack.classList.remove("active");
    }
  }

  updateScore(score) {
    this.scoreEl.textContent = score;
  }

  updateWave(level) {
    this.waveEl.textContent = level;
  }

  updateEnemiesLeft(count) {
    this.enemiesLeftEl.textContent = count;
  }

  updateBuffs(speedTimer, rapidFireTimer) {
    this._updateBuffChip(this.buffSpeed, speedTimer);
    this._updateBuffChip(this.buffRapidFire, rapidFireTimer);
  }

  _updateBuffChip(el, timer) {
    if (timer > 0) {
      el.textContent = el.dataset.label + " " + timer.toFixed(1) + "s";
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  }

  updateBoss(current, max) {
    if (max > 0) {
      this.bossPanel.classList.remove("hidden");
      this.bossHealthFill.style.width = `${Math.max(0, (current / max) * 100)}%`;
    } else {
      this.bossPanel.classList.add("hidden");
    }
  }

  flashHit() {
    this.hitFlash.classList.remove("show");
    void this.hitFlash.offsetWidth;
    this.hitFlash.classList.add("show");
    clearTimeout(this._flashTimeout);
    this._flashTimeout = setTimeout(() => this.hitFlash.classList.remove("show"), 60);
  }

  // Distinct feedback for landing a shot on an enemy, separate from the red
  // damage-taken vignette above.
  flashHitMarker() {
    this.crosshair.classList.remove("hit-marker");
    void this.crosshair.offsetWidth;
    this.crosshair.classList.add("hit-marker");
    clearTimeout(this._hitMarkerTimeout);
    this._hitMarkerTimeout = setTimeout(() => this.crosshair.classList.remove("hit-marker"), 140);
  }

  updateCrosshair(x, y) {
    this.crosshair.style.left = `${x}px`;
    this.crosshair.style.top = `${y}px`;
  }
}
