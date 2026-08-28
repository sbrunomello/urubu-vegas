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
    // Reddit controls the expanded webview size. RESIZE keeps Phaser's logical
    // canvas aligned with the actual safe viewport on desktop and mobile.
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

const startGame = (parent: string): Game => new Game({ ...config, parent });

let game: Game | null = null;
let refreshTimer: number | null = null;

const refreshGameViewport = (): void => {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    game?.scale.refresh();
  }, 120);
};

document.addEventListener('DOMContentLoaded', () => {
  game = startGame('game-container');
  requestAnimationFrame(() => game?.scale.refresh());
});

// Reddit mobile webviews can change usable height when browser chrome, safe areas
// or device orientation change. Refreshing after those transitions prevents the
// canvas from keeping stale desktop-like dimensions until the next scene change.
window.addEventListener('orientationchange', refreshGameViewport);
window.addEventListener('resize', refreshGameViewport);
window.visualViewport?.addEventListener('resize', refreshGameViewport);
window.addEventListener('pageshow', refreshGameViewport);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    void soundEngine.suspend();
    return;
  }
  refreshGameViewport();
  void soundEngine.resume();
});
