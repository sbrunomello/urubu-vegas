import { GameObjects, Scene } from 'phaser';
import { soundEngine } from '../audio/SoundEngine';
import { feedbackEngine } from '../feedback/FeedbackEngine';
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
  fitImage,
  formatCredits,
  makeKey,
  safeScale,
} from '../ui/phaserUi';

type GameDefinition = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  accent: number;
  mascot: string;
  scene: string;
};

const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: 'urubuzinho',
    title: 'URUBUZINHO',
    subtitle: 'Five reels. One very suspicious bird.',
    tag: 'HOUSE FAVORITE',
    accent: CASINO_COLORS.violet,
    mascot: 'mascot-urubu',
    scene: 'UrubuzinhoGame',
  },
  {
    id: 'oncinha-777',
    title: 'ONCINHA 777',
    subtitle: 'Velvet, diamonds and absolutely no restraint.',
    tag: 'GLAM FLOOR',
    accent: 0xff9f36,
    mascot: 'mascot-oncinha',
    scene: 'Oncinha777Game',
  },
  {
    id: 'jacare-crash',
    title: 'JACARE CRASH',
    subtitle: 'Ride the number. Leave before the teeth arrive.',
    tag: 'LIVE ACTION',
    accent: CASINO_COLORS.green,
    mascot: 'mascot-jacare',
    scene: 'JacareCrashGame',
  },
  {
    id: 'capivara-roulette',
    title: 'CAPIVARA ROULETTE',
    subtitle: 'A suspiciously calm wheel with zero sympathy.',
    tag: 'THE SALON',
    accent: CASINO_COLORS.pink,
    mascot: 'mascot-capivara',
    scene: 'CapivaraRouletteGame',
  },
];

export class CasinoLobby extends Scene {
  private root: GameObjects.Container | null = null;

  constructor() {
    super('CasinoLobby');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(CASINO_COLORS.ink);
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    feedbackEngine.sceneOpen('lobby');

    const marquee = createVegasMarquee(this, 0, -308, 'URUBU VEGAS', {
      width: 734,
      height: 112,
      titleSize: 60,
      subtitle: 'FOUR TABLES • ONE BANKROLL • TERRIBLE INSTINCTS',
      accent: CASINO_COLORS.ruby,
    });

    const player = appState.player;
    const bank = createHudPlaque(
      this,
      -265,
      -205,
      player ? `u/${player.username}` : 'YOUR TABLE',
      player
        ? `${formatCredits(player.balance)}  •  RANK #${appState.ranks.richest ?? '-'}`
        : 'LOADING',
      CASINO_COLORS.gold,
      286
    );
    const house = createHudPlaque(
      this,
      265,
      -205,
      'THE HOUSE',
      `${appState.globalStats.communityPlays.toLocaleString()} PLAYS  •  RECORD ${formatCredits(
        appState.globalStats.largestRecordedWin
      )}`,
      CASINO_COLORS.pink,
      286
    );
    const host = addMascot(this, 0, -196, 0.64, 'mascot-urubu');

    const floorFrame = createCabinetFrame(
      this,
      0,
      48,
      906,
      414,
      CASINO_COLORS.gold
    );
    const floorHeader = this.add.container(0, -142);
    floorHeader.add([
      this.add.rectangle(0, 0, 820, 26, 0x12070d, 0.98),
      this.add.rectangle(0, -12, 780, 1, CASINO_COLORS.gold, 0.22),
      this.add
        .text(0, 0, 'CASINO FLOOR  •  4 TABLES OPEN', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffe39a',
          letterSpacing: 2,
        })
        .setOrigin(0.5),
    ]);

    GAME_DEFINITIONS.forEach((definition, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = (column - 0.5) * 430;
      const y = -72 + row * 128;
      this.root?.add(this.createGameCard(x, y, definition));
    });

    const navRail = this.add.container(0, 184);
    navRail.add([
      this.add.rectangle(0, 0, 820, 62, 0x0a070d, 0.96),
      this.add.rectangle(0, -29, 790, 2, CASINO_COLORS.gold, 0.32),
      this.add.rectangle(0, 29, 790, 1, 0xffffff, 0.06),
    ]);

