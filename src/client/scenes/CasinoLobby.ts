import { GameObjects, Scene } from 'phaser';
import { soundEngine } from '../audio/SoundEngine';
import { feedbackEngine } from '../feedback/FeedbackEngine';
import { appState } from '../state/appState';
import {
  CASINO_COLORS,
  addMascot,
  createButton,
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
    subtitle: 'Classic chaos. Bad bird. Worse luck.',
    tag: 'ORIGINAL',
    accent: CASINO_COLORS.violet,
    mascot: 'mascot-urubu',
    scene: 'UrubuzinhoGame',
  },
  {
    id: 'oncinha-777',
    title: 'ONCINHA 777',
    subtitle: 'Velvet, diamonds and dangerous confidence.',
    tag: 'GLAM',
    accent: 0xffa33f,
    mascot: 'mascot-oncinha',
    scene: 'Oncinha777Game',
  },
  {
    id: 'jacare-crash',
    title: 'JACARE CRASH',
    subtitle: 'Ride the multiplier. Escape the chomp.',
    tag: 'HOT',
    accent: CASINO_COLORS.green,
    mascot: 'mascot-jacare',
    scene: 'JacareCrashGame',
  },
  {
    id: 'capivara-roulette',
    title: 'CAPIVARA ROULETTE',
    subtitle: 'Spin slowly. Regret instantly.',
    tag: 'ZEN',
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

    const headerGlow = this.add.rectangle(0, -321, 650, 104, 0x7a1230, 0.07);
    const title = this.add
      .text(0, -326, 'URUBU VEGAS', {
        fontFamily: 'Arial Black',
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#7a1230',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    const tagline = this.add
      .text(0, -276, 'FOUR GAMES. FAKE MONEY. TERRIBLE DECISIONS.', {
        fontFamily: 'Arial Black',
        fontSize: '13px',
        color: '#ffd45a',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const player = appState.player;
    const playerCard = this.createInfoCard(
      -270,
      -205,
      'YOUR TABLE',
      player ? `u/${player.username}` : 'GUEST',
      player
        ? `${formatCredits(player.balance)}   •   RANK #${appState.ranks.richest ?? '-'}`
        : (appState.lastError ?? 'Loading...'),
      CASINO_COLORS.gold
    );
    const statsCard = this.createInfoCard(
      270,
      -205,
      'THE HOUSE',
      `${appState.globalStats.communityPlays.toLocaleString()} PLAYS`,
      `BIGGEST HIT ${formatCredits(appState.globalStats.largestRecordedWin)}`,
      CASINO_COLORS.pink
    );

    const mascot = addMascot(this, 0, -196, 0.66, 'mascot-urubu');
    this.root.add(mascot);

    GAME_DEFINITIONS.forEach((definition, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = (column - 0.5) * 430;
      const y = -54 + row * 132;
      this.root?.add(this.createGameCard(x, y, definition));
    });

    const navY = 238;
    const leaderboards = createButton(this, -282, navY, {
      width: 178,
      height: 48,
      label: 'LEADERS',
      fill: 0x151126,
      stroke: CASINO_COLORS.cyan,
      onPress: () => this.scene.start('LeaderboardScene'),
    });
    const profile = createButton(this, -94, navY, {
      width: 178,
      height: 48,
      label: 'PROFILE',
      fill: 0x151126,
      stroke: CASINO_COLORS.green,
      onPress: () => this.scene.start('ProfileScene'),
    });
    const help = createButton(this, 94, navY, {
      width: 178,
      height: 48,
      label: 'HOW TO PLAY',
      fill: 0x151126,
      stroke: CASINO_COLORS.gold,
      fontSize: 14,
      onPress: () => this.scene.start('HelpScene'),
    });
    const mute = createButton(this, 282, navY, {
      width: 178,
      height: 48,
      label: soundEngine.isMuted() ? 'SOUND OFF' : 'SOUND ON',
      fill: 0x151126,
      stroke: CASINO_COLORS.violet,
      fontSize: 14,
      onPress: () => {
        soundEngine.toggleMuted();
        this.scene.restart();
      },
    });

    const footerLine = this.add.rectangle(0, 302, 760, 1, CASINO_COLORS.gold, 0.15);
    const disclaimer = this.add
      .text(0, 326, appState.disclaimer, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#a99fba',
      })
      .setOrigin(0.5);

    this.root.add([
      headerGlow,
      title,
      tagline,
      playerCard,
      statsCard,
      leaderboards,
      profile,
      help,
      mute,
      footerLine,
      disclaimer,
    ]);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.layout, this)
    );
    makeKey(this, 32, () => this.scene.start('UrubuzinhoGame'));
  }

  private createInfoCard(
    x: number,
    y: number,
    eyebrow: string,
    primary: string,
    secondary: string,
    accent: number
  ): GameObjects.Container {
    const card = this.add.container(x, y);
    const glow = this.add.rectangle(0, 3, 338, 82, accent, 0.055);
    const panel = this.add
      .rectangle(0, 0, 326, 74, 0x100b18, 0.96)
      .setStrokeStyle(1, accent, 0.48);
    const stripe = this.add.rectangle(-160, 0, 4, 54, accent, 0.92);
    card.add([
      glow,
      panel,
      stripe,
      this.add.text(-145, -25, eyebrow, {
        fontFamily: 'Arial Black',
        fontSize: '10px',
        color: '#bfb4d2',
      }),
      this.add.text(-145, -5, primary, {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffffff',
        fixedWidth: 280,
      }),
      this.add.text(-145, 18, secondary, {
        fontFamily: 'Arial Black',
        fontSize: '12px',
        color: accent === CASINO_COLORS.gold ? '#ffd45a' : '#f5c4d5',
        fixedWidth: 280,
      }),
    ]);
    return card;
  }

  private createGameCard(
    x: number,
    y: number,
    definition: GameDefinition
  ): GameObjects.Container {
    const card = this.add.container(x, y);
    const hasActiveRound =
      definition.id === 'jacare-crash' && appState.activeJacareRound !== null;
    const tag = hasActiveRound ? 'LIVE' : definition.tag;

    const shadow = this.add.rectangle(0, 7, 408, 114, 0x000000, 0.38);
    const glow = this.add.rectangle(0, 0, 418, 118, definition.accent, 0.045);
    const panel = this.add
      .rectangle(0, 0, 402, 108, 0x12101b, 0.98)
      .setStrokeStyle(2, definition.accent, 0.64)
      .setInteractive({ useHandCursor: true });
    const accentBar = this.add.rectangle(-197, 0, 6, 84, definition.accent, 0.94);
    const imageGlow = this.add.circle(151, 0, 48, definition.accent, 0.09);
    const image = fitImage(this.add.image(151, -2, definition.mascot), 94, 96);
    const tagPanel = this.add
      .rectangle(-145, -34, 82, 22, 0x09070f, 0.92)
      .setStrokeStyle(1, definition.accent, 0.58);
    const tagText = this.add
      .text(-145, -34, tag, {
        fontFamily: 'Arial Black',
        fontSize: '9px',
        color: hasActiveRound ? '#ffd45a' : '#ffffff',
      })
      .setOrigin(0.5);

    panel.on('pointerover', () => {
      glow.setAlpha(0.13);
      card.setScale(1.018);
      feedbackEngine.uiHover();
    });
    panel.on('pointerout', () => {
      glow.setAlpha(0.045);
      card.setScale(1);
    });
    panel.on('pointerdown', () => {
      void feedbackEngine.unlock().then(() => {
        feedbackEngine.uiClick();
        this.scene.start(definition.scene);
      });
    });

    card.add([
      shadow,
      glow,
      panel,
      accentBar,
      tagPanel,
      tagText,
      imageGlow,
      image,
      this.add.text(-180, -13, definition.title, {
        fontFamily: 'Arial Black',
        fontSize: definition.title.length > 14 ? '19px' : '23px',
        color: '#ffffff',
        fixedWidth: 260,
        stroke: '#050208',
        strokeThickness: 2,
      }),
      this.add.text(-180, 19, definition.subtitle, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#cfc5dd',
        fixedWidth: 250,
      }),
      this.add
        .text(154, 39, hasActiveRound ? 'RESUME  ›' : 'PLAY  ›', {
          fontFamily: 'Arial Black',
          fontSize: '12px',
          color: '#ffd45a',
        })
        .setOrigin(0.5),
    ]);
    return card;
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
      .setScale(safeScale(this, isPortrait ? 950 : 1024, 760));
  }
}
