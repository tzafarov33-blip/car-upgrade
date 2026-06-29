import Phaser from 'phaser';
import { AssetSystem } from '../systems/AssetSystem';

const FONT = 'Inter, Arial';

export class BootScene extends Phaser.Scene {
  private assets!: AssetSystem;
  private progressText?: Phaser.GameObjects.Text;
  private progressFill?: Phaser.GameObjects.Graphics;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(0x07111f);
    this.add.circle(250, 130, 260, 0x0ea5e9, 0.1);
    this.add.circle(1060, 130, 260, 0xf97316, 0.08);
    this.add.existing(this.roundedPanel(640, 380, 620, 280, 30, 0x0f172a, 0.78, 0x38bdf8, 0.25));
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
    this.add.existing(this.roundedPanel(640, 425, 430, 10, 5, 0x1e293b, 0.9, 0x38bdf8, 0.1));
    this.progressFill = this.add.graphics();
    this.progressText = this.add.text(640, 462, 'Loading optimized art assets... 0%', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#e2e8f0',
      fontStyle: '700'
    }).setOrigin(0.5);
    this.assets = new AssetSystem(this);
    this.assets.preload();
    this.load.on('progress', (value: number) => {
      this.drawProgress(value);
      this.progressText?.setText(`Loading optimized art assets... ${Math.round(value * 100)}%`);
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

  private drawProgress(value: number): void {
    if (!this.progressFill) return;
    this.progressFill.clear();
    this.progressFill.fillStyle(0xf97316, 0.95).fillRoundedRect(425, 420, 430 * Math.max(0, Math.min(1, value)), 10, 5);
  }

  private roundedPanel(x: number, y: number, width: number, height: number, radius: number, fill: number, alpha: number, stroke: number, strokeAlpha: number): Phaser.GameObjects.Graphics {
    return this.add.graphics()
      .fillStyle(0x020617, 0.22)
      .fillRoundedRect(x - width / 2 + 4, y - height / 2 + 8, width, height, radius)
      .fillStyle(fill, alpha)
      .fillRoundedRect(x - width / 2, y - height / 2, width, height, radius)
      .lineStyle(1.5, stroke, strokeAlpha)
      .strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  }

  private showBootError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.add.existing(this.roundedPanel(640, 560, 820, 130, 24, 0x111827, 0.92, 0xef4444, 0.75));
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
