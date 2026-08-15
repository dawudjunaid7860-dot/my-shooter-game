import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// 3D props from the Kenney "Blaster Kit 2.1" pack, used for the bullet
// projectile and the muzzle-flash puff (see bullet.js / muzzleflash.js).
// Loaded once as templates; every in-game instance is a clone of these.
const BASE = "public/assets/kenney_blaster-kit_2.1/Models/GLB format/";

const MODEL_PATHS = {
  bullet: BASE + "bullet-foam-tip.glb",
  muzzleSmoke: BASE + "smoke.glb",
};

let cachePromise = null;

export function loadModels() {
  if (!cachePromise) {
    const loader = new GLTFLoader();
    cachePromise = Promise.all(
      Object.entries(MODEL_PATHS).map(
        ([key, path]) =>
          new Promise((resolve, reject) => {
            loader.load(
              path,
              (gltf) => resolve([key, gltf.scene]),
              undefined,
              (err) => reject(new Error(`Failed to load ${path}: ${err}`))
            );
          })
      )
    ).then((entries) => {
      const models = {};
      for (const [key, scene] of entries) models[key] = scene;
      return models;
    });
  }
  return cachePromise;
}

// Deep-clones a template's hierarchy AND its materials, so per-instance
// changes (opacity fade, tint) don't affect the shared template or other
// clones.
export function cloneModel(template) {
  const clone = template.clone(true);
  clone.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
    }
  });
  return clone;
}
