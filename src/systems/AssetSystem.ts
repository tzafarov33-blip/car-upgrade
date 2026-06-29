import Phaser from 'phaser';
import { rarityColor } from '../data/catalog';
import type { Rarity } from '../types/game';

export class AssetSystem {
  constructor(private scene: Phaser.Scene) {}

  createTextures(): void {
    this.createVehicleTextures();
    this.createEnvironmentTextures();
    this.createUiTextures();
  }

  private createVehicleTextures(): void {
    if (this.scene.textures.exists('vehicle_body')) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(4, 18, 118, 38, 12);
    g.fillStyle(0xdbeafe, 1).fillRoundedRect(34, 4, 54, 26, 10);
    g.fillStyle(0x111827, 1).fillCircle(31, 58, 13).fillCircle(95, 58, 13);
    g.fillStyle(0x475569, 1).fillCircle(31, 58, 7).fillCircle(95, 58, 7);
    g.fillStyle(0xffffff, 0.55).fillRoundedRect(48, 8, 22, 12, 5);
    g.generateTexture('vehicle_body', 128, 76);
    g.clear();
    g.fillStyle(0x3f2b1d, 0.78).fillCircle(6, 8, 5).fillCircle(19, 11, 7).fillCircle(31, 7, 4);
    g.generateTexture('dirt_cluster', 40, 24);
    g.clear();
    g.fillStyle(0x7c2d12, 0.86).fillRoundedRect(0, 0, 34, 10, 5).fillCircle(9, 12, 5).fillCircle(25, 11, 4);
    g.generateTexture('rust_patch', 40, 20);
    g.clear();
    Object.entries(rarityColor).forEach(([rarity, color]) => {
      this.drawStar(g, 18, 18, 5, 7, 16, color);
      g.lineStyle(2, 0xffffff, 0.85).strokeCircle(18, 18, 17);
      g.generateTexture(`rarity_${rarity as Rarity}`, 36, 36);
      g.clear();
    });
    g.destroy();
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, points: number, innerRadius: number, outerRadius: number, color: number): void {
    const step = Math.PI / points;
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + i * step;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) graphics.moveTo(px, py);
      else graphics.lineTo(px, py);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private createEnvironmentTextures(): void {
    const g = this.scene.add.graphics();
    const make = (key: string, draw: () => void, w: number, h: number) => {
      if (this.scene.textures.exists(key)) return;
      draw();
      g.generateTexture(key, w, h);
      g.clear();
    };
    make('scrap_pile', () => {
      g.fillStyle(0x475569, 1).fillTriangle(8, 72, 48, 18, 94, 72);
      g.fillStyle(0x94a3b8, 1).fillRoundedRect(20, 42, 44, 12, 3).fillRoundedRect(44, 27, 34, 10, 3);
      g.fillStyle(0xf97316, 1).fillCircle(63, 52, 8);
    }, 104, 82);
    make('tire_stack', () => {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0x111827, 1).fillEllipse(31, 58 - i * 14, 54, 18);
        g.fillStyle(0x334155, 1).fillEllipse(31, 58 - i * 14, 28, 8);
      }
    }, 64, 72);
    make('container', () => {
      g.fillStyle(0x1d4ed8, 1).fillRoundedRect(0, 0, 138, 70, 7);
      g.lineStyle(3, 0x93c5fd, 0.5);
      for (let x = 12; x < 132; x += 18) g.lineBetween(x, 6, x, 64);
      g.strokeRoundedRect(4, 4, 130, 62, 6);
    }, 140, 74);
    make('tree', () => {
      g.fillStyle(0x854d0e, 1).fillRoundedRect(23, 44, 13, 36, 6);
      g.fillStyle(0x166534, 1).fillCircle(28, 34, 25).fillCircle(14, 47, 17).fillCircle(45, 49, 18);
    }, 64, 84);
    make('oil_puddle', () => {
      g.fillStyle(0x020617, 0.75).fillEllipse(34, 16, 66, 25);
      g.fillStyle(0x22d3ee, 0.23).fillEllipse(28, 12, 27, 8);
    }, 70, 32);
    make('forklift', () => {
      g.fillStyle(0xf59e0b, 1).fillRoundedRect(8, 18, 58, 34, 8);
      g.fillStyle(0x111827, 1).fillCircle(22, 54, 10).fillCircle(58, 54, 10);
      g.lineStyle(4, 0x334155, 1).lineBetween(75, 8, 75, 58).lineBetween(75, 58, 103, 58);
    }, 112, 68);
    g.destroy();
  }

  private createUiTextures(): void {
    if (this.scene.textures.exists('panel_glow')) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0x0f172a, 0.92).fillRoundedRect(0, 0, 250, 86, 18);
    g.lineStyle(2, 0x38bdf8, 0.35).strokeRoundedRect(2, 2, 246, 82, 16);
    g.generateTexture('panel_glow', 250, 86);
    g.destroy();
  }
}
