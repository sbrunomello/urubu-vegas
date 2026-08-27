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
      createVegasMarquee(this, 70, -318, 'JACARE CRASH', {
        width: 580,
        height: 92,
        titleSize: 42,
        compact: true,
        accent: CASINO_COLORS.green,
      })
    );
    this.root.add(addMascot(this, -406, -82, 1.25, 'mascot-jacare'));

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

    this.root.add(
      createCabinetFrame(this, 78, -70, 650, 340, CASINO_COLORS.green)
    );
    this.root.add([
      this.add
        .rectangle(78, -226, 540, 14, CASINO_COLORS.goldSoft, 0.9)
        .setStrokeStyle(1, CASINO_COLORS.champagne, 0.4),
      this.add
        .text(78, -226, 'MULTIPLIER TABLE • CASH OUT BEFORE THE BITE', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '10px',
          color: '#281706',
          letterSpacing: 1,
        })
        .setOrigin(0.5),
      this.add.circle(78, -92, 126, CASINO_COLORS.green, 0.025).setStrokeStyle(2, CASINO_COLORS.green, 0.16),
      this.add.circle(78, -92, 90, CASINO_COLORS.gold, 0.018).setStrokeStyle(1, CASINO_COLORS.gold, 0.14),
      this.add.rectangle(78, 30, 438, 1, CASINO_COLORS.green, 0.2),
    ]);

    this.multiplierText = this.add
      .text(78, -100, '1.00x', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '88px',
        color: '#7aff8d',
        stroke: '#041008',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(78, 58, 'GREED HAS A TIMER.', {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e1d7e8',
        fixedWidth: 520,
        align: 'center',
        letterSpacing: 0.5,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(78, 101, 'CASH OUT BEFORE CHOMP', {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '12px',
        color: '#69f59a',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.root.add([this.multiplierText, this.statusText, hint]);

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
    this.multiplierText?.setText(`${multiplier.toFixed(2)}x`);
    this.multiplierText?.setColor(multiplier >= 8 ? '#ffcf55' : multiplier >= 4 ? '#d9ff72' : '#7aff8d');

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
    }

    if (now >= this.activeRound.crashAt) {
      this.running = false;
      this.setStatus(`CHOMP! CRASHED AT ${this.activeRound.crashPoint.toFixed(2)}x.`);
      this.multiplierText?.setColor('#ff425d');
      this.setButtons(false, true);
      setButtonLabel(this.cashoutButton, 'CLEAR ROUND');
      feedbackEngine.crash(this);
    }
    if (delta > 0 && this.multiplierText) {
      this.multiplierText.rotation = Math.sin(now / 120) * 0.01;
    }
  }

  private createControls(): void {
    this.root?.add(
      createCabinetFrame(this, 28, 246, 846, 92, CASINO_COLORS.gold)
    );
    this.betDownButton = createButton(this, -330, 246, {
      width: 72,
      height: 54,
      label: '−',
      fill: 0x101a14,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(-1),
    });
    this.root?.add(this.betDownButton);

    this.root?.add(
      this.add.rectangle(-210, 246, 152, 58, 0x0b1510, 0.98).setStrokeStyle(1, CASINO_COLORS.gold, 0.4)
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
      fill: 0x101a14,
      stroke: CASINO_COLORS.gold,
      fontSize: 24,
      onPress: () => this.changeBet(1),
    });
    this.root?.add(this.betUpButton);

    this.startButton = createButton(this, 112, 246, {
      width: 180,
      height: 64,
      label: 'START',
      fill: 0x0e5f31,
      stroke: CASINO_COLORS.green,
      fontSize: 23,
      onPress: () => this.startRound(),
    });
    this.cashoutButton = createButton(this, 322, 246, {
      width: 200,
      height: 64,
      label: 'CASH OUT',
      fill: CASINO_COLORS.wine,
      stroke: CASINO_COLORS.gold,
      fontSize: 20,
      onPress: () => this.cashout(),
    });
    this.root?.add([this.startButton, this.cashoutButton]);
    this.setButtons(true, false);

    this.root?.add(
      createButton(this, 0, 304, {
        width: 136,
        height: 44,
        label: 'LOBBY',
        fill: 0x151126,
        stroke: CASINO_COLORS.cyan,
        fontSize: 14,
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
    this.betText?.setText(`BET\n${formatCredits(appState.selectedBet)}`);
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
        isPortrait ? this.scale.height * 0.43 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 960 : 1024, 780));
  }
}
