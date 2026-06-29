import Phaser from 'phaser';
import { YandexSDK } from '../systems/YandexSDK';
import { AudioSystem } from '../systems/AudioSystem';
import { ParticlePool } from '../systems/ParticlePool';
import { RNG, money } from '../utils/random';
import type { Rarity, VehicleClass } from '../types/game';

type ContainerPhase = 'waiting' | 'delivering' | 'opening' | 'revealed' | 'cleaning' | 'repairing' | 'painting' | 'ready';

interface ImportVehicle {
  id: string;
  name: string;
  class: VehicleClass;
  rarity: Rarity;
  value: number;
  buyPrice: number;
  condition: number;
  dirt: number;
  damage: number;
  color: number;
  clean: number;
  repair: number;
  paint: number;
}

interface ImportState {
  money: number;
  level: number;
  reputation: number;
  xp: number;
  containerPrice: number;
  containersOpened: number;
  phase: ContainerPhase;
  current?: ImportVehicle;
  boostUntil: number;
  market: 'Rusty Containers' | 'Japanese Imports' | 'European Imports' | 'American Imports' | 'Luxury Imports' | 'Secret Finds';
  lastSave: number;
}

const SAVE_KEY = 'junkyard-empire-import-v1';
const vehicleNames: Record<VehicleClass, string[]> = {
  compact: ['Kei Spark', 'Metro Finch', 'Tokyo Bean'],
  sedan: ['Bavaria Crown', 'Euro Regent', 'Asterline S'],
  muscle: ['Detroit Howler', 'Iron V8', 'Cinder Charger'],
  offroad: ['Trail Baron', 'Desert Ox', 'Ridge Patrol'],
  sports: ['Sprint Veloce', 'Aero Pulse', 'Night GT'],
  super: ['Aurora X', 'Zenith R', 'Phantom Twelve']
};
const rarityDeck: Rarity[] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary'];
const paintColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0xf8fafc, 0x0f172a, 0x14b8a6];

export class GameScene extends Phaser.Scene {
  private state!: ImportState;
  private rng = new RNG(Date.now() % 999999);
  private readonly yandex = new YandexSDK();
  private readonly audio = new AudioSystem();
  private particles!: ParticlePool;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private world: Phaser.GameObjects.GameObject[] = [];
  private autosaveTimer = 0;

  constructor() { super('Game'); }

  create(): void {
    this.yandex.init();
    this.particles = new ParticlePool(this, 90);
    this.state = this.loadState();
    this.cameras.main.setBackgroundColor(0x101827);
    this.drawWorld();
    this.render();
    this.input.keyboard?.on('keydown-S', () => this.saveState());
  }

  private newState(): ImportState {
    return { money: 3200, level: 1, reputation: 1, xp: 0, containerPrice: 900, containersOpened: 0, phase: 'waiting', boostUntil: 0, market: 'Rusty Containers', lastSave: Date.now() };
  }

