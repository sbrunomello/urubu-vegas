import { Scene } from 'phaser';
import { loadUrubuVegas } from '../api/urubuVegasApi';
import { applyServerState, appState } from '../state/appState';
import {
  CASINO_COLORS,
  VEGAS_FONT_BODY,
  createVegasMarquee,
  drawCasinoBackdrop,
} from '../ui/phaserUi';
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

    const marquee = createVegasMarquee(this, centerX, centerY - 72, 'URUBU VEGAS', {
      width: 560,
      height: 110,
      titleSize: 48,
      subtitle: 'OPENING THE CASINO FLOOR',
      accent: CASINO_COLORS.ruby,
    });
    const status = this.add
      .text(centerX, centerY + 44, 'LIGHTING THE NEON...', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd45a',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const barBack = this.add
      .rectangle(centerX, centerY + 80, 320, 8, 0x09060c, 0.95)
      .setStrokeStyle(1, CASINO_COLORS.gold, 0.24);
    const bar = this.add.rectangle(
      centerX - 155,
      centerY + 80,
      8,
      4,
      CASINO_COLORS.gold,
      0.9
    );
    bar.setOrigin(0, 0.5);
    this.tweens.add({
      targets: bar,
      displayWidth: 310,
      duration: 920,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.InOut',
    });

    void loadUrubuVegas()
      .then((payload) => {
        applyServerState(payload);
        status.setText('DOORS OPEN.');
        bar.setFillStyle(CASINO_COLORS.green, 0.95);
        this.time.delayedCall(140, () => this.scene.start('CasinoLobby'));
      })
      .catch((error) => {
        appState.lastError =
          error instanceof Error ? error.message : 'Connection hiccup. Try again.';
        status.setText(appState.lastError);
        bar.setFillStyle(CASINO_COLORS.danger, 0.95);
        marquee.setAlpha(0.78);
        barBack.setStrokeStyle(1, CASINO_COLORS.danger, 0.4);
        this.time.delayedCall(900, () => this.scene.start('CasinoLobby'));
      });
  }
}
