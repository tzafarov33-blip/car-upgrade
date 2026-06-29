import { classes, defectPool, rarityMultiplier } from '../data/catalog';
import type { CollectionEntry, Rarity, Vehicle, VehicleClass } from '../types/game';
import { RNG, clamp } from '../utils/random';

const rarityDeck: Rarity[] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary'];
const paintColors = [0xd34d3f, 0x3f77d3, 0x2fa866, 0xe0b23f, 0x9b59b6, 0xdfe6e9, 0x2d3436, 0xff7675, 0x06b6d4, 0xf97316];

export class VehicleFactory {
  constructor(private rng: RNG) {}

  create(level: number, area: number, quality = 1): Vehicle {
    const unlocked = (Object.keys(classes) as VehicleClass[]).filter((vehicleClass) => level >= classes[vehicleClass].unlock);
    const vehicleClass = this.rng.pick(unlocked);
    const rarityLimit = Math.min(rarityDeck.length, 4 + quality + Math.floor(level / 3) + area);
    const rarity = this.rng.pick(rarityDeck.slice(0, rarityLimit));
    const condition = clamp(this.rng.next() * 0.43 + 0.08 + quality * 0.026 + area * 0.015);
    const dirt = clamp(this.rng.next() * 0.9);
    const rust = clamp(this.rng.next() * (1 - condition));
    const damage = clamp(1 - condition + this.rng.next() * 0.25);
    const count = this.rng.int(1, Math.min(4, 1 + Math.floor(damage * 5)));
    const defects = [...defectPool]
      .sort(() => this.rng.next() - 0.5)
      .slice(0, count)
      .map((defect) => ({ ...defect, severity: clamp(defect.severity * (0.7 + this.rng.next() * 0.6)) }));
    const spec = classes[vehicleClass];
    const base = spec.base * rarityMultiplier[rarity] * (1 + area * 0.18);
    const value = Math.max(250, base * (0.45 + condition * 0.75) - defects.reduce((sum, defect) => sum + defect.valuePenalty * defect.severity, 0));
    return {
      id: crypto.randomUUID(),
      name: this.rng.pick(spec.names),
      class: vehicleClass,
      condition,
      dirt,
      rust,
      damage,
      value,
      rarity,
      mileage: this.rng.int(18000, 260000),
      defects,
      color: this.rng.pick(paintColors),
      accent: this.rng.pick(paintColors),
      size: spec.size,
      station: 'delivery',
      repaired: false,
      discovered: false,
      progress: 0,
      x: -180,
      y: 0
    };
  }

  updateCollection(collection: CollectionEntry[], vehicle: Vehicle): void {
    const entry = collection.find((item) => item.vehicleName === vehicle.name);
    if (entry) {
      entry.discovered = true;
      entry.bestCondition = Math.max(entry.bestCondition, vehicle.condition);
      if (vehicle.repaired) entry.timesRestored += 1;
      return;
    }
    collection.push({
      vehicleName: vehicle.name,
      class: vehicle.class,
      rarity: vehicle.rarity,
      discovered: true,
      bestCondition: vehicle.condition,
      timesRestored: vehicle.repaired ? 1 : 0
    });
  }
}