    const navY = 184;
    const leaderboards = createButton(this, -285, navY, {
      width: 174,
      height: 44,
      label: 'HIGH ROLLERS',
      fill: 0x11101a,
      stroke: CASINO_COLORS.cyan,
      fontSize: 13,
      onPress: () => this.scene.start('LeaderboardScene'),
    });
    const profile = createButton(this, -95, navY, {
      width: 174,
      height: 44,
      label: 'PLAYER CLUB',
      fill: 0x11101a,
      stroke: CASINO_COLORS.green,
      fontSize: 13,
      onPress: () => this.scene.start('ProfileScene'),
    });
    const help = createButton(this, 95, navY, {
      width: 174,
      height: 44,
      label: 'HOUSE RULES',
      fill: 0x11101a,
      stroke: CASINO_COLORS.gold,
      fontSize: 13,
      onPress: () => this.scene.start('HelpScene'),
    });
    const mute = createButton(this, 285, navY, {
      width: 174,
      height: 44,
      label: soundEngine.isMuted() ? 'SOUND OFF' : 'SOUND ON',
      fill: 0x11101a,
      stroke: CASINO_COLORS.violet,
      fontSize: 13,
      onPress: () => {
        soundEngine.toggleMuted();
        this.scene.restart();
      },
    });

    const footer = this.add.container(0, 294);
    footer.add([
      this.add.rectangle(0, -10, 760, 1, CASINO_COLORS.gold, 0.16),
      this.add
        .text(0, 10, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '11px',
          color: '#aa9daf',
        })
        .setOrigin(0.5),
    ]);

    this.root.add([
      marquee,
      bank,
      house,
      host,
      floorFrame,
      floorHeader,
      navRail,
      leaderboards,
      profile,
      help,
      mute,
      footer,
    ]);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.layout, this)
    );
    makeKey(this, 32, () => this.scene.start('UrubuzinhoGame'));
  }

  private createGameCard(
    x: number,
    y: number,
    definition: GameDefinition
  ): GameObjects.Container {
    const card = this.add.container(x, y);
    const hasActiveRound =
      definition.id === 'jacare-crash' && appState.activeJacareRound !== null;
    const tag = hasActiveRound ? 'ACTIVE ROUND' : definition.tag;

    const aura = this.add.rectangle(0, 4, 410, 112, definition.accent, 0.045);
    const shadow = this.add.rectangle(0, 6, 400, 104, 0x000000, 0.42);
    const panel = this.add
      .rectangle(0, 0, 396, 100, 0x0c0810, 0.98)
      .setStrokeStyle(2, definition.accent, 0.68)
      .setInteractive({ useHandCursor: true });
    const inner = this.add
      .rectangle(0, 0, 384, 88, 0x000000, 0)
      .setStrokeStyle(1, 0xffffff, 0.055);
    const accentBar = this.add.rectangle(-192, 0, 5, 76, definition.accent, 0.95);
    const imageGlow = this.add.circle(148, -2, 48, definition.accent, 0.1);
    const image = fitImage(this.add.image(148, -3, definition.mascot), 94, 96);

    const tagPlate = this.add
      .rectangle(-126, -31, 120, 20, 0x150a13, 0.98)
      .setStrokeStyle(1, definition.accent, 0.56);
    const tagText = this.add
      .text(-126, -31, tag, {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '8px',
        fontStyle: 'bold',
        color: hasActiveRound ? '#ffe47d' : '#f4ecf5',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const playPlate = this.add
      .rectangle(146, 34, 80, 22, definition.accent, 0.18)
      .setStrokeStyle(1, definition.accent, 0.6);
    const playText = this.add
      .text(146, 34, hasActiveRound ? 'RESUME  ›' : 'PLAY  ›', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '12px',
        color: '#ffe6a0',
      })
      .setOrigin(0.5);

    panel.on('pointerover', () => {
      aura.setAlpha(0.13);
      imageGlow.setAlpha(0.18);
      card.setScale(1.018);
      feedbackEngine.uiHover();
    });
    panel.on('pointerout', () => {
      aura.setAlpha(0.045);
      imageGlow.setAlpha(0.1);
      card.setScale(1);
    });
    panel.on('pointerdown', () => {
      void feedbackEngine.unlock().then(() => {
        feedbackEngine.uiClick();
        this.scene.start(definition.scene);
      });
    });

    card.add([
      aura,
      shadow,
      panel,
      inner,
      accentBar,
      tagPlate,
      tagText,
      imageGlow,
      image,
      this.add.text(-179, -10, definition.title, {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: definition.title.length > 16 ? '18px' : '23px',
        color: '#fff8ee',
        fixedWidth: 258,
        stroke: '#360811',
        strokeThickness: 2,
      }),
      this.add.text(-179, 18, definition.subtitle, {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '10px',
        color: '#cfc1d0',
        fixedWidth: 252,
      }),
      playPlate,
      playText,
    ]);

    this.tweens.add({
      targets: imageGlow,
      alpha: 0.05,
      scaleX: 1.12,
      scaleY: 1.12,
      yoyo: true,
      repeat: -1,
      duration: 1100 + Math.floor(Math.random() * 600),
      ease: 'Sine.InOut',
    });
    return card;
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
