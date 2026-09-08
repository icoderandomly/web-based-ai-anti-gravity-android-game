// ==========================================================
// ANTI-GRAVITY: PROCEDURAL WEB AUDIO API SOUND ENGINE
// ==========================================================

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.musicGain = null;

    this.masterVolume = 0.8;
    this.sfxVolume = 0.9;
    this.engineVolume = 0.65;
    this.musicVolume = 0.55;

    this.isInitialized = false;
    this.isMuted = false;

    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    // Music loop state
    this.musicInterval = null;
    this.musicStep = 0;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Sub bus gains
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes({ master, sfx, engine, music }) {
    if (master !== undefined) {
      this.masterVolume = master;
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(master, this.ctx.currentTime, 0.05);
    }
    if (sfx !== undefined) {
      this.sfxVolume = sfx;
      if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    }
    if (engine !== undefined) {
      this.engineVolume = engine;
    }
    if (music !== undefined) {
      this.musicVolume = music;
      if (this.musicGain) this.musicGain.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
    }
  }

  // --------------------------------------------------------
  // VEHICLE HOVER ENGINE SYNTHESIS
  // --------------------------------------------------------
  startEngine() {
    if (!this.isInitialized || this.isEngineRunning) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    // Sub oscillator (deep rumble)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, t); // A1

    // Harmonic oscillator (jet whine)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, t);

    // Lowpass filter responding to throttle
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, t);
    this.engineFilter.Q.setValueAtTime(3.5, t);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start(t);
    this.engineOsc2.start(t);

    this.engineGain.gain.setTargetAtTime(this.engineVolume * 0.4, t, 0.1);
    this.isEngineRunning = true;
  }

  updateEngine(speedRatio, isBoosting, isThrottling) {
    if (!this.isEngineRunning || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Pitch rises with speed
    const baseFreq = 50 + speedRatio * 180 + (isBoosting ? 80 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.1, t, 0.05);

    // Filter opens with speed and boost
    const cutoff = 200 + speedRatio * 1800 + (isBoosting ? 1500 : 0) + (isThrottling ? 200 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);

    const targetGain = (0.2 + speedRatio * 0.5 + (isBoosting ? 0.3 : 0)) * this.engineVolume;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  stopEngine() {
    if (!this.isEngineRunning || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0, t, 0.1);
      setTimeout(() => {
        if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); this.engineOsc1 = null; }
        if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); this.engineOsc2 = null; }
        this.isEngineRunning = false;
      }, 120);
    } catch (e) {}
  }

  // --------------------------------------------------------
  // SOUND EFFECTS
  // --------------------------------------------------------
  playCountdown(count) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.sfxGain);

    if (count > 0) {
      // 3, 2, 1 beep (880 Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.26);
    } else {
      // GO! chord (1760 Hz bright fanfare)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1760, t);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.start(t);
      osc.stop(t + 0.66);

      // Harmony
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(2200, t);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      gain2.gain.setValueAtTime(0.4, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.start(t);
      osc2.stop(t + 0.51);
    }
  }

  playBoostStart() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Pitch sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.4);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.46);

    // Noise whoosh
    this.playNoiseWhoosh(0.45, 1200, 300);
  }

  playBoostPad() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.35);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.41);

    this.playNoiseWhoosh(0.35, 2000, 800);
  }

  playCollision(intensity = 0.5) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Low punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(Math.min(1, intensity * 0.8), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.31);

    // Noise crunch
    this.playNoiseBurst(0.2, 0.4 * intensity);
  }

  playPowerupCollect() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // 4-note futuristic ascending arpeggio [C5, E5, G5, C6]
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.21);
    });
  }

  playPowerupUse(type) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'TURBO':
        this.playBoostStart();
        break;
      case 'SHIELD': {
        // Resonant shield bubble hum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.51);
        break;
      }
      case 'BLAST': {
        // EMP shockwave
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.6);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.66);
        this.playNoiseBurst(0.5, 0.7);
        break;
      }
      default: {
        // Generic cyber activation
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.25);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.31);
        break;
      }
    }
  }

  playLapPass() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const freqs = [880, 1108.73, 1318.51];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, noteTime);
      gain.gain.setValueAtTime(0.4, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.26);
    });
  }

  playRaceFinish(isWinner) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = isWinner ? [523.25, 659.25, 783.99, 1046.50, 1318.51] : [523.25, 493.88, 440.00, 392.00];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.12;

      osc.type = isWinner ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.5, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  playMenuClick() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Helper: Noise generation
  playNoiseWhoosh(duration, startFreq, endFreq) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const t = this.ctx.currentTime;
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  playNoiseBurst(duration, volume = 0.3) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);

    noise.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(this.ctx.currentTime);
  }

  // --------------------------------------------------------
  // PROCEDURAL SYNTHWAVE RACING MUSIC
  // --------------------------------------------------------
  startMusic() {
    if (this.isMusicPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    this.musicStep = 0;

    // Fast cyberpunk 16th-note synth pattern in D minor (135 BPM)
    const bpm = 135;
    const stepDuration = 60 / bpm / 4; // ~111ms

    const bassPattern = [
      73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42, // D2, D3
      65.41, 65.41, 130.81, 65.41, 65.41, 65.41, 130.81, 65.41, // C2, C3
      58.27, 58.27, 116.54, 58.27, 58.27, 58.27, 116.54, 58.27, // Bb1, Bb2
      65.41, 65.41, 130.81, 65.41, 73.42, 82.41, 87.31, 98.00   // C2, D2, E2, F2, G2
    ];

    const leadNotes = [293.66, 349.23, 440.00, 523.25, 587.33]; // D4, F4, A4, C5, D5

    const playNextStep = () => {
      if (!this.isMusicPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;

      // Bass note
      const bassFreq = bassPattern[this.musicStep % bassPattern.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, t);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(450, t);
      bassFilter.Q.setValueAtTime(4.0, t);

      bassGain.gain.setValueAtTime(0.18, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.2);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(t);
      bassOsc.stop(t + stepDuration * 1.3);

      // Lead arpeggio on certain steps
      if (this.musicStep % 2 === 0) {
        const leadIdx = (Math.floor(this.musicStep / 2)) % leadNotes.length;
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();

        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadNotes[leadIdx], t);

        leadGain.gain.setValueAtTime(0.12, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 2);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);

        leadOsc.start(t);
        leadOsc.stop(t + stepDuration * 2.1);
      }

      this.musicStep = (this.musicStep + 1) % 128;
    };

    this.musicInterval = setInterval(playNextStep, stepDuration * 1000);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }
}

export const sound = new SoundManager();
