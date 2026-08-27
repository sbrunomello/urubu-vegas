import type { GameObjects, Scene } from 'phaser';
import * as Phaser from 'phaser';
import { feedbackEngine } from '../feedback/FeedbackEngine';

export const CASINO_COLORS = {
  ink: 0x050207,
  panel: 0x100911,
  panelRaised: 0x1a0e18,
  velvet: 0x260813,
  wine: 0x80152d,
  wineBright: 0xc32249,
  ruby: 0xe8335f,
  gold: 0xffd45a,
  goldSoft: 0xe4ad3f,
  champagne: 0xffe8a3,
  cyan: 0x58e6ff,
  green: 0x69f59a,
  emerald: 0x0b7f4d,
  violet: 0x9b7cff,
  pink: 0xff4f87,
  danger: 0xff4b63,
} as const;

export const VEGAS_FONT_DISPLAY =
  'Impact, Haettenschweiler, "Arial Black", "Franklin Gothic Heavy", sans-serif';
export const VEGAS_FONT_BODY =
  'Trebuchet MS, Arial, Helvetica, sans-serif';
export const VEGAS_FONT_SERIF =
  'Georgia, "Times New Roman", serif';

export type ButtonOptions = {
  width: number;
  height: number;
  label: string;
  fill: number;
  stroke?: number;
  textColor?: string;
  fontSize?: number;
  onPress: () => void;
};

type ManagedButtonData = {
  panel: GameObjects.Rectangle;
  text: GameObjects.Text;
  glow: GameObjects.Rectangle;
  highlight: GameObjects.Rectangle;
  innerStroke: GameObjects.Rectangle;
  baseAlpha: number;
};

export type MarqueeOptions = {
  width?: number;
  height?: number;
  accent?: number;
  subtitle?: string;
  titleSize?: number;
  compact?: boolean;
};

export const formatCredits = (value: number): string =>
  `$${Math.round(value).toLocaleString()}`;

const pulse = (
  scene: Scene,
  target: Phaser.GameObjects.GameObject,
  alphaFrom: number,
  alphaTo: number,
  duration: number,
  delay = 0
): void => {
  const alphaTarget = target as Phaser.GameObjects.Components.Alpha;
  alphaTarget.setAlpha(alphaFrom);
  scene.tweens.add({
    targets: target,
    alpha: alphaTo,
    yoyo: true,
    repeat: -1,
    duration,
    delay,
    ease: 'Sine.InOut',
  });
};

export const addChasingBulbs = (
  scene: Scene,
  container: GameObjects.Container,
  width: number,
  height: number,
  accent = CASINO_COLORS.gold,
  density = 42
): void => {
  const halfW = width / 2;
  const halfH = height / 2;
  const positions: Array<{ x: number; y: number }> = [];
  const horizontalCount = Math.max(4, Math.floor(width / density));
  const verticalCount = Math.max(2, Math.floor(height / density));

  for (let index = 0; index <= horizontalCount; index += 1) {
    const x = -halfW + (width * index) / horizontalCount;
    positions.push({ x, y: -halfH });
    positions.push({ x, y: halfH });
  }
  for (let index = 1; index < verticalCount; index += 1) {
    const y = -halfH + (height * index) / verticalCount;
    positions.push({ x: -halfW, y });
    positions.push({ x: halfW, y });
  }

  positions.forEach((position, index) => {
    const halo = scene.add.circle(position.x, position.y, 6, accent, 0.08);
    const bulb = scene.add.circle(
      position.x,
      position.y,
      index % 3 === 0 ? 3.4 : 2.8,
      index % 4 === 0 ? CASINO_COLORS.champagne : accent,
      0.92
    );
    container.add([halo, bulb]);
    pulse(scene, halo, 0.05, 0.28, 540, index * 55);
    pulse(scene, bulb, 0.38, 1, 540, index * 55);
  });
};

