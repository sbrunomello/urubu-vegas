import { GameObjects, Scene } from 'phaser';
import type { LeaderboardKind } from '../../shared/api';
import { appState } from '../state/appState';
import {
  createButton,
  drawCasinoBackdrop,
  formatCredits,
  safeScale,
} from '../ui/phaserUi';

const BOARDS: readonly { kind: LeaderboardKind; title: string }[] = [
  { kind: 'richest', title: 'RICHEST' },
  { kind: 'biggestWin', title: 'BIGGEST WIN' },
  { kind: 'mostPlays', title: 'MOST PLAYS' },
];

export class LeaderboardScene extends Scene {
  private root: GameObjects.Container | null = null;

  constructor() {
    super('LeaderboardScene');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    this.root.add(
      this.add
        .text(0, -322, 'LEADERBOARDS', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ffffff',
          stroke: '#7a1230',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );

    BOARDS.forEach((board, boardIndex) => {
      const x = (boardIndex - 1) * 310;
      const panel = this.add.container(x, -72);
      panel.add([
        this.add
          .rectangle(0, 0, 286, 410, 0x15101f, 0.94)
          .setStrokeStyle(2, 0xffd54a, 0.42),
        this.add
          .text(0, -180, board.title, {
            fontFamily: 'Arial Black',
            fontSize: '19px',
            color: '#ffd54a',
          })
          .setOrigin(0.5),
      ]);

      const rows = appState.leaderboards[board.kind];
      if (rows.length === 0) {
        panel.add(
          this.add
            .text(0, -18, 'No scores yet', {
              fontFamily: 'Arial',
              fontSize: '17px',
              color: '#aeb4c8',
            })
            .setOrigin(0.5)
        );
      }

      rows.forEach((entry, index) => {
        const value =
          board.kind === 'mostPlays'
            ? entry.score.toLocaleString()
            : formatCredits(entry.score);
        panel.add(
          this.add.text(
            -124,
            -132 + index * 30,
            `${entry.rank}. u/${entry.username}`,
            {
              fontFamily: 'Arial Black',
              fontSize: '13px',
              color: '#ffffff',
              fixedWidth: 160,
            }
          )
        );
        panel.add(
          this.add.text(42, -132 + index * 30, value, {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#d9cfff',
            fixedWidth: 82,
            align: 'right',
          })
        );
      });

      this.root?.add(panel);
    });

    this.root.add(
      createButton(this, 0, 260, {
        width: 210,
        height: 56,
        label: 'BACK',
        fill: 0x17132d,
        stroke: 0xffd54a,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
    this.root.add(
      this.add
        .text(0, 328, appState.disclaimer, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#b9aecf',
        })
        .setOrigin(0.5)
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
      .setScale(safeScale(this, isPortrait ? 960 : 1024, 760));
  }
}
