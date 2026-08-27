import type { Scene } from 'phaser';
import type { WinCategory } from '../../shared/games/urubuzinho/SlotEngine';
import { soundEngine } from '../audio/SoundEngine';
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

  reelStart(scene: Scene): void {
    soundEngine.reelStart();
    visualEffects.flash(scene, 0xffd54a, 0.035, 100);
    hapticsEngine.play('light');
  }

  reelStop(index: number): void {
    soundEngine.reelStop(index);
    hapticsEngine.play('light');
  }

  win(scene: Scene, x: number, y: number, category: WinCategory, reward: number): void {
    if (category === 'miss') {
      soundEngine.miss();
      hapticsEngine.play('light');
      return;
    }

    if (category === 'mega-win') {
      soundEngine.megaWin();
      visualEffects.confetti(scene, 84);
      visualEffects.shake(scene, 0.01, 260);
      hapticsEngine.play('success');
    } else if (category === 'big-win') {
      soundEngine.bigWin();
      visualEffects.confetti(scene, 54);
      visualEffects.shake(scene, 0.006, 190);
      hapticsEngine.play('medium');
    } else {
      soundEngine.win();
      hapticsEngine.play('light');
    }

    visualEffects.burst(scene, x, y, category === 'mega-win' ? 0xffd54a : 0x7aff8d, category === 'mega-win' ? 32 : 18);
    visualEffects.ring(scene, x, y, category === 'big-win' ? 0xffd54a : 0x7aff8d, category === 'mega-win' ? 86 : 56);
    visualEffects.floatingText(scene, x, y - 20, `+${reward.toLocaleString()} credits`, '#fff3a6');
  }

  bonus(scene: Scene, x: number, y: number): void {
    soundEngine.bonus();
    visualEffects.flash(scene, 0xff5c93, 0.11, 180);
    visualEffects.ring(scene, x, y, 0xff5c93, 70);
    hapticsEngine.play('success');
  }
}

export const feedbackEngine = new FeedbackEngine();
