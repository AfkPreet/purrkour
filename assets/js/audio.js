// Purrkour - procedural WebAudio: lo-fi night music, the purr, and all SFX.
// No audio files; everything is synthesized.

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// F lo-fi progression: Fmaj7 - Dm7 - Bbmaj7 - C9sus (MIDI)
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 53, 55, 58],
];
const BASS = [41, 38, 34, 36];
const PENTA = [65, 67, 69, 72, 74, 77, 79, 81]; // F pentatonic, high

// per-mood tweaks; index 0-3 = districts, 'title' = menu lullaby
const MOODS = {
  0: { bpm: 92, cutoff: 1600, hatProb: 0.75, melProb: 0.16, kick: true, transpose: 0 },
  1: { bpm: 96, cutoff: 2200, hatProb: 0.9, melProb: 0.2, kick: true, transpose: 2 },
  2: { bpm: 100, cutoff: 1900, hatProb: 0.8, melProb: 0.18, kick: true, transpose: -1 },
  3: { bpm: 104, cutoff: 2400, hatProb: 0.95, melProb: 0.22, kick: true, transpose: 3 },
  title: { bpm: 58, cutoff: 1100, hatProb: 0, melProb: 0.07, kick: false, transpose: 0 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sound = true;
    this.music = true;
    this.mood = null;
    this._timer = null;
    this._nextNote = 0;
    this._step = 0;
    this._rand = 1;
  }

  _rnd() { this._rand = (this._rand * 16807) % 2147483647; return this._rand / 2147483647; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.music ? 0.5 : 0;
      this.musicLP = this.ctx.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 1800;
      this.musicBus.connect(this.musicLP); this.musicLP.connect(this.master);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sound ? 0.6 : 0; this.sfxBus.connect(this.master);
      this._noise = this._makeNoise();
      this._startCrackle();
      this._startPurr();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _noiseSrc() {
    const s = this.ctx.createBufferSource(); s.buffer = this._noise; s.loop = true; return s;
  }

  // ---------- persistent layers ----------
  _startCrackle() {
    const src = this._noiseSrc();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.6;
    this.crackleGain = this.ctx.createGain(); this.crackleGain.gain.value = 0;
    src.connect(bp); bp.connect(this.crackleGain); this.crackleGain.connect(this.musicBus);
    src.start();
  }

  _startPurr() {
    const src = this._noiseSrc();
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.Q.value = 0.8;
    this.purrLp = lp;
    const am = this.ctx.createGain(); am.gain.value = 0.5;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 25;
    this.purrLfo = lfo;
    const depth = this.ctx.createGain(); depth.gain.value = 0.5;
    lfo.connect(depth); depth.connect(am.gain);
    this.purrGain = this.ctx.createGain(); this.purrGain.gain.value = 0;
    src.connect(lp); lp.connect(am); am.connect(this.purrGain); this.purrGain.connect(this.master);
    src.start(); lfo.start();
  }

  // called every frame with the purr phase [0..1]; the purr is audible even in menus.
  // milk=true makes the purr slower and deeper (Moon Milk dream state).
  setPurr(level, milk = false) {
    if (!this.ctx || !this.purrGain) return;
    const v = this.sound ? level * 0.16 : 0;
    this.purrGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    if (milk !== this._milkPurr) {
      this._milkPurr = milk;
      this.purrLfo?.frequency.setTargetAtTime(milk ? 17 : 25, this.ctx.currentTime, 0.2);
      this.purrLp?.frequency.setTargetAtTime(milk ? 100 : 150, this.ctx.currentTime, 0.2);
    }
  }

  setSound(on) { this.sound = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.03); }
  setMusic(on) { this.music = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.03); }

  // ---------- music scheduler ----------
  startMusic(mood) {
    if (!this.ctx) return;
    if (this.mood === mood && this._timer) return;
    this.stopMusic();
    this.mood = mood;
    const m = MOODS[mood];
    this.musicLP.frequency.setTargetAtTime(m.cutoff, this.ctx.currentTime, 0.4);
    this.crackleGain.gain.setTargetAtTime(0.015, this.ctx.currentTime, 0.5);
    this._step = 0;
    this._nextNote = this.ctx.currentTime + 0.1;
    this.musicStartTime = this._nextNote; // beat 0 reference for purr sync
    this.bpm = m.bpm;
    const tick = () => {
      if (!this._timer) return;
      const ahead = this.ctx.currentTime + 0.5;
      while (this._nextNote < ahead) {
        if (this.music) this._schedule(this._nextNote, this._step, m); // muted: keep the clock, skip the synth
        this._step++; this._nextNote += 30 / m.bpm; // 8th notes
      }
      if (mood === 'title' && this.music && this._rnd() < 0.02) this._cricket(this.ctx.currentTime + this._rnd());
    };
    this._timer = setInterval(tick, 90);
    tick();
  }

  stopMusic() { if (this._timer) { clearInterval(this._timer); this._timer = null; } this.mood = null; }

  _schedule(t, step, m) {
    const eighth = step % 8, bar = Math.floor(step / 8) % 4;
    const chord = CHORDS[bar].map((n) => n + m.transpose);
    const swing = eighth % 2 === 1 ? (30 / m.bpm) * 0.16 : 0;
    t += swing;
    // kick beats 1 & 3
    if (m.kick && (eighth === 0 || eighth === 4)) this._kick(t);
    // hats on 8ths
    if (m.hatProb && this._rnd() < m.hatProb) this._hat(t, eighth % 2 === 1);
    // bass on 1 and the and-of-2
    if (eighth === 0 || eighth === 3) this._bass(t, BASS[bar] + m.transpose, eighth === 0 ? 0.5 : 0.3);
    // e-piano stabs on offbeats 2 & 4 (title: whole-bar pads)
    if (this.mood === 'title' ? eighth === 0 : (eighth === 2 || eighth === 6)) this._epiano(t, chord, this.mood === 'title' ? 3.2 : 1.4);
    // sparse melody
    if (this._rnd() < m.melProb && eighth !== 0) this._pluck(t, PENTA[Math.floor(this._rnd() * PENTA.length)] + m.transpose);
  }

  _env(t, a, d, peak = 1) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return g;
  }

  _kick(t) {
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = this._env(t, 0.004, 0.16, 0.5);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.2);
  }
  _hat(t, off) {
    const s = this._noiseSrc();
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = this._env(t, 0.002, off ? 0.05 : 0.03, 0.06);
    s.connect(hp); hp.connect(g); g.connect(this.musicBus); s.start(t); s.stop(t + 0.09);
  }
  _bass(t, n, vol) {
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midiHz(n);
    const g = this._env(t, 0.01, 0.42, vol);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.5);
  }
  _epiano(t, chord, dur) {
    for (const n of chord) {
      const det = 1 + (this._rnd() - 0.5) * 0.002;
      const o = this.ctx.createOscillator(); o.frequency.value = midiHz(n) * det;
      const o2 = this.ctx.createOscillator(); o2.frequency.value = midiHz(n) * 2.005;
      const g = this._env(t, 0.012, dur, 0.09);
      const g2 = this._env(t, 0.012, dur * 0.4, 0.02);
      o.connect(g); g.connect(this.musicBus); o2.connect(g2); g2.connect(this.musicBus);
      o.start(t); o.stop(t + dur + 0.1); o2.start(t); o2.stop(t + dur + 0.1);
    }
  }
  _pluck(t, n) {
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiHz(n);
    const g = this._env(t, 0.006, 0.9, 0.08);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 1);
  }
  _cricket(t) {
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator(); o.frequency.value = 4300 + this._rnd() * 300;
      const g = this._env(t + i * 0.07, 0.005, 0.04, 0.02);
      o.connect(g); g.connect(this.master); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.06);
    }
  }

  // beat-synced purr clock. Falls back to null (game time) when the context is not
  // actually running, and compensates for output latency so timing-by-ear is fair.
  purrClock() {
    if (!this.ctx || !this._timer || this.ctx.state !== 'running') return null;
    const lat = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    return { t: this.ctx.currentTime - this.musicStartTime - lat, bpm: this.bpm };
  }

  // ---------- SFX ----------
  _sfxOsc(type, f0, f1, t, a, d, vol) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    const g = this._env(t, a, d, vol);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + a + d + 0.05);
  }
  _sfxNoise(fType, freq, q, t, a, d, vol) {
    if (!this.ctx) return;
    const s = this._noiseSrc();
    const f = this.ctx.createBiquadFilter(); f.type = fType; f.frequency.value = freq; f.Q.value = q;
    const g = this._env(t, a, d, vol);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t + a + d + 0.05);
  }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  pounce(power) { const t = this.now; this._sfxOsc('sine', 300 + power * 250, 620 + power * 380, t, 0.02, 0.13, 0.25); }
  purrfect() {
    const t = this.now;
    [880, 1108, 1318, 1760].forEach((f, i) => this._sfxOsc('sine', f, f * 1.02, t + i * 0.03, 0.008, 0.25, 0.12));
  }
  dive() { this._sfxNoise('bandpass', 900, 1.2, this.now, 0.01, 0.16, 0.3); }
  pomf(hard) { const t = this.now; this._sfxNoise('lowpass', 300, 0.7, t, 0.004, hard ? 0.14 : 0.09, hard ? 0.5 : 0.3); this._sfxOsc('sine', 130, 70, t, 0.004, 0.1, 0.25); }
  snap() { const t = this.now; this._sfxOsc('sine', 500, 900, t, 0.01, 0.08, 0.2); this._sfxNoise('highpass', 3000, 1, t, 0.005, 0.06, 0.1); }
  coin(comboStep) {
    const t = this.now;
    const f = midiHz(PENTA[Math.min(PENTA.length - 1, comboStep % PENTA.length)]);
    this._sfxOsc('sine', f, f * 1.001, t, 0.005, 0.18, 0.16);
    this._sfxOsc('sine', f * 2, f * 2, t, 0.005, 0.09, 0.06);
  }
  sparkleFish() { const t = this.now; [523, 659, 784, 1046, 1318].forEach((f, i) => this._sfxOsc('sine', f, f, t + i * 0.06, 0.008, 0.3, 0.14)); }
  sparkleNear() { const t = this.now; this._sfxOsc('sine', 1046, 1046, t, 0.01, 0.4, 0.07); this._sfxOsc('sine', 1568, 1568, t + 0.12, 0.01, 0.5, 0.055); }
  pop() { const t = this.now; this._sfxOsc('square', 400, 900, t, 0.004, 0.05, 0.12); this._sfxNoise('bandpass', 2000, 1, t, 0.004, 0.05, 0.1); }
  milk() { const t = this.now; [349, 440, 523].forEach((f, i) => this._sfxOsc('sine', f, f * 1.5, t + i * 0.05, 0.15, 0.7, 0.08)); }
  bellPickup() { const t = this.now; this._sfxOsc('sine', 1568, 1568, t, 0.005, 0.6, 0.15); this._sfxOsc('sine', 2349, 2349, t + 0.02, 0.005, 0.4, 0.08); }
  starSave() { const t = this.now; this._sfxNoise('bandpass', 1400, 2, t, 0.02, 0.5, 0.2); [1046, 1318, 1568, 2093].forEach((f, i) => this._sfxOsc('sine', f, f, t + 0.1 + i * 0.06, 0.008, 0.3, 0.12)); }
  pigeon() { const t = this.now; this._sfxNoise('bandpass', 1800, 0.8, t, 0.01, 0.12, 0.25); this._sfxOsc('sine', 420, 320, t + 0.1, 0.02, 0.12, 0.1); }
  stumble() { this._sfxNoise('lowpass', 500, 0.6, this.now, 0.005, 0.1, 0.25); }
  bonk() { const t = this.now; this._sfxOsc('sine', 220, 90, t, 0.005, 0.16, 0.3); }
  flop() { const t = this.now; this._sfxOsc('sine', 700, 160, t, 0.02, 0.5, 0.18); }
  mew() { const t = this.now; this._sfxOsc('sine', 620, 900, t, 0.05, 0.12, 0.1); this._sfxOsc('sine', 900, 500, t + 0.16, 0.04, 0.14, 0.08); }
  boing() { const t = this.now; this._sfxOsc('sine', 200, 700, t, 0.02, 0.22, 0.3); }
  levelClear() { const t = this.now; [523, 659, 784, 1046].forEach((f, i) => this._sfxOsc('sine', f, f, t + i * 0.1, 0.01, 0.5, 0.16)); }
  goalChime() { const t = this.now; this._sfxOsc('sine', 1318, 1318, t, 0.005, 0.8, 0.08); }
  tapUI() { this._sfxOsc('sine', 700, 900, this.now, 0.004, 0.05, 0.1); }
  denied() { const t = this.now; this._sfxOsc('sine', 300, 240, t, 0.01, 0.1, 0.12); }
}
