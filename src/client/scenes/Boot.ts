import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
