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
  private ballOrbit: GameObjects.Container | null = null;
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
      createVegasMarquee(this, 62, -306, 'CAPIVARA ROULETTE', {
        width: 700,
        height: 82,
        titleSize: 36,
        compact: true,
        accent: CASINO_COLORS.pink,
      })
    );
    this.root.add(addMascot(this, -410, -42, 1.2, 'mascot-capivara'));

    this.root.add(
      createCabinetFrame(this, 66, 12, 770, 560, CASINO_COLORS.pink)
    );
    this.root.add([
      this.add
        .rectangle(66, -244, 660, 18, CASINO_COLORS.goldSoft, 0.94)
        .setStrokeStyle(1, CASINO_COLORS.champagne, 0.5),
      this.add
        .text(66, -244, 'THE CAPYBARA SALON • EUROPEAN WHEEL', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '10px',
          color: '#281506',
          letterSpacing: 1,
        })
        .setOrigin(0.5),
    ]);

    const statusRail = this.add.container(66, -216);
    statusRail.add([
      this.add
        .rectangle(0, 0, 650, 34, 0x12070e, 0.98)
        .setStrokeStyle(1, CASINO_COLORS.pink, 0.38),
      this.add.rectangle(-320, 0, 4, 22, CASINO_COLORS.pink, 0.9),
      this.add.rectangle(320, 0, 4, 22, CASINO_COLORS.pink, 0.42),
    ]);
    this.statusText = this.add
      .text(0, 0, 'PICK A SIDE. CAPYBARA DOES NOT CARE.', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#eadff3',
        fixedWidth: 610,
        align: 'center',
        letterSpacing: 0.4,
      })
      .setOrigin(0.5);
    statusRail.add(this.statusText);
    this.root.add(statusRail);

    this.resultText = this.add
      .text(146, -74, '—', {
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
        .text(0, 330, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '11px',
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
    this.wheel = this.add.container(146, -74);
    const resultText = this.resultText;
    if (!resultText) return;

    const shadow = this.add.circle(0, 12, 150, 0x000000, 0.5);
    const halo = this.add.circle(0, 0, 154, CASINO_COLORS.gold, 0.045);
    const outerBrass = this.add
      .circle(0, 0, 146, CASINO_COLORS.goldSoft, 0.96)
      .setStrokeStyle(2, CASINO_COLORS.champagne, 0.7);
    const woodRing = this.add.circle(0, 0, 138, 0x4b1c18, 1);
    const innerBrass = this.add.circle(0, 0, 134, CASINO_COLORS.gold, 0.64);
    const graphics = this.add.graphics();
    for (let index = 0; index < 37; index += 1) {
      const start = Phaser.Math.DegToRad(index * (360 / 37));
      const end = Phaser.Math.DegToRad((index + 1) * (360 / 37));
      graphics.fillStyle(
        index === 0 ? 0x168447 : index % 2 === 0 ? 0x111015 : 0xb71f3b,
        1
      );
      graphics.slice(0, 0, 129, start, end, false);
      graphics.lineTo(0, 0);
      graphics.fillPath();
    }
    graphics.lineStyle(3, CASINO_COLORS.champagne, 0.88).strokeCircle(0, 0, 130);
    graphics.lineStyle(2, 0xffffff, 0.08).strokeCircle(0, 0, 114);

    const inner = this.add
      .circle(0, 0, 51, 0x35171d, 1)
      .setStrokeStyle(4, CASINO_COLORS.gold, 0.82);
    const hub = this.add
      .circle(0, 0, 39, 0x140a0e, 1)
      .setStrokeStyle(1, 0xffffff, 0.12);
    this.wheel.add([shadow, halo, outerBrass, woodRing, innerBrass, graphics, inner, hub]);
    this.root?.add(this.wheel);

    this.ballOrbit = this.add.container(146, -74);
    const ballShadow = this.add.circle(0, -117, 7, 0x000000, 0.45);
    const ball = this.add
      .circle(0, -120, 6, 0xfff6d8, 1)
      .setStrokeStyle(1, CASINO_COLORS.gold, 0.7);
    this.ballOrbit.add([ballShadow, ball]);
    this.root?.add(this.ballOrbit);

    this.root?.add([
      this.add.triangle(
        146,
        -238,
        128,
        -206,
        164,
        -206,
        146,
        -238,
        CASINO_COLORS.gold,
        1
      ),
      resultText,
    ]);
  }

  private createControls(): void {
    const bettingRail = this.add.container(42, 113);
    bettingRail.add([
      this.add.rectangle(0, 2, 692, 104, 0x000000, 0.3),
      this.add
        .rectangle(0, 0, 692, 100, 0x0c080e, 0.92)
        .setStrokeStyle(1, CASINO_COLORS.gold, 0.22),
    ]);
    this.root?.add(bettingRail);

    SELECTIONS.forEach((selection, index) => {
      const x = -242 + (index % 3) * 124;
      const y = 94 + Math.floor(index / 3) * 44;
      const button = createButton(this, x, y, {
        width: 110,
        height: 36,
        label: selection.toUpperCase(),
        fill:
          selection === 'red'
            ? CASINO_COLORS.wine
            : selection === 'black'
              ? 0x111016
              : 0x171126,
        stroke: selection === 'red' ? CASINO_COLORS.pink : CASINO_COLORS.cyan,
        fontSize: 11,
        onPress: () => {
          if (this.spinning) return;
          this.selected = { kind: selection };
          this.updateSelectionVisuals();
        },
      });
      this.selectionButtons.set(selection, button);
      this.root?.add(button);
    });

    const zeroButton = createButton(this, 128, 106, {
      width: 72,
      height: 36,
      label: '0',
      fill: 0x0e5f31,
      stroke: CASINO_COLORS.green,
      fontSize: 17,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: 0 };
        this.updateSelectionVisuals();
      },
    });
    this.selectionButtons.set('zero', zeroButton);
    this.root?.add(zeroButton);

    this.numberDownButton = createButton(this, 210, 106, {
      width: 50,
      height: 36,
      label: '−',
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 18,
      onPress: () => this.changeSingleNumber(-1),
    });
    this.numberButton = createButton(this, 284, 106, {
      width: 84,
      height: 36,
      label: `N ${this.singleNumber}`,
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 11,
      onPress: () => {
        if (this.spinning) return;
        this.selected = { kind: 'single', number: this.singleNumber };
        this.updateSelectionVisuals();
      },
    });
    this.numberUpButton = createButton(this, 358, 106, {
      width: 50,
      height: 36,
      label: '+',
      fill: 0x171126,
      stroke: CASINO_COLORS.cyan,
      fontSize: 18,
      onPress: () => this.changeSingleNumber(1),
    });
    this.selectionButtons.set('single', this.numberButton);
    this.root?.add([this.numberDownButton, this.numberButton, this.numberUpButton]);

    const deck = this.add.container(66, 222);
    deck.add([
      this.add.rectangle(0, 6, 690, 88, 0x000000, 0.46),
      this.add
        .rectangle(0, 0, 690, 82, 0x10070d, 0.98)
        .setStrokeStyle(2, CASINO_COLORS.goldSoft, 0.62),
      this.add.rectangle(0, -37, 650, 2, CASINO_COLORS.champagne, 0.36),
      this.add.rectangle(0, 37, 650, 1, CASINO_COLORS.pink, 0.2),
    ]);
    this.root?.add(deck);

    const bankPlaque = createHudPlaque(
      this,
      -240,
      222,
      'BANKROLL',
      formatCredits(appState.player?.balance ?? 0),
      CASINO_COLORS.gold,
      160
    );
    this.root?.add(bankPlaque);
    this.balanceText = bankPlaque.list.find(
      (item): item is GameObjects.Text =>
        item instanceof GameObjects.Text && item.text.startsWith('$')
    ) ?? null;

    this.betDownButton = createButton(this, -128, 222, {
      width: 54,
      height: 48,
      label: '−',
      fill: 0x171126,
      stroke: CASINO_COLORS.gold,
      fontSize: 22,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);

    this.root?.add(
      this.add
        .rectangle(-65, 222, 92, 48, 0x160e14, 0.98)
        .setStrokeStyle(1, CASINO_COLORS.gold, 0.34)
    );
    this.betText = this.add
      .text(-65, 222, '', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '14px',
        color: '#fff8ef',
        fixedWidth: 86,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root?.add(this.betText);

    this.betUpButton = createButton(this, 0, 222, {
      width: 54,
      height: 48,
      label: '+',
      fill: 0x171126,
      stroke: CASINO_COLORS.gold,
      fontSize: 22,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);

    this.playButton = createButton(this, 165, 222, {
      width: 220,
      height: 60,
      label: 'SPIN',
      fill: 0x6b2631,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.play(),
    });
    this.root?.add(this.playButton);
    this.root?.add(
      createButton(this, 340, 222, {
        width: 112,
        height: 48,
        label: 'LOBBY',
        fill: 0x171126,
        stroke: CASINO_COLORS.cyan,
        fontSize: 14,
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
        if (this.ballOrbit) {
          this.tweens.add({
            targets: this.ballOrbit,
            rotation: -Math.PI * 2 * (7 + payload.result.number / 53),
            duration: 1600,
            ease: 'Quart.Out',
          });
        }
        this.tweens.add({
          targets: this.wheel,
          rotation: Math.PI * 2 * turns,
          duration: 1550,
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
            if (result.won) {
              this.cameras.main.flash(90, 255, 212, 90, false);
            }
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
        this.selected.kind === selection
          ? CASINO_COLORS.gold
          : selection === 'red'
            ? CASINO_COLORS.pink
            : CASINO_COLORS.cyan
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
    this.betText?.setText(`BET ${formatCredits(appState.selectedBet)}`);
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
        isPortrait ? this.scale.height * 0.45 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 900 : 1024, isPortrait ? 700 : 760));
  }
}
