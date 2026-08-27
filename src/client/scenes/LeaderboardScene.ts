import { GameObjects, Scene } from 'phaser';
import type { LeaderboardKind } from '../../shared/api';
import { appState } from '../state/appState';
import {
  CASINO_COLORS,
  VEGAS_FONT_BODY,
  VEGAS_FONT_DISPLAY,
  createButton,
  createCabinetFrame,
  createVegasMarquee,
  drawCasinoBackdrop,
  formatCredits,
  safeScale,
} from '../ui/phaserUi';

const BOARDS: readonly {
  kind: LeaderboardKind;
  title: string;
  kicker: string;
  accent: number;
}[] = [
  {
    kind: 'richest',
    title: 'BIG BANK',
    kicker: 'DEEPEST POCKETS',
    accent: CASINO_COLORS.gold,
  },
  {
    kind: 'biggestWin',
    title: 'BIGGEST HIT',
    kicker: 'LUCKIEST DISASTER',
    accent: CASINO_COLORS.pink,
  },
  {
    kind: 'mostPlays',
    title: 'HOUSE REGULARS',
    kicker: 'MOST ROUNDS',
    accent: CASINO_COLORS.cyan,
  },
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
      createVegasMarquee(this, 0, -310, 'HIGH ROLLERS', {
        width: 650,
        height: 102,
        titleSize: 48,
        subtitle: 'THE PEOPLE MOST COMMITTED TO FAKE FINANCIAL CHAOS',
        compact: true,
        accent: CASINO_COLORS.ruby,
      })
    );

    BOARDS.forEach((board, boardIndex) => {
      const x = (boardIndex - 1) * 314;
      const frame = createCabinetFrame(this, x, -48, 292, 410, board.accent);
      this.root?.add(frame);

      const header = this.add.container(x, -210);
      header.add([
        this.add
          .rectangle(0, 0, 252, 58, 0x0a060d, 0.98)
          .setStrokeStyle(1, board.accent, 0.45),
        this.add
          .text(0, -10, board.kicker, {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#b8a8b8',
            letterSpacing: 1,
          })
          .setOrigin(0.5),
        this.add
          .text(0, 11, board.title, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '20px',
            color: '#fff7e8',
            stroke: '#4d0d1d',
            strokeThickness: 2,
          })
          .setOrigin(0.5),
      ]);
      this.root?.add(header);

      const rows = appState.leaderboards[board.kind];
      if (rows.length === 0) {
        this.root?.add(
          this.add
            .text(x, -38, 'NO WINNERS YET', {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '17px',
              color: '#9f94a5',
            })
            .setOrigin(0.5)
        );
        return;
      }

      rows.slice(0, 8).forEach((entry, index) => {
        const value =
          board.kind === 'mostPlays'
            ? entry.score.toLocaleString()
            : formatCredits(entry.score);
        const y = -154 + index * 42;
        const row = this.add.container(x, y);
        const isTop = index === 0;
        row.add([
          this.add
            .rectangle(0, 0, 250, 34, isTop ? board.accent : 0x09070d, isTop ? 0.12 : 0.9)
            .setStrokeStyle(1, board.accent, isTop ? 0.5 : 0.18),
          this.add
            .circle(-105, 0, 12, isTop ? board.accent : 0x17101c, isTop ? 0.22 : 1)
            .setStrokeStyle(1, board.accent, 0.38),
          this.add
            .text(-105, 0, String(entry.rank), {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '12px',
              color: isTop ? '#fff0a7' : '#d9cad7',
            })
            .setOrigin(0.5),
          this.add
            .text(-84, 0, `u/${entry.username}`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '11px',
              fontStyle: 'bold',
              color: '#fff8f0',
              fixedWidth: 126,
            })
            .setOrigin(0, 0.5),
          this.add
            .text(112, 0, value, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '12px',
              color: isTop ? '#ffd45a' : '#d9cfe0',
              fixedWidth: 78,
              align: 'right',
            })
            .setOrigin(1, 0.5),
        ]);
        this.root?.add(row);
      });
    });

    this.root.add(
      createButton(this, 0, 248, {
        width: 220,
        height: 58,
        label: 'BACK TO CASINO',
        fill: CASINO_COLORS.wine,
        stroke: CASINO_COLORS.gold,
        fontSize: 16,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
    this.root.add(
      this.add
        .text(0, 318, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '12px',
          color: '#a99fba',
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
        isPortrait ? this.scale.height * 0.44 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 950 : 1024, isPortrait ? 720 : 760));
  }
}
