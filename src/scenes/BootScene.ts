import Phaser from 'phaser';
import { AssetSystem } from '../systems/AssetSystem';

export class BootScene extends Phaser.Scene {
  private assets!: AssetSystem;
  private progressText?: Phaser.GameObjects.Text;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(0x0f172a);
    this.add.text(640, 318, 'JUNKYARD EMPIRE', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.progressText = this.add.text(640, 386, 'Loading commercial art assets...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#e2e8f0'
    }).setOrigin(0.5);
    this.assets = new AssetSystem(this);
    this.assets.preload();
    this.load.on('progress', (value: number) => this.progressText?.setText(`Loading commercial art assets... ${Math.round(value * 100)}%`));
    this.load.on('loaderror', (file: { key?: string; src?: string }) => {
      console.warn(`[BootScene] Asset failed to load: ${file.key ?? 'unknown'} ${file.src ?? ''}`);
    });
  }

  create(): void {
    try {
      this.assets.validate();
      this.scene.start('MainMenu');
    } catch (error) {
      console.error('[BootScene] Failed to initialize assets', error);
      this.showBootError(error);
    }
  }

  private showBootError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.add.rectangle(640, 530, 820, 130, 0x111827, 0.92).setStrokeStyle(2, 0xef4444);
    this.add.text(640, 500, 'The game could not finish loading.', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#fecaca',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(640, 540, message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fee2e2',
      align: 'center',
      wordWrap: { width: 760 }
    }).setOrigin(0.5);
  }
}
