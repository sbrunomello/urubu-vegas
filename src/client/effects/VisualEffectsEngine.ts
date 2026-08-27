import * as Phaser from 'phaser';
import type { Scene } from 'phaser';

export class VisualEffectsEngine {
  burst(scene: Scene, x: number, y: number, color: number, count = 16): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(35, 120);
      const dot = scene.add
        .circle(x, y, Phaser.Math.Between(3, 8), color, 0.95)
        .setDepth(8_000);
      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.15,
        scaleY: 0.15,
        duration: Phaser.Math.Between(260, 560),
        ease: 'Quad.Out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  ring(scene: Scene, x: number, y: number, color: number, radius = 48): void {
    const ring = scene.add
      .circle(x, y, radius, 0x000000, 0)
      .setStrokeStyle(4, color, 0.85)
      .setDepth(7_900)
      .setScale(0.25);
    scene.tweens.add({
      targets: ring,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0,
      duration: 440,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
  }

  floatingText(scene: Scene, x: number, y: number, label: string, color = '#ffffff'): void {
    const text = scene.add
      .text(x, y, label, {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color,
        stroke: '#05020d',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(8_200);
    scene.tweens.add({
      targets: text,
      y: y - 78,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 760,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    });
  }

  flash(scene: Scene, color = 0xffffff, alpha = 0.14, duration = 180): void {
    const overlay = scene.add
      .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, color, alpha)
      .setScrollFactor(0)
      .setDepth(9_500);
    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => overlay.destroy(),
    });
  }

  confetti(scene: Scene, count = 48): void {
    const colors = [0xffd54a, 0xff425d, 0x69f7ff, 0x8d7bff, 0x7aff8d];
    for (let index = 0; index < count; index += 1) {
      const x = Phaser.Math.Between(12, Math.max(12, Math.floor(scene.scale.width - 12)));
      const y = Phaser.Math.Between(-90, Math.max(-89, Math.floor(scene.scale.height * 0.22)));
      const color = colors[index % colors.length] ?? 0xffffff;
      const piece = scene.add
        .rectangle(x, y, Phaser.Math.Between(5, 11), Phaser.Math.Between(10, 24), color, 0.95)
        .setDepth(9_000)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI));
      scene.tweens.add({
        targets: piece,
        y: scene.scale.height + Phaser.Math.Between(40, 140),
        x: x + Phaser.Math.Between(-90, 90),
        rotation: piece.rotation + Phaser.Math.FloatBetween(3, 9),
        alpha: 0.08,
        delay: Phaser.Math.Between(0, 300),
        duration: Phaser.Math.Between(900, 1500),
        ease: 'Sine.In',
        onComplete: () => piece.destroy(),
      });
    }
  }

  shake(scene: Scene, intensity = 0.005, duration = 140): void {
    scene.cameras.main.shake(duration, intensity);
  }
}

export const visualEffects = new VisualEffectsEngine();
