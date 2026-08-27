import { GameObjects, Scene } from 'phaser';
import { appState } from '../state/appState';
import {
  CASINO_COLORS,
  VEGAS_FONT_BODY,
  VEGAS_FONT_DISPLAY,
  createButton,
  createCabinetFrame,
  createVegasMarquee,
  drawCasinoBackdrop,
  safeScale,
} from '../ui/phaserUi';

const RULES = [
  ['URUBUZINHO', 'Spin five reels. WILD helps lines. SCATTER pays anywhere.'],
  ['ONCINHA 777', 'Same basic rhythm, different symbols, odds and paytable.'],
  ['JACARE CRASH', 'Start the round and cash out before the jacare chomps the multiplier.'],
  ['CAPIVARA', 'Pick red, black, odd, even, low, high, zero or a number. Then spin.'],
] as const;

export class HelpScene extends Scene {
  private root: GameObjects.Container | null = null;

  constructor() {
    super('HelpScene');
  }

  create(): void {
    drawCasinoBackdrop(this);
    this.root = this.add.container(0, 0);

    this.root.add(
      createVegasMarquee(this, 0, -310, 'HOUSE RULES', {
        width: 640,
        height: 102,
        titleSize: 48,
        subtitle: 'FOUR TABLES. ONE TERRIBLE IDEA.',
        compact: true,
        accent: CASINO_COLORS.ruby,
      })
    );

    const frame = createCabinetFrame(
      this,
      0,
      -42,
      820,
      420,
      CASINO_COLORS.gold
    );
    this.root.add(frame);

    RULES.forEach(([title, description], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = -200 + column * 400;
      const y = -145 + row * 148;
      const accent = [
        CASINO_COLORS.violet,
        0xff9f36,
        CASINO_COLORS.green,
        CASINO_COLORS.pink,
      ][index] ?? CASINO_COLORS.gold;
      const card = this.add.container(x, y);
      card.add([
        this.add.rectangle(0, 6, 350, 126, 0x000000, 0.38),
        this.add
          .rectangle(0, 0, 350, 120, 0x0b0810, 0.98)
          .setStrokeStyle(2, accent, 0.52),
        this.add.rectangle(-170, 0, 5, 92, accent, 0.92),
        this.add
          .text(-150, -38, title, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '20px',
            color: '#fff8ef',
            fixedWidth: 300,
          }),
        this.add
          .text(-150, -4, description, {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '13px',
            color: '#d8ccd7',
            fixedWidth: 292,
            wordWrap: { width: 292 },
          }),
      ]);
      this.root?.add(card);
    });

    const quick = this.add.container(0, 128);
    quick.add([
      this.add
        .rectangle(0, 0, 760, 62, 0x160b13, 0.96)
        .setStrokeStyle(1, CASINO_COLORS.gold, 0.3),
      this.add
        .text(-350, -12, 'QUICK KEYS', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '13px',
          color: '#ffd45a',
        }),
      this.add
        .text(-350, 10, 'SPACE = play   •   ← → = bet   •   ESC = lobby', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '12px',
          color: '#ffffff',
        }),
      this.add
        .text(340, 0, 'TOUCH FRIENDLY', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '13px',
          color: '#69f59a',
        })
        .setOrigin(1, 0.5),
    ]);
    this.root.add(quick);

    this.root.add(
      this.add
        .text(0, 184, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '12px',
          color: '#ffe49a',
          align: 'center',
          fixedWidth: 720,
        })
        .setOrigin(0.5)
    );

    this.root.add(
      createButton(this, 0, 256, {
        width: 220,
        height: 58,
        label: 'BACK TO CASINO',
        fill: CASINO_COLORS.wine,
        stroke: CASINO_COLORS.gold,
        fontSize: 16,
        onPress: () => this.scene.start('CasinoLobby'),
      })
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
        isPortrait ? this.scale.height * 0.44 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 900 : 1024, isPortrait ? 720 : 760));
  }
}
