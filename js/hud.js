// In-play HUD only (health/ammo/currency/level bars + crosshair + hit
// flash). Full-screen menus (home/upgrades/level-complete/game-over) are
// owned by screens.js.
export class HUD {
  constructor() {
    this.root = document.getElementById("hud");
    this.healthFill = document.getElementById("health-fill");
    this.ammoCount = document.getElementById("ammo-count");
    this.reserveCount = document.getElementById("reserve-count");
    this.weaponIcon = document.getElementById("weapon-icon");
    this.weaponName = document.getElementById("weapon-name");
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
    this.grenadePanel = document.getElementById("hud-bottom-center");
    this.grenadeCount = document.getElementById("grenade-count");
    this.pickupToast = document.getElementById("pickup-toast");

    this._flashTimeout = null;
    this._hitMarkerTimeout = null;
    this._toastTimeout = null;
  }

  // The gameplay HUD (health/ammo/minimap/pause button/etc) lives in the
  // DOM before every menu overlay, so without this it stays visible (and,
  // since overlay backgrounds aren't 100% opaque, faintly bleeds through)
  // on the home/upgrades/settings/level-select/pause screens too.
  setVisible(visible) {
    this.root.classList.toggle("hidden", !visible);
  }

  updateWeapon(label, icon) {
    this.weaponName.textContent = label;
    if (icon && this.weaponIcon.src !== icon) this.weaponIcon.src = icon;
  }

  updateReserve(reserve) {
    this.reserveCount.textContent = `Reserve: ${reserve}`;
  }

  updateGrenades(count) {
    this.grenadePanel.classList.remove("hidden");
    this.grenadeCount.textContent = count;
  }

  showPickupToast(text) {
    this.pickupToast.textContent = text;
    this.pickupToast.classList.remove("show");
    void this.pickupToast.offsetWidth;
    this.pickupToast.classList.add("show");
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => this.pickupToast.classList.remove("show"), 1400);
  }

  updateHealth(current, max) {
    this.healthFill.style.width = `${Math.max(0, (current / max) * 100)}%`;
  }

  updateAmmo(current, max, reloading, progress, reserve = 0) {
    this.ammoCount.textContent = `${current} / ${max}`;
    if (reloading) {
      this.reloadHint.textContent = "Reloading...";
      this.reloadTrack.classList.add("active");
      this.reloadFill.style.width = `${progress * 100}%`;
    } else if (current === 0 && reserve === 0) {
      this.reloadHint.textContent = "OUT OF AMMO — find supplies";
      this.reloadTrack.classList.remove("active");
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
