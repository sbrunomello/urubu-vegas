import { Scene } from 'phaser';
import { loadUrubuVegas } from '../api/urubuVegasApi';
import { applyServerState, appState } from '../state/appState';
import { CASINO_COLORS, drawCasinoBackdrop } from '../ui/phaserUi';
import { URUBUZINHO_SYMBOLS } from '../../shared/games/urubuzinho/symbols';
import { ONCINHA_SYMBOLS } from '../../shared/games/oncinha777/symbols';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  preload(): void {
    this.load.image('mascot-urubu', '/assets/mascots/urubu/host.png');
    this.load.image('mascot-oncinha', '/assets/mascots/oncinha/host.png');
    this.load.image('mascot-jacare', '/assets/mascots/jacare/host.png');
    this.load.image('mascot-capivara', '/assets/mascots/capivara/host.png');
    URUBUZINHO_SYMBOLS.forEach((symbol) => {
      this.load.svg(symbol.assetKey, symbol.assetPath, { width: 96, height: 96 });
    });
    ONCINHA_SYMBOLS.forEach((symbol) => {
      this.load.svg(symbol.assetKey, symbol.assetPath, { width: 96, height: 96 });
    });
  }

  create(): void {
    drawCasinoBackdrop(this);
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const glow = this.add.rectangle(centerX, centerY - 18, 500, 190, 0x7a1230, 0.055);
    const title = this.add
      .text(centerX, centerY - 58, 'URUBU VEGAS', {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#7a1230',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    const status = this.add
      .text(centerX, centerY + 12, 'LIGHTING THE NEON...', {
        fontFamily: 'Arial Black',
        fontSize: '14px',
        color: '#ffd45a',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const dots = [-1, 0, 1].map((offset, index) => {
      const dot = this.add.circle(
        centerX + offset * 24,
        centerY + 58,
        4,
        index === 1 ? CASINO_COLORS.pink : CASINO_COLORS.cyan,
        0.36
      );
      this.tweens.add({
        targets: dot,
        alpha: 1,
        scaleX: 1.45,
        scaleY: 1.45,
        yoyo: true,
        repeat: -1,
        delay: index * 120,
        duration: 420,
        ease: 'Sine.InOut',
      });
      return dot;
    });

    void loadUrubuVegas()
      .then((payload) => {
        applyServerState(payload);
        status.setText('DOORS OPEN.');
        this.time.delayedCall(150, () => this.scene.start('CasinoLobby'));
      })
      .catch((error) => {
        appState.lastError =
          error instanceof Error ? error.message : 'Connection hiccup. Try again.';
        title.setText('URUBU VEGAS');
        status.setText(appState.lastError);
        glow.setFillStyle(CASINO_COLORS.danger, 0.06);
        dots.forEach((dot) => dot.setFillStyle(CASINO_COLORS.danger, 0.65));
        this.time.delayedCall(900, () => this.scene.start('CasinoLobby'));
      });
  }
}
