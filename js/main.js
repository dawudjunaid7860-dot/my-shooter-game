import * as THREE from "three";
import { loadTextures } from "./assets.js";
import {
  createGround,
  createLights,
  scatterProps,
  createTopDownCamera,
  resizeTopDownCamera,
  updateTopDownCamera,
  resetCameraFollow,
  PLAY_HALF_EXTENT,
} from "./world.js";
import { InputManager } from "./input.js";
import { Player } from "./player.js";
import { BulletSystem } from "./bullet.js";
import { EnemySpawner, ExplosionSystem } from "./enemy.js";
import { PowerUpSystem, POWERUP_DEFS } from "./powerups.js";
import { HUD } from "./hud.js";
import { ScreenManager } from "./screens.js";
import { SaveState, DEFAULT_MUSIC_VOLUME } from "./save.js";
import { Minimap } from "./minimap.js";
import { ScreenShake } from "./utils.js";
import { CHARACTER_SKINS, getCharacterSkin } from "./characters.js";
import { loadModels } from "./models.js";
import { MuzzleFlashSystem } from "./muzzleflash.js";
import { DamageNumberSystem } from "./damagenumbers.js";
import { FootstepDustSystem } from "./dust.js";
import { AudioManager } from "./audio.js";
import { WEAPON_TYPES, GRENADE_TYPE } from "./weapons.js";
import { FieldPickupSystem, AMMO_REFILL, GRENADE_PICKUP_AMOUNT } from "./fieldPickups.js";
import { GrenadeSystem } from "./grenade.js";
import { WeaponWheel } from "./weaponwheel.js";
import { getLevelConfig } from "./levels.js";
import { TouchControls } from "./touchControls.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = createTopDownCamera(window.innerWidth / window.innerHeight);

createLights(scene);
const input = new InputManager(canvas);
const touch = new TouchControls();
const hud = new HUD();
const save = new SaveState();
const minimap = new Minimap(document.getElementById("minimap"), PLAY_HALF_EXTENT);
const shake = new ScreenShake();
const audio = new AudioManager(save.volume, save.musicVolume);
const damageNumbers = new DamageNumberSystem(scene);

input.setSensitivity(save.sensitivity);

// A click on any button anywhere in the UI gets a sound, at the saved
// volume — simplest way to give the volume slider genuine, consistent effect.
document.addEventListener("click", (e) => {
  if (e.target.closest("button")) audio.playClick();
});

const screens = new ScreenManager({
  onOpenLevelSelect: () => {
    gameState = "levelSelect";
    screens.showLevelSelect(save);
  },
  onOpenUpgrades: () => {
    gameState = "upgrades";
    screens.showUpgrades(save);
  },
  onOpenSettings: () => {
    gameState = "settings";
    screens.showSettings(save);
  },
  onBackHome: () => {
    gameState = "home";
    screens.showHome(save);
  },
  onBuyUpgrade: (key) => {
    if (save.buyUpgrade(key)) {
      screens.renderUpgrades(save);
    }
  },
  onSelectLevel: (level) => playLevel(level),
  onGoToLevelSelect: () => {
    gameState = "levelSelect";
    screens.showLevelSelect(save);
  },
  onRetry: () => playLevel(enemySpawner.level),
  onPrevCharacter: () => cycleCharacter(-1),
  onNextCharacter: () => cycleCharacter(1),
  onVolumeChange: (value) => {
    save.setVolume(value);
    audio.setVolume(value);
  },
  onSensitivityChange: (value) => {
    save.setSensitivity(value);
    input.setSensitivity(value);
  },
  onMusicChange: (value) => {
    save.setMusicVolume(value);
    audio.setMusicVolume(value);
  },
  onMusicReset: () => {
    save.setMusicVolume(DEFAULT_MUSIC_VOLUME);
    audio.setMusicVolume(DEFAULT_MUSIC_VOLUME);
    screens.syncMusicDisplays(DEFAULT_MUSIC_VOLUME);
  },
  onResume: () => resumeFromPause(),
});

document.getElementById("pause-btn").addEventListener("click", () => openPause());

