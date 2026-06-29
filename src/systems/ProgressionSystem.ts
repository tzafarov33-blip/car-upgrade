import { areas } from '../data/catalog';
import type { GameState } from '../types/game';

export class ProgressionSystem {
  addXp(state: GameState, xp: number): void {
    state.xp += xp;
    while (state.xp >= this.nextLevelXp(state.level)) {
      state.xp -= this.nextLevelXp(state.level);
      state.level += 1;
      state.money += 300 + state.level * 95;
    }
  }

  nextLevelXp(level: number): number {
    return 100 + level * 55;
  }

  canUnlockArea(state: GameState): boolean {
    const current = areas[state.area - 1];
    return current.unlockCost > 0 && state.money >= current.unlockCost && state.level >= state.area * 3;
  }

  unlockArea(state: GameState): string | null {
    if (!this.canUnlockArea(state)) return null;
    const current = areas[state.area - 1];
    state.money -= current.unlockCost;
    state.area += 1;
    state.upgrades.storage += 1;
    state.upgrades.workerCount += 1;
    return areas[state.area - 1].name;
  }

  updateTasks(state: GameState): string[] {
    const rewards: string[] = [];
    for (const task of state.tasks) {
      if (task.id === 'sell3') task.progress = state.stats.carsSold;
      if (task.id === 'parts10') task.progress = state.stats.partsSold;
      if (task.id === 'earn10k') task.progress = state.stats.totalEarned;
      if (task.id === 'collect8') task.progress = state.collection.filter((entry) => entry.discovered).length;
      if (!task.claimed && task.progress >= task.target) {
        task.claimed = true;
        state.money += task.reward;
        rewards.push(`${task.title}: +$${task.reward}`);
      }
    }
    return rewards;
  }
}
