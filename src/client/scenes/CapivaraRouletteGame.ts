import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import type {
  RouletteEvenMoneySelection,
  RouletteSelection,
} from '../../shared/api';
import { createActionId, playCapivaraRoulette } from '../api/urubuVegasApi';
import { feedbackEngine } from '../feedback/FeedbackEngine';
import { applyServerState, appState } from '../state/appState';
import {
  addMascot,
  createButton,
  drawCasinoBackdrop,
  formatCredits,
  makeKey,
  safeScale,
  setButtonEnabled,
  setButtonLabel,
  setButtonStroke,
} from '../ui/phaserUi';

const SELECTIONS: readonly RouletteEvenMoneySelection[] = [
  'red',
  'black',
  'odd',
  'even',
  'low',
  'high',
];
type SelectionButtonKey = RouletteEvenMoneySelection | 'zero' | 'single';

export class CapivaraRouletteGame extends Scene {
  private root: GameObjects.Container | null = null;
  private balanceText: GameObjects.Text | null = null;
  private betText: GameObjects.Text | null = null;
  private statusText: GameObjects.Text | null = null;
  private resultText: GameObjects.Text | null = null;
  private wheel: GameObjects.Container | null = null;
  private betDownButton: GameObjects.Container | null = null;
  private betUpButton: GameObjects.Container | null = null;
  private playButton: GameObjects.Container | null = null;
  private numberDownButton: GameObjects.Container | null = null;
  private numberUpButton: GameObjects.Container | null = null;
  private numberButton: GameObjects.Container | null = null;
  private selectionButtons = new Map<
    SelectionButtonKey,
    GameObjects.Container
  >();
  private singleNumber = 7;
  private selected: RouletteSelection = { kind: 'red' };
  private spinning = false;

