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
  addMascot,
  createButton,
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

  constructor() {
    super('JacareCrashGame');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);
    this.root.add(addMascot(this, -340, -70, 1.36, 'mascot-jacare'));
    this.root.add(
      this.add
        .text(0, -332, 'JACARE CRASH', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ffffff',
          stroke: '#0e5f31',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
    );
    this.balanceText = this.add.text(-430, -284, '', {
      fontFamily: 'Arial Black',
      fontSize: '19px',
      color: '#ffd54a',
    });
    this.multiplierText = this.add
      .text(96, -90, '1.00x', {
        fontFamily: 'Arial Black',
        fontSize: '82px',
        color: '#7aff8d',
        stroke: '#08120d',
        strokeThickness: 9,
      })
      .setOrigin(0.5);
    this.root.add([
      this.add.rectangle(96, -76, 520, 230, 0x07130d, 0.56),
      this.add
        .rectangle(96, -76, 520, 230, 0x0e1d16, 0.28)
        .setStrokeStyle(2, 0x72ff9a, 0.22),
    ]);
    this.statusText = this.add
      .text(96, 2, 'Start, then cash out before the server crash point.', {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#d9cfff',
        fixedWidth: 520,
        align: 'center',
      })
      .setOrigin(0.5);
    this.root.add([this.balanceText, this.multiplierText, this.statusText]);
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
    this.restoreActiveRound();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () =>
      this.scale.off('resize', this.layout, this)
    );
    makeKey(this, Phaser.Input.Keyboard.KeyCodes.SPACE, () =>
      this.running ? this.cashout() : this.startRound()
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

  override update(_time: number, delta: number): void {
    if (!this.running || !this.activeRound) return;
    const now = Date.now();
    const multiplier = multiplierAt(this.activeRound.startedAt, now);
    this.multiplierText?.setText(`${multiplier.toFixed(2)}x`);
    this.multiplierText?.setColor(multiplier > 5 ? '#ffd54a' : '#7aff8d');
    if (now >= this.activeRound.crashAt) {
      this.running = false;
      this.setStatus(
        `CRASHED at ${this.activeRound.crashPoint.toFixed(2)}x. Settle to clear the round.`
      );
      this.setButtons(false, true);
      setButtonLabel(this.cashoutButton, 'SETTLE');
      feedbackEngine.bonus(this, this.scale.width / 2, this.scale.height / 2);
    }
    if (delta > 0 && this.multiplierText) {
      this.multiplierText.rotation = Math.sin(now / 120) * 0.01;
    }
  }

  private createControls(): void {
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
    this.startButton = createButton(this, 122, 246, {
      width: 182,
      height: 64,
      label: 'START',
      fill: 0x0e5f31,
      stroke: 0x7aff8d,
      fontSize: 24,
      onPress: () => this.startRound(),
    });
    this.cashoutButton = createButton(this, 328, 246, {
      width: 182,
      height: 64,
      label: 'CASH OUT',
      fill: 0x8f1834,
      stroke: 0xffd54a,
      fontSize: 20,
      onPress: () => this.cashout(),
    });
    this.root?.add([this.startButton, this.cashoutButton]);
    this.setButtons(true, false);
    this.root?.add(
      createButton(this, 0, 302, {
        width: 138,
        height: 44,
        label: 'LOBBY',
        fill: 0x17132d,
        stroke: 0x69f7ff,
        onPress: () => this.scene.start('CasinoLobby'),
      })
    );
  }

  private changeBet(direction: -1 | 1): void {
    if (this.running || this.activeRound) return;
    const betValues = appState.games['jacare-crash'].betValues;
    const index = betValues.indexOf(appState.selectedBet);
    const next = Phaser.Math.Clamp(index + direction, 0, betValues.length - 1);
    appState.selectedBet = betValues[next] ?? appState.selectedBet;
    this.refreshHud();
  }

  private startRound(): void {
    if (this.running || this.activeRound) {
      this.setStatus('Finish the active Jacare round first.');
      return;
    }
    if (!appState.player || appState.player.balance < appState.selectedBet) {
      this.setStatus('Not enough virtual credits.');
      return;
    }
    this.setStatus('Server is setting the crash point...');
    this.setButtons(false, false);
    void startJacareCrash(createActionId(), appState.selectedBet)
      .then((payload) => {
        applyServerState(payload);
        this.activeRound = payload.round;
        appState.activeJacareRound = payload.round;
        this.running = true;
        this.multiplierText?.setText('1.00x');
        this.multiplierText?.setColor('#7aff8d');
        this.setStatus('Cash out before it snaps.');
        setButtonLabel(this.cashoutButton, 'CASH OUT');
        this.setButtons(false, true);
        this.refreshHud();
      })
      .catch((error) => {
        this.setButtons(true, false);
        this.setStatus(
          error instanceof Error
            ? error.message
            : 'Connection hiccup. Try again.'
        );
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
            ? `Cashed out ${result.multiplier.toFixed(2)}x for ${formatCredits(result.reward)}`
            : `Settled crash at ${result.multiplier.toFixed(2)}x. -${formatCredits(roundBet)}`
        );
        feedbackEngine.win(
          this,
          this.scale.width / 2,
          this.scale.height / 2,
          result.reward > 0 ? 'win' : 'miss',
          result.reward
        );
        setButtonLabel(this.cashoutButton, 'CASH OUT');
        this.setButtons(true, false);
        this.refreshHud();
      })
      .catch((error) => {
        this.running = wasRunning;
        this.setButtons(false, true);
        this.setStatus(
          error instanceof Error
            ? error.message
            : 'Connection hiccup. Try again.'
        );
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
    this.multiplierText?.setText(
      `${Math.min(multiplier, round.crashPoint).toFixed(2)}x`
    );
    this.multiplierText?.setColor(now >= round.crashAt ? '#ff425d' : '#7aff8d');

    if (now >= round.crashAt) {
      this.running = false;
      this.setStatus(
        `CRASHED at ${round.crashPoint.toFixed(2)}x. Settle to clear the round.`
      );
      setButtonLabel(this.cashoutButton, 'SETTLE');
      this.setButtons(false, true);
      return;
    }

    this.running = true;
    setButtonLabel(this.cashoutButton, 'CASH OUT');
    this.setStatus('Active round restored. Cash out before it snaps.');
    this.setButtons(false, true);
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
