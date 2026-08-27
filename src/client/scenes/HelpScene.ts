import { GameObjects, Scene } from 'phaser';
import { appState } from '../state/appState';
import { createButton, drawCasinoBackdrop, safeScale } from '../ui/phaserUi';

export class HelpScene extends Scene {
  private root: GameObjects.Container | null = null;

  constructor() {
    super('HelpScene');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    this.root.add(
      this.add
        .text(0, -304, 'HOW TO PLAY', {
          fontFamily: 'Arial Black',
          fontSize: '50px',
          color: '#ffffff',
          stroke: '#7a1230',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );

    const lines = [
      'All tables use fixed virtual-credit bets.',
      'Urubuzinho and Oncinha 777 are 5x3 slots generated on the server.',
      'WILD substitutes normal symbols on slot paylines.',
      'SCATTER pays anywhere with 3 or more symbols.',
      'Jacare Crash debits the bet on start and cashes out only if the server round is still alive.',
      'Capivara Roulette resolves red, black, odd, even, low, high, zero and single-number picks on the server.',
      'Wins are visual score events only. Nothing can be bought, sold or withdrawn.',
      'Keyboard: Space plays, arrows change bet, Esc returns to lobby.',
    ];

    lines.forEach((line, index) => {
      this.root?.add(
        this.add.text(-360, -210 + index * 46, line, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: index === 6 ? '#ffd54a' : '#ffffff',
          wordWrap: { width: 720 },
        })
      );
    });

    this.root.add(
      this.add
        .text(0, 164, appState.disclaimer, {
          fontFamily: 'Arial Black',
          fontSize: '16px',
          color: '#7aff8d',
          align: 'center',
        })
        .setOrigin(0.5)
    );
    this.root.add(
      createButton(this, 0, 252, {
        width: 210,
        height: 56,
        label: 'BACK',
        fill: 0x17132d,
        stroke: 0xffd54a,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.layout, this)
    );
  }

  private layout(): void {
    if (!this.root) return;
    this.cameras.resize(this.scale.width, this.scale.height);
    const isPortrait = this.scale.height > this.scale.width * 1.2;
    this.root
      .setPosition(
        this.scale.width / 2,
        isPortrait ? this.scale.height * 0.43 : this.scale.height / 2
      )
      .setScale(safeScale(this, 900, 760));
  }
}
