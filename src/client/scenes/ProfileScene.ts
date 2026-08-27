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

    const marquee = createVegasMarquee(this, 0, -310, 'PLAYER CLUB', {
      width: 620,
      height: 100,
      titleSize: 48,
      subtitle: 'YOUR EXTREMELY UNREGULATED-LOOKING LOYALTY CARD',
      compact: true,
      accent: CASINO_COLORS.ruby,
    });
    this.root.add(marquee);

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
      const playerFrame = createCabinetFrame(
        this,
        -250,
        -66,
        400,
        352,
        CASINO_COLORS.gold
      );
      this.root.add(playerFrame);
      this.root.add(addMascot(this, -360, -102, 0.78, 'mascot-urubu'));

      this.root.add([
        this.add
          .text(-320, -218, 'MEMBER', {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#bfae91',
            letterSpacing: 2,
          }),
        this.add
          .text(-320, -192, `u/${player.username}`, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '30px',
            color: '#fff5d0',
            stroke: '#6e142c',
            strokeThickness: 3,
            fixedWidth: 280,
          }),
        this.add
          .text(-320, -154, `RANK #${appState.ranks.richest ?? '-'}`, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '15px',
            color: '#ffd45a',
          }),
      ]);

      const balancePlaque = createHudPlaque(
        this,
        -250,
        -48,
        'BANKROLL',
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
        const x = -338 + column * 174;
        const y = 26 + row * 80;
        const tile = this.add.container(x, y);
        tile.add([
          this.add
            .rectangle(0, 0, 158, 64, 0x09070d, 0.98)
            .setStrokeStyle(1, CASINO_COLORS.gold, 0.26),
          this.add
            .text(0, -13, label, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '9px',
              fontStyle: 'bold',
              color: '#b8a9b7',
              letterSpacing: 1,
            })
            .setOrigin(0.5),
          this.add
            .text(0, 10, value, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '20px',
              color: '#ffffff',
            })
            .setOrigin(0.5),
        ]);
        this.root?.add(tile);
      });

      const gamesFrame = createCabinetFrame(
        this,
        236,
        -66,
        432,
        352,
        CASINO_COLORS.pink
      );
      this.root.add(gamesFrame);
      this.root.add(
        this.add
          .text(236, -214, 'TABLE HISTORY', {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '24px',
            color: '#fff6ec',
            stroke: '#6e142c',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
      );

      Object.entries(GAME_LABELS).forEach(([gameId, definition], index) => {
        const stats = player.statsByGame[gameId as keyof typeof player.statsByGame];
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 132 + column * 210;
        const y = -126 + row * 142;
        const card = this.add.container(x, y);
        card.add([
          this.add.rectangle(0, 6, 190, 118, 0x000000, 0.38),
          this.add
            .rectangle(0, 0, 190, 112, 0x0c0810, 0.98)
            .setStrokeStyle(2, definition.accent, 0.55),
          this.add.rectangle(-91, 0, 4, 88, definition.accent, 0.9),
          this.add
            .text(-78, -42, definition.label, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '15px',
              color: '#fff8ef',
              fixedWidth: 156,
            }),
          this.add
            .text(-78, -12, `${stats.plays} PLAYS  •  ${stats.wins} WINS`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#d6c9d6',
              fixedWidth: 156,
            }),
          this.add
            .text(-78, 14, `BEST ${formatCredits(stats.biggestWin)}`, {
              fontFamily: VEGAS_FONT_DISPLAY,
              fontSize: '14px',
              color: '#ffd45a',
              fixedWidth: 156,
            }),
          this.add
            .text(-78, 36, `${stats.bestMultiplier.toFixed(2)}x MULTIPLIER`, {
              fontFamily: VEGAS_FONT_BODY,
              fontSize: '10px',
              color: '#a99fba',
              fixedWidth: 156,
            }),
        ]);
        this.root?.add(card);
      });
    }

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
      .setScale(safeScale(this, isPortrait ? 900 : 1024, isPortrait ? 720 : 760));
  }
}
