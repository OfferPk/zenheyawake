/**
 * ZenHeyawake Procedural Web Audio Synthesizer
 * Pure Web Audio API - zero external sound files.
 * Generates traditional Japanese tea room acoustics:
 * - Shoji lattice slide & gentle wooden tap
 * - Sumi ink stone placement click
 * - Bamboo dot tick
 * - Harmonic Koto room resolution chord
 * - Resonant bronze temple bell (Bonshō 梵鐘)
 */

class ZenAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('zenheyawake_muted') === 'true';
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;\n    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('zenheyawake_muted', String(this.muted));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.45, now + 0.05);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Smooth tactile wooden tap when placing or removing dot
   */
  playTick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);\n    osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Crisp ink stone placement sound (deep smooth pebble tap)
   */
  playStone() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.1);
    subOsc.stop(now + 0.1);
  }

  /**
   * Subtle wooden clack on undo or clear
   */
  playUndo() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Gentle harmonic koto chime when a room becomes harmonized
   */
  playChime() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Japanese Insen pentatonic scale note
    const notes = [440, 466.16, 587.33, 659.25, 783.99]; // A4, Bb4, D5, E5, G5
    const freq = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  /**
   * Resonant bronze temple victory bell (Bonshō 梵鐘)
   * Fundamental ~108 Hz with sacred overtones and long decaying resonance
   */
  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const partials = [
      { ratio: 1.0, gain: 0.35, decay: 2.8 },
      { ratio: 1.98, gain: 0.22, decay: 2.4 },
      { ratio: 2.94, gain: 0.16, decay: 1.9 },
      { ratio: 4.18, gain: 0.11, decay: 1.5 },
      { ratio: 5.42, gain: 0.07, decay: 1.1 }
    ];

    const fundamental = 108.0;

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * p.ratio, now);

      gain.gain.setValueAtTime(p.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZenAudio;
}
if (typeof window !== 'undefined') {
  window.ZenAudio = ZenAudio;
}
