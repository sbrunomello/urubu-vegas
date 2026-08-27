import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import type {
  UrubuzinhoRoundResult,
  UrubuzinhoSymbolId,
} from '../../shared/api';
import {
  getSymbolDefinition,
  URUBUZINHO_ROWS,
  URUBUZINHO_REELS,
} from '../../shared/api';
import { createActionId, playUrubuzinho } from '../api/urubuVegasApi';
import { feedbackEngine } from '../feedback/FeedbackEngine';
import { applyServerState, appState } from '../state/appState';
import {
  createButton,
  drawCasinoBackdrop,
  formatCredits,
  makeKey,
  safeScale,
  setButtonEnabled,
} from '../ui/phaserUi';

type SymbolCell = {
  container: GameObjects.Container;
  panel: GameObjects.Rectangle;
  image: GameObjects.Image;
  row: number;
  reel: number;
};

const RANDOM_SYMBOLS: readonly UrubuzinhoSymbolId[] = [
  'vulture',
  'banana',
  'coconut',
  'crown',
  'diamond',
  'seven',
  'wild',
  'scatter',
];

export class UrubuzinhoGame extends Scene {
  private root: GameObjects.Container | null = null;
  private cells: SymbolCell[] = [];
  private balanceText: GameObjects.Text | null = null;
  private betText: GameObjects.Text | null = null;
  private statusText: GameObjects.Text | null = null;
  private betDownButton: GameObjects.Container | null = null;
  private betUpButton: GameObjects.Container | null = null;
  private playButton: GameObjects.Container | null = null;
  private spinTimer: Phaser.Time.TimerEvent | null = null;
  private playing = false;
  private pendingActionId: string | null = null;

  constructor() {
    super('UrubuzinhoGame');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);

