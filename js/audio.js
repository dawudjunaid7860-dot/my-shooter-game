// Minimal audio manager driving the settings screen's volume slider.
// Each named sound gets a preloaded template Audio element; playing clones
// it so overlapping plays (e.g. rapid fire, simultaneous explosions) don't
// cut each other off.
const SOUNDS = {
  click: "public/assets/kenney_ui-pack/Sounds/click-a.ogg",
  gunshot: "public/assets/sounds/gunshot.mp3",
  explosion: "public/assets/sounds/explosion.mp3",
};

export class AudioManager {
  constructor(volume = 0.7) {
    this.volume = volume;
    this._templates = {};
    for (const [name, path] of Object.entries(SOUNDS)) {
      const audio = new Audio(path);
      audio.preload = "auto";
      this._templates[name] = audio;
    }
  }

  setVolume(value) {
    this.volume = value;
  }

  play(name, volumeScale = 1) {
    if (this.volume <= 0) return;
    const template = this._templates[name];
    if (!template) return;
    const node = template.cloneNode();
    node.volume = Math.min(1, this.volume * volumeScale);
    node.play().catch(() => {
      // Autoplay can still be blocked in some browsers before any gesture
      // has been seen on this page — harmless to ignore.
    });
  }

  playClick() {
    this.play("click");
  }
}
