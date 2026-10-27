const defaults = {
  master: 0.5, typing: 0.5, error: 0.5, coin: 0.65,
  countdown: 0.6, engine: 0.35, nitro: 0.5, ui: 0.35,
  victory: 0.65, defeat: 0.45, levelUp: 0.6, achievement: 0.7,
  muted: false
};
const key = "tr3d-audio-settings";

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.engine = null;
    this.lastKeyAt = 0;
    this.settings = { ...defaults };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      for (const k of Object.keys(defaults)) {
        if (typeof saved[k] === typeof defaults[k]) this.settings[k] = saved[k];
      }
    } catch {}
  }
  async activate() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("Web Audio API is not available in this browser.");
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const k of Object.keys(defaults)) {
        if (k === "master" || k === "muted") continue;
        this.buses[k] = this.ctx.createGain();
        this.buses[k].connect(this.master);
      }
      this.apply();
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
  }
  apply() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.master, t, 0.02);
    for (const [k, node] of Object.entries(this.buses)) {
      node.gain.setTargetAtTime(this.settings[k], t, 0.02);
    }
  }
  set(name, value) {
    if (!(name in defaults) || name === "muted") return;
    this.settings[name] = Math.max(0, Math.min(1, Number(value) || 0));
    this.save(); this.apply();
  }
  mute(value) { this.settings.muted = !!value; this.save(); this.apply(); }
  get() { return { ...this.settings }; }
  save() { try { localStorage.setItem(key, JSON.stringify(this.settings)); } catch {} }
  tone(bus, frequency, duration = 0.1, type = "sine", volume = 0.18, endFrequency = null) {
    if (!this.ctx || !this.buses[bus] || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, frequency), t);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(this.buses[bus]);
    osc.start(t); osc.stop(t + duration + 0.025);
  }
  noise(bus, duration = 0.025, volume = 0.12, cutoff = 5000) {
    if (!this.ctx || !this.buses[bus] || this.ctx.state !== "running") return;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    filter.type = "lowpass"; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    src.buffer = buffer; src.connect(filter); filter.connect(gain); gain.connect(this.buses[bus]);
    src.start(); src.stop(this.ctx.currentTime + duration + 0.01);
  }
  typing() {
    const now = performance.now();
    if (now - this.lastKeyAt < 22) return;
    this.lastKeyAt = now;
    this.noise("typing", 0.022, 0.16, 5200);
    this.tone("typing", 1050, 0.022, "triangle", 0.045, 780);
  }
  error() { this.tone("error", 190, 0.13, "triangle", 0.18, 125); }
  coin() { this.tone("coin", 880, 0.11, "sine", 0.2); setTimeout(() => this.tone("coin", 1320, 0.16, "sine", 0.17), 65); }
  countdown(n) {
    if (n > 0) this.tone("countdown", 520, 0.13, "triangle", 0.2);
    else { this.tone("countdown", 880, 0.23, "sawtooth", 0.13); this.tone("countdown", 1175, 0.25, "sine", 0.16); }
  }
  ui() { this.tone("ui", 680, 0.045, "sine", 0.11); }
  nitro() { this.noise("nitro", 0.28, 0.16, 1600); this.tone("nitro", 150, 0.3, "sawtooth", 0.13, 430); }
  startEngine() {
    if (!this.ctx || this.engine) return;
    const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    osc.type = "sawtooth"; osc.frequency.value = 55;
    filter.type = "lowpass"; filter.frequency.value = 180; gain.gain.value = 0.0001;
    osc.connect(filter); filter.connect(gain); gain.connect(this.buses.engine); osc.start();
    this.engine = { osc, filter, gain }; this.updateEngine(0.1);
  }
  updateEngine(ratio) {
    if (!this.ctx || !this.engine) return;
    const t = this.ctx.currentTime, r = Math.max(0, Math.min(1, ratio));
    this.engine.osc.frequency.setTargetAtTime(55 + r * 115, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(180 + r * 700, t, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.025 + r * 0.08, t, 0.08);
  }
  stopEngine() {
    if (!this.ctx || !this.engine) return;
    const e = this.engine; this.engine = null;
    e.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    setTimeout(() => { try { e.osc.stop(); e.osc.disconnect(); e.filter.disconnect(); e.gain.disconnect(); } catch {} }, 260);
  }
  victory() { [523,659,784,1047].forEach((f,i) => setTimeout(() => this.tone("victory", f, 0.32, "sine", 0.18), i * 125)); }
  defeat() { this.tone("defeat", 330, 0.24, "triangle", 0.16); setTimeout(() => this.tone("defeat", 220, 0.36, "triangle", 0.14), 180); }
  levelUp() { [440,554,659,880].forEach((f,i) => setTimeout(() => this.tone("levelUp", f, 0.17, "sine", 0.17), i * 80)); }
  achievement() { this.tone("achievement", 660, 0.13, "sine", 0.18); setTimeout(() => this.tone("achievement", 990, 0.22, "sine", 0.18), 100); }
}
const audioManager = new AudioManager();
export default audioManager;