export const createVegasMarquee = (
  scene: Scene,
  x: number,
  y: number,
  title: string,
  options: MarqueeOptions = {}
): GameObjects.Container => {
  const width = options.width ?? 700;
  const height = options.height ?? 114;
  const accent = options.accent ?? CASINO_COLORS.ruby;
  const compact = options.compact ?? false;
  const titleSize = options.titleSize ?? (compact ? 42 : 58);
  const sign = scene.add.container(x, y);

  const backGlow = scene.add.rectangle(0, 8, width + 24, height + 26, accent, 0.08);
  const shadow = scene.add.rectangle(0, 10, width + 8, height + 8, 0x000000, 0.52);
  const outer = scene.add
    .rectangle(0, 0, width, height, CASINO_COLORS.goldSoft, 0.96)
    .setStrokeStyle(2, CASINO_COLORS.champagne, 0.72);
  const velvet = scene.add
    .rectangle(0, 0, width - 12, height - 12, CASINO_COLORS.velvet, 0.99)
    .setStrokeStyle(2, accent, 0.9);
  const inner = scene.add
    .rectangle(0, 0, width - 30, height - 30, 0x09040a, 0.94)
    .setStrokeStyle(1, CASINO_COLORS.gold, 0.35);
  const shine = scene.add.rectangle(
    0,
    -height / 2 + 12,
    width - 34,
    2,
    0xffffff,
    0.18
  );

  const titleShadow = scene.add
    .text(3, 5, title, {
      fontFamily: VEGAS_FONT_DISPLAY,
      fontSize: `${titleSize}px`,
      color: '#1b0209',
      align: 'center',
      fixedWidth: width - 58,
    })
    .setOrigin(0.5);
  const titleGlow = scene.add
    .text(0, 0, title, {
      fontFamily: VEGAS_FONT_DISPLAY,
      fontSize: `${titleSize}px`,
      color: '#ff335f',
      stroke: '#ff315e',
      strokeThickness: 10,
      align: 'center',
      fixedWidth: width - 58,
    })
    .setOrigin(0.5)
    .setAlpha(0.2);
  const titleText = scene.add
    .text(0, options.subtitle ? -9 : 0, title, {
      fontFamily: VEGAS_FONT_DISPLAY,
      fontSize: `${titleSize}px`,
      color: '#fff8e9',
      stroke: '#8b1330',
      strokeThickness: 6,
      align: 'center',
      fixedWidth: width - 58,
      letterSpacing: compact ? 1 : 2,
    })
    .setOrigin(0.5);

  sign.add([backGlow, shadow, outer, velvet, inner, shine, titleShadow, titleGlow, titleText]);

  if (options.subtitle) {
    sign.add(
      scene.add
        .text(0, height / 2 - 22, options.subtitle, {
          fontFamily: VEGAS_FONT_BODY,
          fontSize: compact ? '10px' : '12px',
          fontStyle: 'bold',
          color: '#ffd45a',
          align: 'center',
          fixedWidth: width - 84,
          letterSpacing: 1,
        })
        .setOrigin(0.5)
    );
  }

  addChasingBulbs(scene, sign, width - 6, height - 6, CASINO_COLORS.gold, compact ? 52 : 44);
  pulse(scene, backGlow, 0.045, 0.13, 980);
  pulse(scene, titleGlow, 0.12, 0.28, 1050);
  return sign;
};

export const createHudPlaque = (
  scene: Scene,
  x: number,
  y: number,
  label: string,
  value: string,
  accent = CASINO_COLORS.gold,
  width = 196
): GameObjects.Container => {
  const plaque = scene.add.container(x, y);
  const glow = scene.add.rectangle(0, 3, width + 10, 52, accent, 0.055);
  const frame = scene.add
    .rectangle(0, 0, width, 46, CASINO_COLORS.goldSoft, 0.92)
    .setStrokeStyle(1, CASINO_COLORS.champagne, 0.5);
  const panel = scene.add.rectangle(0, 0, width - 5, 41, 0x0b070d, 0.98);
  const shine = scene.add.rectangle(0, -17, width - 18, 1, 0xffffff, 0.16);
  plaque.add([
    glow,
    frame,
    panel,
    shine,
    scene.add
      .text(-width / 2 + 12, -9, label, {
        fontFamily: VEGAS_FONT_BODY,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#bfae91',
        letterSpacing: 1,
      }),
    scene.add
      .text(-width / 2 + 12, 7, value, {
        fontFamily: VEGAS_FONT_DISPLAY,
        fontSize: '17px',
        color: '#fff2bd',
        fixedWidth: width - 24,
      })
      .setOrigin(0, 0.5),
  ]);
  return plaque;
};

