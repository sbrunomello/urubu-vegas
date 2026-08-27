export type HapticPreset = 'light' | 'medium' | 'heavy' | 'success' | 'fail';

const HAPTIC_PATTERNS: Record<HapticPreset, number | readonly number[]> = {
  light: 10,
  medium: 22,
  heavy: 38,
  success: [12, 34, 18],
  fail: [52, 26, 72],
};

export class HapticsEngine {
  private enabled = true;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  toggleEnabled(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(preset: HapticPreset): boolean {
    return this.vibrate(HAPTIC_PATTERNS[preset]);
  }

  cancel(): void {
    if (this.isSupported()) navigator.vibrate(0);
  }

  private vibrate(pattern: number | readonly number[]): boolean {
    if (!this.enabled || !this.isSupported() || document.hidden) return false;
    return navigator.vibrate(typeof pattern === 'number' ? pattern : Array.from(pattern));
  }
}

export const hapticsEngine = new HapticsEngine();
