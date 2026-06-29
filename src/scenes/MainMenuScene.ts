import Phaser from 'phaser';

const FONT = 'Inter, Arial';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x07111f);
    this.drawBackdrop();
    this.add.existing(this.roundedPanel(640, 286, 720, 250, 34, 0x0f172a, 0.64, 0x38bdf8, 0.22));
    const title = this.add.text(640, 188, 'JUNKYARD EMPIRE', {
      fontFamily: FONT,
      fontSize: '62px',
      color: '#facc15',
      fontStyle: '900'
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 6, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(640, 250, 'Restore forgotten imports. Flip legends. Build a premium auto empire.', {
      fontFamily: FONT,
      fontSize: '21px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: 740 }
    }).setOrigin(0.5);
    const start = this.add.container(640, 430);
    const panel = this.roundedPanel(0, 0, 330, 72, 24, 0xf97316, 0.92, 0xfacc15, 0.4);
    const glow = this.roundedPanel(0, 0, 312, 56, 22, 0xfacc15, 0, 0xfacc15, 0);
    (glow as any).setBlendMode('ADD');
    const label = this.add.text(0, 0, '🏁  START RESTORING', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#fff7ed',
      fontStyle: '900'
    }).setOrigin(0.5);
    start.add([panel, glow, label]).setSize(330, 72).setInteractive({ useHandCursor: true })
      .on('pointerover', () => { (glow as any).setAlpha(0.22); this.tweens.add({ targets: start, scale: 1.045, duration: 130, ease: 'Back.Out' }); })
      .on('pointerout', () => { (glow as any).setAlpha(0); this.tweens.add({ targets: start, scale: 1, duration: 130 }); })
      .on('pointerdown', () => this.tweens.add({ targets: start, scale: 0.96, yoyo: true, duration: 90, onComplete: () => this.scene.start('Game') }));
    this.tweens.add({ targets: start, y: start.y - 5, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(640, 525, 'Autosave • Offline income • Reward containers • Mobile-ready layout', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#bae6fd',
      fontStyle: '700'
    }).setOrigin(0.5);
  }

  private roundedPanel(x: number, y: number, width: number, height: number, radius: number, fill: number, alpha: number, stroke: number, strokeAlpha: number): Phaser.GameObjects.Graphics {
    return this.add.graphics({ x, y })
      .fillStyle(0x020617, 0.24)
      .fillRoundedRect(-width / 2 + 4, -height / 2 + 8, width, height, radius)
      .fillStyle(fill, alpha)
      .fillRoundedRect(-width / 2, -height / 2, width, height, radius)
      .lineStyle(1.5, stroke, strokeAlpha)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }

  private drawBackdrop(): void {
    this.add.circle(160, 115, 270, 0x0ea5e9, 0.09);
    this.add.circle(1110, 95, 245, 0xf97316, 0.08);
    const workshop = this.add.image(640, 560, 'workshop').setScale(1.1);
    this.tweens.add({ targets: workshop, alpha: 0.82, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.image(170, 590, 'scrap_pile').setScale(1.6);
    const container = this.add.image(1110, 590, 'container').setScale(1.25);
    this.tweens.add({ targets: container, y: container.y - 4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const forklift = this.add.image(1030, 470, 'forklift').setScale(1.25);
    this.tweens.add({ targets: forklift, x: forklift.x - 28, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const tow = this.add.image(350, 610, 'tow_truck').setScale(1.0);
    this.tweens.add({ targets: tow, x: tow.x + 20, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const worker = this.add.image(905, 625, 'worker').setScale(0.86);
    this.tweens.add({ targets: worker, y: worker.y - 12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.image(265, 482, 'tire_stack').setScale(1.2);
    this.add.ellipse(640, 675, 1120, 90, 0x020617, 0.35);
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.ellipse(160 + i * 300, 82 + (i % 2) * 28, 140, 34, 0xffffff, 0.08);
      this.tweens.add({ targets: cloud, x: cloud.x + 70, yoyo: true, repeat: -1, duration: 9000 + i * 950 });
    }
  }
}
