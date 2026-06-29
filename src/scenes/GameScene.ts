import Phaser from 'phaser';
import { areas, upgradeInfo, workerNames, specializations } from '../data/catalog';
import { AudioSystem } from '../systems/AudioSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { ParticlePool } from '../systems/ParticlePool';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { VehicleFactory } from '../systems/VehicleFactory';
import { YandexSDK } from '../systems/YandexSDK';
import type { GameState, Vehicle, Worker } from '../types/game';
import { Hud } from '../ui/Hud';
import { RNG, money } from '../utils/random';

const parkingSpots = [{ x: 235, y: 380 }, { x: 410, y: 380 }, { x: 585, y: 380 }, { x: 760, y: 380 }, { x: 935, y: 380 }, { x: 1110, y: 380 }];

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private hud!: Hud;
  private factory!: VehicleFactory;
  private particles!: ParticlePool;
  private readonly save = new SaveSystem();
  private readonly economy = new EconomySystem();
  private readonly progression = new ProgressionSystem();
  private readonly yandex = new YandexSDK();
  private readonly audio = new AudioSystem();
  private vehicleSprites = new Map<string, Phaser.GameObjects.Container>();
  private workerSprites = new Map<string, Phaser.GameObjects.Container>();
  private uiObjects: Phaser.GameObjects.Container[] = [];
  private nextSave = 0;

  constructor() { super('Game'); }

  create(): void {
    this.yandex.init();
    this.particles = new ParticlePool(this);
    const loaded = this.save.load();
    this.state = loaded ?? this.createNewGame();
    this.factory = new VehicleFactory(new RNG(this.state.marketSeed));
    this.applyOfflineProgress();
    this.economy.notify = (message) => this.toast(message);
    this.drawEnvironment();
    this.hud = new Hud(this);
    this.input.on('pointerdown', () => this.audio.unlock());
    this.input.keyboard?.on('keydown-S', () => this.manualSave());
    this.input.keyboard?.on('keydown-R', () => this.rewardDoubleIncome());
    this.renderUi();
    this.renderVehicles();
    this.renderWorkers();
  }

  private createNewGame(): GameState {
    return {
      money: 1650,
      level: 1,
      area: 1,
      xp: 0,
      vehicles: [],
      workers: [this.createWorker(0, 'mechanic')],
      parts: [],
      upgrades: { towTruck: 1, storage: 1, repairSpeed: 1, paintQuality: 1, workerCount: 1, workerEfficiency: 1, workshopSize: 1, reputation: 1, auctionQuality: 1 },
      tasks: [
        { id: 'sell3', title: 'First Flips', detail: 'Sell 3 restored cars', cadence: 'milestone', progress: 0, target: 3, reward: 900, claimed: false },
        { id: 'parts10', title: 'Parts Dealer', detail: 'Sell 10 valuable parts', cadence: 'daily', progress: 0, target: 10, reward: 650, claimed: false },
        { id: 'earn10k', title: 'Real Business', detail: 'Earn $10,000 total', cadence: 'milestone', progress: 0, target: 10000, reward: 1500, claimed: false },
        { id: 'collect8', title: 'Collector Book', detail: 'Discover 8 unique vehicles', cadence: 'collection', progress: 0, target: 8, reward: 2200, claimed: false }
      ],
      collection: [],
      stats: { day: 1, carsBought: 0, carsSold: 0, partsSold: 0, totalEarned: 0, achievements: [], lastSave: Date.now() },
      marketSeed: Date.now() % 999999,
      adBoostUntil: 0,
      extraAuctionSlots: 0
    };
  }

  private createWorker(index: number, specialization = specializations[index % specializations.length]): Worker {
    return { id: crypto.randomUUID(), name: workerNames[index % workerNames.length], level: 1, experience: 0, salary: 18 + index * 7, efficiency: 1 + index * 0.05, skill: 1, mood: 0.9, specialization, x: 155 + index * 34, y: 535 };
  }

  private drawEnvironment(): void {
    this.cameras.main.setBackgroundColor(0x172033);
    this.add.rectangle(640, 410, 1210, 610, 0x354230).setStrokeStyle(5, 0x506148);
    this.add.rectangle(640, 426, 1100, 330, 0x475569, 0.76).setStrokeStyle(3, 0x94a3b8);
    this.add.rectangle(235, 205, 310, 170, 0x2f3d4e).setStrokeStyle(3, 0x9ca3af);
    this.add.rectangle(610, 205, 330, 170, 0x3b3649).setStrokeStyle(3, 0xc4b5fd);
    this.add.rectangle(985, 205, 300, 170, 0x493831).setStrokeStyle(3, 0xfca5a5);
    this.add.text(95, 115, 'Inspection Bay', { fontSize: '20px', color: '#e0f2fe', fontStyle: 'bold' });
    this.add.text(480, 115, 'Repair Lift', { fontSize: '20px', color: '#ede9fe', fontStyle: 'bold' });
    this.add.text(870, 115, 'Paint + Detail', { fontSize: '20px', color: '#fee2e2', fontStyle: 'bold' });
    const props: Array<[string, number, number, number?]> = [
      ['scrap_pile', 105, 612], ['scrap_pile', 1120, 610], ['tire_stack', 55, 405], ['tire_stack', 1190, 460],
      ['container', 1030, 555], ['forklift', 865, 575], ['oil_puddle', 535, 565], ['tree', 78, 170], ['tree', 1195, 170]
    ];
    props.forEach(([key, x, y, scale = 1]) => this.add.image(x, y, key).setScale(scale));
    for (let i = 0; i < 6; i++) {
      this.add.ellipse(100 + i * 215, 710, 150, 18, 0x0f172a, 0.28);
      const cloud = this.add.ellipse(120 + i * 210, 56 + (i % 2) * 16, 92, 28, 0xffffff, 0.12);
      this.tweens.add({ targets: cloud, x: cloud.x + 70, yoyo: true, repeat: -1, duration: 9000 + i * 650 });
    }
  }

  private renderUi(): void {
    this.uiObjects.forEach((object) => object.destroy());
    this.uiObjects = [];
    this.hud.update(this.state, this.progression.nextLevelXp(this.state.level));
    const actions: Array<[number, number, string, () => void]> = [
      [130, 665, 'Buy Auction', () => this.buyVehicle()], [322, 665, 'Sell Parts', () => this.sellParts()], [514, 665, 'Scrap Worst', () => this.scrapWorst()],
      [706, 665, 'Hire Crew', () => this.hireWorker()], [898, 665, 'Unlock Area', () => this.unlockArea()], [1090, 665, 'Reward Boost', () => this.rewardDoubleIncome()]
    ];
    actions.forEach(([x, y, label, action]) => this.uiObjects.push(this.button(x, y, label, action)));
    upgradeInfo.slice(0, 6).forEach((upgrade, index) => {
      this.uiObjects.push(this.button(140 + index * 196, 724, `${upgrade[1]} ↑`, () => this.buyUpgrade(upgrade[0])));
    });
  }

  private button(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.image(0, 0, 'panel_glow').setScale(0.7, 0.5).setTint(0xf59e0b);
    const text = this.add.text(0, 0, label, { fontSize: '16px', color: '#fff7ed', fontStyle: 'bold' }).setOrigin(0.5);
    c.add([bg, text]).setSize(170, 48).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.audio.play('click'); onClick(); })
      .on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 90 }))
      .on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 90 }));
    return c;
  }

  private renderVehicles(): void {
    this.vehicleSprites.forEach((sprite) => sprite.destroy());
    this.vehicleSprites.clear();
    this.state.vehicles.forEach((vehicle, index) => {
      const spot = parkingSpots[index % parkingSpots.length];
      vehicle.x = spot.x;
      vehicle.y = spot.y;
      const c = this.add.container(vehicle.x, vehicle.y);
      c.add(this.add.ellipse(0, 45, 150 * vehicle.size, 22, 0x020617, 0.32));
      c.add(this.add.image(0, 0, 'vehicle_body').setTint(vehicle.color).setScale(vehicle.size));
      for (let i = 0; i < Math.ceil(vehicle.dirt * 4); i++) c.add(this.add.image(-45 + i * 27, -2 + (i % 2) * 10, 'dirt_cluster').setScale(0.7));
      for (let i = 0; i < Math.ceil(vehicle.rust * 3); i++) c.add(this.add.image(-30 + i * 34, 14, 'rust_patch').setScale(0.75));
      c.add(this.add.image(-68, -34, `rarity_${vehicle.rarity}`).setScale(0.72));
      c.add(this.add.text(-68, 54, `${vehicle.name}\n${Math.floor(vehicle.condition * 100)}% • ${money(vehicle.value)}`, { fontSize: '13px', color: '#f8fafc', align: 'center' }));
      c.setSize(150, 110).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.workOnVehicle(vehicle));
      this.vehicleSprites.set(vehicle.id, c);
    });
  }

  private renderWorkers(): void {
    this.workerSprites.forEach((sprite) => sprite.destroy());
    this.workerSprites.clear();
    this.state.workers.forEach((worker, index) => {
      const c = this.add.container(worker.x, worker.y);
      c.add(this.add.circle(0, -18, 10, 0xffdbac));
      c.add(this.add.rectangle(0, 5, 22, 38, 0x2563eb + index * 3000).setStrokeStyle(2, 0xdbeafe));
      c.add(this.add.text(-28, 30, `${worker.name}\n${worker.specialization}`, { fontSize: '11px', color: '#e0f2fe', align: 'center' }));
      this.tweens.add({ targets: c, x: worker.x + 18, yoyo: true, repeat: -1, duration: 1800 + index * 220 });
      this.workerSprites.set(worker.id, c);
    });
  }

  private buyVehicle(): void {
    const vehicle = this.factory.create(this.state.level, this.state.area, this.state.upgrades.auctionQuality + this.state.extraAuctionSlots);
    const cost = this.economy.buyCost(vehicle, this.state);
    if (this.state.money < cost) return this.toast(`Need ${money(cost)} for this auction lot`);
    if (this.state.vehicles.length >= 6 + this.state.upgrades.storage * 2) return this.toast('Storage is full. Upgrade storage.');
    this.state.money -= cost;
    this.state.vehicles.push(vehicle);
    this.state.stats.carsBought += 1;
    this.factory.updateCollection(this.state.collection, vehicle);
    this.audio.play('engine');
    this.toast(`Tow truck delivered ${vehicle.name} for ${money(cost)}`);
    this.renderVehicles();
    this.renderUi();
  }

  private workOnVehicle(vehicle: Vehicle): void {
    const crewPower = this.state.workers.reduce((sum, worker) => sum + worker.efficiency * worker.mood * (worker.specialization === 'mechanic' ? 1.18 : 1), 0);
    const speed = (0.15 + crewPower * 0.09) * (1 + this.state.upgrades.repairSpeed * 0.15) * (1 + this.state.upgrades.workerEfficiency * 0.08);
    vehicle.progress += speed;
    this.particles.burst(vehicle.x, vehicle.y - 8);
    this.audio.play('tool');
    if (vehicle.progress < 1) return this.toast(`Inspecting and repairing ${vehicle.name}: ${Math.floor(vehicle.progress * 100)}%`);
    vehicle.progress = 0;
    if (!vehicle.discovered) vehicle.discovered = true;
    if (vehicle.defects.length > 0 || vehicle.damage > 0.18) {
      vehicle.defects.pop();
      vehicle.damage = Math.max(0, vehicle.damage - 0.38);
      vehicle.condition = Math.min(1, vehicle.condition + 0.28);
      this.toast(`${vehicle.name} repaired. Remaining defects: ${vehicle.defects.length}`);
    } else {
      vehicle.repaired = true;
      this.sellVehicle(vehicle);
    }
    this.renderVehicles();
  }

  private sellVehicle(vehicle: Vehicle): void {
    const price = this.economy.restoredSaleValue(vehicle, this.state);
    this.state.money += price;
    this.state.stats.totalEarned += price;
    this.state.stats.carsSold += 1;
    this.state.vehicles = this.state.vehicles.filter((item) => item.id !== vehicle.id);
    this.factory.updateCollection(this.state.collection, vehicle);
    this.progression.addXp(this.state, 45 + vehicle.value / 200);
    this.particles.burst(vehicle.x, vehicle.y - 30, 0xfacc15, 18);
    this.audio.play('cash');
    this.toast(`Sold restored ${vehicle.name} for ${money(price)}`);
    if (this.state.stats.carsSold % 5 === 0) this.yandex.showInterstitial();
    this.renderVehicles();
    this.renderUi();
  }

  private sellParts(): void {
    const candidates = this.state.vehicles.filter((vehicle) => !vehicle.repaired && vehicle.damage > 0.5).slice(0, 2);
    if (candidates.length === 0) return this.toast('No high-damage vehicles are ready to dismantle.');
    const total = candidates.reduce((sum, vehicle) => sum + this.economy.partValue(vehicle, this.state), 0);
    this.state.vehicles = this.state.vehicles.filter((vehicle) => !candidates.includes(vehicle));
    this.state.money += total;
    this.state.stats.partsSold += candidates.length * 4;
    this.state.stats.totalEarned += total;
    this.audio.play('cash');
    this.toast(`Dismantled ${candidates.length} vehicles into parts for ${money(total)}`);
    this.renderVehicles();
    this.renderUi();
  }

  private scrapWorst(): void {
    const worst = [...this.state.vehicles].sort((a, b) => b.damage - a.damage)[0];
    if (!worst) return this.toast('No vehicle to scrap.');
    const value = this.economy.scrapValue(worst, this.state);
    this.state.vehicles = this.state.vehicles.filter((vehicle) => vehicle.id !== worst.id);
    this.state.money += value;
    this.state.stats.totalEarned += value;
    this.particles.burst(worst.x, worst.y, 0x94a3b8, 16);
    this.toast(`Crusher paid ${money(value)} for ${worst.name}`);
    this.renderVehicles();
    this.renderUi();
  }

  private hireWorker(): void {
    const cost = 600 + this.state.workers.length * 430;
    if (this.state.workers.length >= this.state.upgrades.workerCount) return this.toast('Upgrade Crew Size before hiring more workers.');
    if (this.state.money < cost) return this.toast(`Hiring costs ${money(cost)}`);
    this.state.money -= cost;
    this.state.workers.push(this.createWorker(this.state.workers.length));
    this.toast('A new specialist joined the crew.');
    this.renderWorkers();
    this.renderUi();
  }

  private buyUpgrade(key: keyof GameState['upgrades']): void {
    const cost = 420 + this.state.upgrades[key] * this.state.upgrades[key] * 340;
    if (this.state.money < cost) return this.toast(`${upgradeInfo.find((item) => item[0] === key)?.[1]} costs ${money(cost)}`);
    this.state.money -= cost;
    this.state.upgrades[key] += 1;
    this.progression.addXp(this.state, 28);
    this.toast('Upgrade installed. The yard feels more valuable.');
    this.renderUi();
  }

  private unlockArea(): void {
    const current = areas[this.state.area - 1];
    const unlocked = this.progression.unlockArea(this.state);
    if (!unlocked) return this.toast(`Next area requires level ${this.state.area * 3} and ${money(current.unlockCost)}`);
    this.toast(`Expanded into ${unlocked}. New mechanics and richer cars unlocked.`);
    this.drawEnvironment();
    this.renderVehicles();
    this.renderWorkers();
    this.renderUi();
  }

  private rewardDoubleIncome(): void {
    this.yandex.showRewarded('double-income', () => {
      this.state.adBoostUntil = Date.now() + 5 * 60 * 1000;
      this.audio.play('reward');
      this.toast('Reward active: double income for 5 minutes.');
    });
  }

  private manualSave(): void {
    this.save.save(this.state);
    this.yandex.save(this.state);
    this.toast('Game saved locally and queued for cloud sync.');
  }

  private applyOfflineProgress(): void {
    const seconds = this.save.offlineSeconds(this.state);
    if (seconds < 60) return;
    const area = areas[this.state.area - 1];
    const gain = Math.floor(seconds * (4 + this.state.level) * area.incomeMultiplier);
    this.state.money += gain;
    this.state.stats.totalEarned += gain;
    this.toast(`Offline contracts earned ${money(gain)}`);
  }

  private toast(message: string): void {
    const text = this.add.text(910, 100, message, { fontSize: '16px', color: '#fef3c7', backgroundColor: '#111827', padding: { x: 10, y: 7 } }).setDepth(20);
    this.tweens.add({ targets: text, y: 132, alpha: 0, delay: 2300, duration: 700, onComplete: () => text.destroy() });
  }

  update(_: number, delta: number): void {
    const dt = delta / 1000;
    this.economy.tick(this.state, dt);
    for (const reward of this.progression.updateTasks(this.state)) this.toast(reward);
    this.hud.update(this.state, this.progression.nextLevelXp(this.state.level));
    this.nextSave += dt;
    if (this.nextSave > 20) {
      this.nextSave = 0;
      this.save.save(this.state);
    }
  }
}
