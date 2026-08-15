// Gun types. Enemies (ranged/person archetype) pick a random one via
// pickRandomWeapon() and use attackCooldown for their AI fire pacing. The
// player instead builds a collection of these by picking them up off the
// map (see js/fieldPickups.js) and switches between owned ones via the
// radial weapon wheel (js/weaponwheel.js) — fireRate/icon/reserve fields
// below are player-only and unused by enemy AI.
const BLASTER_PREVIEWS = "public/assets/kenney_blaster-kit_2.1/Previews/";

export const WEAPON_TYPES = {
  pistol: {
    label: "Pistol",
    icon: BLASTER_PREVIEWS + "blaster-a.png",
    ammoCapacity: 8,
    reloadDuration: 1.4,
    damage: 11,
    attackCooldown: 0.55,
    fireRate: 3.5, // player shots/sec
    startingReserve: 16, // two extra magazines when first picked up/started with
  },
  rifle: {
    label: "Rifle",
    icon: BLASTER_PREVIEWS + "blaster-e.png",
    ammoCapacity: 12,
    reloadDuration: 1.8,
    damage: 14,
    attackCooldown: 0.7,
    fireRate: 7,
    startingReserve: 24,
  },
  shotgun: {
    label: "Shotgun",
    icon: BLASTER_PREVIEWS + "blaster-j.png",
    ammoCapacity: 4,
    reloadDuration: 2.2,
    damage: 24,
    attackCooldown: 1.1,
    fireRate: 1.6,
    startingReserve: 12,
  },
  heavy: {
    label: "Heavy Blaster",
    icon: BLASTER_PREVIEWS + "blaster-q.png",
    ammoCapacity: 6,
    reloadDuration: 2.6,
    damage: 20,
    attackCooldown: 0.9,
    fireRate: 2.4,
    startingReserve: 12,
  },
};

const WEAPON_KEYS = Object.keys(WEAPON_TYPES);

// Weapon types the player can find as ground pickups — everything except
// the starter pistol, which they already carry from the start of the level.
export const PICKUP_WEAPON_KEYS = WEAPON_KEYS.filter((k) => k !== "pistol");

export function pickRandomWeapon() {
  return WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
}

// Thrown explosive: deals solid AoE damage (more than any single gunshot)
// but is scarce (must be picked up) and on a cooldown, so it's a burst tool
// rather than a spammable nuke.
export const GRENADE_TYPE = {
  label: "Grenade",
  icon: "public/assets/kenney_blaster-kit_2.1/Previews/grenade-a.png",
  damage: 55,
  radius: 3.2,
  throwSpeed: 16,
  maxRange: 22,
  cooldown: 2.5,
  pickupAmount: 2,
};