  constructor() {
    super('CapivaraRouletteGame');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    this.root.add(addMascot(this, -384, -56, 1.34, 'mascot-capivara'));
    this.root.add(
      this.add
        .text(0, -332, 'CAPIVARA ROULETTE', {
          fontFamily: 'Arial Black',
          fontSize: '44px',
          color: '#ffffff',
          stroke: '#6b2631',
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
      .text(142, -260, 'Pick a calm little risk.', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#d9cfff',
        fixedWidth: 470,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root.add([
      this.add.rectangle(144, -54, 424, 330, 0x071017, 0.56),
      this.add
        .rectangle(144, -54, 424, 330, 0x151018, 0.28)
        .setStrokeStyle(2, 0xff3d71, 0.2),
    ]);
    this.resultText = this.add
      .text(160, -58, '--', {
        fontFamily: 'Arial Black',
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#12040b',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.root.add([this.balanceText, this.statusText]);
    this.createWheel();
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
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.layout, this)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () => this.play());
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.LEFT, () =>
      this.changeBet(-1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.RIGHT, () =>
      this.changeBet(1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.UP, () =>
      this.changeSingleNumber(1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.DOWN, () =>
      this.changeSingleNumber(-1)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.ESC, () =>
      this.scene.start('CasinoLobby')
    );
  }

  private createWheel(): void {
    this.wheel = this.add.container(160, -58);
    const resultText = this.resultText;
    if (!resultText) return;
    const graphics = this.add.graphics();
    for (let index = 0; index < 37; index += 1) {
      const start = Phaser.Math.DegToRad(index * (360 / 37));
      const end = Phaser.Math.DegToRad((index + 1) * (360 / 37));
      graphics.fillStyle(
        index === 0 ? 0x1b8f45 : index % 2 === 0 ? 0x151515 : 0xc12b3c,
        1
      );
      graphics.slice(0, 0, 122, start, end, false);
      graphics.lineTo(0, 0);
      graphics.fillPath();
    }
    graphics.lineStyle(5, 0xffd54a, 0.9).strokeCircle(0, 0, 122);
    this.wheel.add([
      graphics,
      this.add.circle(0, 0, 40, 0x4b2215, 1).setStrokeStyle(4, 0xffd54a, 0.8),
    ]);
    this.root?.add(this.wheel);
    this.root?.add([
      this.add.triangle(
        160,
        -202,
        144,
        -174,
        176,
        -174,
        160,
        -202,
        0xffd54a,
        1
      ),
      resultText,
    ]);
  }

  private createControls(): void {
    SELECTIONS.forEach((selection, index) => {
      const x = -272 + (index % 3) * 132;
      const y = 98 + Math.floor(index / 3) * 54;
      const button = createButton(this, x, y, {
        width: 118,
        height: 42,
        label: selection.toUpperCase(),
        fill:
          selection === 'red'
            ? 0x8f1834
            : selection === 'black'
              ? 0x111111
              : 0x17132d,
        stroke: 0x69f7ff,
        fontSize: 13,
        onPress: () => {
          if (this.spinning) return;
          this.selected = { kind: selection };
          this.updateSelectionVisuals();
        },
      });
      this.selectionButtons.set(selection, button);
      this.root?.add(button);
    });
    const zeroButton = createButton(this, 104, 106, {
      width: 86,
      height: 42,
      label: '0',
      fill: 0x0e5f31,
      stroke: 0x7aff8d,
      fontSize: 18,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: 0 };
        this.updateSelectionVisuals();
      },
    });
    this.selectionButtons.set('zero', zeroButton);
    this.root?.add(zeroButton);
    this.numberDownButton = createButton(this, 212, 106, {
      width: 64,
      height: 42,
      label: '-',
      fill: 0x17132d,
      stroke: 0x69f7ff,
      fontSize: 20,
      onPress: () => this.changeSingleNumber(-1),
    });
    this.numberButton = createButton(this, 304, 106, {
      width: 110,
      height: 42,
      label: `N ${this.singleNumber}`,
      fill: 0x17132d,
      stroke: 0x69f7ff,
      fontSize: 13,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: this.singleNumber };
        this.updateSelectionVisuals();
      },
    });
    this.numberUpButton = createButton(this, 396, 106, {
      width: 64,
      height: 42,
      label: '+',
      fill: 0x17132d,
      stroke: 0x69f7ff,
      fontSize: 20,
      onPress: () => this.changeSingleNumber(1),
    });
    this.selectionButtons.set('single', this.numberButton);
    this.root?.add([
      this.numberDownButton,
      this.numberButton,
      this.numberUpButton,
    ]);
    this.betDownButton = createButton(this, -314, 246, {
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
      .text(-190, 246, '', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#ffffff',
        fixedWidth: 170,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root?.add(this.betText);
    this.betUpButton = createButton(this, -66, 246, {
      width: 82,
      height: 54,
      label: '+',
      fill: 0x17132d,
      stroke: 0xffd54a,
      fontSize: 24,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);
    this.playButton = createButton(this, 146, 246, {
      width: 202,
      height: 64,
      label: 'SPIN WHEEL',
      fill: 0x6b2631,
      stroke: 0xffd54a,
      fontSize: 20,
      onPress: () => this.play(),
    });
    this.root?.add(this.playButton);
    this.root?.add(
      createButton(this, 358, 246, {
        width: 138,
        height: 54,
        label: 'LOBBY',
        fill: 0x17132d,
        stroke: 0x69f7ff,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
    this.updateSelectionVisuals();
  }

  private changeBet(direction: -1 | 1): void {
    if (this.spinning) return;
    const betValues = appState.games['capivara-roulette'].betValues;
    const index = betValues.indexOf(appState.selectedBet);
    const next = Phaser.Math.Clamp(index + direction, 0, betValues.length - 1);
    appState.selectedBet = betValues[next] ?? appState.selectedBet;
    this.refreshHud();
  }

  private play(): void {
    if (this.spinning) return;
    if (!appState.player || appState.player.balance < appState.selectedBet) {
      this.setStatus('Not enough virtual credits.');
      return;
    }
    this.spinning = true;
    this.setStatus('Capivara is waiting for the server spin...');
    this.setControlsEnabled(false);
    this.resultText?.setText('...');
    void playCapivaraRoulette(
      createActionId(),
      appState.selectedBet,
      this.selected
    )
      .then((payload) => {
        applyServerState(payload);
        const turns = 4 + payload.result.number / 37;
        this.tweens.add({
          targets: this.wheel,
          rotation: Math.PI * 2 * turns,
          duration: 1200,
          ease: 'Cubic.Out',
          onComplete: () => {
            this.spinning = false;
            const result = payload.result;
            this.resultText?.setText(String(result.number));
            this.setStatus(
              result.won
                ? `${result.number} ${result.color}. Paid ${formatCredits(result.reward)}`
                : `${result.number} ${result.color}. Miss.`
            );
            feedbackEngine.win(
              this,
              this.scale.width / 2,
              this.scale.height / 2,
              result.won ? 'win' : 'miss',
              result.reward
            );
            this.refreshHud();
            this.setControlsEnabled(true);
          },
        });
      })
      .catch((error) => {
        this.spinning = false;
        this.resultText?.setText('--');
        this.setControlsEnabled(true);
        this.setStatus(
          error instanceof Error
            ? error.message
            : 'Connection hiccup. Try again.'
        );
      });
  }

  private changeSingleNumber(direction: -1 | 1): void {
    if (this.spinning) return;
    this.singleNumber = Phaser.Math.Clamp(this.singleNumber + direction, 1, 36);
    this.selected = { kind: 'single', number: this.singleNumber };
    setButtonLabel(this.numberButton, `N ${this.singleNumber}`);
    this.updateSelectionVisuals();
  }

  private updateSelectionVisuals(): void {
    SELECTIONS.forEach((selection) => {
      setButtonStroke(
        this.selectionButtons.get(selection) ?? null,
        this.selected.kind === selection ? 0xffd54a : 0x69f7ff
      );
    });
    setButtonStroke(
      this.selectionButtons.get('zero') ?? null,
      this.selected.kind === 'single' && this.selected.number === 0
        ? 0xffd54a
        : 0x7aff8d
    );
    setButtonStroke(
      this.selectionButtons.get('single') ?? null,
      this.selected.kind === 'single' &&
        this.selected.number === this.singleNumber
        ? 0xffd54a
        : 0x69f7ff
    );
    const label =
      this.selected.kind === 'single'
        ? `Selected number ${this.selected.number}`
        : `Selected ${this.selected.kind}`;
    this.setStatus(label);
  }

  private setControlsEnabled(enabled: boolean): void {
    setButtonEnabled(this.betDownButton, enabled);
    setButtonEnabled(this.betUpButton, enabled);
    setButtonEnabled(this.playButton, enabled);
    setButtonEnabled(this.numberDownButton, enabled);
    setButtonEnabled(this.numberUpButton, enabled);
    this.selectionButtons.forEach((button) =>
      setButtonEnabled(button, enabled)
    );
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
