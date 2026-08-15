// Minimal audio manager so the settings screen's volume slider has a real
// effect. The asset packs on hand don't include gunfire/impact SFX (only
// this UI click), so that's what volume currently controls; it's wired
// generically to every button press.
const CLICK_SOUND = "public/assets/kenney_ui-pack/Sounds/click-a.ogg";

export class AudioManager {
  constructor(volume = 0.7) {
    this.volume = volume;
    this._template = new Audio(CLICK_SOUND);
    this._template.preload = "auto";
  }

  setVolume(value) {
    this.volume = value;
  }

  playClick() {
    if (this.volume <= 0) return;
    const node = this._template.cloneNode();
    node.volume = this.volume;
    node.play().catch(() => {
      // Autoplay can still be blocked in some browsers before any gesture
      // has been seen on this page — harmless to ignore.
    });
  }
}
