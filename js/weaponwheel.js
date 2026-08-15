import { WEAPON_TYPES } from "./weapons.js";

const WHEEL_ORDER = ["pistol", "rifle", "shotgun", "heavy"];
const RADIUS = 150;
const DEAD_ZONE = 40;

// GTA-style radial gun select: hold Q to open (see main.js), move the mouse
// out from center toward a slice to highlight it, release Q to equip.
// Slice angles are placed clockwise starting at the top (screen space, so
// x = cos(a)*r, y = sin(a)*r with a = -PI/2 at slice 0); hover detection
// inverts that same mapping from the cursor's angle to center.
export class WeaponWheel {
  constructor(rootEl, ringEl) {
    this.root = rootEl;
    this.ring = ringEl;
    this.slices = [];
    this.hoveredId = null;
    this._buildSlices();
  }

  _buildSlices() {
    const n = WHEEL_ORDER.length;
    WHEEL_ORDER.forEach((id, i) => {
      const def = WEAPON_TYPES[id];
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * RADIUS;
      const y = Math.sin(angle) * RADIUS;

      const el = document.createElement("div");
      el.className = "wheel-slice";
      el.style.left = `calc(50% + ${x}px)`;
      el.style.top = `calc(50% + ${y}px)`;
      el.innerHTML = `
        <img src="${def.icon}" alt="${def.label}" />
        <div class="wheel-slice-label">${def.label}</div>
        <div class="wheel-slice-ammo"></div>
        <div class="wheel-slice-lock">LOCKED</div>
      `;
      this.ring.appendChild(el);
      this.slices.push({ id, el, ammoEl: el.querySelector(".wheel-slice-ammo") });
    });
  }

  show(player) {
    this.root.classList.remove("hidden");
    this.hoveredId = null;
    for (const { id, el, ammoEl } of this.slices) {
      const slot = player.weapons[id];
      el.classList.toggle("locked", !slot);
      el.classList.toggle("current", id === player.currentWeaponId);
      el.classList.remove("hovered");
      ammoEl.textContent = slot ? `${slot.ammo} / ${slot.reserve}` : "";
    }
  }

  hide() {
    this.root.classList.add("hidden");
  }

  updateHover(mouseScreen, player) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = mouseScreen.x - cx;
    const dy = mouseScreen.y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < DEAD_ZONE) {
      this.hoveredId = null;
    } else {
      const angle = Math.atan2(dy, dx);
      const n = WHEEL_ORDER.length;
      let a = angle + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      const idx = Math.round(a / ((Math.PI * 2) / n)) % n;
      this.hoveredId = WHEEL_ORDER[idx];
    }

    for (const { id, el } of this.slices) {
      const owned = !!player.weapons[id];
      el.classList.toggle("hovered", owned && id === this.hoveredId);
    }
  }

  // Weapon id to switch to, or null if the hovered slice isn't owned/valid.
  confirmSelection(player) {
    if (this.hoveredId && player.weapons[this.hoveredId]) return this.hoveredId;
    return null;
  }
}
