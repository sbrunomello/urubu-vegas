import { GameObjects, Scene } from 'phaser';
import { appState } from '../state/appState';
import {
  CASINO_COLORS,
  VEGAS_FONT_BODY,
  VEGAS_FONT_DISPLAY,
  addMascot,
  createButton,
  createCabinetFrame,
  createHudPlaque,
  createVegasMarquee,
  drawCasinoBackdrop,
  formatCredits,
  safeScale,
} from '../ui/phaserUi';
import { soundEngine } from '../audio/SoundEngine';

const GAME_LABELS = {
  urubuzinho: { label: 'URUBUZINHO', accent: CASINO_COLORS.violet },
  'oncinha-777': { label: 'ONCINHA 777', accent: 0xff9f36 },
  'jacare-crash': { label: 'JACARE CRASH', accent: CASINO_COLORS.green },
  'capivara-roulette': { label: 'CAPIVARA', accent: CASINO_COLORS.pink },
} as const;

export class ProfileScene extends Scene {
  private root: GameObjects.Container | null = null;

  constructor() {
    super('ProfileScene');
  }

  create(): void {
    soundEngine.profileOpen();
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    const player = appState.player;

    this.root.add(
      createVegasMarquee(this, 0, -302, 'PLAYER CLUB', {
        width: 660,
        height: 92,
        titleSize: 44,
        subtitle: 'THE HOUSE KNOWS YOUR NAME',
        compact: true,
        accent: CASINO_COLORS.ruby,
      })
    );

    const mainFrame = createCabinetFrame(
      this,
      0,
      -38,
      884,
      438,
      CASINO_COLORS.gold
    );
    this.root.add(mainFrame);
    this.root.add(
      this.add.rectangle(0, -38, 1, 390, CASINO_COLORS.gold, 0.18)
    );

    if (!player) {
      this.root.add(
        this.add
          .text(0, -30, appState.lastError ?? 'PLAYER NOT LOADED.', {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '24px',
            color: '#ffffff',
          })
          .setOrigin(0.5)
      );
    } else {
      const vipCard = this.add.container(-232, -48);
      const cardGlow = this.add.rectangle(0, 7, 370, 344, CASINO_COLORS.gold, 0.05);
      const card = this.add
        .rectangle(0, 0, 360, 334, 0x160a10, 0.98)
        .setStrokeStyle(2, CASINO_COLORS.gold, 0.62);
      const inner = this.add
        .rectangle(0, 0, 344, 318, 0x000000, 0)
        .setStrokeStyle(1, 0xffffff, 0.08);
      const foilA = this.add.rectangle(-84, -28, 280, 36, CASINO_COLORS.pink, 0.025).setRotation(-0.2);
      const foilB = this.add.rectangle(78, 44, 250, 28, CASINO_COLORS.cyan, 0.02).setRotation(-0.2);
      vipCard.add([cardGlow, card, inner, foilA, foilB]);
      this.root.add(vipCard);
      this.root.add(addMascot(this, -326, -112, 0.72, 'mascot-urubu'));

      this.root.add([
        this.add
          .text(-372, -196, 'HOUSE PLAYER CARD', {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#bfae91',
            letterSpacing: 2,
          }),
        this.add
          .text(-276, -174, `u/${player.username}`, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '28px',
            color: '#fff5d0',
            stroke: '#6e142c',
            strokeThickness: 3,
            fixedWidth: 250,
          }),
        this.add
          .text(-276, -140, `RANK #${appState.ranks.richest ?? '-'}  •  PLAYER CLUB`, {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#ffd45a',
            fixedWidth: 250,
          }),
      ]);

      const balancePlaque = createHudPlaque(
        this,
        -232,
        -72,
        'VIRTUAL BANKROLL',
        formatCredits(player.balance),
        CASINO_COLORS.gold,
        250
      );
      this.root.add(balancePlaque);

      const metrics = [
        ['PLAYS', player.totalRounds.toLocaleString()],
        ['BIGGEST HIT', formatCredits(player.biggestWin)],
        ['BEST MULTI', `${player.bestMultiplier.toFixed(2)}x`],
        ['BEST STREAK', String(player.bestStreak)],
      ] as const;
      metrics.forEach(([label, value], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = -318 + column * 172;
        const y = 22 + row * 66;
        this.root?.add([
          this.add.rectangle(x, y, 154, 54, 0x09070d, 0.88).setStrokeStyle(1, CASINO_COLORS.gold, 0.18),
          this.add
            .text(x, y - 11, label, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '8px',
              fontStyle: 'bold',
              color: '#a99cab',
              letterSpacing: 1,
            })
            .setOrigin(0.5),
          this.add
            .text(x, y + 9, value, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '18px',
              color: '#fff8ef',
            })
            .setOrigin(0.5),
        ]);
      });

      this.root.add(
        this.add
          .text(224, -194, 'TABLE HISTORY', {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '23px',
            color: '#fff6ec',
            stroke: '#6e142c',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
      );
      this.root.add(
        this.add
          .text(224, -166, 'YOUR RECENT BAD HABITS, ORGANIZED', {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#aa9fac',
            letterSpacing: 1,
          })
          .setOrigin(0.5)
      );

      Object.entries(GAME_LABELS).forEach(([gameId, definition], index) => {
        const stats = player.statsByGame[gameId as keyof typeof player.statsByGame];
        const y = -112 + index * 72;
        const row = this.add.container(224, y);
        row.add([
          this.add.rectangle(0, 2, 358, 58, 0x000000, 0.2),
          this.add
            .rectangle(0, 0, 358, 56, 0x0c0810, 0.88)
            .setStrokeStyle(1, definition.accent, 0.32),
          this.add.rectangle(-174, 0, 4, 38, definition.accent, 0.9),
          this.add
            .text(-156, -11, definition.label, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '14px',
              color: '#fff8ef',
              fixedWidth: 146,
            }),
          this.add
            .text(-156, 10, `${stats.plays} PLAYS • ${stats.wins} WINS`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '9px',
              fontStyle: 'bold',
              color: '#cfc4d0',
              fixedWidth: 150,
            }),
          this.add
            .text(156, -10, `BEST ${formatCredits(stats.biggestWin)}`, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '13px',
              color: '#ffd45a',
              fixedWidth: 150,
              align: 'right',
            })
            .setOrigin(1, 0),
          this.add
            .text(156, 10, `${stats.bestMultiplier.toFixed(2)}x MULTI`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '9px',
              color: '#9f94a5',
              fixedWidth: 150,
              align: 'right',
            })
            .setOrigin(1, 0),
        ]);
        this.root?.add(row);
      });
    }

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
      .setScale(safeScale(this, isPortrait ? 900 : 1024, isPortrait ? 700 : 760));
  }
}