function openPause() {
  if (gameState !== "playing") return;
  gameState = "paused";
  const levelConfig = getLevelConfig(enemySpawner.level);
  screens.showPause(levelConfig.objective, save);
}

function resumeFromPause() {
  if (gameState !== "paused") return;
  gameState = "playing";
  screens.hidePause();
}

function cycleCharacter(delta) {
  const ids = CHARACTER_SKINS.map((s) => s.id);
  const currentIndex = ids.indexOf(save.characterSkin);
  const nextIndex = (currentIndex + delta + ids.length) % ids.length;
  save.setCharacterSkin(ids[nextIndex]);
  screens.updateCharacterPreview(save.characterSkin);
}

let colliders = [];
let player = null;
let playerTextures = null;
let bulletSystem, enemyBulletSystem, enemySpawner, explosions, powerUps, muzzleFlash, footstepDust;
let fieldPickups, grenadeSystem, weaponWheel;
let wasWheelOpen = false;
let runCurrencyEarned = 0;
// loading -> home -> levelSelect -> playing <-> paused -> levelComplete -> levelSelect
//                  -> upgrades -> home                  -> gameover -> levelSelect/home (via retry/home)
//                  -> settings -> home
let gameState = "loading";
let lastTime = performance.now();

window.addEventListener("resize", () => {
  resizeTopDownCamera(camera, window.innerWidth / window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

async function init() {
  const textures = await loadTextures((loaded, total) => screens.setLoadingProgress(loaded, total));
  const models = await loadModels();

  createGround(scene, textures);
  colliders = scatterProps(scene, textures);

  bulletSystem = new BulletSystem(scene, models.bullet, { speed: 42, maxRange: 55, damage: 34, scale: 0.6, trailColor: "#ffcf7a" });
  enemyBulletSystem = new BulletSystem(scene, models.bullet, { speed: 30, maxRange: 40, damage: 10, scale: 0.5, trailColor: "#ff6a6a" });
  muzzleFlash = new MuzzleFlashSystem(scene, models.muzzleSmoke);
  explosions = new ExplosionSystem(scene, textures.explosion);
  enemySpawner = new EnemySpawner(scene, textures, PLAY_HALF_EXTENT);
  powerUps = new PowerUpSystem(scene, textures, PLAY_HALF_EXTENT, colliders);
  fieldPickups = new FieldPickupSystem(scene, textures, PLAY_HALF_EXTENT, colliders);
  grenadeSystem = new GrenadeSystem(scene, textures.pickupGrenade);
  weaponWheel = new WeaponWheel(document.getElementById("weapon-wheel"), document.getElementById("weapon-wheel-ring"));
  footstepDust = new FootstepDustSystem(scene, textures);
  playerTextures = textures; // kept for playLevel() to (re)create the player on demand

  screens.setReady();
  gameState = "home";
  screens.showHome(save);

  lastTime = performance.now();
  requestAnimationFrame(animate);
}

// Starts (or retries) the given level. The player is always (re)created
// from the current save so it reflects whatever upgrades are purchased,
// full health/ammo, at the spawn point.
function playLevel(level) {
  if (player) player.dispose(scene);
  const skin = getCharacterSkin(save.characterSkin);
  player = new Player(scene, playerTextures[skin.textureKey], PLAY_HALF_EXTENT, save.getStats());
  resetCameraFollow(camera, player.position);

  enemySpawner.startLevel(level);
  bulletSystem.clear();
  enemyBulletSystem.clear();
  muzzleFlash.clear();
  explosions.clear();
  damageNumbers.clear();
  powerUps.reset();
  fieldPickups.reset();
  grenadeSystem.clear();
  footstepDust.clear();
  runCurrencyEarned = 0;
  shake.trauma = 0;
  wasWheelOpen = false;
  weaponWheel.hide();

  hud.updateHealth(player.health, player.maxHealth);
  hud.updateAmmo(player.ammo, player.maxAmmo, false, 1, player.reserveAmmo);
  hud.updateReserve(player.reserveAmmo);
  hud.updateWeapon(player.weaponDef.label, player.weaponDef.icon);
  touch.setWeaponIcon(player.weaponDef.icon);
  hud.updateGrenades(player.grenades);
  hud.updateScore(save.currency);
  hud.updateWave(level);
  hud.updateEnemiesLeft(enemySpawner.config.enemyQuota);
  hud.updateBuffs(0, 0);
  hud.updateBoss(0, 0);

  input.consumePausePress(); // discard any stale Escape press from a menu screen
  screens.hideAll();
  gameState = "playing";
  audio.startMusic();
}

function onLevelComplete() {
  const completedLevel = enemySpawner.level;
  save.unlockLevel(completedLevel + 1);

  screens.showLevelComplete({
    level: completedLevel,
    kills: enemySpawner.killedCount,
    currencyEarned: runCurrencyEarned,
  });
  gameState = "levelComplete";
}

function onGameOver() {
  screens.showGameOver(runCurrencyEarned);
  gameState = "gameover";
}

// Shared by both bullet-kills and grenade-kills so currency/score/FX stay
// in sync regardless of which weapon landed the killing blow.
function resolveEnemyDeath(enemy) {
  explosions.spawn(enemy.position, enemy.type === "boss" ? 5 : 2.6);
  audio.play("explosion", enemy.type === "boss" ? 1 : 0.7);
  save.addCurrency(enemy.currencyValue);
  runCurrencyEarned += enemy.currencyValue;
  hud.updateScore(save.currency);
}

function updateGameplay(dt) {
  const aimPoint = touch.active ? touch.getAimPoint(player.position) : input.getGroundAimPoint(camera);
  const moveVec = touch.active ? touch.getMoveVector() : input.getMoveVector();
  const firing = touch.active ? touch.firing : input.firing;
  player.aimAt(aimPoint);
  player.move(moveVec, dt, colliders);
  player.update(dt);
  footstepDust.update(dt, player.position, moveVec.x !== 0 || moveVec.z !== 0);

  if (!touch.active && input.consumeReloadPress()) player.startReload();

  if (firing && player.canFire()) {
    player.fire();
    const forward = player.getForward();
    const spawnPos = {
      x: player.position.x + forward.x * 1.3,
      z: player.position.z + forward.z * 1.3,
    };
    bulletSystem.spawn(spawnPos, forward, { damage: player.damage });
    muzzleFlash.spawn(spawnPos, forward);
    audio.play("gunshot");
  }

  const grenadePressed = touch.active ? touch.consumeGrenadeThrow() : input.consumeGrenadeThrow();
  if (grenadePressed && player.canThrowGrenade()) {
    player.throwGrenade();
    grenadeSystem.spawn(player.position, aimPoint);
  }

  grenadeSystem.update(dt, (impactPos) => {
    explosions.spawn(impactPos, 4.5);
    audio.play("explosion", 1);
    shake.add(0.5);
    for (const enemy of enemySpawner.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - impactPos.x;
      const dz = enemy.position.z - impactPos.z;
      if (dx * dx + dz * dz > GRENADE_TYPE.radius * GRENADE_TYPE.radius) continue;
      damageNumbers.spawn(enemy.position, GRENADE_TYPE.damage);
      const died = enemy.takeDamage(GRENADE_TYPE.damage);
      if (died) resolveEnemyDeath(enemy);
    }
  });

  fieldPickups.update(dt, player.position, (drop) => {
    if (drop.kind === "ammo") {
      player.addAmmo(AMMO_REFILL);
      hud.showPickupToast(`+${AMMO_REFILL} Ammo`);
    } else if (drop.kind === "grenade") {
      player.addGrenades(GRENADE_PICKUP_AMOUNT);
      hud.showPickupToast(`+${GRENADE_PICKUP_AMOUNT} Grenade${GRENADE_PICKUP_AMOUNT > 1 ? "s" : ""}`);
    } else if (drop.kind === "weapon") {
      const alreadyOwned = !!player.weapons[drop.weaponId];
      player.addWeapon(drop.weaponId);
      const label = WEAPON_TYPES[drop.weaponId].label;
      hud.showPickupToast(alreadyOwned ? `${label} ammo topped up` : `Picked up ${label} — hold Q to equip`);
    }
  });

  bulletSystem.update(dt, enemySpawner.enemies, colliders, (enemy, damage) => {
    hud.flashHitMarker();
    shake.add(0.12);
    damageNumbers.spawn(enemy.position, damage);
    const died = enemy.takeDamage(damage);
    if (died) resolveEnemyDeath(enemy);
  });

  enemyBulletSystem.update(dt, [player], colliders, (target, damage) => {
    const applied = target.takeDamage(damage);
    if (applied) {
      hud.flashHit();
      shake.add(0.35);
    }
  });

  enemySpawner.update(
    dt,
    player.position,
    colliders,
    (enemy) => {
      const applied = player.takeDamage(enemy.attackDamage);
      if (applied) {
        hud.flashHit();
        shake.add(0.35);
      }
    },
    (position, direction, damage, bulletSpeed) => {
      const spawnPos = { x: position.x + direction.x * 1.2, z: position.z + direction.z * 1.2 };
      enemyBulletSystem.spawn(spawnPos, direction, { speed: bulletSpeed, damage });
      muzzleFlash.spawn(spawnPos, direction, 0.7);
      audio.play("gunshot", 0.5);
    }
  );

  powerUps.update(dt, player.position, (type) => {
    const def = POWERUP_DEFS[type];
    if (type === "health") {
      player.heal(def.healAmount);
    } else if (type === "speed") {
      player.applySpeedBoost(def.multiplier, def.duration);
    } else if (type === "rapidFire") {
      player.applyRapidFire(def.multiplier, def.duration);
    }
  });

  explosions.update(dt);
  muzzleFlash.update(dt);
  damageNumbers.update(dt);
  shake.update(dt);
  minimap.update(player.position, player.heading, enemySpawner.enemies);

  const boss = enemySpawner.boss;
  if (boss && boss.alive) {
    hud.updateBoss(boss.health, boss.maxHealth);
  } else {
    hud.updateBoss(0, 0);
  }

  hud.updateHealth(player.health, player.maxHealth);
  hud.updateAmmo(player.ammo, player.maxAmmo, player.isReloading, player.reloadProgress, player.reserveAmmo);
  hud.updateReserve(player.reserveAmmo);
  hud.updateWeapon(player.weaponDef.label, player.weaponDef.icon);
  touch.setWeaponIcon(player.weaponDef.icon);
  hud.updateGrenades(player.grenades);
  hud.updateEnemiesLeft(Math.max(0, enemySpawner.config.enemyQuota - enemySpawner.killedCount));
  hud.updateBuffs(player.speedBoostTimer, player.rapidFireTimer);

  if (!player.alive) {
    onGameOver();
    return;
  }

  if (enemySpawner.isLevelComplete) {
    onLevelComplete();
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  hud.updateCrosshair(input.mouseScreen.x, input.mouseScreen.y);
  hud.setVisible(gameState === "playing");
  touch.setVisible(gameState === "playing");

  const wheelOpen = touch.active ? touch.wheelOpen : input.wheelOpen;
  const wheelPos = touch.active ? touch.wheelPos : input.mouseScreen;

  if (gameState === "playing") {
    if (input.consumePausePress()) {
      openPause();
    } else if (wheelOpen) {
      if (!wasWheelOpen) weaponWheel.show(player);
      weaponWheel.updateHover(wheelPos, player);
      wasWheelOpen = true;
    } else {
      if (wasWheelOpen) {
        const chosen = weaponWheel.confirmSelection(player);
        if (chosen) player.switchWeapon(chosen);
        weaponWheel.hide();
        wasWheelOpen = false;
      }
      updateGameplay(dt);
    }
  } else if (gameState === "paused") {
    if (input.consumePausePress()) resumeFromPause();
  }

  if (player) {
    const shakeOffset = shake.getOffset();
    updateTopDownCamera(
      camera,
      {
        x: player.position.x + shakeOffset.x,
        z: player.position.z + shakeOffset.z,
      },
      dt
    );
  }

  renderer.render(scene, camera);
}

init();
