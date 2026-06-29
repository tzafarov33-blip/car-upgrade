import Phaser from 'phaser';

export class ParticlePool {
  private sparks: Phaser.GameObjects.Arc[] = [];

  constructor(private scene: Phaser.Scene, size = 80) {
    for (let i = 0; i < size; i++) {
      const spark = scene.add.circle(-100, -100, 3, 0xfbbf24).setVisible(false);
      this.sparks.push(spark);
    }
  }

  burst(x: number, y: number, color = 0xfbbf24, count = 12): void {
    for (let i = 0; i < count; i++) {
      const spark = this.sparks[i % this.sparks.length];
      spark.setPosition(x, y).setFillStyle(color, 1).setAlpha(1).setVisible(true);
      this.scene.tweens.killTweensOf(spark);
      this.scene.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-75, 75),
        y: y + Phaser.Math.Between(-55, 45),
        alpha: 0,
        scale: 0.25,
        duration: 420,
        onComplete: () => spark.setVisible(false).setScale(1)
      });
    }
  }
}
