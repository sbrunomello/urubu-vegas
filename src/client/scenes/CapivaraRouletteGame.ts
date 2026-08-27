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
  private spinTickTimer: Phaser.Time.TimerEvent | null = null;
  private selectionButtons = new Map<SelectionButtonKey, GameObjects.Container>();
  private singleNumber = 7;
  private selected: RouletteSelection = { kind: 'red' };
  private spinning = false;

  constructor() {
    super('CapivaraRouletteGame');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    feedbackEngine.sceneOpen('roulette');

    this.root.add(
      createVegasMarquee(this, 68, -318, 'CAPIVARA ROULETTE', {
        width: 650,
        height: 92,
        titleSize: 38,
        compact: true,
        accent: CASINO_COLORS.pink,
      })
    );
    this.root.add(addMascot(this, -410, -82, 1.18, 'mascot-capivara'));

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
      .text(0, 0, 'PICK A SIDE. CAPYBARA DOES NOT CARE.', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#eadff3',
        fixedWidth: 440,
        align: 'center',
        letterSpacing: 0.4,
      })
      .setOrigin(0.5);
    statusFrame.add(this.statusText);
    this.root.add(statusFrame);

    this.root.add(
      createCabinetFrame(this, 150, -82, 500, 370, CASINO_COLORS.pink)
    );
    this.root.add([
      this.add
        .rectangle(150, -252, 410, 14, CASINO_COLORS.goldSoft, 0.9)
        .setStrokeStyle(1, CASINO_COLORS.champagne, 0.4),
      this.add
        .text(150, -252, 'THE CAPYBARA SALON • EUROPEAN WHEEL', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '10px',
          color: '#281506',
          letterSpacing: 1,
        })
        .setOrigin(0.5),
    ]);

    this.resultText = this.add
      .text(150, -82, '—', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '38px',
        color: '#ffffff',
        stroke: '#12040b',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.createWheel();
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
      this.spinTickTimer?.destroy();
      this.spinTickTimer = null;
    });
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () => this.play());
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.LEFT, () => this.changeBet(-1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.RIGHT, () => this.changeBet(1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.UP, () => this.changeSingleNumber(1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.DOWN, () => this.changeSingleNumber(-1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.ESC, () => this.scene.start('CasinoLobby'));
  }

  private createWheel(): void {
    this.wheel = this.add.container(150, -82);
    const resultText = this.resultText;
    if (!resultText) return;

    const shadow = this.add.circle(0, 10, 146, 0x000000, 0.48);
    const outerGlow = this.add.circle(0, 0, 149, CASINO_COLORS.gold, 0.05);
    const brass = this.add.circle(0, 0, 142, CASINO_COLORS.goldSoft, 0.9);
    const graphics = this.add.graphics();
    for (let index = 0; index < 37; index += 1) {
      const start = Phaser.Math.DegToRad(index * (360 / 37));
      const end = Phaser.Math.DegToRad((index + 1) * (360 / 37));
      graphics.fillStyle(
        index === 0 ? 0x168447 : index % 2 === 0 ? 0x121116 : 0xb71f3b,
        1
      );
      graphics.slice(0, 0, 133, start, end, false);
      graphics.lineTo(0, 0);
      graphics.fillPath();
    }
    graphics.lineStyle(3, CASINO_COLORS.champagne, 0.9).strokeCircle(0, 0, 134);
    graphics.lineStyle(2, 0xffffff, 0.1).strokeCircle(0, 0, 117);

    const inner = this.add
      .circle(0, 0, 51, 0x35171d, 1)
      .setStrokeStyle(4, CASINO_COLORS.gold, 0.82);
    const hub = this.add
      .circle(0, 0, 39, 0x140a0e, 1)
      .setStrokeStyle(1, 0xffffff, 0.12);
    this.wheel.add([shadow, outerGlow, brass, graphics, inner, hub]);
    this.root?.add(this.wheel);

    this.root?.add([
      this.add.triangle(
        150,
        -242,
        132,
        -208,
        168,
        -208,
        150,
        -242,
        CASINO_COLORS.gold,
        1
      ),
      resultText,
    ]);
  }

  private createControls(): void {
    SELECTIONS.forEach((selection, index) => {
      const x = -262 + (index % 3) * 132;
      const y = 104 + Math.floor(index / 3) * 52;
      const button = createButton(this, x, y, {
        width: 118,
        height: 40,
        label: selection.toUpperCase(),
        fill:
          selection === 'red'
            ? CASINO_COLORS.wine
            : selection === 'black'
              ? 0x111016
              : 0x171126,
        stroke: CASINO_COLORS.cyan,
        fontSize: 12,
        onPress: () => {
          if (this.spinning) return;
          this.selected = { kind: selection };
          this.updateSelectionVisuals();
        },
      });
      this.selectionButtons.set(selection, button);
      this.root?.add(button);
    });

    const zeroButton = createButton(this, 116, 112, {
      width: 78,
      height: 40,
      label: '0',
      fill: 0x0e5f31,
      stroke: CASINO_COLORS.green,
      fontSize: 18,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: 0 };
        this.updateSelectionVisuals();
      },
    });
    this.selectionButtons.set('zero', zeroButton);
    this.root?.add(zeroButton);

    this.numberDownButton = createButton(this, 214, 112, {
      width: 58,
      height: 40,
      label: '−',
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 20,
      onPress: () => this.changeSingleNumber(-1),
    });
    this.numberButton = createButton(this, 300, 112, {
      width: 100,
      height: 40,
      label: `N ${this.singleNumber}`,
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 12,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: this.singleNumber };
        this.updateSelectionVisuals();
      },
    });
    this.numberUpButton = createButton(this, 386, 112, {
      width: 58,
      height: 40,
      label: '+',
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 20,
      onPress: () => this.changeSingleNumber(1),
    });
    this.selectionButtons.set('single', this.numberButton);
    this.root?.add([this.numberDownButton, this.numberButton, this.numberUpButton]);

    this.root?.add(
      createCabinetFrame(this, 24, 246, 846, 92, CASINO_COLORS.gold)
    );
    this.betDownButton = createButton(this, -330, 246, {
      width: 72,
      height: 54,
      label: '−',
      fill: 0x171126,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);

    this.root?.add(
      this.add.rectangle(-210, 246, 152, 58, 0x160e14, 0.98).setStrokeStyle(1, CASINO_COLORS.gold, 0.4)
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
      fill: 0x171126,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);

    this.playButton = createButton(this, 150, 246, {
      width: 220,
      height: 66,
      label: 'SPIN',
      fill: 0x6b2631,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.play(),
    });
    this.root?.add(this.playButton);
    this.root?.add(
      createButton(this, 368, 246, {
        width: 136,
        height: 54,
        label: 'LOBBY',
        fill: 0x171126,
        stroke: CASINO_COLORS.cyan,
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
    if (next === index) return;
    appState.selectedBet = betValues[next] ?? appState.selectedBet;
    feedbackEngine.betChange();
    this.refreshHud();
  }

  private play(): void {
    if (this.spinning) return;
    if (!appState.player || appState.player.balance < appState.selectedBet) {
      this.setStatus('NOT ENOUGH FAKE CASH.');
      return;
    }

    this.spinning = true;
    this.setStatus('WHEEL GOES BRRRR...');
    this.setControlsEnabled(false);
    this.resultText?.setText('•');
    feedbackEngine.rouletteSpin(this);
    this.spinTickTimer?.destroy();
    this.spinTickTimer = this.time.addEvent({
      delay: 58,
      loop: true,
      callback: () => feedbackEngine.rouletteTick(),
    });

    void playCapivaraRoulette(createActionId(), appState.selectedBet, this.selected)
      .then((payload) => {
        applyServerState(payload);
        const turns = 5 + payload.result.number / 37;
        this.tweens.add({
          targets: this.wheel,
          rotation: Math.PI * 2 * turns,
          duration: 1450,
          ease: 'Cubic.Out',
          onComplete: () => {
            this.spinTickTimer?.destroy();
            this.spinTickTimer = null;
            this.spinning = false;
            const result = payload.result;
            this.resultText?.setText(String(result.number));
            this.resultText?.setColor(
              result.color === 'green'
                ? '#7aff8d'
                : result.color === 'red'
                  ? '#ff6b7e'
                  : '#ffffff'
            );
            this.setStatus(
              result.won
                ? `${result.number} ${result.color.toUpperCase()} • +${formatCredits(result.reward)}`
                : `${result.number} ${result.color.toUpperCase()} • CAPYBARA WINS.`
            );
            feedbackEngine.rouletteResult(this, result.won);
            this.refreshHud();
            this.setControlsEnabled(true);
          },
        });
      })
      .catch((error) => {
        this.spinTickTimer?.destroy();
        this.spinTickTimer = null;
        this.spinning = false;
        this.resultText?.setText('—');
        this.resultText?.setColor('#ffffff');
        this.setControlsEnabled(true);
        this.setStatus(error instanceof Error ? error.message : 'CAPYBARA LEFT THE TABLE. TRY AGAIN.');
      });
  }

  private changeSingleNumber(direction: -1 | 1): void {
    if (this.spinning) return;
    this.singleNumber = Phaser.Math.Clamp(this.singleNumber + direction, 1, 36);
    this.selected = { kind: 'single', number: this.singleNumber };
    setButtonLabel(this.numberButton, `N ${this.singleNumber}`);
    feedbackEngine.betChange();
    this.updateSelectionVisuals();
  }

  private updateSelectionVisuals(): void {
    SELECTIONS.forEach((selection) => {
      setButtonStroke(
        this.selectionButtons.get(selection) ?? null,
        this.selected.kind === selection ? CASINO_COLORS.gold : CASINO_COLORS.cyan
      );
    });
    setButtonStroke(
      this.selectionButtons.get('zero') ?? null,
      this.selected.kind === 'single' && this.selected.number === 0
        ? CASINO_COLORS.gold
        : CASINO_COLORS.green
    );
    setButtonStroke(
      this.selectionButtons.get('single') ?? null,
      this.selected.kind === 'single' && this.selected.number === this.singleNumber
        ? CASINO_COLORS.gold
        : CASINO_COLORS.cyan
    );
    const label =
      this.selected.kind === 'single'
        ? `NUMBER ${this.selected.number} LOCKED IN.`
        : `${this.selected.kind.toUpperCase()} LOCKED IN.`;
    this.setStatus(label);
  }

  private setControlsEnabled(enabled: boolean): void {
    setButtonEnabled(this.betDownButton, enabled);
    setButtonEnabled(this.betUpButton, enabled);
    setButtonEnabled(this.playButton, enabled);
    setButtonEnabled(this.numberDownButton, enabled);
    setButtonEnabled(this.numberUpButton, enabled);
    this.selectionButtons.forEach((button) => setButtonEnabled(button, enabled));
  }

  private refreshHud(): void {
    this.balanceText?.setText(formatCredits(appState.player?.balance ?? 0));
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
