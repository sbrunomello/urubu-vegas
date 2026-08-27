import type { GameObjects, Scene } from 'phaser';
import * as Phaser from 'phaser';
import { feedbackEngine } from '../feedback/FeedbackEngine';

export const CASINO_COLORS = {
  ink: 0x06030a,
  panel: 0x100b18,
  panelRaised: 0x171020,
  wine: 0x8f1834,
  wineBright: 0xc5264f,
  gold: 0xffd45a,
  goldSoft: 0xf2bd4d,
  cyan: 0x56e6ff,
  green: 0x69f59a,
  violet: 0x9b7cff,
  pink: 0xff4f87,
  danger: 0xff4b63,
} as const;

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
  baseAlpha: number;
};

export const formatCredits = (value: number): string =>
  `$${Math.round(value).toLocaleString()}`;

export const createButton = (
  scene: Scene,
  x: number,
  y: number,
  options: ButtonOptions
): GameObjects.Container => {
  const container = scene.add.container(x, y);
  container.setData('enabled', true);

  const shadow = scene.add.rectangle(
    0,
    7,
    options.width + 2,
    options.height + 2,
    0x000000,
    0.42
  );
  const glow = scene.add
    .rectangle(0, 1, options.width + 12, options.height + 12, options.stroke ?? CASINO_COLORS.gold, 0.08)
    .setAlpha(0.36);
  const panel = scene.add
    .rectangle(0, 0, options.width, options.height, options.fill, 0.98)
    .setStrokeStyle(2, options.stroke ?? CASINO_COLORS.gold, 0.82)
    .setInteractive({ useHandCursor: true });
  const highlight = scene.add
    .rectangle(0, -options.height / 2 + 3, Math.max(12, options.width - 12), 2, 0xffffff, 0.16)
    .setAlpha(0.7);
  const text = scene.add
    .text(0, 0, options.label, {
      fontFamily: 'Arial Black',
      fontSize: `${options.fontSize ?? 17}px`,
      color: options.textColor ?? '#ffffff',
      align: 'center',
      fixedWidth: options.width - 18,
      stroke: '#050208',
      strokeThickness: 2,
    })
    .setOrigin(0.5);

  container.setData('managedButton', {
    panel,
    text,
    glow,
    highlight,
    baseAlpha: 1,
  } satisfies ManagedButtonData);

  panel.on('pointerover', () => {
    if (container.getData('enabled') === false) return;
    glow.setAlpha(0.72);
    highlight.setAlpha(1);
    container.setScale(1.025);
    feedbackEngine.uiHover();
  });
  panel.on('pointerout', () => {
    glow.setAlpha(0.36);
    highlight.setAlpha(0.7);
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

  container.add([shadow, glow, panel, highlight, text]);
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
  data?.panel.setAlpha(enabled ? 0.98 : 0.5);
  data?.glow.setAlpha(enabled ? 0.36 : 0.05);
  data?.highlight.setAlpha(enabled ? 0.7 : 0.18);
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
  alpha = 0.82
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

  graphics.fillGradientStyle(0x030106, 0x12051e, 0x230913, 0x06030d, 1);
  graphics.fillRect(0, 0, width, height);

  graphics.fillGradientStyle(0x150823, 0x090a17, 0x2b0816, 0x08050f, 0.92);
  graphics.fillRect(0, height * 0.61, width, height * 0.39);

  graphics.fillStyle(0xff315f, 0.035);
  graphics.fillCircle(width * 0.17, height * 0.2, Math.max(120, width * 0.16));
  graphics.fillStyle(0x7a5cff, 0.04);
  graphics.fillCircle(width * 0.84, height * 0.18, Math.max(140, width * 0.18));
  graphics.fillStyle(0xffd45a, 0.025);
  graphics.fillCircle(width * 0.5, height * 0.44, Math.max(170, width * 0.2));

  graphics.lineStyle(2, CASINO_COLORS.gold, 0.18);
  graphics.lineBetween(0, height * 0.61, width, height * 0.61);
  graphics.lineStyle(1, CASINO_COLORS.cyan, 0.075);
  graphics.lineBetween(width * 0.08, 0, width * 0.39, height * 0.61);
  graphics.lineBetween(width * 0.92, 0, width * 0.61, height * 0.61);

  for (let y = height * 0.65; y < height; y += 31) {
    const fade = Math.max(0.025, 0.09 - ((y - height * 0.65) / height) * 0.11);
    graphics.lineStyle(1, CASINO_COLORS.gold, fade);
    graphics.lineBetween(0, y, width, y + (height - y) * 0.12);
  }
  for (let x = -width; x < width * 2; x += 68) {
    graphics.lineStyle(1, CASINO_COLORS.cyan, 0.065);
    graphics.lineBetween(x, height * 0.63, x + width * 0.34, height);
  }

  const bulbColors = [
    CASINO_COLORS.gold,
    CASINO_COLORS.pink,
    CASINO_COLORS.cyan,
    CASINO_COLORS.violet,
  ];
  const bulbCount = Math.max(18, Math.ceil(width / 66));
  for (let index = 0; index < bulbCount; index += 1) {
    const x = ((index + 0.5) / bulbCount) * width;
    const color = bulbColors[index % bulbColors.length] ?? CASINO_COLORS.gold;
    const bulb = scene.add.circle(x, 18, 3, color, 0.76);
    scene.tweens.add({
      targets: bulb,
      alpha: 0.24,
      yoyo: true,
      repeat: -1,
      delay: index * 43,
      duration: 720 + (index % 4) * 110,
      ease: 'Sine.InOut',
    });
  }

  for (let index = 0; index < 20; index += 1) {
    const sparkle = scene.add.circle(
      ((index * 83 + 37) % Math.max(1, width - 20)) + 10,
      ((index * 47 + 54) % Math.max(1, Math.floor(height * 0.54))) + 30,
      index % 3 === 0 ? 2 : 1,
      index % 2 === 0 ? CASINO_COLORS.gold : CASINO_COLORS.cyan,
      0.18
    );
    scene.tweens.add({
      targets: sparkle,
      alpha: 0.58,
      scaleX: 1.8,
      scaleY: 1.8,
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
  const aura = scene.add.circle(0, 4, 78, CASINO_COLORS.gold, 0.055);
  const ring = scene.add
    .circle(0, 4, 70, 0x000000, 0)
    .setStrokeStyle(2, CASINO_COLORS.gold, 0.12);
  const shadow = scene.add.ellipse(2, 74, 126, 28, 0x000000, 0.42);
  const image = fitImage(scene.add.image(0, 0, textureKey), 152, 174);
  mascot.add([aura, ring, shadow, image]);

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
    alpha: 0.13,
    scaleX: 1.16,
    scaleY: 1.16,
    yoyo: true,
    repeat: -1,
    duration: 1180,
    ease: 'Sine.InOut',
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
