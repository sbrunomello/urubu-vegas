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
      createVegasMarquee(this, 0, -302, 'HIGH ROLLERS', {
        width: 670,
        height: 92,
        titleSize: 44,
        subtitle: 'BIG BANKS • BIG HITS • BAD HABITS',
        compact: true,
        accent: CASINO_COLORS.ruby,
      })
    );

    this.root.add(
      createCabinetFrame(this, 0, -40, 930, 438, CASINO_COLORS.gold)
    );
    this.root.add([
      this.add.rectangle(-155, -40, 1, 390, CASINO_COLORS.gold, 0.12),
      this.add.rectangle(155, -40, 1, 390, CASINO_COLORS.gold, 0.12),
    ]);

    BOARDS.forEach((board, boardIndex) => {
      const x = (boardIndex - 1) * 310;
      const header = this.add.container(x, -194);
      header.add([
        this.add.rectangle(0, 0, 274, 62, 0x0a060d, 0.9),
        this.add.rectangle(0, 30, 250, 2, board.accent, 0.56),
        this.add
          .text(0, -11, board.kicker, {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '8px',
            fontStyle: 'bold',
            color: '#a99dab',
            letterSpacing: 1,
          })
          .setOrigin(0.5),
        this.add
          .text(0, 12, board.title, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '21px',
            color: '#fff7e8',
            stroke: '#4d0d1d',
            strokeThickness: 2,
          })
          .setOrigin(0.5),
      ]);
      this.root?.add(header);

      const rows = appState.leaderboards[board.kind].slice(0, 5);
      for (let index = 0; index < 5; index += 1) {
        const entry = rows[index];
        const y = -126 + index * 60;
        const isTop = index === 0 && Boolean(entry);
        const row = this.add.container(x, y);

        if (!entry) {
          row.add([
            this.add
              .rectangle(0, 0, 270, 46, 0x08060b, 0.46)
              .setStrokeStyle(1, board.accent, 0.1),
            this.add
              .text(0, 0, 'OPEN SEAT', {
                fontFamily: VEGAS_FONT_BODY,
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#5f5664',
                letterSpacing: 1,
              })
              .setOrigin(0.5),
          ]);
          this.root?.add(row);
          continue;
        }

        const value =
          board.kind === 'mostPlays'
            ? entry.score.toLocaleString()
            : formatCredits(entry.score);
        row.add([
          this.add
            .rectangle(0, 0, 270, 46, isTop ? board.accent : 0x0a070d, isTop ? 0.12 : 0.82)
            .setStrokeStyle(1, board.accent, isTop ? 0.52 : 0.16),
          this.add
            .circle(-112, 0, 13, isTop ? board.accent : 0x17101c, isTop ? 0.22 : 1)
            .setStrokeStyle(1, board.accent, 0.38),
          this.add
            .text(-112, 0, String(entry.rank), {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '12px',
              color: isTop ? '#fff0a7' : '#d9cad7',
            })
            .setOrigin(0.5),
          this.add
            .text(-90, 0, `u/${entry.username}`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#fff8f0',
              fixedWidth: 128,
            })
            .setOrigin(0, 0.5),
          this.add
            .text(120, 0, value, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '12px',
              color: isTop ? '#ffd45a' : '#d9cfe0',
              fixedWidth: 88,
              align: 'right',
            })
            .setOrigin(1, 0.5),
        ]);
        this.root?.add(row);
      }
    });

    this.root.add(
      createButton(this, 0, 230, {
        width: 220,
        height: 54,
        label: 'BACK TO CASINO',
        fill: CASINO_COLORS.wine,
        stroke: CASINO_COLORS.gold,
        fontSize: 15,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
    this.root.add(
      this.add
        .text(0, 304, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '11px',
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
        isPortrait ? this.scale.height * 0.45 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 920 : 1024, isPortrait ? 700 : 760));
  }
}
