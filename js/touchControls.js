// On-screen touch controls for phones (landscape) — built from the Kenney
// "mobile-controls-1" pack. Only shown on touch-capable devices (see
// isTouchDevice() below), so desktop/mouse play is completely unaffected.
//
// Two floating joysticks (appear wherever the thumb first lands within
// their half of the screen, standard mobile-shooter ergonomics): left for
// movement, right for aim+fire (dragging it both aims AND fires — the
// same drag-to-shoot convention most mobile twin-stick shooters use, so no
// separate fire button is needed). Two small discrete-action buttons
// (grenade, weapon-swap) sit above the aim joystick since the right thumb
// briefly taps them between aiming. The weapon-swap button reuses the
// exact same WeaponWheel hover/confirm logic as the desktop hold-Q wheel —
// press and drag to pick a gun, release to equip.
const CONTROLS_BASE = "public/assets/mobile-controls-1 (2)/Sprites/Style A/Default/";
const PAD_ICON = CONTROLS_BASE + "joystick_circle_pad_a.png";
const NUB_ICON = CONTROLS_BASE + "joystick_circle_nub_a.png";
const BUTTON_ICON = CONTROLS_BASE + "button_circle.png";
const GRENADE_ICON = "public/assets/kenney_blaster-kit_2.1/Previews/grenade-a.png";

const JOYSTICK_RADIUS = 55; // px the nub can travel from the pad center
const DEADZONE = 0.15;

export function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

function makeJoystick(zoneEl) {
  const pad = document.createElement("img");
  pad.src = PAD_ICON;
  pad.className = "touch-joystick-pad";
  const nub = document.createElement("img");
  nub.src = NUB_ICON;
  nub.className = "touch-joystick-nub";
  zoneEl.appendChild(pad);
  zoneEl.appendChild(nub);
  pad.style.display = "none";
  nub.style.display = "none";

  const state = { x: 0, z: 0, active: false, pointerId: null };

  function start(e) {
    if (state.pointerId !== null) return;
    state.pointerId = e.pointerId;
    state.active = true;
    const rect = zoneEl.getBoundingClientRect();
    const cx = e.clientX;
    const cy = e.clientY;
    pad.style.left = `${cx - rect.left}px`;
    pad.style.top = `${cy - rect.top}px`;
    nub.style.left = `${cx - rect.left}px`;
    nub.style.top = `${cy - rect.top}px`;
    pad.style.display = "block";
    nub.style.display = "block";
    zoneEl.dataset.centerX = cx;
    zoneEl.dataset.centerY = cy;
    move(e);
  }

  function move(e) {
    if (e.pointerId !== state.pointerId) return;
    const cx = Number(zoneEl.dataset.centerX);
    const cy = Number(zoneEl.dataset.centerY);
    const rect = zoneEl.getBoundingClientRect();
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    if (dist > 1e-4) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    nub.style.left = `${cx - rect.left + dx}px`;
    nub.style.top = `${cy - rect.top + dy}px`;

    const nx = dx / JOYSTICK_RADIUS;
    const nz = dy / JOYSTICK_RADIUS;
    const mag = Math.hypot(nx, nz);
    if (mag < DEADZONE) {
      state.x = 0;
      state.z = 0;
    } else {
      state.x = nx;
      state.z = nz;
    }
  }

  function end(e) {
    if (e.pointerId !== state.pointerId) return;
    state.pointerId = null;
    state.active = false;
    state.x = 0;
    state.z = 0;
    pad.style.display = "none";
    nub.style.display = "none";
  }

  zoneEl.addEventListener("pointerdown", start);
  zoneEl.addEventListener("pointermove", move);
  zoneEl.addEventListener("pointerup", end);
  zoneEl.addEventListener("pointercancel", end);

  return state;
}

