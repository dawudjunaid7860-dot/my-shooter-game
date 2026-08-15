import { UPGRADE_DEFS, costForNextTier, maxTierFor } from "./save.js";
import { LEVEL_DEFS } from "./levels.js";
import { CHARACTER_SKINS } from "./characters.js";

const TANK_ICON_BASE = "public/assets/kenney_top-down-tanks-remastered/PNG/Default size/";
const STAR_ICON = "public/assets/kenney_ui-pack/PNG/Yellow/Default/star.png";

// Neither pack has dedicated ammo/speed/health/fire-rate/damage icons, so
// each upgrade borrows a thematically fitting sprite instead. maxHealth
// reuses the same icon as the in-game health power-up for consistency.
const UPGRADE_ICONS = {
  ammoCapacity: TANK_ICON_BASE + "bulletBlue2.png",
  fireRate: TANK_ICON_BASE + "shotOrange.png",
  damage: TANK_ICON_BASE + "bulletRed2.png",
  moveSpeed: "public/assets/kenney_top-down-shooter/PNG/Survivor 1/survivor1_gun.png",
  maxHealth: TANK_ICON_BASE + "specialBarrel1.png",
};

const UPGRADE_ORDER = ["ammoCapacity", "fireRate", "damage", "moveSpeed", "maxHealth"];

