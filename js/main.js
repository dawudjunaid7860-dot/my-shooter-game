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
import { SaveState } from "./save.js";
import { Minimap } from "./minimap.js";
import { ScreenShake } from "./utils.js";
import { CHARACTER_SKINS, getCharacterSkin } from "./characters.js";
import { loadModels } from "./models.js";
import { MuzzleFlashSystem } from "./muzzleflash.js";
import { DamageNumberSystem } from "./damagenumbers.js";
import { FootstepDustSystem } from "./dust.js";
import { AudioManager } from "./audio.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = createTopDownCamera(window.innerWidth / window.innerHeight);

createLights(scene);
const input = new InputManager(canvas);
const hud = new HUD();
const save = new SaveState();
const minimap = new Minimap(document.getElementById("minimap"), PLAY_HALF_EXTENT);
const shake = new ScreenShake();
const audio = new AudioManager(save.volume);
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
});

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
let runCurrencyEarned = 0;
// loading -> home -> levelSelect -> playing -> levelComplete -> levelSelect
//                  -> upgrades -> home                        -> gameover -> levelSelect/home (via retry/home)
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
  footstepDust.clear();
  runCurrencyEarned = 0;
  shake.trauma = 0;

  hud.updateHealth(player.health, player.maxHealth);
  hud.updateAmmo(player.ammo, player.maxAmmo, false, 1);
  hud.updateScore(save.currency);
  hud.updateWave(level);
  hud.updateEnemiesLeft(enemySpawner.config.enemyQuota);
  hud.updateBuffs(0, 0);
  hud.updateBoss(0, 0);

  screens.hideAll();
  gameState = "playing";
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

function updateGameplay(dt) {
  const aimPoint = input.getGroundAimPoint(camera);
  const moveVec = input.getMoveVector();
  player.aimAt(aimPoint);
  player.move(moveVec, dt, colliders);
  player.update(dt);
  footstepDust.update(dt, player.position, moveVec.x !== 0 || moveVec.z !== 0);

  if (input.consumeReloadPress()) player.startReload();

  if (input.firing && player.canFire()) {
    player.fire();
    const forward = player.getForward();
    const spawnPos = {
      x: player.position.x + forward.x * 1.3,
      z: player.position.z + forward.z * 1.3,
    };
    bulletSystem.spawn(spawnPos, forward, { damage: player.damage });
    muzzleFlash.spawn(spawnPos, forward);
  }

  bulletSystem.update(dt, enemySpawner.enemies, colliders, (enemy, damage) => {
    hud.flashHitMarker();
    shake.add(0.12);
    damageNumbers.spawn(enemy.position, damage);
    const died = enemy.takeDamage(damage);
    if (died) {
      explosions.spawn(enemy.position, enemy.type === "boss" ? 5 : 2.6);
      save.addCurrency(enemy.currencyValue);
      runCurrencyEarned += enemy.currencyValue;
      hud.updateScore(save.currency);
    }
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
  hud.updateAmmo(player.ammo, player.maxAmmo, player.isReloading, player.reloadProgress);
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

  if (gameState === "playing") {
    updateGameplay(dt);
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
