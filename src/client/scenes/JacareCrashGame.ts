import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import { multiplierAt, type JacareCrashRound } from '../../shared/api';
import {
  createActionId,
  cashoutJacareCrash,
  startJacareCrash,
} from '../api/urubuVegasApi';
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
} from '../ui/phaserUi';

export class JacareCrashGame extends Scene {
  private root: GameObjects.Container | null = null;
  private balanceText: GameObjects.Text | null = null;
  private betText: GameObjects.Text | null = null;
  private multiplierText: GameObjects.Text | null = null;
  private statusText: GameObjects.Text | null = null;
  private riskRing: GameObjects.Arc | null = null;
  private riskGlow: GameObjects.Rectangle | null = null;
  private betDownButton: GameObjects.Container | null = null;
  private betUpButton: GameObjects.Container | null = null;
  private startButton: GameObjects.Container | null = null;
  private cashoutButton: GameObjects.Container | null = null;
  private activeRound: JacareCrashRound | null = null;
  private running = false;
  private lastTickStep = 1;

  constructor() {
    super('JacareCrashGame');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    feedbackEngine.sceneOpen('crash');

    this.root.add(
      createVegasMarquee(this, 66, -306, 'JACARE CRASH', {
        width: 660,
        height: 82,
        titleSize: 40,
        compact: true,
        accent: CASINO_COLORS.green,
      })
    );
    this.root.add(addMascot(this, -410, -42, 1.27, 'mascot-jacare'));

    this.root.add(
      createCabinetFrame(this, 66, 12, 770, 560, CASINO_COLORS.green)
    );
    this.root.add([
      this.add
        .rectangle(66, -244, 660, 18, CASINO_COLORS.goldSoft, 0.94)
        .setStrokeStyle(1, CASINO_COLORS.champagne, 0.5),
      this.add
        .text(66, -244, 'LIVE MULTIPLIER • LEAVE BEFORE THE BITE', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '10px',
          color: '#281706',
          letterSpacing: 1,
        })
        .setOrigin(0.5),
    ]);