    this.root.add(
      this.add
        .text(0, -334, 'URUBUZINHO', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ffffff',
          stroke: '#7a1230',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );

    this.balanceText = this.add.text(-430, -284, '', {
      fontFamily: 'Arial Black',
      fontSize: '19px',
      color: '#ffd54a',
    });
    this.statusText = this.add
      .text(0, -284, 'Ready to tempt imaginary fate.', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#d9cfff',
        fixedWidth: 480,
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.root.add([this.balanceText, this.statusText]);

    this.createReels();
    this.createControls();

    this.root.add(
      this.add
        .text(0, 344, appState.disclaimer, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#b9aecf',
        })
        .setOrigin(0.5)
    );

    this.refreshHud();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.spinTimer?.destroy();
      this.spinTimer = null;
    });

    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () =>
      this.startRound()
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.LEFT, () =>
      this.changeBet(-1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.RIGHT, () =>
      this.changeBet(1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.ESC, () =>
      this.scene.start('CasinoLobby')
    );
  }

  private createReels(): void {
    const startX = -328;
    const startY = -180;
    const cellW = 132;
    const cellH = 112;
    this.root?.add([
      this.add.rectangle(-44, -58, 734, 390, 0x070913, 0.58),
      this.add
        .rectangle(-44, -58, 734, 390, 0x10121f, 0.38)
        .setStrokeStyle(2, 0x8d7bff, 0.24),
    ]);
    for (let row = 0; row < URUBUZINHO_ROWS; row += 1) {
      for (let reel = 0; reel < URUBUZINHO_REELS; reel += 1) {
        const x = startX + reel * (cellW + 10);
        const y = startY + row * (cellH + 10);
        const cell = this.createSymbolCell(
          x,
          y,
          row,
          reel,
          RANDOM_SYMBOLS[(row + reel) % RANDOM_SYMBOLS.length] ?? 'banana'
        );
        this.cells.push(cell);
        this.root?.add(cell.container);
      }
    }
  }

  private createSymbolCell(
    x: number,
    y: number,
    row: number,
    reel: number,
    symbol: UrubuzinhoSymbolId
  ): SymbolCell {
    const definition = getSymbolDefinition(symbol);
    const container = this.add.container(x, y);
    const panel = this.add
      .rectangle(0, 0, 132, 112, 0x130d1e, 0.98)
      .setStrokeStyle(2, definition.color, 0.62);
    const glow = this.add.circle(0, 0, 38, definition.color, 0.12);
    const image = this.add
      .image(0, -7, definition.assetKey)
      .setDisplaySize(76, 76);
    const name = this.add
      .text(0, 35, definition.label.toUpperCase(), {
        fontFamily: 'Arial Black',
        fontSize: '10px',
        color: '#f5efff',
        align: 'center',
        fixedWidth: 112,
      })
      .setOrigin(0.5);
    container.add([panel, glow, image, name]);
    return { container, panel, image, row, reel };
  }

  private createControls(): void {
    this.betDownButton = createButton(this, -334, 246, {
      width: 82,
      height: 54,
      label: '-',
      fill: 0x17132d,
      stroke: 0xffd54a,
      fontSize: 24,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);
    this.betText = this.add
      .text(-210, 246, '', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#ffffff',
        fixedWidth: 170,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root?.add(this.betText);
    this.betUpButton = createButton(this, -86, 246, {
      width: 82,
      height: 54,
      label: '+',
      fill: 0x17132d,
      stroke: 0xffd54a,
      fontSize: 24,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);
    this.playButton = createButton(this, 170, 246, {
      width: 250,
      height: 72,
      label: 'PLAY',
      fill: 0x8f1834,
      stroke: 0xffd54a,
      fontSize: 28,
      onPress: () => this.startRound(),
    });
    this.root?.add(this.playButton);
    this.root?.add(
      createButton(this, 386, 246, {
        width: 138,
        height: 54,
        label: 'LOBBY',
        fill: 0x17132d,
        stroke: 0x69f7ff,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
  }

  private changeBet(direction: -1 | 1): void {
    if (this.playing) return;
    const index = appState.betValues.indexOf(appState.selectedBet);
    const next = Phaser.Math.Clamp(
      index + direction,
      0,
      appState.betValues.length - 1
    );
    appState.selectedBet = appState.betValues[next] ?? appState.selectedBet;
    this.refreshHud();
  }

  private startRound(): void {
    if (this.playing) return;
    const player = appState.player;
    if (!player) {
      this.setStatus(appState.lastError ?? 'Player not loaded.');
      return;
    }
    if (player.balance < appState.selectedBet) {
      this.setStatus('Not enough virtual credits.');
      return;
    }

    this.playing = true;
    this.pendingActionId = createActionId();
    this.setStatus('Server is deciding your fictional fate...');
    this.setInputsEnabled(false);
    feedbackEngine.reelStart(this);
    this.startAnticipation();

    const actionId = this.pendingActionId;
    void playUrubuzinho(actionId, appState.selectedBet)
      .then((payload) => {
        applyServerState(payload);
        this.stopAtResult(payload.result);
      })
      .catch((error) => {
        this.spinTimer?.destroy();
        this.spinTimer = null;
        this.playing = false;
        this.pendingActionId = null;
        this.setInputsEnabled(true);
        this.setStatus(
          error instanceof Error
            ? error.message
            : 'Connection hiccup. Try again.'
        );
      });
  }

  private startAnticipation(): void {
    this.spinTimer?.destroy();
    this.spinTimer = this.time.addEvent({
      delay: 62,
      loop: true,
      callback: () => {
        this.cells.forEach((cell) => {
          const next =
            RANDOM_SYMBOLS[Phaser.Math.Between(0, RANDOM_SYMBOLS.length - 1)] ??
            'banana';
          this.paintCell(cell, next, false);
        });
      },
    });
  }

  private stopAtResult(result: UrubuzinhoRoundResult): void {
    const minimumDelay = 550;
    this.time.delayedCall(minimumDelay, () => {
      this.spinTimer?.destroy();
      this.spinTimer = null;
      for (let reel = 0; reel < URUBUZINHO_REELS; reel += 1) {
        this.time.delayedCall(reel * 190, () => {
          this.cells
            .filter((cell) => cell.reel === reel)
            .forEach((cell) => {
              this.paintCell(
                cell,
                result.grid[cell.row]?.[cell.reel] ?? 'banana',
                false
              );
              this.tweens.add({
                targets: cell.container,
                y: cell.container.y - 10,
                yoyo: true,
                duration: 130,
                ease: 'Back.Out',
              });
            });
          feedbackEngine.reelStop(reel);
          if (reel === URUBUZINHO_REELS - 1) {
            this.time.delayedCall(230, () => this.finishRound(result));
          }
        });
      }
    });
  }

  private finishRound(result: UrubuzinhoRoundResult): void {
    const winningCells = new Set<string>();
    result.lineWins.forEach((line) =>
      line.cells.forEach((cell) => winningCells.add(`${cell.row}:${cell.reel}`))
    );
    result.scatterWin?.cells.forEach((cell) =>
      winningCells.add(`${cell.row}:${cell.reel}`)
    );

    this.cells.forEach((cell) => {
      const key = `${cell.row}:${cell.reel}`;
      this.paintCell(
        cell,
        result.grid[cell.row]?.[cell.reel] ?? 'banana',
        winningCells.has(key)
      );
    });

    if (result.scatterWin) {
      feedbackEngine.bonus(this, this.scale.width / 2, this.scale.height / 2);
    }
    feedbackEngine.win(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      result.category,
      result.reward
    );

    const winDetail =
      result.lineWins.length > 0
        ? `${result.lineWins.length} line${result.lineWins.length === 1 ? '' : 's'}`
        : '';
    const scatterDetail = result.scatterWin
      ? `${result.scatterWin.count} scatter bonus`
      : '';
    const detail = [winDetail, scatterDetail].filter(Boolean).join(' + ');
    const label =
      result.category === 'miss'
        ? `Miss. -${formatCredits(result.bet)}`
        : `${result.category.toUpperCase()} ${result.multiplier.toFixed(2)}x paid ${formatCredits(
            result.reward
          )}${detail ? ` (${detail})` : ''}`;
    this.setStatus(label);
    this.refreshHud();
    this.playing = false;
    this.pendingActionId = null;
    this.setInputsEnabled(true);
  }

  private paintCell(
    cell: SymbolCell,
    symbol: UrubuzinhoSymbolId,
    winning: boolean
  ): void {
    const definition = getSymbolDefinition(symbol);
    cell.panel.setStrokeStyle(
      winning ? 5 : 2,
      definition.color,
      winning ? 1 : 0.62
    );
    cell.panel.setFillStyle(winning ? 0x261b12 : 0x130d1e, 0.98);
    cell.image.setTexture(definition.assetKey);
    cell.container.setScale(winning ? 1.07 : 1);
  }

  private refreshHud(): void {
    this.balanceText?.setText(
      `Balance ${formatCredits(appState.player?.balance ?? 0)}`
    );
    this.betText?.setText(`BET\n${formatCredits(appState.selectedBet)}`);
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }

  private setInputsEnabled(enabled: boolean): void {
    setButtonEnabled(this.betDownButton, enabled);
    setButtonEnabled(this.betUpButton, enabled);
    setButtonEnabled(this.playButton, enabled);
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
      .setScale(safeScale(this, isPortrait ? 960 : 1024, 780));
  }
}
