import type { GameState } from '../types/game';

const KEY = 'junkyard-empire-save-v2';
const REQUIRED_KEYS: Array<keyof GameState> = ['money', 'level', 'area', 'vehicles', 'workers', 'upgrades', 'tasks', 'collection', 'stats'];

export class SaveSystem {
  load(): GameState | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameState;
      return this.validate(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(state: GameState): void {
    const compact: GameState = { ...state, stats: { ...state.stats, lastSave: Date.now() } };
    localStorage.setItem(KEY, JSON.stringify(compact));
    state.stats.lastSave = compact.stats.lastSave;
  }

  offlineSeconds(state: GameState): number {
    return Math.max(0, Math.min(8 * 3600, (Date.now() - state.stats.lastSave) / 1000));
  }

  reset(): void {
    localStorage.removeItem(KEY);
  }

  private validate(value: GameState): boolean {
    return Boolean(value && REQUIRED_KEYS.every((key) => key in value) && Number.isFinite(value.money) && value.stats.lastSave > 0);
  }
}
