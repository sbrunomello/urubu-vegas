import { GameObjects, Scene } from 'phaser';
import { appState } from '../state/appState';
import {
  createButton,
  drawCasinoBackdrop,
  formatCredits,
  safeScale,
} from '../ui/phaserUi';
import { soundEngine } from '../audio/SoundEngine';

const GAME_LABELS = {
  urubuzinho: 'Urubuzinho',
  'oncinha-777': 'Oncinha 777',
  'jacare-crash': 'Jacare Crash',
  'capivara-roulette': 'Capivara Roulette',
};

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
      this.add
        .text(0, -290, 'PROFILE', {
          fontFamily: 'Arial Black',
          fontSize: '54px',
          color: '#ffffff',
          stroke: '#7a1230',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );

    const lines = player
      ? [
          `u/${player.username}`,
          `Balance: ${formatCredits(player.balance)}`,
          `Total plays: ${player.totalRounds.toLocaleString()}`,
          `Total virtual rewards: ${formatCredits(player.totalRewarded)}`,
          `Biggest win: ${formatCredits(player.biggestWin)}`,
          `Best multiplier: ${player.bestMultiplier.toFixed(2)}x`,
          `Best streak: ${player.bestStreak}`,
          `Richest rank: ${appState.ranks.richest ?? '-'}`,
        ]
      : [appState.lastError ?? 'Player not loaded.'];

    lines.forEach((line, index) => {
      this.root?.add(
        this.add.text(-250, -190 + index * 48, line, {
          fontFamily: index === 0 ? 'Arial Black' : 'Arial',
          fontSize: index === 0 ? '25px' : '21px',
          color: index === 0 ? '#ffd54a' : '#ffffff',
        })
      );
    });

    if (player) {
      Object.entries(GAME_LABELS).forEach(([gameId, label], index) => {
        const stats =
          player.statsByGame[gameId as keyof typeof player.statsByGame];
        this.root?.add(
          this.add.text(210, -180 + index * 70, label.toUpperCase(), {
            fontFamily: 'Arial Black',
            fontSize: '13px',
            color: '#ffd54a',
          })
        );
        this.root?.add(
          this.add.text(
            210,
            -158 + index * 70,
            `${stats.plays} plays  |  ${stats.wins} wins`,
            {
              fontFamily: 'Arial',
              fontSize: '17px',
              color: '#ffffff',
            }
          )
        );
        this.root?.add(
          this.add.text(
            210,
            -136 + index * 70,
            `Best ${formatCredits(stats.biggestWin)}  |  ${stats.bestMultiplier.toFixed(2)}x`,
            {
              fontFamily: 'Arial',
              fontSize: '15px',
              color: '#d9cfff',
            }
          )
        );
      });
    }

    this.root.add(
      createButton(this, 0, 246, {
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
        .text(0, 326, appState.disclaimer, {
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
      .setScale(safeScale(this, 900, 760));
  }
}