  private loadState(): ImportState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return this.newState();
      const parsed = JSON.parse(raw) as ImportState;
      if (!Number.isFinite(parsed.money) || !parsed.phase) return this.newState();
      const offline = Math.min(6 * 3600, Math.max(0, (Date.now() - parsed.lastSave) / 1000));
      if (offline > 90) parsed.money += Math.floor(offline * parsed.reputation * 1.8);
      return parsed;
    } catch {
      return this.newState();
    }
  }

  private saveState(): void {
    this.state.lastSave = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    this.toast('Business saved.');
  }

  private drawWorld(): void {
    this.world.forEach((object) => object.destroy());
    this.world = [];
    this.world.push(this.add.ellipse(640, 650, 1160, 145, 0x020617, 0.35));
    this.world.push(this.add.image(170, 575, 'scrap_pile').setScale(1.15));
    this.world.push(this.add.image(1110, 545, 'container').setScale(0.92));
    this.world.push(this.add.image(1050, 650, 'dumpster').setScale(0.95));
    this.world.push(this.add.image(925, 592, 'forklift').setScale(0.85));
    this.world.push(this.add.image(230, 690, 'tire_stack').setScale(0.82));
    this.world.push(this.add.image(1185, 245, 'tree').setScale(0.9));
    this.world.push(this.add.image(85, 250, 'tree').setScale(0.85));
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.ellipse(120 + i * 260, 70 + (i % 2) * 28, 150, 34, 0xffffff, 0.11);
      this.tweens.add({ targets: cloud, x: cloud.x + 90, yoyo: true, repeat: -1, duration: 9000 + i * 850 });
      this.world.push(cloud);
    }
  }

  private render(): void {
    this.ui.forEach((object) => object.destroy());
    this.ui = [];
    this.drawTopBar();
    this.drawContainerStage();
    this.drawActionBar();
  }

  private drawTopBar(): void {
    this.ui.push(this.add.image(640, 42, 'panel_glow').setScale(2.45, 0.55));
    const labels = [`${money(this.state.money)}`, `Level ${this.state.level}`, `Rep ${this.state.reputation}`, `Container ${money(this.state.containerPrice)}`, this.state.market];
    labels.forEach((label, index) => this.ui.push(this.add.text(92 + index * 245, 31, label, { fontFamily: 'Arial', fontSize: '20px', color: '#f8fafc', fontStyle: 'bold' })));
  }

  private drawContainerStage(): void {
    if (this.state.phase === 'waiting') {
      this.ui.push(this.add.image(640, 390, 'container_closed').setScale(1.05));
      this.ui.push(this.add.text(640, 535, 'A sealed import container is waiting. Buy it, skip it, or claim a free sponsored container.', { fontSize: '21px', color: '#e0f2fe', align: 'center', wordWrap: { width: 780 } }).setOrigin(0.5));
      return;
    }
    if (this.state.phase === 'delivering' || this.state.phase === 'opening') {
      this.ui.push(this.add.image(640, 390, this.state.phase === 'opening' ? 'container_open' : 'container_closed').setScale(1.08));
      this.ui.push(this.add.text(640, 535, this.state.phase === 'opening' ? 'Doors opening... smoke, dust, and mystery inside.' : 'Forklift is unloading the container...', { fontSize: '22px', color: '#fde68a' }).setOrigin(0.5));
      return;
    }
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.ui.push(this.add.image(640, 340, 'container_open').setScale(1.04));
    const car = this.add.image(640, 420, 'vehicle_body').setScale(1.12).setTint(vehicle.color);
    this.ui.push(car);
    for (let i = 0; i < Math.ceil(vehicle.dirt * 5 * (1 - vehicle.clean)); i++) this.ui.push(this.add.image(560 + i * 38, 410 + (i % 2) * 18, 'dirt_cluster').setScale(0.72));
    for (let i = 0; i < Math.ceil(vehicle.damage * 4 * (1 - vehicle.repair)); i++) this.ui.push(this.add.image(585 + i * 48, 445, 'rust_patch').setScale(0.8));
    this.ui.push(this.add.image(510, 315, `rarity_${vehicle.rarity}`).setScale(0.72));
    this.ui.push(this.add.text(640, 535, `${vehicle.name} • ${vehicle.rarity.toUpperCase()} • Estimated ${money(vehicle.value)}`, { fontSize: '24px', color: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5));
    this.ui.push(this.progressPill(420, 585, 'Clean', vehicle.clean, 'icon_clean'));
    this.ui.push(this.progressPill(640, 585, 'Repair', vehicle.repair, 'icon_repair'));
    this.ui.push(this.progressPill(860, 585, 'Paint', vehicle.paint, 'icon_paint'));
  }

  private progressPill(x: number, y: number, label: string, value: number, icon: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(this.add.image(-70, 0, icon).setScale(0.45));
    c.add(this.add.text(-28, -18, label, { fontSize: '16px', color: '#cbd5e1', fontStyle: 'bold' }));
    c.add(this.add.rectangle(38, 14, 118, 12, 0x0f172a, 0.82));
    c.add(this.add.rectangle(-21 + value * 59, 14, 118 * value, 12, 0xfacc15, 0.95));
    c.add(this.add.text(100, 5, `${Math.floor(value * 100)}%`, { fontSize: '13px', color: '#fff7ed' }));
    return c;
  }

  private drawActionBar(): void {
    const buttons: Array<[string, () => void]> = [
      ['Buy Container', () => this.buyContainer()], ['Open Garage', () => this.toast('Garage shows the current mystery vehicle and restoration steps.')],
      ['Sell Vehicle', () => this.sellVehicle()], ['Shop', () => this.shop()], ['Settings', () => this.saveState()]
    ];
    buttons.forEach(([label, action], index) => this.ui.push(this.button(150 + index * 245, 710, label, action)));
    if (this.state.phase === 'waiting') this.ui.push(this.button(1040, 625, 'Free Ad Container', () => this.freeContainer(), 0x22c55e));
    if (this.state.current && this.state.phase !== 'ready') {
      this.ui.push(this.button(420, 640, 'Remove Trash', () => this.restore('clean'), 0x38bdf8));
      this.ui.push(this.button(640, 640, 'Repair', () => this.restore('repair'), 0xf97316));
      this.ui.push(this.button(860, 640, 'Paint', () => this.restore('paint'), 0xa855f7));
    }
  }

  private button(x: number, y: number, label: string, action: () => void, tint = 0xf59e0b): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, 0, 'panel_glow').setScale(0.78, 0.44).setTint(tint));
    c.add(this.add.text(0, 0, label, { fontSize: '17px', color: '#fff7ed', fontStyle: 'bold' }).setOrigin(0.5));
    c.setSize(180, 50).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 90 }))
      .on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 90 }))
      .on('pointerdown', () => { this.audio.play('click'); action(); });
    return c;
  }

  private buyContainer(free = false): void {
    if (this.state.phase !== 'waiting') return this.toast('Finish the current container first.');
    if (!free && this.state.money < this.state.containerPrice) return this.toast(`Need ${money(this.state.containerPrice)} to buy this container.`);
    if (!free) this.state.money -= this.state.containerPrice;
    this.state.current = this.rollVehicle(free ? 2 : 0);
    this.state.phase = 'delivering';
    this.audio.play('engine');
    this.render();
    this.tweens.add({ targets: this.cameras.main, zoom: 1.04, yoyo: true, duration: 450, onComplete: () => this.openContainer() });
  }

  private openContainer(): void {
    this.state.phase = 'opening';
    this.render();
    this.particles.burst(640, 410, 0xcbd5e1, 24);
    this.time.delayedCall(900, () => {
      this.state.phase = 'revealed';
      this.state.containersOpened += 1;
      this.toast(`Found ${this.state.current?.name}! Restore it for profit.`);
      this.render();
    });
  }

  private freeContainer(): void {
    this.yandex.showRewarded('free-container', () => this.buyContainer(true));
  }

  private restore(step: 'clean' | 'repair' | 'paint'): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    vehicle[step] = Math.min(1, vehicle[step] + 0.34 + this.state.reputation * 0.02);
    this.state.phase = step === 'clean' ? 'cleaning' : step === 'repair' ? 'repairing' : 'painting';
    this.audio.play(step === 'clean' ? 'tool' : step === 'paint' ? 'reward' : 'tool');
    this.particles.burst(640, 420, step === 'paint' ? vehicle.color : 0xfacc15, 18);
    if (vehicle.clean >= 1 && vehicle.repair >= 1 && vehicle.paint >= 1) {
      this.state.phase = 'ready';
      this.toast('Restoration complete. Customers are making offers!');
    }
    this.render();
  }

  private sellVehicle(): void {
    const vehicle = this.state.current;
    if (!vehicle) return this.toast('No vehicle ready to sell.');
    const quality = (vehicle.clean + vehicle.repair + vehicle.paint) / 3;
    const boost = Date.now() < this.state.boostUntil ? 2 : 1;
    const offer = Math.floor(vehicle.value * (0.58 + quality * 0.85 + this.state.reputation * 0.03) * boost);
    this.state.money += offer;
    this.state.xp += Math.floor(25 + offer / 120);
    while (this.state.xp >= this.state.level * 100) {
      this.state.xp -= this.state.level * 100;
      this.state.level += 1;
      this.state.reputation += 1;
      if (this.state.level === 3) this.state.market = 'Japanese Imports';
      if (this.state.level === 5) this.state.market = 'European Imports';
      if (this.state.level === 7) this.state.market = 'Luxury Imports';
    }
    this.state.containerPrice = Math.floor(900 + this.state.level * 260 + this.state.reputation * 120);
    this.flyCoins(offer);
    this.audio.play('cash');
    this.toast(`Sold ${vehicle.name} for ${money(offer)}.`);
    this.state.current = undefined;
    this.state.phase = 'waiting';
    this.saveState();
    this.render();
  }

  private shop(): void {
    const price = 1200 + this.state.reputation * 700;
    if (this.state.money < price) return this.toast(`Reputation upgrade costs ${money(price)}.`);
    this.state.money -= price;
    this.state.reputation += 1;
    this.toast('Import contacts upgraded. Better containers unlocked.');
    this.render();
  }

  private rollVehicle(bonus: number): ImportVehicle {
    const classes: VehicleClass[] = this.state.level >= 7 ? ['compact', 'sedan', 'muscle', 'offroad', 'sports', 'super'] : this.state.level >= 4 ? ['compact', 'sedan', 'muscle', 'offroad', 'sports'] : ['compact', 'sedan', 'offroad'];
    const vehicleClass = this.rng.pick(classes);
    const rarity = this.rng.pick(rarityDeck.slice(0, Math.min(rarityDeck.length, 4 + bonus + Math.floor(this.state.level / 2))));
    const base = { common: 1300, uncommon: 2100, rare: 4200, epic: 9000, legendary: 24000 }[rarity];
    const condition = 0.22 + this.rng.next() * 0.38;
    return {
      id: crypto.randomUUID(), name: this.rng.pick(vehicleNames[vehicleClass]), class: vehicleClass, rarity,
      value: Math.floor(base * (1 + this.state.level * 0.18) * (0.75 + condition)), buyPrice: this.state.containerPrice, condition,
      dirt: 0.45 + this.rng.next() * 0.5, damage: 0.35 + this.rng.next() * 0.55, color: this.rng.pick(paintColors), clean: 0, repair: 0, paint: 0
    };
  }

  private flyCoins(amount: number): void {
    for (let i = 0; i < 10; i++) {
      const coin = this.add.image(640, 420, 'coin').setScale(0.45);
      this.tweens.add({ targets: coin, x: 100 + i * 8, y: 42, alpha: 0, duration: 650, delay: i * 25, onComplete: () => coin.destroy() });
    }
    this.toast(`+${money(amount)}`);
  }

  private toast(message: string): void {
    const text = this.add.text(640, 105, message, { fontSize: '18px', color: '#fef3c7', backgroundColor: '#111827', padding: { x: 14, y: 8 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: text, y: 138, alpha: 0, delay: 2200, duration: 650, onComplete: () => text.destroy() });
  }

  update(_: number, delta: number): void {
    this.autosaveTimer += delta / 1000;
    if (this.autosaveTimer >= 20) {
      this.autosaveTimer = 0;
      this.state.lastSave = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    }
  }
}