    const statusRail = this.add.container(66, -216);
    statusRail.add([
      this.add
        .rectangle(0, 0, 650, 34, 0x07130d, 0.98)
        .setStrokeStyle(1, CASINO_COLORS.green, 0.36),
      this.add.rectangle(-320, 0, 4, 22, CASINO_COLORS.green, 0.92),
      this.add.rectangle(320, 0, 4, 22, CASINO_COLORS.green, 0.42),
    ]);
    this.statusText = this.add
      .text(0, 0, 'GREED HAS A TIMER.', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#dff3e4',
        fixedWidth: 610,
        align: 'center',
        letterSpacing: 0.5,
      })
      .setOrigin(0.5);
    statusRail.add(this.statusText);
    this.root.add(statusRail);

    this.riskGlow = this.add.rectangle(66, -58, 560, 286, CASINO_COLORS.green, 0.025);
    this.riskRing = this.add
      .circle(66, -72, 126, 0x000000, 0)
      .setStrokeStyle(3, CASINO_COLORS.green, 0.22);
    const innerRing = this.add
      .circle(66, -72, 92, 0x000000, 0)
      .setStrokeStyle(1, CASINO_COLORS.gold, 0.14);
    const horizon = this.add.rectangle(66, 60, 438, 1, CASINO_COLORS.green, 0.22);
    this.root.add([this.riskGlow, this.riskRing, innerRing, horizon]);

    this.multiplierText = this.add
      .text(66, -80, '1.00x', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '92px',
        color: '#7aff8d',
        stroke: '#041008',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(66, 92, 'CASH OUT BEFORE CHOMP', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '12px',
        color: '#69f59a',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.root.add([this.multiplierText, hint]);

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
    this.restoreActiveRound();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () =>
      this.running ? this.cashout() : this.startRound()
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.LEFT, () => this.changeBet(-1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.RIGHT, () => this.changeBet(1));
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.ESC, () => this.scene.start('CasinoLobby'));
  }

  override update(_time: number, delta: number): void {
    if (!this.running || !this.activeRound) return;
    const now = Date.now();
    const multiplier = multiplierAt(this.activeRound.startedAt, now);
    const riskColor =
      multiplier >= 8
        ? CASINO_COLORS.danger
        : multiplier >= 4
          ? CASINO_COLORS.gold
          : multiplier >= 2
            ? 0xd9ff72
            : CASINO_COLORS.green;

    this.multiplierText?.setText(`${multiplier.toFixed(2)}x`);
    this.multiplierText?.setColor(
      multiplier >= 8 ? '#ff5b6f' : multiplier >= 4 ? '#ffcf55' : multiplier >= 2 ? '#d9ff72' : '#7aff8d'
    );
    this.riskRing?.setStrokeStyle(3, riskColor, 0.25 + Math.min(multiplier / 18, 0.5));
    this.riskGlow?.setFillStyle(riskColor, 0.025 + Math.min(multiplier / 180, 0.07));

    const tickStep = Math.floor(multiplier);
    if (tickStep > this.lastTickStep) {
      this.lastTickStep = tickStep;
      feedbackEngine.crashTick(multiplier);
      if (this.multiplierText) {
        this.tweens.add({
          targets: this.multiplierText,
          scaleX: 1.08,
          scaleY: 1.08,
          yoyo: true,
          duration: 90,
          ease: 'Quad.Out',
        });
      }
      if (this.cashoutButton) {
        this.tweens.add({
          targets: this.cashoutButton,
          scaleX: 1.025,
          scaleY: 1.025,
          yoyo: true,
          duration: 100,
          ease: 'Quad.Out',
        });
      }
    }

    if (now >= this.activeRound.crashAt) {
      this.running = false;
      this.setStatus(`CHOMP! CRASHED AT ${this.activeRound.crashPoint.toFixed(2)}x.`);
      this.multiplierText?.setColor('#ff425d');
      this.riskRing?.setStrokeStyle(4, CASINO_COLORS.danger, 0.8);
      this.riskGlow?.setFillStyle(CASINO_COLORS.danger, 0.1);
      this.setButtons(false, true);
      setButtonLabel(this.cashoutButton, 'CLEAR ROUND');
      this.cameras.main.shake(180, 0.008);
      this.cameras.main.flash(100, 255, 60, 90, false);
      feedbackEngine.crash(this);
    }
    if (delta > 0 && this.multiplierText) {
      this.multiplierText.rotation = Math.sin(now / 120) * 0.01;
    }
  }

  private createControls(): void {
    const deck = this.add.container(66, 222);
    deck.add([
      this.add.rectangle(0, 6, 690, 88, 0x000000, 0.46),
      this.add
        .rectangle(0, 0, 690, 82, 0x08120c, 0.98)
        .setStrokeStyle(2, CASINO_COLORS.goldSoft, 0.62),
      this.add.rectangle(0, -37, 650, 2, CASINO_COLORS.champagne, 0.35),
      this.add.rectangle(0, 37, 650, 1, CASINO_COLORS.green, 0.22),
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
      fill: 0x101a14,
      stroke: CASINO_COLORS.gold,
      fontSize: 22,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);

    this.root?.add(
      this.add
        .rectangle(-65, 222, 92, 48, 0x0b1510, 0.98)
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
      fill: 0x101a14,
      stroke: CASINO_COLORS.gold,
      fontSize: 22,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);

    this.startButton = createButton(this, 112, 222, {
      width: 148,
      height: 56,
      label: 'START',
      fill: 0x0e5f31,
      stroke: CASINO_COLORS.green,
      fontSize: 22,
      onPress: () => this.startRound(),
    });
    this.cashoutButton = createButton(this, 278, 222, {
      width: 164,
      height: 56,
      label: 'CASH OUT',
      fill: CASINO_COLORS.wine,
      stroke: CASINO_COLORS.gold,
      fontSize: 19,
      onPress: () => this.cashout(),
    });
    this.root?.add([this.startButton, this.cashoutButton]);
    this.setButtons(true, false);

    this.root?.add(
      createButton(this, 400, 222, {
        width: 92,
        height: 48,
        label: 'LOBBY',
        fill: 0x151126,
        stroke: CASINO_COLORS.cyan,
        fontSize: 12,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
  }

  private changeBet(direction: -1 | 1): void {
    if (this.running || this.activeRound) return;
    const betValues = appState.games['jacare-crash'].betValues;
    const index = betValues.indexOf(appState.selectedBet);
    const next = Phaser.Math.Clamp(index + direction, 0, betValues.length - 1);
    if (next === index) return;
    appState.selectedBet = betValues[next] ?? appState.selectedBet;
    feedbackEngine.betChange();
    this.refreshHud();
  }

  private startRound(): void {
    if (this.running || this.activeRound) {
      this.setStatus('FINISH THIS ROUND FIRST.');
      return;
    }
    if (!appState.player || appState.player.balance < appState.selectedBet) {
      this.setStatus('NOT ENOUGH FAKE CASH.');
      return;
    }

    this.setStatus('JACARE IS WAKING UP...');
    this.setButtons(false, false);
    this.lastTickStep = 1;
    feedbackEngine.crashStart(this);
    void startJacareCrash(createActionId(), appState.selectedBet)
      .then((payload) => {
        applyServerState(payload);
        this.activeRound = payload.round;
        appState.activeJacareRound = payload.round;
        this.running = true;
        this.multiplierText?.setText('1.00x');
        this.multiplierText?.setColor('#7aff8d');
        this.riskRing?.setStrokeStyle(3, CASINO_COLORS.green, 0.3);
        this.riskGlow?.setFillStyle(CASINO_COLORS.green, 0.03);
        this.setStatus('RUN. GREEDY LITTLE HUMAN.');
        setButtonLabel(this.cashoutButton, 'CASH OUT');
        this.setButtons(false, true);
        this.refreshHud();
      })
      .catch((error) => {
        this.setButtons(true, false);
        this.setStatus(error instanceof Error ? error.message : 'JACARE FELL ASLEEP. TRY AGAIN.');
      });
  }

  private cashout(): void {
    if (!this.activeRound) return;
    const wasRunning = this.running;
    this.running = false;
    this.setButtons(false, false);
    const roundId = this.activeRound.roundId;
    const roundBet = this.activeRound.bet;
    void cashoutJacareCrash(createActionId(), roundId)
      .then((payload) => {
        applyServerState(payload);
        this.activeRound = null;
        appState.activeJacareRound = null;
        const result = payload.result;
        this.setStatus(
          result.status === 'cashed-out'
            ? `ESCAPED AT ${result.multiplier.toFixed(2)}x • +${formatCredits(result.reward)}`
            : `TOO SLOW. −${formatCredits(roundBet)}`
        );
        if (result.reward > 0) {
          feedbackEngine.cashout(this, this.scale.width / 2, this.scale.height / 2, result.reward);
          this.cameras.main.flash(90, 100, 255, 145, false);
        } else {
          feedbackEngine.win(
            this,
            this.scale.width / 2,
            this.scale.height / 2,
            'miss',
            0
          );
        }
        setButtonLabel(this.cashoutButton, 'CASH OUT');
        this.multiplierText?.setText(result.multiplier > 0 ? `${result.multiplier.toFixed(2)}x` : '1.00x');
        this.riskRing?.setStrokeStyle(3, CASINO_COLORS.green, 0.24);
        this.riskGlow?.setFillStyle(CASINO_COLORS.green, 0.025);
        this.setButtons(true, false);
        this.refreshHud();
      })
      .catch((error) => {
        this.running = wasRunning;
        this.setButtons(false, true);
        this.setStatus(error instanceof Error ? error.message : 'THE BUTTON SLIPPED. TRY AGAIN.');
      });
  }

  private restoreActiveRound(): void {
    const round = appState.activeJacareRound;
    if (!round || round.completed) {
      this.setButtons(true, false);
      return;
    }

    this.activeRound = round;
    const now = Date.now();
    const multiplier = multiplierAt(round.startedAt, now);
    this.lastTickStep = Math.max(1, Math.floor(multiplier));
    this.multiplierText?.setText(`${Math.min(multiplier, round.crashPoint).toFixed(2)}x`);
    this.multiplierText?.setColor(now >= round.crashAt ? '#ff425d' : '#7aff8d');

    if (now >= round.crashAt) {
      this.running = false;
      this.setStatus(`CHOMP! CRASHED AT ${round.crashPoint.toFixed(2)}x.`);
      this.riskRing?.setStrokeStyle(4, CASINO_COLORS.danger, 0.8);
      this.riskGlow?.setFillStyle(CASINO_COLORS.danger, 0.1);
      setButtonLabel(this.cashoutButton, 'CLEAR ROUND');
      this.setButtons(false, true);
      return;
    }

    this.running = true;
    setButtonLabel(this.cashoutButton, 'CASH OUT');
    this.setStatus('WELCOME BACK. THE JACARE IS STILL HUNGRY.');
    this.setButtons(false, true);
  }

  private refreshHud(): void {
    this.balanceText?.setText(formatCredits(appState.player?.balance ?? 0));
    this.betText?.setText(`BET ${formatCredits(appState.selectedBet)}`);
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }

  private setButtons(startEnabled: boolean, cashoutEnabled: boolean): void {
    setButtonEnabled(this.betDownButton, startEnabled);
    setButtonEnabled(this.betUpButton, startEnabled);
    setButtonEnabled(this.startButton, startEnabled);
    setButtonEnabled(this.cashoutButton, cashoutEnabled);
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
