const SHOOTER_BASE = "public/assets/kenney_top-down-shooter/PNG/";

// Playable character skins, drawn from the Kenney "Top-down Shooter" pack.
// Every skin uses the same "_gun" pose: a person holding a pistol pointed
// to the right (image +X) — see player.js's aimAt() for the rotation
// convention that follows from that default orientation. imgPath is a
// plain <img>-usable path for DOM UI (character select, HUD), separate
// from the three.js texture pipeline in assets.js/loadTextures().
export const CHARACTER_SKINS = [
  { id: "manBlue", label: "Man (Blue)", textureKey: "charManBlue", imgPath: SHOOTER_BASE + "Man Blue/manBlue_gun.png" },
  { id: "manBrown", label: "Man (Brown)", textureKey: "charManBrown", imgPath: SHOOTER_BASE + "Man Brown/manBrown_gun.png" },
  { id: "manOld", label: "Old Man", textureKey: "charManOld", imgPath: SHOOTER_BASE + "Man Old/manOld_gun.png" },
  { id: "womanGreen", label: "Woman (Green)", textureKey: "charWomanGreen", imgPath: SHOOTER_BASE + "Woman Green/womanGreen_gun.png" },
  { id: "soldier1", label: "Soldier", textureKey: "charSoldier1", imgPath: SHOOTER_BASE + "Soldier 1/soldier1_gun.png" },
  { id: "survivor1", label: "Survivor", textureKey: "charSurvivor1", imgPath: SHOOTER_BASE + "Survivor 1/survivor1_gun.png" },
  { id: "hitman1", label: "Hitman", textureKey: "charHitman1", imgPath: SHOOTER_BASE + "Hitman 1/hitman1_gun.png" },
  { id: "robot1", label: "Robot", textureKey: "charRobot1", imgPath: SHOOTER_BASE + "Robot 1/robot1_gun.png" },
  { id: "zombie1", label: "Zombie", textureKey: "charZombie1", imgPath: SHOOTER_BASE + "Zombie 1/zoimbie1_gun.png" },
];

export function getCharacterSkin(id) {
  return CHARACTER_SKINS.find((skin) => skin.id === id) || CHARACTER_SKINS[0];
}