export const createCabinetFrame = (
  scene: Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent = CASINO_COLORS.gold
): GameObjects.Container => {
  const cabinet = scene.add.container(x, y);
  const aura = scene.add.rectangle(0, 8, width + 30, height + 30, accent, 0.045);
  const shadow = scene.add.rectangle(0, 12, width + 10, height + 10, 0x000000, 0.6);
  const outer = scene.add
    .rectangle(0, 0, width, height, CASINO_COLORS.goldSoft, 0.98)
    .setStrokeStyle(2, CASINO_COLORS.champagne, 0.54);
  const blackTrim = scene.add.rectangle(0, 0, width - 8, height - 8, 0x08060a, 1);
  const inner = scene.add
    .rectangle(0, 0, width - 22, height - 22, CASINO_COLORS.panelRaised, 0.99)
    .setStrokeStyle(2, accent, 0.66);
  const bevelTop = scene.add.rectangle(0, -height / 2 + 12, width - 34, 3, 0xffffff, 0.16);
  const bevelBottom = scene.add.rectangle(0, height / 2 - 12, width - 34, 2, accent, 0.28);
  const leftLed = scene.add.rectangle(-width / 2 + 6, 0, 3, height - 22, accent, 0.7);
  const rightLed = scene.add.rectangle(width / 2 - 6, 0, 3, height - 22, accent, 0.7);
  cabinet.add([
    aura,
    shadow,
    outer,
    blackTrim,
    inner,
    bevelTop,
    bevelBottom,
    leftLed,
    rightLed,
  ]);
  pulse(scene, aura, 0.03, 0.12, 1100);
  pulse(scene, leftLed, 0.4, 0.95, 760);
  pulse(scene, rightLed, 0.95, 0.4, 760, 210);
  return cabinet;
};

export const createButton = (
  scene: Scene,
  x: number,
  y: number,
  options: ButtonOptions
): GameObjects.Container => {
  const container = scene.add.container(x, y);
  container.setData('enabled', true);

  const accent = options.stroke ?? CASINO_COLORS.gold;
  const shadow = scene.add.rectangle(
    0,
    7,
    options.width + 5,
    options.height + 5,
    0x000000,
    0.5
  );
  const glow = scene.add
    .rectangle(0, 1, options.width + 16, options.height + 16, accent, 0.08)
    .setAlpha(0.3);
  const outerTrim = scene.add
    .rectangle(0, 0, options.width + 2, options.height + 2, CASINO_COLORS.goldSoft, 0.9)
    .setStrokeStyle(1, CASINO_COLORS.champagne, 0.5);
  const panel = scene.add
    .rectangle(0, 0, options.width - 4, options.height - 4, options.fill, 0.99)
    .setStrokeStyle(2, accent, 0.92)
    .setInteractive({ useHandCursor: true });
  const innerStroke = scene.add
    .rectangle(0, 0, options.width - 12, options.height - 12, 0x000000, 0)
    .setStrokeStyle(1, 0xffffff, 0.08);
  const highlight = scene.add
    .rectangle(0, -options.height / 2 + 6, Math.max(12, options.width - 20), 2, 0xffffff, 0.2)
    .setAlpha(0.72);
  const text = scene.add
    .text(0, 0, options.label, {
      fontFamily: VEGAS_FONT_DISPLAY,
      fontSize: `${options.fontSize ?? 17}px`,
      color: options.textColor ?? '#fffaf0',
      align: 'center',
      fixedWidth: options.width - 18,
      stroke: '#050208',
      strokeThickness: 2,
      letterSpacing: 0.5,
    })
    .setOrigin(0.5);

  container.setData('managedButton', {
    panel,
    text,
    glow,
    highlight,
    innerStroke,
    baseAlpha: 1,
  } satisfies ManagedButtonData);

  panel.on('pointerover', () => {
    if (container.getData('enabled') === false) return;
    glow.setAlpha(0.72);
    highlight.setAlpha(1);
    innerStroke.setStrokeStyle(1, 0xffffff, 0.18);
    container.setScale(1.025);
    feedbackEngine.uiHover();
  });
  panel.on('pointerout', () => {
    glow.setAlpha(0.3);
    highlight.setAlpha(0.72);
    innerStroke.setStrokeStyle(1, 0xffffff, 0.08);
    container.setScale(1);
  });
  panel.on('pointerdown', () => {
    if (container.getData('enabled') === false) return;
    void feedbackEngine.unlock().then(() => {
      if (container.getData('enabled') === false) return;
      feedbackEngine.uiClick();
      scene.tweens.add({
        targets: container,
        scaleX: 0.965,
        scaleY: 0.965,
        yoyo: true,
        duration: 72,
        ease: 'Quad.Out',
      });
      options.onPress();
    });
  });

  container.add([shadow, glow, outerTrim, panel, innerStroke, highlight, text]);
  return container;
};

