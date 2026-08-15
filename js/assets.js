import * as THREE from "three";

// Paths below are drawn from assets.json. Two Kenney packs are in play:
// the tank/terrain pack (vehicles, outdoor tiles, obstacles) and the
// top-down shooter pack (human character sprites, indoor building tiles).
const TANK_BASE = "public/assets/kenney_top-down-tanks-remastered/PNG/Default size/";
const SHOOTER_BASE = "public/assets/kenney_top-down-shooter/PNG/";
const SHOOTER_TILES = SHOOTER_BASE + "Tiles/";
const BLASTER_PREVIEWS = "public/assets/kenney_blaster-kit_2.1/Previews/";

export const ASSET_PATHS = {
  // Playable character skins (see js/characters.js CHARACTER_SKINS).
  charHitman1: SHOOTER_BASE + "Hitman 1/hitman1_gun.png",
  charManBlue: SHOOTER_BASE + "Man Blue/manBlue_gun.png",
  charManBrown: SHOOTER_BASE + "Man Brown/manBrown_gun.png",
  charManOld: SHOOTER_BASE + "Man Old/manOld_gun.png",
  charRobot1: SHOOTER_BASE + "Robot 1/robot1_gun.png",
  charSoldier1: SHOOTER_BASE + "Soldier 1/soldier1_gun.png",
  charSurvivor1: SHOOTER_BASE + "Survivor 1/survivor1_gun.png",
  charWomanGreen: SHOOTER_BASE + "Woman Green/womanGreen_gun.png",
  charZombie1: SHOOTER_BASE + "Zombie 1/zoimbie1_gun.png",

  // Enemy types (see js/levels.js ENEMY_TYPES) — a mix of vehicles and people.
  enemyTankGrunt: TANK_BASE + "tank_red.png",
  enemyTankHeavy: TANK_BASE + "tank_bigRed.png",
  enemyTankBoss: TANK_BASE + "tank_huge.png",
  enemyPersonScout: SHOOTER_BASE + "Zombie 1/zoimbie1_gun.png",
  enemyPersonSniper: SHOOTER_BASE + "Soldier 1/soldier1_gun.png",

  // Ground tiles used to bake the outdoor tilemap texture (see js/tilemap.js).
  grass1: TANK_BASE + "tileGrass1.png",
  grass2: TANK_BASE + "tileGrass2.png",
  sand1: TANK_BASE + "tileSand1.png",
  sand2: TANK_BASE + "tileSand2.png",
  grassTransitionE: TANK_BASE + "tileGrass_transitionE.png",
  grassRoadEast: TANK_BASE + "tileGrass_roadEast.png",
  grassRoadNorth: TANK_BASE + "tileGrass_roadNorth.png",
  grassRoadCrossing: TANK_BASE + "tileGrass_roadCrossing.png",
  grassRoadTransitionE: TANK_BASE + "tileGrass_roadTransitionE_dirt.png",
  sandRoadEast: TANK_BASE + "tileSand_roadEast.png",
  sandRoadNorth: TANK_BASE + "tileSand_roadNorth.png",
  sandRoadCrossing: TANK_BASE + "tileSand_roadCrossing.png",

  // Building tiles baked into the same ground texture (see js/building.js).
  buildingFloor: SHOOTER_TILES + "tile_08.png",
  buildingWall: SHOOTER_TILES + "tile_109.png",

  // Scattered outdoor props (obstacles/cover).
  propOilSpillLarge: TANK_BASE + "oilSpill_large.png",
  propOilSpillSmall: TANK_BASE + "oilSpill_small.png",
  propCrateWood: TANK_BASE + "crateWood.png",
  propCrateMetal: TANK_BASE + "crateMetal.png",
  propBarrelGreen: TANK_BASE + "barrelGreen_top.png",
  propBarrelRust: TANK_BASE + "barrelRust_top.png",
  propBarricadeWood: TANK_BASE + "barricadeWood.png",
  propBarricadeMetal: TANK_BASE + "barricadeMetal.png",
  propTreeLarge: TANK_BASE + "treeGreen_large.png",
  propTreeSmall: TANK_BASE + "treeGreen_small.png",
  propSandbag: TANK_BASE + "sandbagBeige.png",
  propFence: TANK_BASE + "fenceRed.png",

  // Indoor furniture (obstacles, same collision treatment as outdoor props).
  furnitureTable: SHOOTER_TILES + "tile_453.png",
  furnitureChair: SHOOTER_TILES + "tile_478.png",
  furnitureCouch: SHOOTER_TILES + "tile_447.png",
  furnitureCounter: SHOOTER_TILES + "tile_297.png",

  // Power-up pickups.
  powerupHealth: TANK_BASE + "specialBarrel1.png",
  powerupSpeed: TANK_BASE + "tracksDouble.png",
  powerupRapidFire: TANK_BASE + "bulletGreen1.png",

  // Weapon/ammo/grenade field pickups (see js/fieldPickups.js).
  pickupRifle: BLASTER_PREVIEWS + "blaster-e.png",
  pickupShotgun: BLASTER_PREVIEWS + "blaster-j.png",
  pickupHeavy: BLASTER_PREVIEWS + "blaster-q.png",
  pickupAmmo: BLASTER_PREVIEWS + "clip-large.png",
  pickupGrenade: BLASTER_PREVIEWS + "grenade-a.png",

  // Footstep dust puffs (see js/dust.js).
  footstepDust_0: TANK_BASE + "explosionSmoke1.png",
  footstepDust_1: TANK_BASE + "explosionSmoke2.png",
  footstepDust_2: TANK_BASE + "explosionSmoke3.png",

  explosion: [
    TANK_BASE + "explosion1.png",
    TANK_BASE + "explosion2.png",
    TANK_BASE + "explosion3.png",
    TANK_BASE + "explosion4.png",
    TANK_BASE + "explosion5.png",
  ],
};

export async function loadTextures(onProgress) {
  const loader = new THREE.TextureLoader();
  const flatList = [];
  for (const [key, value] of Object.entries(ASSET_PATHS)) {
    if (Array.isArray(value)) {
      value.forEach((path, i) => flatList.push([`${key}_${i}`, path]));
    } else {
      flatList.push([key, value]);
    }
  }

  let loaded = 0;
  const loadOne = ([key, path]) =>
    new Promise((resolve, reject) => {
      loader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          loaded += 1;
          if (onProgress) onProgress(loaded, flatList.length);
          resolve([key, texture]);
        },
        undefined,
        (err) => reject(new Error(`Failed to load ${path}: ${err}`))
      );
    });

  const entries = await Promise.all(flatList.map(loadOne));
  const textures = {};
  for (const [key, texture] of entries) {
    textures[key] = texture;
  }

  // Reassemble the explosion sequence into an array of textures.
  textures.explosion = ASSET_PATHS.explosion.map((_, i) => textures[`explosion_${i}`]);

  return textures;
}
