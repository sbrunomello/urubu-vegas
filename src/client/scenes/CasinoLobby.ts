import { GameObjects, Scene } from 'phaser';
import { soundEngine } from '../audio/SoundEngine';
import { appState } from '../state/appState';
import {
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
  accent: number;
  mascot: string;
  scene: string;
};

const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: 'urubuzinho',
    title: 'URUBUZINHO',
    subtitle: '5x3 arcade slot with server-side fate',
    accent: 0x8d7bff,
    mascot: 'mascot-urubu',
    scene: 'UrubuzinhoGame',
  },
  {
    id: 'oncinha-777',
    title: 'ONCINHA 777',
    subtitle: 'Glam slot with different lines and odds',
    accent: 0xffa33f,
    mascot: 'mascot-oncinha',
    scene: 'Oncinha777Game',
  },
  {
    id: 'jacare-crash',
    title: 'JACARE CRASH',
    subtitle: 'Cash out before the server snap',
    accent: 0x7aff8d,
    mascot: 'mascot-jacare',
    scene: 'JacareCrashGame',
  },
  {
    id: 'capivara-roulette',
    title: 'CAPIVARA ROULETTE',
    subtitle: 'Server-side wheel with calm chaos',
    accent: 0xd05a67,
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
    this.cameras.main.setBackgroundColor(0x07030d);
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);

    const marquee = this.add
      .rectangle(0, -320, 620, 118, 0x0b0712, 0.58)
      .setStrokeStyle(1, 0xf4c95d, 0.18);
    const eyebrow = this.add
      .text(0, -354, 'ARCADE CASINO FICTION', {
        fontFamily: 'Arial Black',
        fontSize: '12px',
        color: '#72ff9a',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(0, -316, 'URUBU VEGAS', {
        fontFamily: 'Arial Black',
        fontSize: '62px',
        color: '#ffffff',
        stroke: '#6b1435',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const tagline = this.add
      .text(0, -270, 'Fast tables. Fictional stakes. Server-side results.', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#d9cfff',
      })
      .setOrigin(0.5);

    const player = appState.player;
    const playerLabel = player
      ? `u/${player.username}  |  ${formatCredits(player.balance)}  |  Rank ${
          appState.ranks.richest ?? '-'
        }`
      : (appState.lastError ?? 'Loading player...');
    const playerCard = this.add.container(-276, -144);
    playerCard.add([
      this.add.rectangle(4, 6, 372, 100, 0x000000, 0.34),
      this.add
        .rectangle(0, 0, 372, 100, 0x111421, 0.94)
        .setStrokeStyle(2, 0xf4c95d, 0.48),
      this.add.rectangle(-178, 0, 5, 80, 0xf4c95d, 0.84),
      this.add.text(-158, -28, 'PLAYER', {
        fontFamily: 'Arial Black',
        fontSize: '12px',
        color: '#72ff9a',
      }),
      this.add.text(-160, 8, playerLabel, {
        fontFamily: 'Arial Black',
        fontSize: '17px',
        color: '#ffffff',
        wordWrap: { width: 320 },
      }),
    ]);

    const statsCard = this.add.container(276, -144);
    statsCard.add([
      this.add.rectangle(4, 6, 372, 100, 0x000000, 0.34),
      this.add
        .rectangle(0, 0, 372, 100, 0x1a0a16, 0.94)
        .setStrokeStyle(2, 0xff3d71, 0.5),
      this.add.rectangle(-178, 0, 5, 80, 0xff3d71, 0.84),
      this.add.text(-158, -28, 'COMMUNITY', {
        fontFamily: 'Arial Black',
        fontSize: '12px',
        color: '#f4c95d',
      }),
      this.add.text(
        -160,
        8,
        `${appState.globalStats.communityPlays.toLocaleString()} plays  |  record ${formatCredits(
          appState.globalStats.largestRecordedWin
        )}`,
        {
          fontFamily: 'Arial Black',
          fontSize: '17px',
          color: '#ffffff',
          wordWrap: { width: 320 },
        }
      ),
    ]);

    const mascot = addMascot(this, 0, -104, 0.76, 'mascot-urubu');
    this.root.add(mascot);

    GAME_DEFINITIONS.forEach((definition, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = (column - 0.5) * 420;
      const y = 4 + row * 118;
      this.root?.add(this.createGameCard(x, y, definition));
    });

    const navY = 278;
    const play = createButton(this, -270, navY, {
      width: 172,
      height: 54,
      label: 'PLAY',
      fill: 0x8f1834,
      onPress: () => this.scene.start('UrubuzinhoGame'),
    });
    const leaderboards = createButton(this, -90, navY, {
      width: 172,
      height: 54,
      label: 'LEADERS',
      fill: 0x17132d,
      stroke: 0x69f7ff,
      onPress: () => this.scene.start('LeaderboardScene'),
    });
    const profile = createButton(this, 90, navY, {
      width: 172,
      height: 54,
      label: 'PROFILE',
      fill: 0x17132d,
      stroke: 0x7aff8d,
      onPress: () => this.scene.start('ProfileScene'),
    });
    const help = createButton(this, 270, navY, {
      width: 172,
      height: 54,
      label: 'RULES',
      fill: 0x17132d,
      stroke: 0xffd54a,
      onPress: () => this.scene.start('HelpScene'),
    });

    const mute = createButton(this, 0, 342, {
      width: 190,
      height: 42,
      label: soundEngine.isMuted() ? 'SOUND: MUTED' : 'SOUND: ON',
      fill: 0x0f1220,
      stroke: 0x8d7bff,
      fontSize: 14,
      onPress: () => {
        soundEngine.toggleMuted();
        this.scene.restart();
      },
    });
    const disclaimer = this.add
      .text(0, 390, appState.disclaimer, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#b9aecf',
      })
      .setOrigin(0.5);

    this.root.add([
      marquee,
      eyebrow,
      title,
      tagline,
      playerCard,
      statsCard,
      play,
      leaderboards,
      profile,
      help,
      mute,
      disclaimer,
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
    const shadow = this.add.rectangle(5, 7, 388, 104, 0x000000, 0.36);
    const panel = this.add
      .rectangle(0, 0, 388, 104, 0x12131f, 0.96)
      .setStrokeStyle(2, definition.accent, 0.72)
      .setInteractive({ useHandCursor: true });
    panel.on('pointerdown', () => this.scene.start(definition.scene));
    const accentBar = this.add.rectangle(
      -190,
      0,
      6,
      78,
      definition.accent,
      0.92
    );
    const imageGlow = this.add.circle(142, 0, 46, definition.accent, 0.1);
    const image = fitImage(this.add.image(142, 0, definition.mascot), 86, 88);
    const statusChip = this.add
      .rectangle(-122, -30, 96, 20, 0x0a2415, 0.92)
      .setStrokeStyle(1, hasActiveRound ? 0xf4c95d : 0x72ff9a, 0.5);
    card.add([
      shadow,
      panel,
      accentBar,
      statusChip,
      imageGlow,
      image,
      this.add.text(-170, -24, hasActiveRound ? 'ACTIVE ROUND' : 'OPEN TABLE', {
        fontFamily: 'Arial Black',
        fontSize: '10px',
        color: hasActiveRound ? '#ffd54a' : '#7aff8d',
      }),
      this.add.text(-170, 1, definition.title, {
        fontFamily: 'Arial Black',
        fontSize: definition.title.length > 14 ? '20px' : '24px',
        color: '#ffffff',
        fixedWidth: 260,
      }),
      this.add.text(-170, 31, definition.subtitle, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#d9cfff',
        fixedWidth: 250,
      }),
      this.add
        .text(150, 34, hasActiveRound ? 'RESUME' : 'PLAY', {
          fontFamily: 'Arial Black',
          fontSize: '15px',
          color: '#ffd54a',
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
        isPortrait ? this.scale.height * 0.42 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 960 : 1024, 860));
  }
}
