import { GameObjects, Scene } from 'phaser';
import { soundEngine } from '../audio/SoundEngine';
import { feedbackEngine } from '../feedback/FeedbackEngine';
import { appState } from '../state/appState';
import {
  CASINO_COLORS,
  VEGAS_FONT_BODY,
  VEGAS_FONT_DISPLAY,
  addChasingBulbs,
  addMascot,
  createButton,
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
    subtitle: 'Classic reels. Questionable bird.',
    tag: 'HOUSE FAVORITE',
    accent: CASINO_COLORS.violet,
    mascot: 'mascot-urubu',
    scene: 'UrubuzinhoGame',
  },
  {
    id: 'oncinha-777',
    title: 'ONCINHA 777',
    subtitle: 'Velvet. Diamonds. Zero restraint.',
    tag: 'GLAM FLOOR',
    accent: 0xff9f36,
    mascot: 'mascot-oncinha',
    scene: 'Oncinha777Game',
  },
  {
    id: 'jacare-crash',
    title: 'JACARE CRASH',
    subtitle: 'Ride the number. Dodge the teeth.',
    tag: 'LIVE ACTION',
    accent: CASINO_COLORS.green,
    mascot: 'mascot-jacare',
    scene: 'JacareCrashGame',
  },
  {
    id: 'capivara-roulette',
    title: 'CAPIVARA ROULETTE',
    subtitle: 'A suspiciously calm roulette table.',
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

    const marquee = createVegasMarquee(this, 0, -318, 'URUBU VEGAS', {
      width: 720,
      height: 122,
      titleSize: 62,
      subtitle: 'WELCOME TO THE STRIP\'S WORST FINANCIAL DECISION',
      accent: CASINO_COLORS.ruby,
    });

    const player = appState.player;
    const bank = createHudPlaque(
      this,
      -255,
      -218,
      player ? `u/${player.username}` : 'YOUR TABLE',
      player ? `${formatCredits(player.balance)}  •  RANK #${appState.ranks.richest ?? '-'}` : 'LOADING',
      CASINO_COLORS.gold,
      286
    );
    const house = createHudPlaque(
      this,
      255,
      -218,
      'THE HOUSE',
      `${appState.globalStats.communityPlays.toLocaleString()} PLAYS  •  RECORD ${formatCredits(
        appState.globalStats.largestRecordedWin
      )}`,
      CASINO_COLORS.pink,
      286
    );

    const host = addMascot(this, 0, -210, 0.64, 'mascot-urubu');

    const floorLabel = this.add.container(0, -145);
    floorLabel.add([
      this.add.rectangle(0, 0, 350, 28, 0x07040a, 0.9).setStrokeStyle(1, CASINO_COLORS.gold, 0.28),
      this.add
        .text(0, 0, 'CHOOSE YOUR TABLE', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '11px',
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
      const y = -70 + row * 130;
      this.root?.add(this.createGameCard(x, y, definition));
    });

    const navY = 225;
    const leaderboards = createButton(this, -282, navY, {
      width: 178,
      height: 50,
      label: 'HIGH ROLLERS',
      fill: 0x11101a,
      stroke: CASINO_COLORS.cyan,
      fontSize: 14,
      onPress: () => this.scene.start('LeaderboardScene'),
    });
    const profile = createButton(this, -94, navY, {
      width: 178,
      height: 50,
      label: 'MY PLAYER CARD',
      fill: 0x11101a,
      stroke: CASINO_COLORS.green,
      fontSize: 13,
      onPress: () => this.scene.start('ProfileScene'),
    });
    const help = createButton(this, 94, navY, {
      width: 178,
      height: 50,
      label: 'HOUSE RULES',
      fill: 0x11101a,
      stroke: CASINO_COLORS.gold,
      fontSize: 14,
      onPress: () => this.scene.start('HelpScene'),
    });
    const mute = createButton(this, 282, navY, {
      width: 178,
      height: 50,
      label: soundEngine.isMuted() ? 'SOUND OFF' : 'SOUND ON',
      fill: 0x11101a,
      stroke: CASINO_COLORS.violet,
      fontSize: 14,
      onPress: () => {
        soundEngine.toggleMuted();
        this.scene.restart();
      },
    });

    const footer = this.add.container(0, 292);
    footer.add([
      this.add.rectangle(0, -8, 760, 1, CASINO_COLORS.gold, 0.18),
      this.add
        .text(0, 12, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '12px',
          color: '#aa9daf',
        })
        .setOrigin(0.5),
    ]);

    this.root.add([
      marquee,
      bank,
      house,
      host,
      floorLabel,
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

    const aura = this.add.rectangle(0, 5, 424, 120, definition.accent, 0.055);
    const shadow = this.add.rectangle(0, 9, 412, 112, 0x000000, 0.5);
    const outer = this.add
      .rectangle(0, 0, 408, 108, CASINO_COLORS.goldSoft, 0.94)
      .setStrokeStyle(1, CASINO_COLORS.champagne, 0.46);
    const panel = this.add
      .rectangle(0, 0, 400, 100, 0x0b0810, 0.99)
      .setStrokeStyle(2, definition.accent, 0.76)
      .setInteractive({ useHandCursor: true });
    const inner = this.add
      .rectangle(0, 0, 388, 88, 0x000000, 0)
      .setStrokeStyle(1, 0xffffff, 0.06);
    const accentBar = this.add.rectangle(-196, 0, 5, 78, definition.accent, 0.94);
    const imageGlow = this.add.circle(148, -3, 50, definition.accent, 0.11);
    const image = fitImage(this.add.image(148, -4, definition.mascot), 98, 100);

    const tagPlate = this.add
      .rectangle(-129, -31, 118, 20, 0x140a12, 0.98)
      .setStrokeStyle(1, definition.accent, 0.62);
    const tagText = this.add
      .text(-129, -31, tag, {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '8px',
        fontStyle: 'bold',
        color: hasActiveRound ? '#ffe47d' : '#f4ecf5',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const playPlate = this.add
      .rectangle(146, 34, 78, 22, definition.accent, 0.14)
      .setStrokeStyle(1, definition.accent, 0.44);
    const playText = this.add
      .text(146, 34, hasActiveRound ? 'RESUME  ›' : 'PLAY  ›', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '12px',
        color: '#ffe6a0',
      })
      .setOrigin(0.5);

    addChasingBulbs(this, card, 396, 96, definition.accent, 74);

    panel.on('pointerover', () => {
      aura.setAlpha(0.14);
      card.setScale(1.018);
      feedbackEngine.uiHover();
    });
    panel.on('pointerout', () => {
      aura.setAlpha(0.055);
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
      outer,
      panel,
      inner,
      accentBar,
      tagPlate,
      tagText,
      imageGlow,
      image,
      this.add.text(-181, -11, definition.title, {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: definition.title.length > 16 ? '18px' : '24px',
        color: '#fff8ee',
        fixedWidth: 258,
        stroke: '#360811',
        strokeThickness: 2,
      }),
      this.add.text(-181, 18, definition.subtitle, {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '11px',
        color: '#cfc1d0',
        fixedWidth: 248,
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
        isPortrait ? this.scale.height * 0.44 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 930 : 1024, isPortrait ? 720 : 760));
  }
}
