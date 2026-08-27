import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import type { OncinhaRoundResult, OncinhaSymbolId } from '../../shared/api';
import {
  getOncinhaSymbolDefinition,
  ONCINHA_REELS,
  ONCINHA_ROWS,
} from '../../shared/api';
import { createActionId, playOncinha } from '../api/urubuVegasApi';
import { feedbackEngine } from '../feedback/FeedbackEngine';
import { applyServerState, appState } from '../state/appState';
import {
  CASINO_COLORS,
  addMascot,
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

const RANDOM_SYMBOLS: readonly OncinhaSymbolId[] = [
  'oncinha',
  'champagne',
  'star',
  'ruby',
  'pearl',
  'seven',
  'wild',
  'scatter',
];

export class Oncinha777Game extends Scene {
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

  constructor() {
    super('Oncinha777Game');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    feedbackEngine.sceneOpen('slots');

    this.root.add(
      this.add
        .text(48, -332, 'ONCINHA 777', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ffffff',
          stroke: '#9a1832',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );
    this.root.add(addMascot(this, -418, -62, 1.12, 'mascot-oncinha'));

    this.root.add([
      this.add.rectangle(-326, -282, 228, 46, 0x160d15, 0.95).setStrokeStyle(1, CASINO_COLORS.gold, 0.42),
      this.add.rectangle(106, -282, 500, 46, 0x160d15, 0.9).setStrokeStyle(1, 0xff6f91, 0.32),
    ]);
    this.balanceText = this.add
      .text(-326, -282, '', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffd45a',
        fixedWidth: 210,
        align: 'center',
      })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(106, -282, 'GLAMOUR. GLITTER. QUESTIONABLE LUCK.', {
        fontFamily: 'Arial Black',
        fontSize: '13px',
        color: '#f3d7ff',
        fixedWidth: 460,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root.add([this.balanceText, this.statusText]);

    this.createReels();
    this.createControls();
    this.root.add(
      this.add
        .text(0, 342, appState.disclaimer, {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#a99fba',
        })
        .setOrigin(0.5)
    );

    this.refreshHud();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.spinTimer?.destroy();
    });
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () => this.startRound());
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.LEFT, () => this.changeBet(-1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.RIGHT, () => this.changeBet(1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.ESC, () => this.scene.start('CasinoLobby'));
  }

  private createReels(): void {
    const startX = -220;
    const startY = -176;
    const cellW = 126;
    const cellH = 104;
    const frameX = 52;
    const frameY = -58;

    this.root?.add([
      this.add.rectangle(frameX, frameY + 8, 716, 376, 0x000000, 0.38),
      this.add.rectangle(frameX, frameY, 716, 376, 0x0b060d, 0.96).setStrokeStyle(3, CASINO_COLORS.gold, 0.5),
      this.add.rectangle(frameX, frameY, 696, 356, 0x1a0e16, 0.74).setStrokeStyle(1, 0xff6f91, 0.35),
      this.add.rectangle(frameX, frameY - 174, 646, 2, CASINO_COLORS.gold, 0.28),
    ]);

    for (let row = 0; row < ONCINHA_ROWS; row += 1) {
      for (let reel = 0; reel < ONCINHA_REELS; reel += 1) {
        const x = startX + reel * (cellW + 10);
        const y = startY + row * (cellH + 10);
        const symbol = RANDOM_SYMBOLS[(row + reel) % RANDOM_SYMBOLS.length] ?? 'pearl';
        const cell = this.createSymbolCell(x, y, row, reel, symbol);
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
    symbol: OncinhaSymbolId
  ): SymbolCell {
    const definition = getOncinhaSymbolDefinition(symbol);
    const container = this.add.container(x, y);
    const glow = this.add.rectangle(0, 2, 130, 108, definition.color, 0.035);
    const panel = this.add
      .rectangle(0, 0, 122, 100, 0x1c1019, 0.99)
      .setStrokeStyle(2, definition.color, 0.42);
    const innerGlow = this.add.circle(0, 0, 38, definition.color, 0.075);
    const image = this.add.image(0, 0, definition.assetKey).setDisplaySize(82, 82);
    container.add([glow, panel, innerGlow, image]);
    return { container, panel, image, row, reel };
  }

  private createControls(): void {
    this.betDownButton = createButton(this, -330, 246, {
      width: 72,
      height: 54,
      label: '−',
      fill: 0x171020,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);

    this.root?.add(
      this.add.rectangle(-210, 246, 152, 58, 0x160d15, 0.94).setStrokeStyle(1, CASINO_COLORS.gold, 0.3)
    );
    this.betText = this.add
      .text(-210, 246, '', {
        fontFamily: 'Arial Black',
        fontSize: '17px',
        color: '#ffffff',
        fixedWidth: 142,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root?.add(this.betText);

    this.betUpButton = createButton(this, -90, 246, {
      width: 72,
      height: 54,
      label: '+',
      fill: 0x171020,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);

    this.playButton = createButton(this, 166, 246, {
      width: 246,
      height: 72,
      label: 'SPIN',
      fill: 0xa51f3e,
      stroke: CASINO_COLORS.gold,
      fontSize: 28,
      onPress: () => this.startRound(),
    });
    this.root?.add(this.playButton);

    this.root?.add(
      createButton(this, 382, 246, {
        width: 136,
        height: 54,
        label: 'LOBBY',
        fill: 0x171020,
        stroke: CASINO_COLORS.cyan,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
  }

  private changeBet(direction: -1 | 1): void {
    if (this.playing) return;
    const betValues = appState.games['oncinha-777'].betValues;
    const index = betValues.indexOf(appState.selectedBet);
    const next = Phaser.Math.Clamp(index + direction, 0, betValues.length - 1);
    if (next === index) return;
    appState.selectedBet = betValues[next] ?? appState.selectedBet;
    feedbackEngine.betChange();
    this.refreshHud();
  }

  private startRound(): void {
    if (this.playing) return;
    if (!appState.player) {
      this.setStatus(appState.lastError ?? 'PLAYER NOT READY.');
      return;
    }
    if (appState.player.balance < appState.selectedBet) {
      this.setStatus('NOT ENOUGH FAKE CASH.');
      return;
    }

    this.playing = true;
    this.setStatus('ONCINHA IS FEELING LUCKY...');
    this.setInputsEnabled(false);
    feedbackEngine.reelStart(this);
    this.startAnticipation();
    void playOncinha(createActionId(), appState.selectedBet)
      .then((payload) => {
        applyServerState(payload);
        this.stopAtResult(payload.result);
      })
      .catch((error) => {
        this.spinTimer?.destroy();
        this.spinTimer = null;
        this.playing = false;
        this.setInputsEnabled(true);
        this.setStatus(error instanceof Error ? error.message : 'THE VELVET CURTAIN FELL. TRY AGAIN.');
      });
  }

  private startAnticipation(): void {
    this.spinTimer?.destroy();
    this.spinTimer = this.time.addEvent({
      delay: 58,
      loop: true,
      callback: () => {
        this.cells.forEach((cell) => {
          const next = RANDOM_SYMBOLS[Phaser.Math.Between(0, RANDOM_SYMBOLS.length - 1)] ?? 'pearl';
          this.paintCell(cell, next, false);
        });
      },
    });
  }

  private stopAtResult(result: OncinhaRoundResult): void {
    this.time.delayedCall(520, () => {
      this.spinTimer?.destroy();
      this.spinTimer = null;
      for (let reel = 0; reel < ONCINHA_REELS; reel += 1) {
        this.time.delayedCall(reel * 170, () => {
          this.cells
            .filter((cell) => cell.reel === reel)
            .forEach((cell) => {
              this.paintCell(cell, result.grid[cell.row]?.[cell.reel] ?? 'pearl', false);
              this.tweens.add({
                targets: cell.container,
                y: cell.container.y - 11,
                yoyo: true,
                duration: 120,
                ease: 'Back.Out',
              });
            });
          feedbackEngine.reelStop(reel);
          if (reel === ONCINHA_REELS - 1) {
            this.time.delayedCall(210, () => this.finishRound(result));
          }
        });
      }
    });
  }

  private finishRound(result: OncinhaRoundResult): void {
    const winningCells = new Set<string>();
    result.lineWins.forEach((line) =>
      line.cells.forEach((cell) => winningCells.add(`${cell.row}:${cell.reel}`))
    );
    result.scatterWin?.cells.forEach((cell) => winningCells.add(`${cell.row}:${cell.reel}`));

    this.cells.forEach((cell) => {
      const symbol = result.grid[cell.row]?.[cell.reel] ?? 'pearl';
      const winning = winningCells.has(`${cell.row}:${cell.reel}`);
      this.paintCell(cell, symbol, winning);
      if (winning) {
        this.tweens.add({
          targets: cell.container,
          scaleX: 1.1,
          scaleY: 1.1,
          yoyo: true,
          repeat: 2,
          duration: 150,
          ease: 'Sine.InOut',
        });
      }
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

    const detail = result.scatterWin
      ? ` • ${result.scatterWin.count} SCATTERS`
      : result.lineWins.length > 1
        ? ` • ${result.lineWins.length} LINES`
        : '';
    this.setStatus(
      result.category === 'miss'
        ? `NO DIAMONDS TODAY. −${formatCredits(result.bet)}`
        : `${result.category.toUpperCase()} • ${result.multiplier.toFixed(2)}x • +${formatCredits(result.reward)}${detail}`
    );
    this.refreshHud();
    this.playing = false;
    this.setInputsEnabled(true);
  }

  private paintCell(cell: SymbolCell, symbol: OncinhaSymbolId, winning: boolean): void {
    const definition = getOncinhaSymbolDefinition(symbol);
    cell.panel.setStrokeStyle(winning ? 4 : 2, winning ? CASINO_COLORS.gold : definition.color, winning ? 1 : 0.42);
    cell.panel.setFillStyle(winning ? 0x2a1519 : 0x1c1019, 0.99);
    cell.image.setTexture(definition.assetKey);
    if (!winning) cell.container.setScale(1);
  }

  private refreshHud(): void {
    this.balanceText?.setText(`BANK  ${formatCredits(appState.player?.balance ?? 0)}`);
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
