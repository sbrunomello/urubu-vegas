import type { Scene } from 'phaser';
import type { WinCategory } from '../../shared/games/urubuzinho/SlotEngine';
import { soundEngine, type CasinoSceneSound } from '../audio/SoundEngine';
import { visualEffects } from '../effects/VisualEffectsEngine';
import { hapticsEngine } from '../haptics/HapticsEngine';

export class FeedbackEngine {
  async unlock(): Promise<void> {
    await soundEngine.unlock();
  }

  uiHover(): void {
    soundEngine.uiHover();
  }

  uiClick(): void {
    soundEngine.uiClick();
    hapticsEngine.play('light');
  }

  sceneOpen(scene: CasinoSceneSound): void {
    soundEngine.sceneOpen(scene);
  }

  betChange(): void {
    soundEngine.betChange();
    hapticsEngine.play('light');
  }

  reelStart(scene: Scene): void {
    soundEngine.reelStart();
    visualEffects.flash(scene, 0xffd54a, 0.035, 100);
    hapticsEngine.play('light');
  }

  reelStop(index: number): void {
    soundEngine.reelStop(index);
    hapticsEngine.play('light');
  }

  rouletteSpin(scene: Scene): void {
    soundEngine.rouletteSpin();
    visualEffects.flash(scene, 0xffd54a, 0.025, 90);
    hapticsEngine.play('light');
  }

  rouletteTick(): void {
    soundEngine.rouletteTick();
  }

  rouletteResult(scene: Scene, won: boolean): void {
    soundEngine.rouletteResult(won);
    if (won) {
      visualEffects.confetti(scene, 44);
      visualEffects.flash(scene, 0xffd54a, 0.08, 160);
      hapticsEngine.play('success');
      return;
    }
    hapticsEngine.play('light');
  }

  crashStart(scene: Scene): void {
    soundEngine.crashStart();
    visualEffects.flash(scene, 0x7aff8d, 0.04, 120);
    hapticsEngine.play('light');
  }

  crashTick(multiplier: number): void {
    soundEngine.crashTick(multiplier);
  }

  crash(scene: Scene): void {
    soundEngine.crash();
    visualEffects.flash(scene, 0xff425d, 0.18, 220);
    visualEffects.shake(scene, 0.012, 300);
    hapticsEngine.play('medium');
  }

  cashout(scene: Scene, x: number, y: number, reward: number): void {
    soundEngine.cashout();
    visualEffects.burst(scene, x, y, 0xffd54a, 28);
    visualEffects.ring(scene, x, y, 0x7aff8d, 74);
    visualEffects.floatingText(scene, x, y - 16, `+${reward.toLocaleString()}`, '#fff3a6');
    hapticsEngine.play('success');
  }

  win(
    scene: Scene,
    x: number,
    y: number,
    category: WinCategory,
    reward: number
  ): void {
    if (category === 'miss') {
      soundEngine.miss();
      hapticsEngine.play('light');
      return;
    }

    if (category === 'mega-win') {
      soundEngine.megaWin();
      visualEffects.confetti(scene, 96);
      visualEffects.flash(scene, 0xffd54a, 0.1, 190);
      visualEffects.shake(scene, 0.01, 260);
      hapticsEngine.play('success');
    } else if (category === 'big-win') {
      soundEngine.bigWin();
      visualEffects.confetti(scene, 62);
      visualEffects.flash(scene, 0xffd54a, 0.065, 150);
      visualEffects.shake(scene, 0.006, 190);
      hapticsEngine.play('medium');
    } else {
      soundEngine.win();
      visualEffects.burst(scene, x, y, 0x7aff8d, 16);
      hapticsEngine.play('light');
    }

    visualEffects.ring(
      scene,
      x,
      y,
      category === 'mega-win' ? 0xffd54a : 0x7aff8d,
      category === 'mega-win' ? 92 : 60
    );
    visualEffects.floatingText(
      scene,
      x,
      y - 20,
      `+${reward.toLocaleString()}`,
      '#fff3a6'
    );
  }

  bonus(scene: Scene, x: number, y: number): void {
    soundEngine.bonus();
    visualEffects.flash(scene, 0xff5c93, 0.11, 180);
    visualEffects.ring(scene, x, y, 0xff5c93, 70);
    hapticsEngine.play('success');
  }
}

export const feedbackEngine = new FeedbackEngine();
