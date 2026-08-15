// Minimal audio manager driving the settings screen's volume slider(s).
// Each named SFX gets a preloaded template Audio element; playing clones it
// so overlapping plays (e.g. rapid fire, simultaneous explosions) don't cut
// each other off. Background music is a separate, single looping instance
// with its own independent volume, since it needs to keep playing
// continuously rather than being retriggered per-event.
const SOUNDS = {
  click: "public/assets/kenney_ui-pack/Sounds/click-a.ogg",
  gunshot: "public/assets/sounds/gunshot.mp3",
  explosion: "public/assets/sounds/explosion.mp3",
};

const MUSIC_SOUND = "public/assets/sounds/music.mp3";

export class AudioManager {
  constructor(volume = 0.7, musicVolume = 0.5) {
    this.volume = volume;
    this._templates = {};
    for (const [name, path] of Object.entries(SOUNDS)) {
      const audio = new Audio(path);
      audio.preload = "auto";
      this._templates[name] = audio;
    }

    this.musicVolume = musicVolume;
    this._music = new Audio(MUSIC_SOUND);
    this._music.loop = true;
    this._music.preload = "auto";
    this._music.volume = musicVolume;
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

  setMusicVolume(value) {
    this.musicVolume = value;
    this._music.volume = value;
  }

  // Browsers block audio until a user gesture is seen on the page — call
  // this from a click handler (e.g. hitting Play). Safe to call repeatedly;
  // it's a no-op once the music is already playing.
  startMusic() {
    if (!this._music.paused) return;
    this._music.play().catch(() => {});
  }
}