export const setButtonEnabled = (
  button: GameObjects.Container | null,
  enabled: boolean
): void => {
  if (!button) return;
  const data = button.getData('managedButton') as ManagedButtonData | undefined;
  button.setData('enabled', enabled);
  button.setAlpha(enabled ? (data?.baseAlpha ?? 1) : 0.4);
  data?.panel.setAlpha(enabled ? 0.99 : 0.5);
  data?.glow.setAlpha(enabled ? 0.3 : 0.04);
  data?.highlight.setAlpha(enabled ? 0.72 : 0.16);
  data?.innerStroke.setAlpha(enabled ? 1 : 0.25);
};

export const setButtonLabel = (
  button: GameObjects.Container | null,
  label: string
): void => {
  const data = button?.getData('managedButton') as
    | ManagedButtonData
    | undefined;
  data?.text.setText(label);
};

export const setButtonStroke = (
  button: GameObjects.Container | null,
  stroke: number,
  alpha = 0.92
): void => {
  const data = button?.getData('managedButton') as
    | ManagedButtonData
    | undefined;
  data?.panel.setStrokeStyle(2, stroke, alpha);
  data?.glow.setFillStyle(stroke, 0.08);
};

export const fitImage = (
  image: GameObjects.Image,
  maxWidth: number,
  maxHeight: number
): GameObjects.Image => {
  const sourceWidth = image.width || maxWidth;
  const sourceHeight = image.height || maxHeight;
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return image.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
};

export const drawCasinoBackdrop = (scene: Scene): GameObjects.Graphics => {
  const { width, height } = scene.scale;
  const graphics = scene.add.graphics();

  graphics.fillGradientStyle(0x020104, 0x110417, 0x260913, 0x07030a, 1);
  graphics.fillRect(0, 0, width, height);

  // Velvet wall panels.
  graphics.fillStyle(0x310817, 0.22);
  graphics.fillCircle(width * 0.16, height * 0.21, Math.max(150, width * 0.18));
  graphics.fillStyle(0x1b0a31, 0.28);
  graphics.fillCircle(width * 0.84, height * 0.17, Math.max(180, width * 0.2));
  graphics.fillStyle(0xffd45a, 0.025);
  graphics.fillCircle(width * 0.5, height * 0.38, Math.max(190, width * 0.22));

  // Gold architectural trim.
  graphics.lineStyle(2, CASINO_COLORS.goldSoft, 0.16);
  graphics.lineBetween(0, height * 0.61, width, height * 0.61);
  graphics.lineStyle(1, CASINO_COLORS.goldSoft, 0.08);
  graphics.lineBetween(width * 0.08, 0, width * 0.38, height * 0.61);
  graphics.lineBetween(width * 0.92, 0, width * 0.62, height * 0.61);

  // Soft theatrical spotlights.
  graphics.fillStyle(CASINO_COLORS.champagne, 0.022);
  graphics.fillTriangle(width * 0.12, 0, width * 0.39, height * 0.62, width * 0.53, height * 0.62);
  graphics.fillStyle(CASINO_COLORS.pink, 0.018);
  graphics.fillTriangle(width * 0.88, 0, width * 0.48, height * 0.62, width * 0.66, height * 0.62);

  // Casino carpet: deep burgundy with a gold/cyan diamond lattice.
  graphics.fillGradientStyle(0x250713, 0x0b1122, 0x310714, 0x0b0711, 0.96);
  graphics.fillRect(0, height * 0.61, width, height * 0.39);
  for (let y = height * 0.64; y < height + 40; y += 36) {
    graphics.lineStyle(1, CASINO_COLORS.goldSoft, 0.07);
    graphics.lineBetween(0, y, width, y + 54);
    graphics.lineStyle(1, CASINO_COLORS.cyan, 0.045);
    graphics.lineBetween(0, y + 54, width, y);
  }
  for (let x = -width; x < width * 2; x += 78) {
    graphics.lineStyle(1, CASINO_COLORS.goldSoft, 0.07);
    graphics.lineBetween(x, height * 0.61, x + width * 0.33, height);
    graphics.lineStyle(1, CASINO_COLORS.cyan, 0.045);
    graphics.lineBetween(x + 42, height * 0.61, x - width * 0.18, height);
  }

  // Atomic-age starbursts: classic Vegas language without copying a property.
  const starbursts = [
    { x: width * 0.08, y: height * 0.12, color: CASINO_COLORS.gold },
    { x: width * 0.91, y: height * 0.2, color: CASINO_COLORS.pink },
  ];
  starbursts.forEach((star, starIndex) => {
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 8 + starIndex * 0.2;
      const length = ray % 2 === 0 ? 22 : 14;
      graphics.lineStyle(1, star.color, 0.12);
      graphics.lineBetween(
        star.x,
        star.y,
        star.x + Math.cos(angle) * length,
        star.y + Math.sin(angle) * length
      );
    }
    graphics.fillStyle(star.color, 0.45);
    graphics.fillCircle(star.x, star.y, 2);
  });

  // Animated ceiling bulbs and floating glints.
  const bulbColors = [
    CASINO_COLORS.gold,
    CASINO_COLORS.pink,
    CASINO_COLORS.cyan,
    CASINO_COLORS.violet,
  ];
  const bulbCount = Math.max(18, Math.ceil(width / 62));
  for (let index = 0; index < bulbCount; index += 1) {
    const x = ((index + 0.5) / bulbCount) * width;
    const color = bulbColors[index % bulbColors.length] ?? CASINO_COLORS.gold;
    const halo = scene.add.circle(x, 17, 7, color, 0.055);
    const bulb = scene.add.circle(x, 17, 2.6, color, 0.76);
    pulse(scene, halo, 0.03, 0.18, 600, index * 45);
    pulse(scene, bulb, 0.28, 0.94, 600, index * 45);
  }

  for (let index = 0; index < 18; index += 1) {
    const sparkle = scene.add.circle(
      ((index * 83 + 37) % Math.max(1, width - 20)) + 10,
      ((index * 47 + 54) % Math.max(1, Math.floor(height * 0.54))) + 30,
      index % 4 === 0 ? 2 : 1,
      index % 3 === 0 ? CASINO_COLORS.gold : CASINO_COLORS.cyan,
      0.16
    );
    scene.tweens.add({
      targets: sparkle,
      alpha: 0.54,
      scaleX: 1.9,
      scaleY: 1.9,
      yoyo: true,
      repeat: -1,
      delay: index * 71,
      duration: 900 + (index % 5) * 160,
      ease: 'Sine.InOut',
    });
  }

  return graphics;
};

