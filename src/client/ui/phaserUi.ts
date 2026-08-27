import type { GameObjects, Scene } from 'phaser';
import * as Phaser from 'phaser';
import { feedbackEngine } from '../feedback/FeedbackEngine';

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
  baseAlpha: number;
};

export const formatCredits = (value: number): string =>
  `💵 $${Math.round(value).toLocaleString()}`;

export const createButton = (
  scene: Scene,
  x: number,
  y: number,
  options: ButtonOptions
): GameObjects.Container => {
  const container = scene.add.container(x, y);
  container.setData('enabled', true);
  const shadow = scene.add.rectangle(
    4,
    5,
    options.width,
    options.height,
    0x000000,
    0.32
  );
  const panel = scene.add
    .rectangle(0, 0, options.width, options.height, options.fill, 0.96)
    .setStrokeStyle(2, options.stroke ?? 0xffd54a, 0.72)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(0, 0, options.label, {
      fontFamily: 'Arial Black',
      fontSize: `${options.fontSize ?? 17}px`,
      color: options.textColor ?? '#ffffff',
      align: 'center',
      fixedWidth: options.width - 20,
    })
    .setOrigin(0.5);
  container.setData('managedButton', {
    panel,
    text,
    baseAlpha: 1,
  } satisfies ManagedButtonData);

  panel.on('pointerover', () => {
    if (container.getData('enabled') === false) return;
    panel.setAlpha(1);
    panel.setScale(1.01);
    feedbackEngine.uiHover();
  });
  panel.on('pointerout', () => {
    panel.setAlpha(0.96);
    panel.setScale(1);
  });
  panel.on('pointerdown', () => {
    if (container.getData('enabled') === false) return;
    void feedbackEngine.unlock().then(() => {
      if (container.getData('enabled') === false) return;
      feedbackEngine.uiClick();
      scene.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        yoyo: true,
        duration: 70,
        ease: 'Quad.Out',
      });
      options.onPress();
    });
  });

  container.add([shadow, panel, text]);
  return container;
};

export const setButtonEnabled = (
  button: GameObjects.Container | null,
  enabled: boolean
): void => {
  if (!button) return;
  const data = button.getData('managedButton') as ManagedButtonData | undefined;
  button.setData('enabled', enabled);
  button.setAlpha(enabled ? (data?.baseAlpha ?? 1) : 0.46);
  data?.panel.setAlpha(enabled ? 0.96 : 0.5);
};

export const setButtonLabel = (
  button: GameObjects.Container | null,
  label: string
): void => {
  const data = button?.getData('managedButton') as
    ManagedButtonData | undefined;
  data?.text.setText(label);
};

export const setButtonStroke = (
  button: GameObjects.Container | null,
  stroke: number,
  alpha = 0.72
): void => {
  const data = button?.getData('managedButton') as
    ManagedButtonData | undefined;
  data?.panel.setStrokeStyle(2, stroke, alpha);
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
  graphics.fillGradientStyle(0x050208, 0x10051f, 0x170515, 0x050208, 1);
  graphics.fillRect(0, 0, width, height);

  graphics.fillGradientStyle(0x190a2b, 0x0b1124, 0x260713, 0x0b0612, 0.72);
  graphics.fillRect(0, height * 0.62, width, height * 0.38);
  graphics.lineStyle(2, 0xf4c95d, 0.16);
  graphics.lineBetween(0, height * 0.62, width, height * 0.62);
  graphics.lineStyle(1, 0x29d6ff, 0.08);
  graphics.lineBetween(width * 0.16, 0, width * 0.42, height * 0.62);
  graphics.lineBetween(width * 0.84, 0, width * 0.58, height * 0.62);

  for (let y = height * 0.66; y < height; y += 32) {
    graphics.lineStyle(1, 0xf4c95d, 0.08);
    graphics.lineBetween(0, y, width, y + (height - y) * 0.16);
  }
  for (let x = -width; x < width * 2; x += 72) {
    graphics.lineStyle(1, 0x29d6ff, 0.08);
    graphics.lineBetween(x, height * 0.64, x + width * 0.36, height);
  }
  for (let index = 0; index < 34; index += 1) {
    const x = (index / 27) * width;
    const color =
      index % 4 === 0 ? 0xf4c95d : index % 3 === 0 ? 0x29d6ff : 0xff3d71;
    graphics.fillStyle(color, 0.5);
    graphics.fillRect(x - 5, 18, 10, 3);
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
  const glow = scene.add.circle(0, 4, 74, 0xf4c95d, 0.07);
  const shadow = scene.add.ellipse(2, 72, 118, 26, 0x000000, 0.34);
  const image = fitImage(scene.add.image(0, 0, textureKey), 150, 170);
  mascot.add([glow, shadow, image]);
  scene.tweens.add({
    targets: mascot,
    y: y - 8,
    yoyo: true,
    repeat: -1,
    duration: 1450,
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
