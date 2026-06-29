import Phaser from 'phaser';
import { AssetSystem } from '../systems/AssetSystem';

const FONT = 'Inter, Arial';

export class BootScene extends Phaser.Scene {
  private assets!: AssetSystem;
  private progressText?: Phaser.GameObjects.Text;
  private progressFill?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(0x07111f);
    this.add.circle(250, 130, 260, 0x0ea5e9, 0.1);
    this.add.circle(1060, 130, 260, 0xf97316, 0.08);
    this.add.rectangle(640, 380, 620, 280, 0x0f172a, 0.78).setStrokeStyle(2, 0x38bdf8, 0.25);
    this.add.text(640, 315, 'JUNKYARD EMPIRE', {
      fontFamily: FONT,
      fontSize: '50px',
      color: '#facc15',
      fontStyle: '900'
    }).setOrigin(0.5);
    this.add.text(640, 360, 'Premium import restoration tycoon', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#bae6fd',
      fontStyle: '700'
    }).setOrigin(0.5);
    this.add.rectangle(640, 425, 430, 10, 0x1e293b, 0.9);
    this.progressFill = this.add.rectangle(425, 425, 0, 10, 0xf97316, 0.95).setOrigin(0, 0.5);
    this.progressText = this.add.text(640, 462, 'Loading optimized art assets... 0%', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#e2e8f0',
      fontStyle: '700'
    }).setOrigin(0.5);
    this.assets = new AssetSystem(this);
    this.assets.preload();
    this.load.on('progress', (value: number) => {
      if (this.progressFill) (this.progressFill as any).width = 430 * value;
      this.progressText?.setText(`Loading optimized art assets... ${Math.round(value * 100)}%`);
    });
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
    this.add.rectangle(640, 560, 820, 130, 0x111827, 0.92).setStrokeStyle(2, 0xef4444);
    this.add.text(640, 530, 'The game could not finish loading.', {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#fecaca',
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add.text(640, 570, message, {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#fee2e2',
      align: 'center',
      wordWrap: { width: 760 }
    }).setOrigin(0.5);
  }
}
