import { Boot } from './scenes/Boot';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { CasinoLobby } from './scenes/CasinoLobby';
import { HelpScene } from './scenes/HelpScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { ProfileScene } from './scenes/ProfileScene';
import { UrubuzinhoGame } from './scenes/UrubuzinhoGame';
import { Oncinha777Game } from './scenes/Oncinha777Game';
import { JacareCrashGame } from './scenes/JacareCrashGame';
import { CapivaraRouletteGame } from './scenes/CapivaraRouletteGame';
import { soundEngine } from './audio/SoundEngine';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#07030d',
  scale: {
    // Keep a fixed game resolution but automatically scale it to fit within the available
    // web-view / device while maintaining aspect ratio.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [
    Boot,
    Preloader,
    CasinoLobby,
    UrubuzinhoGame,
    Oncinha777Game,
    JacareCrashGame,
    CapivaraRouletteGame,
    LeaderboardScene,
    ProfileScene,
    HelpScene,
  ],
  input: {
    activePointers: 4,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
};

const startGame = (parent: string) => {
  return new Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  startGame('game-container');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    void soundEngine.suspend();
    return;
  }
  void soundEngine.resume();
});
