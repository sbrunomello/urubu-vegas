import { Scene } from 'phaser';
import { loadUrubuVegas } from '../api/urubuVegasApi';
import { applyServerState, appState } from '../state/appState';
import { drawCasinoBackdrop } from '../ui/phaserUi';
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
    const title = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 38, 'URUBU VEGAS', {
        fontFamily: 'Arial Black',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#7a1230',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    const status = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 24, 'Loading the fake casino...', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffd54a',
      })
      .setOrigin(0.5);

    void loadUrubuVegas()
      .then((payload) => {
        applyServerState(payload);
        this.scene.start('CasinoLobby');
      })
      .catch((error) => {
        appState.lastError = error instanceof Error ? error.message : 'Connection hiccup. Try again.';
        title.setText('URUBU VEGAS');
        status.setText(appState.lastError);
        this.time.delayedCall(900, () => this.scene.start('CasinoLobby'));
      });
  }
}