export class TouchControls {
  constructor() {
    this.active = isTouchDevice();
    if (!this.active) return;

    this.root = document.createElement("div");
    this.root.id = "touch-controls";
    this.root.classList.add("hidden"); // only shown during actual gameplay, see setVisible()
    document.getElementById("app").appendChild(this.root);

    this.moveZone = document.createElement("div");
    this.moveZone.className = "touch-zone touch-zone-left";
    this.aimZone = document.createElement("div");
    this.aimZone.className = "touch-zone touch-zone-right";
    this.root.appendChild(this.moveZone);
    this.root.appendChild(this.aimZone);

    this.moveStick = makeJoystick(this.moveZone);
    this.aimStick = makeJoystick(this.aimZone);

    this.grenadeBtn = this._makeActionButton("touch-btn-grenade", GRENADE_ICON);
    this.weaponBtn = this._makeActionButton("touch-btn-weapon", null);
    this.root.appendChild(this.grenadeBtn.el);
    this.root.appendChild(this.weaponBtn.el);

    this._grenadeThrowPressed = false;
    this.grenadeBtn.el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this._grenadeThrowPressed = true;
    });

    this.wheelOpen = false;
    this.wheelPos = { x: 0, y: 0 };
    this.weaponBtn.el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.wheelOpen = true;
      this.wheelPos = { x: e.clientX, y: e.clientY };
      this._weaponPointerId = e.pointerId;
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId === this._weaponPointerId) this.wheelPos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerId === this._weaponPointerId) {
        this.wheelOpen = false;
        this._weaponPointerId = null;
      }
    });
  }

  _makeActionButton(id, iconSrc) {
    const el = document.createElement("div");
    el.id = id;
    el.className = "touch-action-btn";
    const bg = document.createElement("img");
    bg.src = BUTTON_ICON;
    bg.className = "touch-action-btn-bg";
    el.appendChild(bg);
    if (iconSrc) {
      const icon = document.createElement("img");
      icon.src = iconSrc;
      icon.className = "touch-action-btn-icon";
      el.appendChild(icon);
    }
    return { el, iconEl: el.querySelector(".touch-action-btn-icon") };
  }

  // Updates the weapon-swap button's icon to match the currently equipped
  // gun, same as the desktop HUD does.
  setWeaponIcon(iconSrc) {
    if (!this.active) return;
    if (!this.weaponBtn.iconEl) {
      const icon = document.createElement("img");
      icon.className = "touch-action-btn-icon";
      this.weaponBtn.el.appendChild(icon);
      this.weaponBtn.iconEl = icon;
    }
    if (this.weaponBtn.iconEl.src !== iconSrc) this.weaponBtn.iconEl.src = iconSrc;
  }

  // Only meant to be interactable during actual gameplay — otherwise the
  // (mostly invisible) full-height joystick zones sit on top of every menu
  // screen in DOM stacking order and silently eat clicks on the buttons
  // underneath (Play, level cards, Resume, etc).
  setVisible(visible) {
    if (!this.active) return;
    this.root.classList.toggle("hidden", !visible);
    if (!visible) {
      // Release any in-progress touch so nothing is left "stuck" firing/
      // aiming/holding the wheel open across a screen transition.
      this.moveStick.active = false;
      this.moveStick.pointerId = null;
      this.moveStick.x = 0;
      this.moveStick.z = 0;
      this.aimStick.active = false;
      this.aimStick.pointerId = null;
      this.aimStick.x = 0;
      this.aimStick.z = 0;
      this.wheelOpen = false;
    }
  }

  getMoveVector() {
    return { x: this.moveStick.x, z: this.moveStick.z };
  }

  get firing() {
    return this.aimStick.active && Math.hypot(this.aimStick.x, this.aimStick.z) > 0;
  }

  // Mirrors input.getGroundAimPoint()'s return shape: a world-space point
  // out ahead of the player in the aimed direction. Screen-space joystick
  // deltas map directly to world x/z with no sign flip needed, since the
  // top-down camera's up vector is world -Z (see world.js createTopDownCamera)
  // — the same convention WASD movement already relies on.
  getAimPoint(playerPos) {
    const { x, z } = this.aimStick;
    return { x: playerPos.x + x * 20, z: playerPos.z + z * 20 };
  }

  consumeGrenadeThrow() {
    const pressed = this._grenadeThrowPressed;
    this._grenadeThrowPressed = false;
    return pressed;
  }
}
