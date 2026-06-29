import Phaser from 'phaser';
import type { Rarity } from '../types/game';

export interface AssetDefinition {
  key: string;
  path: string;
  width: number;
  height: number;
}

const rarityKeys: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const assetManifest: AssetDefinition[] = [
  { key: 'vehicle_body', path: 'assets/junkyard/vehicle_body.svg', width: 256, height: 152 },
  { key: 'dirt_cluster', path: 'assets/junkyard/dirt_cluster.svg', width: 80, height: 48 },
  { key: 'rust_patch', path: 'assets/junkyard/rust_patch.svg', width: 80, height: 40 },
  { key: 'scrap_pile', path: 'assets/junkyard/scrap_pile.svg', width: 208, height: 164 },
  { key: 'tire_stack', path: 'assets/junkyard/tire_stack.svg', width: 128, height: 144 },
  { key: 'container', path: 'assets/junkyard/container.svg', width: 280, height: 148 },
  { key: 'tree', path: 'assets/junkyard/tree.svg', width: 128, height: 168 },
  { key: 'oil_puddle', path: 'assets/junkyard/oil_puddle.svg', width: 140, height: 64 },
  { key: 'forklift', path: 'assets/junkyard/forklift.svg', width: 224, height: 136 },
  { key: 'panel_glow', path: 'assets/ui/panel_glow.svg', width: 500, height: 172 },
  ...rarityKeys.map((rarity) => ({ key: `rarity_${rarity}`, path: `assets/ui/rarity_${rarity}.svg`, width: 72, height: 72 }))
];

export class AssetSystem {
  constructor(private scene: Phaser.Scene) {}

  preload(): void {
    for (const asset of assetManifest) {
      if (this.scene.textures.exists(asset.key)) continue;
      this.scene.load.svg(asset.key, asset.path, { width: asset.width, height: asset.height });
    }
  }

  validate(): void {
    for (const asset of assetManifest) {
      if (!this.scene.textures.exists(asset.key)) {
        console.warn(`[AssetSystem] Missing asset '${asset.key}' at '${asset.path}'. Creating emergency fallback texture.`);
        this.createFallback(asset);
      }
    }
  }

  private createFallback(asset: AssetDefinition): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x1e293b, 1).fillRoundedRect(0, 0, asset.width, asset.height, Math.min(24, asset.height / 4));
    g.lineStyle(4, 0xfacc15, 0.7).strokeRoundedRect(4, 4, asset.width - 8, asset.height - 8, Math.min(20, asset.height / 5));
    g.generateTexture(asset.key, asset.width, asset.height);
    g.destroy();
  }
}
