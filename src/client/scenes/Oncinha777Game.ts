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
  VEGAS_FONT_BODY,
  VEGAS_FONT_DISPLAY,
  addMascot,
  createButton,
  createCabinetFrame,
  createHudPlaque,
  createVegasMarquee,
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
      createVegasMarquee(this, 68, -318, 'ONCINHA 777', {
        width: 580,
        height: 92,
        titleSize: 42,
        compact: true,
        accent: CASINO_COLORS.pink,
      })
    );
    this.root.add(addMascot(this, -408, -82, 1.08, 'mascot-oncinha'));

    const bankPlaque = createHudPlaque(
      this,
      -344,
      -266,
      'BANKROLL',
      formatCredits(appState.player?.balance ?? 0),
      CASINO_COLORS.gold,
      220
    );
    this.root.add(bankPlaque);
    this.balanceText = bankPlaque
      .list
      .find(
        (item): item is GameObjects.Text =>
          item instanceof GameObjects.Text && item.text.startsWith('$')
      ) ?? null;

    const statusFrame = this.add.container(106, -266);
    statusFrame.add([
      this.add
        .rectangle(0, 0, 486, 46, 0x12070e, 0.98)
        .setStrokeStyle(1, CASINO_COLORS.pink, 0.38),
      this.add.rectangle(-236, 0, 4, 30, CASINO_COLORS.pink, 0.86),
    ]);
    this.statusText = this.add
      .text(0, 0, 'GLAMOUR. GLITTER. QUESTIONABLE LUCK.', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f6ddeb',
        fixedWidth: 440,
        align: 'center',
        letterSpacing: 0.5,
      })
      .setOrigin(0.5);
    statusFrame.add(this.statusText);
    this.root.add(statusFrame);

    this.createReels();
    this.createControls();
    this.root.add(
      this.add
        .text(0, 342, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '12px',
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

    this.root?.add(
      createCabinetFrame(this, frameX, frameY, 742, 392, CASINO_COLORS.pink)
    );
    this.root?.add([
      this.add
        .rectangle(frameX, frameY - 166, 650, 12, CASINO_COLORS.goldSoft, 0.92)
        .setStrokeStyle(1, CASINO_COLORS.champagne, 0.45),
      this.add
        .text(frameX, frameY - 166, 'VELVET ROOM • 777 • DIAMONDS & DRAMA', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '10px',
          color: '#2d1606',
          letterSpacing: 1,
        })
        .setOrigin(0.5),
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
    const glow = this.add.rectangle(0, 3, 130, 108, definition.color, 0.035);
    const goldLip = this.add.rectangle(0, 0, 126, 104, CASINO_COLORS.goldSoft, 0.3);
    const panel = this.add
      .rectangle(0, 0, 120, 98, 0x1c1019, 0.99)
      .setStrokeStyle(2, definition.color, 0.5);
    const topShine = this.add.rectangle(0, -44, 102, 2, 0xffffff, 0.11);
    const innerGlow = this.add.circle(0, 0, 39, definition.color, 0.08);
    const image = this.add.image(0, 0, definition.assetKey).setDisplaySize(82, 82);
    container.add([glow, goldLip, panel, topShine, innerGlow, image]);
    return { container, panel, image, row, reel };
  }

  private createControls(): void {
    this.root?.add(
      createCabinetFrame(this, 30, 246, 846, 92, CASINO_COLORS.gold)
    );

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
      this.add
        .rectangle(-210, 246, 152, 58, 0x12070e, 0.98)
        .setStrokeStyle(1, CASINO_COLORS.gold, 0.4)
    );
    this.betText = this.add
      .text(-210, 246, '', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '17px',
        color: '#fff8ef',
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
    cell.panel.setStrokeStyle(
      winning ? 4 : 2,
      winning ? CASINO_COLORS.gold : definition.color,
      winning ? 1 : 0.5
    );
    cell.panel.setFillStyle(winning ? 0x2a1519 : 0x1c1019, 0.99);
    cell.image.setTexture(definition.assetKey);
    if (!winning) cell.container.setScale(1);
  }

  private refreshHud(): void {
    this.balanceText?.setText(formatCredits(appState.player?.balance ?? 0));
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
