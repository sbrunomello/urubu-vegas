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
  ['URUBUZINHO', 'WILD completes lines. SCATTER pays anywhere.', CASINO_COLORS.violet],
  ['ONCINHA 777', 'Same five reels, louder glamour, different paytable.', 0xff9f36],
  ['JACARE CRASH', 'Start. Watch the multiplier. Cash out before CHOMP.', CASINO_COLORS.green],
  ['CAPIVARA', 'Pick a side or number, then let the wheel decide.', CASINO_COLORS.pink],
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
      createVegasMarquee(this, 0, -302, 'HOUSE RULES', {
        width: 650,
        height: 92,
        titleSize: 44,
        subtitle: 'KNOW THE TABLE. BLAME YOURSELF LATER.',
        compact: true,
        accent: CASINO_COLORS.ruby,
      })
    );

    this.root.add(
      createCabinetFrame(this, 0, -42, 850, 430, CASINO_COLORS.gold)
    );

    this.root.add(
      this.add
        .text(-356, -214, 'TABLE GUIDE', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#bfae91',
          letterSpacing: 2,
        })
    );

    RULES.forEach(([title, description, accent], index) => {
      const y = -150 + index * 72;
      const row = this.add.container(0, y);
      row.add([
        this.add.rectangle(0, 0, 744, 58, 0x0b0810, 0.82),
        this.add.rectangle(-366, 0, 5, 40, accent, 0.94),
        this.add.circle(-330, 0, 13, accent, 0.13).setStrokeStyle(1, accent, 0.45),
        this.add
          .text(-330, 0, String(index + 1), {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '12px',
            color: '#fff8ef',
          })
          .setOrigin(0.5),
        this.add
          .text(-300, -11, title, {
            fontFamily: VEGAS_FONT_DISPLAY,
            fontSize: '17px',
            color: '#fff8ef',
            fixedWidth: 190,
          }),
        this.add
          .text(-90, 0, description, {
            fontFamily: VEGAS_FONT_BODY,
            fontSize: '12px',
            color: '#d8ccd7',
            fixedWidth: 390,
          })
          .setOrigin(0, 0.5),
      ]);
      this.root?.add(row);
    });

    const quick = this.add.container(0, 140);
    quick.add([
      this.add
        .rectangle(0, 0, 744, 52, 0x150a12, 0.9)
        .setStrokeStyle(1, CASINO_COLORS.gold, 0.22),
      this.add
        .text(-350, -9, 'QUICK KEYS', {
          fontFamily: VEGAS_FONT_DISPLAY,
          fontSize: '11px',
          color: '#ffd45a',
        }),
      this.add
        .text(-350, 10, 'SPACE play   •   ← → bet   •   ESC lobby', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '10px',
          color: '#d9cedb',
        }),
      this.add
        .text(350, 0, 'TAP CONTROLS ON MOBILE', {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#69f59a',
          letterSpacing: 1,
        })
        .setOrigin(1, 0.5),
    ]);
    this.root.add(quick);

    this.root.add(
      this.add
        .text(0, 186, appState.disclaimer, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: '11px',
          color: '#ffe49a',
          align: 'center',
          fixedWidth: 720,
        })
        .setOrigin(0.5)
    );

    this.root.add(
      createButton(this, 0, 246, {
        width: 220,
        height: 54,
        label: 'BACK TO CASINO',
        fill: CASINO_COLORS.wine,
        stroke: CASINO_COLORS.gold,
        fontSize: 15,
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
        isPortrait ? this.scale.height * 0.45 : this.scale.height / 2
      )
      .setScale(safeScale(this, isPortrait ? 900 : 1024, isPortrait ? 700 : 760));
  }
}
