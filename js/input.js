import * as THREE from "three";

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseNDC = new THREE.Vector2(0, 0);
    // A virtual cursor decoupled from the raw OS cursor position, moved by
    // mousemove deltas scaled by sensitivity — this is what makes a mouse
    // sensitivity setting meaningful even though aiming is otherwise a
    // direct point-and-click raycast (see setSensitivity()/getGroundAimPoint()).
    this.mouseScreen = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    this.sensitivity = 1;
    this.firing = false;
    this.reloadPressed = false;
    this.wheelOpen = false;
    this.grenadeThrowPressed = false;
    this.pausePressed = false;

    this._raycaster = new THREE.Raycaster();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._aimPoint = new THREE.Vector3();

    window.addEventListener("keydown", (e) => this._onKeyDown(e));
    window.addEventListener("keyup", (e) => this._onKeyUp(e));
    canvas.addEventListener("mousemove", (e) => this._onMouseMove(e));
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.firing = true;
      if (e.button === 2) this.grenadeThrowPressed = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.firing = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setSensitivity(value) {
    this.sensitivity = value;
  }

  _onKeyDown(e) {
    this.keys.add(e.code);
    if (e.code === "KeyR") this.reloadPressed = true;
    if (e.code === "KeyQ") this.wheelOpen = true;
    if (e.code === "Escape") this.pausePressed = true;
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
    if (e.code === "KeyQ") this.wheelOpen = false;
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dx = (e.movementX || 0) * this.sensitivity;
    const dy = (e.movementY || 0) * this.sensitivity;
    const x = Math.max(rect.left, Math.min(rect.right, this.mouseScreen.x + dx));
    const y = Math.max(rect.top, Math.min(rect.bottom, this.mouseScreen.y + dy));
    this.mouseScreen.set(x, y);
    this.mouseNDC.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((y - rect.top) / rect.height) * 2 + 1;
  }

  consumeReloadPress() {
    const pressed = this.reloadPressed;
    this.reloadPressed = false;
    return pressed;
  }

  consumeGrenadeThrow() {
    const pressed = this.grenadeThrowPressed;
    this.grenadeThrowPressed = false;
    return pressed;
  }

  consumePausePress() {
    const pressed = this.pausePressed;
    this.pausePressed = false;
    return pressed;
  }

  getMoveVector() {
    let x = 0;
    let z = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;

    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      z *= inv;
    }
    return { x, z };
  }

  // Raycasts the mouse position onto the y=0 ground plane to find the
  // world-space point the player is aiming at.
  getGroundAimPoint(camera) {
    this._raycaster.setFromCamera(this.mouseNDC, camera);
    this._raycaster.ray.intersectPlane(this._groundPlane, this._aimPoint);
    return this._aimPoint;
  }
}
