import { areas } from '../data/catalog';
import type { GameState, Vehicle } from '../types/game';
import { money } from '../utils/random';

export class EconomySystem {
  notify?: (message: string) => void;

  tick(state: GameState, dt: number): void {
    const wage = state.workers.reduce((sum, worker) => sum + worker.salary, 0) / 480 * dt;
    state.money = Math.max(0, state.money - wage);
    if (Math.random() < dt / 90) {
      const area = areas[state.area - 1];
      const bonus = Math.floor((70 + state.level * 28) * area.incomeMultiplier);
      state.money += bonus;
      state.stats.totalEarned += bonus;
      this.notify?.(`Walk-in customer bought parts: ${money(bonus)}`);
    }
  }

  buyCost(vehicle: Vehicle, state: GameState): number {
    const area = areas[state.area - 1];
    return Math.floor(vehicle.value * (0.44 + vehicle.damage * 0.26) * area.priceMultiplier);
  }

  restoredSaleValue(vehicle: Vehicle, state: GameState): number {
    const area = areas[state.area - 1];
    const rep = 1 + state.upgrades.reputation * 0.035;
    const paint = 1 + state.upgrades.paintQuality * 0.03;
    const boost = Date.now() < state.adBoostUntil ? 2 : 1;
    return Math.floor(vehicle.value * (1.65 + vehicle.rarity.length * 0.025) * rep * paint * area.incomeMultiplier * boost);
  }

  partValue(vehicle: Vehicle, state: GameState): number {
    const area = areas[state.area - 1];
    return Math.floor(vehicle.value * (0.28 + vehicle.rust * 0.08) * area.incomeMultiplier);
  }

  scrapValue(vehicle: Vehicle, state: GameState): number {
    return Math.floor(this.partValue(vehicle, state) * 0.45);
  }
}
