/**
 * Naruto Jutsu-Cam Audio Synthesizer
 * Uses Web Audio API to procedurally generate authentic anime sound effects
 * Zero external audio files required — 100% reliable, zero latency!
 */

class JutsuAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.activeLoops = {};
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.muted;
  }

  createNoiseBuffer(duration = 1.0) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. RASENGAN: Spiraling chakra vortex hum
  startRasengan() {
    if (this.muted || !this.ctx || this.activeLoops.rasengan) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(520, now + 1.2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 1.2);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(14, now); // 14 Hz rotation speed
    lfoGain.gain.setValueAtTime(60, now);
    lfo.connect(osc1.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(4, now);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start();
    osc2.start();
    lfo.start();

    this.activeLoops.rasengan = { osc1, osc2, lfo, gainNode };
  }

  stopRasengan() {
    if (!this.activeLoops.rasengan || !this.ctx) return;
    const { osc1, osc2, lfo, gainNode } = this.activeLoops.rasengan;
    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
        lfo.stop();
      } catch (e) {}
    }, 320);
    delete this.activeLoops.rasengan;
  }

  // 2. CHIDORI: Thousand Birds electrical arcing and chirping
  startChidori() {
    if (this.muted || !this.ctx || this.activeLoops.chidori) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2.5);
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2500, now);

    const chirpOsc = this.ctx.createOscillator();
    chirpOsc.type = 'square';
    chirpOsc.frequency.setValueAtTime(3200, now);

    const chirpLfo = this.ctx.createOscillator();
    chirpLfo.type = 'sawtooth';
    chirpLfo.frequency.setValueAtTime(28, now); // rapid chirp modulation

    const chirpLfoGain = this.ctx.createGain();
    chirpLfoGain.gain.setValueAtTime(1400, now);
    chirpLfo.connect(chirpOsc.frequency);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.3);

    noise.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    chirpOsc.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start();
    chirpOsc.start();
    chirpLfo.start();

    this.activeLoops.chidori = { noise, chirpOsc, chirpLfo, gainNode };
  }

  stopChidori() {
    if (!this.activeLoops.chidori || !this.ctx) return;
    const { noise, chirpOsc, chirpLfo, gainNode } = this.activeLoops.chidori;
    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    setTimeout(() => {
      try {
        noise.stop();
        chirpOsc.stop();
        chirpLfo.stop();
      } catch (e) {}
    }, 220);
    delete this.activeLoops.chidori;
  }

  // 3. SHADOW CLONE: Classic anime "POOF!" smoke explosion
  playShadowClone() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Transient noise pop
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Punchy body pop
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.3);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    noise.start(now);
    subOsc.start(now);
    subOsc.stop(now + 0.4);
  }

  // 4. FIREBALL: Roaring furnace flame explosion
  startFireball() {
    if (this.muted || !this.ctx || this.activeLoops.fireball) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2.5);
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.8);
    filter.Q.setValueAtTime(3.5, now);

    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(65, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.5, now + 0.4);

    noise.connect(filter);
    sub.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start();
    sub.start();

    this.activeLoops.fireball = { noise, sub, gainNode };
  }

  stopFireball() {
    if (!this.activeLoops.fireball || !this.ctx) return;
    const { noise, sub, gainNode } = this.activeLoops.fireball;
    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    setTimeout(() => {
      try {
        noise.stop();
        sub.stop();
      } catch (e) {}
    }, 420);
    delete this.activeLoops.fireball;
  }

  // 5. REAPER DEATH SEAL: Ominous bell toll + ethereal ghostly drone
  playReaperDeathSeal() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Deep temple bell / gong
    const freqs = [78, 156, 312, 470, 780];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const decay = 2.5 - idx * 0.3;
      gain.gain.setValueAtTime(0.3 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + decay);
    });

    // Dark spectral breath
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2.0);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.setValueAtTime(6.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.25, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 2.0);
  }

  // 6. SHARINGAN: Mystical eye awakening chime
  playSharingan() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const freqs = [1760, 2640, 3520];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.2 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  // KAMUI: Spacetime vortex suction whoosh
  playKamui() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);
    filter.Q.setValueAtTime(8, now);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.45, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    noise.connect(filter);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  // 7. SUSANOO: Colossal chakra titan roar and burning aura
  playSusanoo() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass impact
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 1.8);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    // Flaming aura chord (Susanoo theme)
    const notes = [130.81, 196.00, 261.63, 392.00]; // C minor power
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + idx * 200, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 2.6);
    });

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 2.3);
  }
}

window.jutsuAudio = new JutsuAudio();