function formatValue(value, unit) {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

// Owns every full-screen menu overlay (home, upgrades, level select,
// level-complete, game-over). The in-play HUD (health/ammo/currency bars)
// is handled separately by hud.js.
export class ScreenManager {
  constructor({
    onOpenLevelSelect,
    onOpenUpgrades,
    onOpenSettings,
    onBackHome,
    onBuyUpgrade,
    onSelectLevel,
    onGoToLevelSelect,
    onRetry,
    onPrevCharacter,
    onNextCharacter,
    onVolumeChange,
    onSensitivityChange,
    onMusicChange,
    onMusicReset,
    onResume,
  }) {
    this.homeScreen = document.getElementById("home-screen");
    this.homeContent = document.getElementById("home-content");
    this.loadingText = document.getElementById("loading-text");
    this.homeCurrency = document.getElementById("home-currency");
    this.charPortrait = document.getElementById("char-portrait");
    this.charName = document.getElementById("char-name");

    this.upgradesScreen = document.getElementById("upgrades-screen");
    this.upgradesCurrency = document.getElementById("upgrades-currency");
    this.upgradeList = document.getElementById("upgrade-list");

    this.settingsScreen = document.getElementById("settings-screen");
    this.volumeSlider = document.getElementById("volume-slider");
    this.volumeValue = document.getElementById("volume-value");
    this.sensitivitySlider = document.getElementById("sensitivity-slider");
    this.sensitivityValue = document.getElementById("sensitivity-value");
    this.musicSlider = document.getElementById("music-slider");
    this.musicValue = document.getElementById("music-value");

    this.pauseScreen = document.getElementById("pause-screen");
    this.pauseObjective = document.getElementById("pause-objective");
    this.pauseMusicSlider = document.getElementById("pause-music-slider");
    this.pauseMusicValue = document.getElementById("pause-music-value");

    this.levelSelectScreen = document.getElementById("levelselect-screen");
    this.levelList = document.getElementById("level-list");

    this.levelCompleteScreen = document.getElementById("levelcomplete-screen");
    this.lcLevel = document.getElementById("lc-level");
    this.lcKills = document.getElementById("lc-kills");
    this.lcCurrency = document.getElementById("lc-currency");

    this.gameoverScreen = document.getElementById("gameover-screen");
    this.finalScore = document.getElementById("final-score");

    this._onBuyUpgrade = onBuyUpgrade;
    this._onSelectLevel = onSelectLevel;

    document.getElementById("play-btn").addEventListener("click", onOpenLevelSelect);
    document.getElementById("upgrades-btn").addEventListener("click", onOpenUpgrades);
    document.getElementById("settings-btn").addEventListener("click", onOpenSettings);
    document.getElementById("upgrades-back-btn").addEventListener("click", onBackHome);
    document.getElementById("settings-back-btn").addEventListener("click", onBackHome);
    document.getElementById("levelselect-back-btn").addEventListener("click", onBackHome);
    document.getElementById("continue-btn").addEventListener("click", onGoToLevelSelect);

    this.volumeSlider.addEventListener("input", () => {
      const value = Number(this.volumeSlider.value);
      this.volumeValue.textContent = `${Math.round(value * 100)}%`;
      onVolumeChange(value);
    });
    this.sensitivitySlider.addEventListener("input", () => {
      const value = Number(this.sensitivitySlider.value);
      this.sensitivityValue.textContent = `${value.toFixed(1)}x`;
      onSensitivityChange(value);
    });
    document.getElementById("retry-btn").addEventListener("click", onRetry);
    document.getElementById("home-btn").addEventListener("click", onBackHome);
    document.getElementById("char-prev-btn").addEventListener("click", onPrevCharacter);
    document.getElementById("char-next-btn").addEventListener("click", onNextCharacter);

    this.musicSlider.addEventListener("input", () => {
      const value = Number(this.musicSlider.value);
      this.syncMusicDisplays(value);
      onMusicChange(value);
    });
    document.getElementById("music-reset-btn").addEventListener("click", () => onMusicReset());
    this.pauseMusicSlider.addEventListener("input", () => {
      const value = Number(this.pauseMusicSlider.value);
      this.syncMusicDisplays(value);
      onMusicChange(value);
    });
    document.getElementById("pause-music-reset-btn").addEventListener("click", () => onMusicReset());
    document.getElementById("pause-resume-btn").addEventListener("click", onResume);
    document.getElementById("pause-home-btn").addEventListener("click", onBackHome);
  }

  syncMusicDisplays(value) {
    this.musicSlider.value = value;
    this.musicValue.textContent = `${Math.round(value * 100)}%`;
    this.pauseMusicSlider.value = value;
    this.pauseMusicValue.textContent = `${Math.round(value * 100)}%`;
  }

  setLoadingProgress(loaded, total) {
    this.loadingText.textContent = `Loading assets... ${loaded}/${total}`;
  }

  setReady() {
    this.loadingText.classList.add("hidden");
    this.homeContent.classList.remove("hidden");
  }

  hideAll() {
    this.homeScreen.classList.add("hidden");
    this.upgradesScreen.classList.add("hidden");
    this.settingsScreen.classList.add("hidden");
    this.levelSelectScreen.classList.add("hidden");
    this.levelCompleteScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
  }

  showSettings(save) {
    this.hideAll();
    this.volumeSlider.value = save.volume;
    this.volumeValue.textContent = `${Math.round(save.volume * 100)}%`;
    this.sensitivitySlider.value = save.sensitivity;
    this.sensitivityValue.textContent = `${save.sensitivity.toFixed(1)}x`;
    this.syncMusicDisplays(save.musicVolume);
    this.settingsScreen.classList.remove("hidden");
  }

  // Shown on top of the (frozen) gameplay view — doesn't call hideAll()
  // since the other menu overlays are already hidden while playing.
  showPause(objectiveText, save) {
    this.pauseObjective.textContent = objectiveText;
    this.syncMusicDisplays(save.musicVolume);
    this.pauseScreen.classList.remove("hidden");
  }

  hidePause() {
    this.pauseScreen.classList.add("hidden");
  }

  showHome(save) {
    this.hideAll();
    this.homeCurrency.textContent = save.currency;
    this.updateCharacterPreview(save.characterSkin);
    this.homeScreen.classList.remove("hidden");
  }

  updateCharacterPreview(skinId) {
    const skin = CHARACTER_SKINS.find((s) => s.id === skinId) || CHARACTER_SKINS[0];
    this.charPortrait.src = skin.imgPath;
    this.charName.textContent = skin.label;
  }

  showUpgrades(save) {
    this.hideAll();
    this.renderUpgrades(save);
    this.upgradesScreen.classList.remove("hidden");
  }

  showLevelSelect(save) {
    this.hideAll();
    this.levelList.innerHTML = "";

    for (const def of LEVEL_DEFS) {
      const unlocked = save.isLevelUnlocked(def.level);
      const card = document.createElement("div");
      card.className = `level-card${unlocked ? "" : " locked"}`;

      const infoHtml = `
        <div class="level-card-info">
          <div class="level-card-name">${def.name}</div>
          <div class="level-card-detail">${def.enemyQuota} enemies</div>
        </div>
      `;

      const actionHtml = unlocked
        ? `<button class="kenney-btn kenney-btn-green kenney-btn-small level-play-btn" data-level="${def.level}">PLAY</button>`
        : `<div class="level-locked-label">LOCKED</div>`;

      card.innerHTML = infoHtml + actionHtml;
      this.levelList.appendChild(card);
    }

    this.levelList.querySelectorAll(".level-play-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._onSelectLevel(Number(btn.dataset.level)));
    });

    this.levelSelectScreen.classList.remove("hidden");
  }

  // Re-buildable without hiding/showing the screen, so a purchase can
  // refresh affordability/tier state in place.
  renderUpgrades(save) {
    this.upgradesCurrency.textContent = save.currency;
    this.upgradeList.innerHTML = "";

    for (const key of UPGRADE_ORDER) {
      const def = UPGRADE_DEFS[key];
      const tier = save.upgrades[key];
      const maxTier = maxTierFor(key);
      const cost = costForNextTier(key, tier);
      const currentValue = def.base + def.perTier * tier;
      const nextValue = cost !== null ? def.base + def.perTier * (tier + 1) : currentValue;

      const row = document.createElement("div");
      row.className = "upgrade-row";

      const dots = Array.from({ length: maxTier }, (_, i) => `<span class="${i < tier ? "filled" : ""}"></span>`).join("");

      const statText =
        cost !== null
          ? `${formatValue(currentValue, def.unit)} &rarr; ${formatValue(nextValue, def.unit)}`
          : `${formatValue(currentValue, def.unit)} (max)`;

      const actionHtml =
        cost !== null
          ? `<button class="kenney-btn kenney-btn-green upgrade-buy-btn" data-key="${key}" ${save.currency < cost ? "disabled" : ""}>
               BUY&nbsp;<img src="${STAR_ICON}" class="currency-icon" alt="" />${cost}
             </button>`
          : `<div class="upgrade-maxed">MAXED</div>`;

      row.innerHTML = `
        <img class="upgrade-icon" src="${UPGRADE_ICONS[key]}" alt="" />
        <div class="upgrade-info">
          <div class="upgrade-name">${def.label}</div>
          <div class="upgrade-stat">${statText}</div>
          <div class="upgrade-tiers">${dots}</div>
        </div>
        ${actionHtml}
      `;

      this.upgradeList.appendChild(row);
    }

    this.upgradeList.querySelectorAll(".upgrade-buy-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._onBuyUpgrade(btn.dataset.key));
    });
  }

  showLevelComplete({ level, kills, currencyEarned }) {
    this.hideAll();
    this.lcLevel.textContent = level;
    this.lcKills.textContent = kills;
    this.lcCurrency.textContent = currencyEarned;
    this.levelCompleteScreen.classList.remove("hidden");
  }

  showGameOver(currencyEarned) {
    this.hideAll();
    this.finalScore.textContent = `Currency earned: ${currencyEarned}`;
    this.gameoverScreen.classList.remove("hidden");
  }
}
