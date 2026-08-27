export class SoundEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.68;

  async unlock(): Promise<void> {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.applyMasterGain();
    }
    if (this.context.state === 'suspended') await this.context.resume();
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
    this.tone(980, 1160, 0.035, 'sine', 0.025);
  }

  uiClick(): void {
    this.tone(620, 830, 0.055, 'square', 0.055);
  }

  reelStart(): void {
    this.noise(0.16, 420, 2600, 0.045);
    this.tone(190, 320, 0.18, 'sawtooth', 0.04);
  }

  reelTick(): void {
    this.tone(380, 540, 0.025, 'square', 0.018);
  }

  reelStop(index: number): void {
    const base = 360 + index * 58;
    this.tone(base, base * 0.72, 0.07, 'triangle', 0.045);
  }

  win(): void {
    this.tone(523, 659, 0.08, 'triangle', 0.055);
    this.toneAt(70, 659, 784, 0.1, 'sine', 0.055);
  }

  bigWin(): void {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      this.toneAt(index * 74, frequency, frequency * 1.02, 0.13, 'triangle', 0.065);
    });
  }

  megaWin(): void {
    this.bigWin();
    this.toneAt(280, 1046, 1568, 0.22, 'sawtooth', 0.055);
    this.noise(0.28, 180, 1800, 0.06);
  }

  miss(): void {
    this.tone(170, 92, 0.14, 'square', 0.045);
  }

  bonus(): void {
    this.tone(420, 840, 0.14, 'sine', 0.06);
    this.toneAt(95, 840, 1260, 0.16, 'triangle', 0.055);
  }

  profileOpen(): void {
    this.tone(310, 520, 0.08, 'sine', 0.035);
  }

  private applyMasterGain(): void {
    if (!this.masterGain || !this.context) return;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.01);
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

  private noise(duration: number, fromFrequency: number, toFrequency: number, gainValue: number): void {
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
    filter.frequency.setValueAtTime(fromFrequency, now);
    filter.frequency.exponentialRampToValueAtTime(toFrequency, now + duration);
    gain.gain.setValueAtTime(gainValue, now);
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
