/**
 * Audio Engine using HTML5 Web Audio API (No external audio files needed)
 * Includes both Sound Effects (SFX) and ambient oceanic Background Music (BGM) synthesizer.
 */

class SeaAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmGainNode: GainNode | null = null;
  private bgmStep: number = 0;

  // Oceanic Pentatonic Arpeggio scale (C-major / A-minor pentatonic: C4, D4, E4, G4, A4, C5, D5, E5)
  private melodyNotes: number[] = [
    261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 523.25, 392.00,
    293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23,
    261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 659.25, 523.25,
    220.00, 261.63, 329.63, 440.00, 523.25, 440.00, 329.63, 261.63
  ];

  // Soft bass accompaniment chords
  private bassNotes: number[] = [130.81, 146.83, 164.81, 110.00];

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal: number = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // ═══════════════════════════════════════════════
  // BACKGROUND MUSIC (BGM) SYNTHESIZER
  // ═══════════════════════════════════════════════

  startBGM() {
    if (!this.enabled || this.isBgmPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // Master BGM gain for soft aquatic ambiance
    try {
      this.bgmGainNode = this.ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.bgmGainNode.connect(this.ctx.destination);
    } catch {
      return;
    }

    const playNextNote = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode || !this.enabled) return;
      try {
        const now = this.ctx.currentTime;
        const noteFreq = this.melodyNotes[this.bgmStep % this.melodyNotes.length];

        // 1. Soft aquatic bell / marimba note
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(noteFreq, now);

        // Soft envelope: attack 0.05s, decay 0.65s
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGainNode);
        osc.start(now);
        osc.stop(now + 0.65);

        // 2. Gentle ocean bass pad every 8 steps
        if (this.bgmStep % 8 === 0) {
          const bassFreq = this.bassNotes[Math.floor(this.bgmStep / 8) % this.bassNotes.length];
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.001, now);
          bassGain.gain.exponentialRampToValueAtTime(0.07, now + 0.15);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmGainNode);
          bassOsc.start(now);
          bassOsc.stop(now + 2.4);
        }

        this.bgmStep++;
      } catch {
        // Safe catch for browser suspend
      }
    };

    // Trigger note every 380ms for calm oceanic rhythm
    playNextNote();
    this.bgmIntervalId = window.setInterval(playNextNote, 380);
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  // ═══════════════════════════════════════════════
  // SOUND EFFECTS (SFX)
  // ═══════════════════════════════════════════════

  benarkan() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.22, 'triangle', 0.2), idx * 75);
    });
  }

  salahkan() {
    if (!this.enabled) return;
    this.playTone(180, 0.35, 'sawtooth', 0.18);
    setTimeout(() => this.playTone(130, 0.45, 'sawtooth', 0.18), 120);
  }

  klik() {
    this.playTone(880, 0.06, 'sine', 0.08);
  }

  pop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  pearlDing() {
    if (!this.enabled) return;
    this.playTone(1046.5, 0.18, 'sine', 0.25);
    setTimeout(() => this.playTone(1567.98, 0.25, 'triangle', 0.22), 80);
  }

  shockBuzz() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {}
  }

  levelUp() {
    if (!this.enabled) return;
    const notes = [523, 659, 784, 987, 1046, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.28, 'triangle', 0.22), idx * 90);
    });
  }

  gameOver() {
    if (!this.enabled) return;
    const notes = [440, 415.3, 392, 349.2, 329.6];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.45, 'sawtooth', 0.22), idx * 160);
    });
  }
}

export const seaAudio = new SeaAudioEngine();
