import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#game-root');

function showFatal(message: string): void {
  const target = root ?? document.body;
  target.innerHTML = `<div class="fatal-screen"><h1>Junkyard Empire</h1><p>${message}</p><small>Open the browser console for technical details.</small></div>`;
}

window.addEventListener('error', (event) => {
  console.error('[Runtime Error]', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

try {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: 1280,
    height: 760,
    backgroundColor: '#111827',
    scene: [BootScene, MainMenuScene, GameScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { pixelArt: false, antialias: true },
    fps: { target: 60, forceSetTimeOut: true },
    audio: { disableWebAudio: false }
  });
} catch (error) {
  console.error('[Phaser Boot Failure]', error);
  showFatal(error instanceof Error ? error.message : String(error));
}
