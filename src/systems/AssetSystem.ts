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
  { key: 'container_closed', path: 'assets/junkyard/container_closed.svg', width: 360, height: 220 },
  { key: 'container_open', path: 'assets/junkyard/container_open.svg', width: 420, height: 240 },
  { key: 'dumpster', path: 'assets/junkyard/dumpster.svg', width: 180, height: 130 },
  { key: 'tree', path: 'assets/junkyard/tree.svg', width: 128, height: 168 },
  { key: 'oil_puddle', path: 'assets/junkyard/oil_puddle.svg', width: 140, height: 64 },
  { key: 'forklift', path: 'assets/junkyard/forklift.svg', width: 224, height: 136 },
  { key: 'workshop', path: 'assets/junkyard/workshop.svg', width: 520, height: 300 },
  { key: 'tow_truck', path: 'assets/junkyard/tow_truck.svg', width: 280, height: 150 },
  { key: 'worker', path: 'assets/junkyard/worker.svg', width: 72, height: 112 },
  { key: 'yard_light', path: 'assets/junkyard/yard_light.svg', width: 110, height: 220 },
  { key: 'fence', path: 'assets/junkyard/fence.svg', width: 360, height: 110 },
  { key: 'grass_patch', path: 'assets/junkyard/grass_patch.svg', width: 160, height: 72 },
  { key: 'steam', path: 'assets/junkyard/steam.svg', width: 120, height: 120 },
  { key: 'panel_glow', path: 'assets/ui/panel_glow.svg', width: 500, height: 172 },
  { key: 'coin', path: 'assets/ui/coin.svg', width: 64, height: 64 },
  { key: 'icon_clean', path: 'assets/ui/icon_clean.svg', width: 96, height: 96 },
  { key: 'icon_repair', path: 'assets/ui/icon_repair.svg', width: 96, height: 96 },
  { key: 'icon_paint', path: 'assets/ui/icon_paint.svg', width: 96, height: 96 },
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
    const missing = assetManifest.filter((asset) => !this.scene.textures.exists(asset.key));
    if (missing.length > 0) {
      throw new Error(`Missing required game assets: ${missing.map((asset) => asset.key).join(', ')}`);
    }
  }
}
