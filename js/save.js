const STORAGE_KEY = "tankAssaultSave.v1";
export const DEFAULT_MUSIC_VOLUME = 0.5;

// ammoCapacity/fireRate/damage are BONUSES layered on top of whichever
// weapon is currently equipped (see js/weapons.js WEAPON_TYPES) — guns now
// come from map pickups rather than being one fixed loadout, so these
// upgrades start at 0 and stack additively on top of a gun's own stats.
// moveSpeed/maxHealth remain absolute, weapon-independent stats.
export const UPGRADE_DEFS = {
  ammoCapacity: {
    label: "Ammo Capacity",
    unit: "bonus rounds",
    base: 0,
    perTier: 4,
    costs: [50, 100, 175, 275, 400],
  },
  fireRate: {
    label: "Fire Rate",
    unit: "bonus shots/s",
    base: 0,
    perTier: 0.6,
    costs: [60, 120, 200, 300, 450],
  },
  moveSpeed: {
    label: "Move Speed",
    unit: "m/s",
    base: 9,
    perTier: 1,
    costs: [50, 100, 175, 275, 400],
  },
  maxHealth: {
    label: "Max Health",
    unit: "HP",
    base: 100,
    perTier: 20,
    costs: [60, 120, 200, 300, 450],
  },
  damage: {
    label: "Damage",
    unit: "bonus dmg/shot",
    base: 0,
    perTier: 6,
    costs: [70, 140, 220, 320, 470],
  },
};

function defaultSaveData() {
  return {
    currency: 0,
    unlockedLevel: 1,
    characterSkin: "manBlue",
    settings: { volume: 0.7, sensitivity: 1, musicVolume: DEFAULT_MUSIC_VOLUME },
    upgrades: { ammoCapacity: 0, fireRate: 0, moveSpeed: 0, maxHealth: 0, damage: 0 },
  };
}

function loadSaveData() {
  const fallback = defaultSaveData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const settings = parsed.settings || {};
    return {
      currency: Number.isFinite(parsed.currency) ? parsed.currency : fallback.currency,
      unlockedLevel:
        Number.isInteger(parsed.unlockedLevel) && parsed.unlockedLevel > 0
          ? parsed.unlockedLevel
          : fallback.unlockedLevel,
      characterSkin:
        typeof parsed.characterSkin === "string" ? parsed.characterSkin : fallback.characterSkin,
      settings: {
        volume: Number.isFinite(settings.volume) ? settings.volume : fallback.settings.volume,
        sensitivity: Number.isFinite(settings.sensitivity) ? settings.sensitivity : fallback.settings.sensitivity,
        musicVolume: Number.isFinite(settings.musicVolume) ? settings.musicVolume : fallback.settings.musicVolume,
      },
      upgrades: { ...fallback.upgrades, ...(parsed.upgrades || {}) },
    };
  } catch {
    return fallback;
  }
}

function writeSaveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private browsing, quota) — the run continues
    // in-memory, it just won't persist across reloads.
  }
}

function statForTier(key, tier) {
  const def = UPGRADE_DEFS[key];
  return def.base + def.perTier * tier;
}

export function costForNextTier(key, tier) {
  const def = UPGRADE_DEFS[key];
  if (tier >= def.costs.length) return null; // maxed out
  return def.costs[tier];
}

export function maxTierFor(key) {
  return UPGRADE_DEFS[key].costs.length;
}

// Wraps the persisted save blob (currency, current level, upgrade tiers)
// with the read/write operations the rest of the game needs.
export class SaveState {
  constructor() {
    this.data = loadSaveData();
  }

  get currency() {
    return this.data.currency;
  }

  get unlockedLevel() {
    return this.data.unlockedLevel;
  }

  get upgrades() {
    return this.data.upgrades;
  }

  get characterSkin() {
    return this.data.characterSkin;
  }

  setCharacterSkin(id) {
    this.data.characterSkin = id;
    writeSaveData(this.data);
  }

  get volume() {
    return this.data.settings.volume;
  }

  get sensitivity() {
    return this.data.settings.sensitivity;
  }

  setVolume(value) {
    this.data.settings.volume = value;
    writeSaveData(this.data);
  }

  setSensitivity(value) {
    this.data.settings.sensitivity = value;
    writeSaveData(this.data);
  }

  get musicVolume() {
    return this.data.settings.musicVolume;
  }

  setMusicVolume(value) {
    this.data.settings.musicVolume = value;
    writeSaveData(this.data);
  }

  addCurrency(amount) {
    if (amount <= 0) return;
    this.data.currency += amount;
    writeSaveData(this.data);
  }

  canAfford(key) {
    const cost = costForNextTier(key, this.data.upgrades[key]);
    return cost !== null && this.data.currency >= cost;
  }

  buyUpgrade(key) {
    const tier = this.data.upgrades[key];
    const cost = costForNextTier(key, tier);
    if (cost === null || this.data.currency < cost) return false;
    this.data.currency -= cost;
    this.data.upgrades[key] = tier + 1;
    writeSaveData(this.data);
    return true;
  }

  // Only ever raises the unlocked level, never lowers it.
  unlockLevel(level) {
    if (level > this.data.unlockedLevel) {
      this.data.unlockedLevel = level;
      writeSaveData(this.data);
    }
  }

  isLevelUnlocked(level) {
    return level <= this.data.unlockedLevel;
  }

  // Current player stats after applying all purchased upgrade tiers.
  getStats() {
    const upgrades = this.data.upgrades;
    return {
      ammoCapacity: Math.round(statForTier("ammoCapacity", upgrades.ammoCapacity)),
      fireRate: statForTier("fireRate", upgrades.fireRate),
      moveSpeed: statForTier("moveSpeed", upgrades.moveSpeed),
      maxHealth: Math.round(statForTier("maxHealth", upgrades.maxHealth)),
      damage: Math.round(statForTier("damage", upgrades.damage)),
    };
  }
}
