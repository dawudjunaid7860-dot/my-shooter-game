// Gun types carried by ranged/person enemies (the sniper archetype) — each
// has its own ammo capacity, reload time, damage, and fire rate, so ranged
// enemies vary shot-to-shot instead of all sharing one fixed gun. Some hit
// harder but fire slower; others are weaker but faster. Ranged enemies now
// also run dry and have to reload, giving a brief window to press an
// advantage.
export const WEAPON_TYPES = {
  pistol: {
    label: "Pistol",
    ammoCapacity: 8,
    reloadDuration: 1.4,
    damage: 11,
    attackCooldown: 0.55,
  },
  rifle: {
    label: "Rifle",
    ammoCapacity: 12,
    reloadDuration: 1.8,
    damage: 14,
    attackCooldown: 0.7,
  },
  shotgun: {
    label: "Shotgun",
    ammoCapacity: 4,
    reloadDuration: 2.2,
    damage: 24,
    attackCooldown: 1.1,
  },
  heavy: {
    label: "Heavy Blaster",
    ammoCapacity: 6,
    reloadDuration: 2.6,
    damage: 20,
    attackCooldown: 0.9,
  },
};

const WEAPON_KEYS = Object.keys(WEAPON_TYPES);

export function pickRandomWeapon() {
  return WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
}