export const safeScale = (
  scene: Scene,
  baseWidth = 1024,
  baseHeight = 768
): number =>
  Math.min(
    scene.scale.width / baseWidth,
    scene.scale.height / baseHeight,
    1.08
  );

export const addMascot = (
  scene: Scene,
  x: number,
  y: number,
  scale = 1,
  textureKey = 'mascot-urubu'
): GameObjects.Container => {
  const mascot = scene.add.container(x, y).setScale(scale);
  const aura = scene.add.circle(0, 4, 82, CASINO_COLORS.gold, 0.045);
  const ringA = scene.add
    .circle(0, 4, 72, 0x000000, 0)
    .setStrokeStyle(2, CASINO_COLORS.gold, 0.14);
  const ringB = scene.add
    .circle(0, 4, 62, 0x000000, 0)
    .setStrokeStyle(1, CASINO_COLORS.pink, 0.09);
  const shadow = scene.add.ellipse(2, 74, 128, 28, 0x000000, 0.48);
  const image = fitImage(scene.add.image(0, 0, textureKey), 156, 178);
  mascot.add([aura, ringA, ringB, shadow, image]);

  scene.tweens.add({
    targets: mascot,
    y: y - 7,
    yoyo: true,
    repeat: -1,
    duration: 1650,
    ease: 'Sine.InOut',
  });
  scene.tweens.add({
    targets: aura,
    alpha: 0.12,
    scaleX: 1.18,
    scaleY: 1.18,
    yoyo: true,
    repeat: -1,
    duration: 1180,
    ease: 'Sine.InOut',
  });
  scene.tweens.add({
    targets: ringB,
    rotation: Math.PI * 2,
    repeat: -1,
    duration: 9000,
    ease: 'Linear',
  });
  return mascot;
};

export const makeKey = (
  scene: Scene,
  keyCode: number,
  action: () => void
): void => {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  const key = keyboard.addKey(keyCode);
  key.on('down', action);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    key.off('down', action)
  );
};
