import Phaser from 'phaser';
import { areas } from '../data/catalog';
import type { GameState } from '../types/game';
import { money } from '../utils/random';

export class Hud {
  private labels: Phaser.GameObjects.Text[] = [];
  private taskText: Phaser.GameObjects.Text;
  private areaText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    scene.add.image(8, 8, 'panel_glow').setOrigin(0).setScrollFactor(0);
    scene.add.image(266, 8, 'panel_glow').setOrigin(0).setScrollFactor(0);
    scene.add.image(524, 8, 'panel_glow').setOrigin(0).setScrollFactor(0);
    for (let i = 0; i < 6; i++) {
      this.labels.push(scene.add.text(24 + (i % 3) * 258, 20 + Math.floor(i / 3) * 32, '', {
        fontFamily: 'Arial', fontSize: '18px', color: '#f8fafc', fontStyle: 'bold'
      }).setScrollFactor(0));
    }
    this.areaText = scene.add.text(792, 18, '', { fontSize: '19px', color: '#bae6fd', fontStyle: 'bold' }).setScrollFactor(0);
    this.taskText = scene.add.text(792, 48, '', { fontSize: '15px', color: '#fde68a' }).setScrollFactor(0);
  }

  update(state: GameState, nextXp: number): void {
    const area = areas[state.area - 1];
    const activeTask = state.tasks.find((task) => !task.claimed);
    this.labels[0].setText(`Coins ${money(state.money)}`);
    this.labels[1].setText(`Level ${state.level}  ${Math.floor(state.xp)}/${nextXp}`);
    this.labels[2].setText(`Crew ${state.workers.length}/${state.upgrades.workerCount}`);
    this.labels[3].setText(`Storage ${state.vehicles.length}/${6 + state.upgrades.storage * 2}`);
    this.labels[4].setText(`Area x${area.incomeMultiplier}`);
    this.labels[5].setText(`Collection ${state.collection.filter((entry) => entry.discovered).length}`);
    this.areaText.setText(`${area.name} — ${area.mechanic}`);
    this.taskText.setText(activeTask ? `${activeTask.title}: ${Math.floor(activeTask.progress)}/${activeTask.target}` : 'All current goals claimed. Expand the empire.');
  }
}
