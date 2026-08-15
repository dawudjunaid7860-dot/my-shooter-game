// Enemy type roster: a mix of vehicles (tanks) and people, for variety.
// Each type has its own texture, size/collision radius, base combat stats,
// behavior ("melee" chases and bumps the player; "ranged" holds its
// distance and shoots; "boss" holds its distance like ranged but fires in
// timed bursts instead of single steady shots — see enemy.js), and a
// spriteConvention ("tank" | "person") that picks which heading-rotation
// formula applies, since the two art styles have different default facing
// directions (see player.js's aimAt() for the person convention, and the
// original tank convention it was adapted from). Bosses are spawned
// directly by EnemySpawner once a level's regular quota is cleared, not
// through the weighted enemyMix below.
export const ENEMY_TYPES = {
  grunt: {
    textureKey: "enemyTankGrunt",
    spriteConvention: "tank",
    spriteSize: 2,
    radius: 0.85,
    speed: 3.2,
    health: 60,
    damage: 9,
    attackCooldown: 1.1,
    attackRange: 1.7,
    behavior: "melee",
    currencyValue: 10,
  },
  scout: {
    // Fast but weak — a zombie chasing on foot.
    textureKey: "enemyPersonScout",
    spriteConvention: "person",
    spriteSize: 1.6,
    radius: 0.6,
    speed: 5.6,
    health: 28,
    damage: 6,
    attackCooldown: 0.75,
    attackRange: 1.4,
    behavior: "melee",
    currencyValue: 8,
  },
  tank: {
    // Slow but tanky.
    textureKey: "enemyTankHeavy",
    spriteConvention: "tank",
    spriteSize: 2.8,
    radius: 1.2,
    speed: 1.7,
    health: 150,
    damage: 16,
    attackCooldown: 1.5,
    attackRange: 2,
    behavior: "melee",
    currencyValue: 20,
  },
  sniper: {
    // Holds range and shoots instead of chasing — a human sniper. Damage
    // and fire rate come from its randomly-assigned gun (see weapons.js),
    // not fixed values here.
    textureKey: "enemyPersonSniper",
    spriteConvention: "person",
    spriteSize: 1.6,
    radius: 0.6,
    speed: 2.6,
    health: 38,
    attackRange: 17, // max engagement distance
    preferredRange: 12, // stops closing once inside this
    retreatRange: 7, // backs away if the player gets closer than this
    bulletSpeed: 32,
    behavior: "ranged",
    currencyValue: 16,
  },
  boss: {
    // Bigger and tankier than any regular enemy; pauses, then unloads a
    // quick burst of shots, then pauses again.
    textureKey: "enemyTankBoss",
    spriteConvention: "tank",
    spriteSize: 4.2,
    radius: 1.8,
    speed: 1.8,
    health: 500,
    damage: 14,
    attackRange: 18, // max engagement distance
    preferredRange: 11, // stops closing once inside this
    retreatRange: 6, // backs away if the player gets closer than this
    bulletSpeed: 26,
    behavior: "boss",
    currencyValue: 80,
    burstCount: 5, // shots per burst
    burstShotInterval: 0.15, // seconds between shots within a burst
    burstPauseDuration: 2.5, // seconds paused between bursts
  },
};

// Fixed 2-level campaign. Level 2 is tuned to be clearly harder than Level 1
// (more enemies, a difficulty multiplier on top of each type's base stats,
// and the full enemy roster instead of just the two easiest types).
export const LEVEL_DEFS = [
  {
    level: 1,
    name: "Level 1",
    enemyQuota: 10,
    maxConcurrent: 6,
    spawnInterval: 1.4,
    objective: "Defeat 10 enemies, then survive the boss to clear the level. Pick up guns, ammo, and grenades scattered around the map.",
    difficultyMultiplier: { speed: 1, health: 1, damage: 1 },
    enemyMix: [
      { type: "grunt", weight: 3 },
      { type: "scout", weight: 2 },
    ],
  },
  {
    level: 2,
    name: "Level 2",
    enemyQuota: 18,
    maxConcurrent: 9,
    spawnInterval: 1.0,
    objective: "A tougher wave: 18 enemies including heavy tanks and snipers. Defeat them all, then take down the boss.",
    difficultyMultiplier: { speed: 1.15, health: 1.3, damage: 1.2 },
    enemyMix: [
      { type: "grunt", weight: 3 },
      { type: "scout", weight: 2 },
      { type: "tank", weight: 2 },
      { type: "sniper", weight: 2 },
    ],
  },
];

export const TOTAL_LEVELS = LEVEL_DEFS.length;

export function getLevelConfig(level) {
  return LEVEL_DEFS[level - 1] || LEVEL_DEFS[LEVEL_DEFS.length - 1];
}

export function pickEnemyType(levelConfig) {
  const mix = levelConfig.enemyMix;
  const total = mix.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of mix) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return mix[mix.length - 1].type;
}
