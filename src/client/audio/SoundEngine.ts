export type CasinoSceneSound = 'lobby' | 'slots' | 'crash' | 'roulette' | 'profile';

export class SoundEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.58;
  private ambientTimer: number | null = null;

  async unlock(): Promise<void> {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.applyMasterGain();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.startAmbientLoop();
  }

  async suspend(): Promise<void> {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  setMuted(value: boolean): void {
    this.muted = value;
    this.applyMasterGain();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  uiHover(): void {
    this.tone(900, 1040, 0.025, 'sine', 0.018);
  }

  uiClick(): void {
    this.tone(520, 760, 0.055, 'triangle', 0.05);
    this.toneAt(28, 980, 860, 0.035, 'sine', 0.025);
  }

  sceneOpen(scene: CasinoSceneSound): void {
    if (scene === 'lobby') {
      this.chord([392, 494, 659], 0.13, 0.024, 'triangle');
      this.coinPing(95, 0.026);
      return;
    }
    if (scene === 'slots') {
      this.tone(330, 520, 0.09, 'triangle', 0.032);
      this.coinPing(66, 0.02);
      return;
    }
    if (scene === 'crash') {
      this.tone(170, 260, 0.12, 'sawtooth', 0.024);
      this.toneAt(82, 330, 440, 0.08, 'triangle', 0.024);
      return;
    }
    if (scene === 'roulette') {
      this.tone(440, 660, 0.075, 'triangle', 0.027);
      this.toneAt(58, 660, 990, 0.08, 'sine', 0.022);
      return;
    }
    this.profileOpen();
  }

  betChange(): void {
    this.coinPing(0, 0.035);
  }

  reelStart(): void {
    this.noise(0.18, 320, 2100, 0.032);
    this.tone(150, 300, 0.18, 'sawtooth', 0.035);
    this.toneAt(90, 360, 520, 0.12, 'triangle', 0.022);
  }

  reelTick(): void {
    this.tone(360, 500, 0.022, 'square', 0.012);
  }

  reelStop(index: number): void {
    const base = 330 + index * 52;
    this.tone(base, base * 0.78, 0.065, 'triangle', 0.042);
    this.coinPing(24, 0.012 + index * 0.002);
  }

  win(): void {
    this.chord([523, 659, 784], 0.12, 0.045, 'triangle');
    this.coinCascade(3, 60, 0.034);
  }

  bigWin(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      this.toneAt(index * 66, frequency, frequency * 1.025, 0.15, 'triangle', 0.055);
    });
    this.coinCascade(6, 44, 0.038);
  }

  megaWin(): void {
    this.bigWin();
    this.toneAt(270, 1046, 1568, 0.24, 'sawtooth', 0.045);
    this.noise(0.3, 240, 2400, 0.042);
    this.coinCascade(10, 34, 0.04);
  }

  miss(): void {
    this.tone(170, 88, 0.14, 'square', 0.036);
  }

  bonus(): void {
    this.tone(420, 840, 0.14, 'sine', 0.05);
    this.toneAt(95, 840, 1260, 0.16, 'triangle', 0.045);
    this.coinCascade(4, 52, 0.03);
  }

  rouletteSpin(): void {
    this.noise(0.32, 1200, 280, 0.028);
    this.tone(120, 220, 0.34, 'sawtooth', 0.018);
  }

  rouletteTick(): void {
    this.tone(1180, 760, 0.018, 'square', 0.016);
  }

  rouletteResult(won: boolean): void {
    if (won) {
      this.win();
      return;
    }
    this.tone(280, 190, 0.12, 'triangle', 0.035);
  }

  crashStart(): void {
    this.tone(120, 230, 0.22, 'sawtooth', 0.032);
    this.noise(0.14, 180, 920, 0.018);
  }

  crashTick(multiplier: number): void {
    const frequency = Math.min(1180, 330 + multiplier * 90);
    this.tone(frequency, frequency * 1.08, 0.035, 'square', 0.016);
  }

  crash(): void {
    this.noise(0.26, 130, 780, 0.065);
    this.tone(190, 48, 0.28, 'sawtooth', 0.055);
  }

  cashout(): void {
    this.tone(410, 820, 0.12, 'triangle', 0.05);
    this.toneAt(74, 820, 1230, 0.13, 'sine', 0.045);
    this.coinCascade(5, 42, 0.035);
  }

  profileOpen(): void {
    this.tone(310, 520, 0.08, 'sine', 0.03);
  }

  private startAmbientLoop(): void {
    if (this.ambientTimer !== null || typeof window === 'undefined') return;
    this.ambientTimer = window.setInterval(() => {
      if (!this.context || this.context.state !== 'running' || this.muted) return;
      const roll = Math.random();
      if (roll < 0.45) {
        this.coinPing(0, 0.008);
        return;
      }
      if (roll < 0.78) {
        const root = 330 + Math.floor(Math.random() * 5) * 55;
        this.tone(root, root * 1.02, 0.055, 'sine', 0.008);
        this.toneAt(46, root * 1.25, root * 1.27, 0.06, 'triangle', 0.006);
        return;
      }
      this.noise(0.06, 900, 1600, 0.004);
    }, 4600);
  }

  private coinPing(offsetMs = 0, gainValue = 0.022): void {
    this.toneAt(offsetMs, 1280, 980, 0.05, 'sine', gainValue);
    this.toneAt(offsetMs + 12, 1980, 1460, 0.035, 'triangle', gainValue * 0.55);
  }

  private coinCascade(count: number, spacingMs: number, gainValue: number): void {
    for (let index = 0; index < count; index += 1) {
      this.coinPing(index * spacingMs, gainValue * Math.max(0.45, 1 - index * 0.06));
    }
  }

  private chord(
    frequencies: readonly number[],
    duration: number,
    gainValue: number,
    type: OscillatorType
  ): void {
    frequencies.forEach((frequency, index) => {
      this.toneAt(index * 12, frequency, frequency * 1.01, duration, type, gainValue / frequencies.length);
    });
  }

  private applyMasterGain(): void {
    if (!this.masterGain || !this.context) return;
    this.masterGain.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.01
    );
  }

  private tone(
    fromFrequency: number,
    toFrequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ): void {
    this.toneAt(0, fromFrequency, toFrequency, duration, type, gainValue);
  }

  private toneAt(
    offsetMs: number,
    fromFrequency: number,
    toFrequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number
  ): void {
    const context = this.context;
    const destination = this.masterGain;
    if (!context || !destination || this.muted) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + offsetMs / 1000;
    const end = start + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, fromFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), end);
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private noise(
    duration: number,
    fromFrequency: number,
    toFrequency: number,
    gainValue: number
  ): void {
    const context = this.context;
    const destination = this.masterGain;
    if (!context || !destination || this.muted) return;

    const frameCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const decay = 1 - index / frameCount;
      channel[index] = (Math.random() * 2 - 1) * decay;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    filter.type = 'bandpass';
    filter.Q.value = 1.8;
    filter.frequency.setValueAtTime(Math.max(20, fromFrequency), now);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(20, toFrequency),
      now + duration
    );
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now);
    source.stop(now + duration);
  }
}

export const soundEngine = new SoundEngine();
