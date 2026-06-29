import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x101827);
    this.drawBackdrop();
    this.add.text(640, 150, 'JUNKYARD EMPIRE', {
      fontFamily: 'Arial',
      fontSize: '58px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(640, 216, 'Build your junkyard. Restore legends. Become the richest car tycoon.', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#e2e8f0'
    }).setOrigin(0.5);
    const start = this.add.container(640, 438);
    const panel = this.add.image(0, 0, 'panel_glow').setScale(1.28, 0.82).setTint(0xf59e0b);
    const label = this.add.text(0, 0, 'START RESTORING', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#fff7ed',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    start.add([panel, label]).setSize(320, 72).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.tweens.add({ targets: start, scale: 1.05, duration: 100 }))
      .on('pointerout', () => this.tweens.add({ targets: start, scale: 1, duration: 100 }))
      .on('pointerdown', () => this.scene.start('Game'));
    this.add.text(640, 520, 'Autosave • Offline income • Optional Yandex rewards', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#bae6fd'
    }).setOrigin(0.5);
  }

  private drawBackdrop(): void {
    this.add.image(170, 590, 'scrap_pile').setScale(1.6);
    this.add.image(1110, 590, 'container').setScale(1.25);
    this.add.image(1030, 470, 'forklift').setScale(1.25);
    this.add.image(265, 482, 'tire_stack').setScale(1.2);
    this.add.ellipse(640, 675, 1120, 90, 0x020617, 0.35);
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.ellipse(140 + i * 260, 80 + (i % 2) * 28, 140, 34, 0xffffff, 0.1);
      this.tweens.add({ targets: cloud, x: cloud.x + 80, yoyo: true, repeat: -1, duration: 8000 + i * 900 });
    }
  }
}
