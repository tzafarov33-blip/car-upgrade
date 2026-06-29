import Phaser from 'phaser';
import { AssetSystem } from '../systems/AssetSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.script('yandex-games-sdk', 'https://yandex.ru/games/sdk/v2');
  }

  create(): void {
    new AssetSystem(this).createTextures();
    this.scene.start('Game');
  }
}
