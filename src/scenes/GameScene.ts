import Phaser from 'phaser';
import { YandexSDK } from '../systems/YandexSDK';
import { AudioSystem } from '../systems/AudioSystem';
import { ParticlePool } from '../systems/ParticlePool';
import { RNG, money } from '../utils/random';
import type { Rarity, VehicleClass } from '../types/game';

type ContainerPhase = 'waiting' | 'delivering' | 'delivered' | 'opening' | 'revealed' | 'inspecting' | 'trashing' | 'cleaning' | 'repairing' | 'painting' | 'polishing' | 'starting' | 'ready';
type MissionCadence = 'daily' | 'weekly' | 'achievement';
type SpecialContainer = 'golden' | 'collector' | 'military' | 'classic';
type ContainerTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
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
  trash: number;
  inspected: number;
  clean: number;
  repair: number;
  paint: number;
  polish: number;
  engineStart: number;
  customerPreference: 'paint' | 'engine' | 'originality' | 'perfect';
  conditionTags: string[];
  specialContainer?: SpecialContainer;
  containerTier: ContainerTier;
  repairCostEstimate: number;
  instantSaleOffer: number;
  scrapValue: number;
  potentialSale: number;
  bestSalePrice?: number;
}

interface CollectionRecord {
  vehicleName: string;
  vehicleClass: string;
  rarity: Rarity;
  discovered: boolean;
  firstCondition: number;
  bestCondition: number;
  estimatedValue: number;
  timesRestored: number;
  timesSold: number;
  bestSalePrice: number;
  favorite: boolean;
  displayed: boolean;
}

interface Mission {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: number;
  cadence: MissionCadence;
  claimed: boolean;
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
  currentContainerTier?: ContainerTier;
  boostUntil: number;
  market: 'Rusty Containers' | 'Japanese Imports' | 'European Imports' | 'American Imports' | 'Luxury Imports' | 'Secret Finds';
  lastSave: number;
  dayStamp: number;
  weekStamp: number;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  achievements: Mission[];
  collection: string[];
  collectionBook: Record<string, CollectionRecord>;
  unlockedLocations: string[];
  unlockedFeatures: string[];
  workers: number;
  yardStage: number;
  bestVehicleValue: number;
  totalEarned: number;
  vipCustomers: number;
  collectors: number;
  specialAuctions: number;
  secretContainers: number;
  vehiclesSold: number;
  vehiclesRestored: number;
  storedVehicles: number;
  favoriteVehicles: string[];
  displayedVehicles: string[];
  dailyStreak: number;
  workerXp: number;
  expansions: string[];
  eventName?: string;
  tutorialComplete: boolean;
  tutorialStep: number;
}

interface NavAction {
  icon: string;
  title: string;
  tint: number;
  action: () => void;
  enabled: () => boolean;
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
const rarityDeck: Rarity[] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const paintColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0xf8fafc, 0x0f172a, 0x14b8a6];
const rarityText: Record<Rarity, string> = { common: '#cbd5e1', uncommon: '#34d399', rare: '#60a5fa', epic: '#c084fc', legendary: '#facc15', mythic: '#ff3df2' };
const rarityTint: Record<Rarity, number> = { common: 0xcbd5e1, uncommon: 0x34d399, rare: 0x60a5fa, epic: 0xc084fc, legendary: 0xfacc15, mythic: 0xff3df2 };
const specialContainerNames: Record<SpecialContainer, string> = { golden: 'Golden Container', collector: 'Collector Container', military: 'Mysterious Military Container', classic: 'Forgotten Classic Collection' };

const locationUnlocks = [
  { level: 1, name: 'Abandoned Junkyard' },
  { level: 3, name: 'County Salvage Road' },
  { level: 5, name: 'Port Import Yard' },
  { level: 7, name: 'Collector District' },
  { level: 10, name: 'Private Auction Island' }
];
const featureUnlocks = [
  { level: 2, name: 'First hired mechanic' },
  { level: 3, name: 'Better imported vehicles' },
  { level: 4, name: 'Special auctions' },
  { level: 5, name: 'VIP customers' },
  { level: 6, name: 'Collectors' },
  { level: 8, name: 'Secret containers' },
  { level: 10, name: 'Legendary showroom' }
];
const dailyTemplates = [
  ['daily_open', 'Open 3 containers', 3, 950],
  ['daily_restore', 'Restore one vehicle', 1, 900],
  ['daily_sell', 'Sell two vehicles', 2, 1200],
  ['daily_repair', 'Repair five parts', 5, 1100],
  ['daily_wash', 'Wash three vehicles', 3, 1000],
  ['daily_upgrade', 'Complete one upgrade', 1, 1400]
] as const;
const weeklyTemplates = [
  ['weekly_restore', 'Restore 20 vehicles', 20, 18000],
  ['weekly_earn', 'Earn $500,000', 500000, 36000],
  ['weekly_open', 'Open 30 containers', 30, 22000],
  ['weekly_legendary', 'Discover one Legendary', 1, 30000],
  ['weekly_reputation', 'Reach next reputation level', 1, 16000]
] as const;
const achievementTemplates = [
  ['ach_first_flip', 'First Sale', 1, 900],
  ['ach_perfect', 'First Perfect Restoration', 1, 1800],
  ['ach_rare', 'First Rare Vehicle', 1, 2500],
  ['ach_epic', 'First Epic Vehicle', 1, 5000],
  ['ach_legend', 'First Legendary Vehicle', 1, 12000],
  ['ach_mythic', 'First Mythic Vehicle', 1, 50000],
  ['ach_million', 'One Million Coins', 1000000, 75000],
  ['ach_ten_million', 'Ten Million Coins', 10000000, 300000],
  ['ach_restore_100', '100 Vehicles Restored', 100, 90000],
  ['ach_open_1000', '1000 Containers Opened', 1000, 180000],
  ['ach_all_collection', 'Complete Every Collection', 1, 500000]
] as const;
const eventNames = ['Rainy Port Discounts', 'TV Auction Weekend', 'Collector Convention', 'Midnight Container Rumors'];
const tutorialSteps = ['Inspect damage', 'Remove trash', 'Pressure wash', 'Repair parts', 'Paint & polish', 'Start engine', 'Sell the flip'] as const;
const restorationStages = ['Inspection', 'Trash', 'Wash', 'Repair', 'Paint', 'Polish', 'Engine'] as const;
const repairParts = ['Headlights', 'Door', 'Windows', 'Mirror', 'Engine', 'Suspension', 'Wheels', 'Brakes'] as const;
const paintFinishes = ['Gloss', 'Metallic', 'Matte', 'Pearl'] as const;
const containerTiers: Record<ContainerTier, { label: string; unlock: number; price: number; rate: number; color: number; classes: VehicleClass[]; value: number; costRisk: number }> = {
  common: { label: 'Common', unlock: 1, price: 420, rate: 0.70, color: 0xcbd5e1, classes: ['compact', 'sedan', 'offroad'], value: 950, costRisk: 0.9 },
  uncommon: { label: 'Uncommon', unlock: 2, price: 1250, rate: 0.20, color: 0x34d399, classes: ['compact', 'sedan', 'offroad'], value: 2400, costRisk: 1.0 },
  rare: { label: 'Rare', unlock: 4, price: 4200, rate: 0.07, color: 0x60a5fa, classes: ['sedan', 'offroad', 'sports'], value: 7600, costRisk: 1.12 },
  epic: { label: 'Epic', unlock: 6, price: 12500, rate: 0.025, color: 0xc084fc, classes: ['sports', 'muscle', 'super'], value: 22000, costRisk: 1.22 },
  legendary: { label: 'Legendary', unlock: 9, price: 42000, rate: 0.0045, color: 0xfacc15, classes: ['muscle', 'sports', 'super'], value: 84000, costRisk: 1.35 },
  mythic: { label: 'Mythic', unlock: 12, price: 140000, rate: 0.0005, color: 0xff3df2, classes: ['super'], value: 320000, costRisk: 1.5 }
};
const customerTypes = ['Budget buyer', 'Collector', 'Luxury dealer', 'Museum', 'Export company'] as const;
const collectionClasses = ['City Cars', 'Sedans', 'SUVs', 'Pickup Trucks', 'Classic Cars', 'Sports Cars', 'Luxury Cars', 'Electric Cars', 'Concept Cars', 'Limited Editions', 'Prototype Vehicles', 'Secret Vehicles'] as const;
const classDisplay: Record<VehicleClass, string> = { compact: 'City Cars', sedan: 'Sedans', offroad: 'SUVs', muscle: 'Classic Cars', sports: 'Sports Cars', super: 'Luxury Cars' };
const workshopExpansions = ['Extra Repair Bays', 'Second Garage', 'Paint Department', 'Performance Shop', 'Engine Laboratory', 'Luxury Restoration Building', 'Vehicle Photography Studio', 'Auction Hall'];

export class GameScene extends Phaser.Scene {
  private state!: ImportState;
  private rng = new RNG(Date.now() % 999999);
  private readonly yandex = new YandexSDK();
  private readonly audio = new AudioSystem();
  private particles!: ParticlePool;
  private readonly world: Phaser.GameObjects.GameObject[] = [];
  private stageLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private navLayer!: Phaser.GameObjects.Container;
  private toastPool: any[] = [];
  private coinPool: any[] = [];
  private cinematicLayer!: Phaser.GameObjects.Container;
  private rewardLayer!: Phaser.GameObjects.Container;
  private activeWorkers: any[] = [];
  private activeForklift?: any;
  private activeVehicle?: any;
  private stageBusy = false;
  private autosaveTimer = 0;
  private hasRendered = false;
  private ambientTimer?: any;
  private layout = { width: 1280, height: 760 };

  constructor() { super('Game'); }

  create(): void {
    this.yandex.init();
    this.particles = new ParticlePool(this, 120);
    this.state = this.loadState();
    this.cameras.main.setBackgroundColor(0x07111f);
    this.drawWorld();
    this.stageLayer = this.add.container(0, 0).setDepth(10);
    this.hudLayer = this.add.container(0, 0).setDepth(30);
    this.navLayer = this.add.container(0, 0).setDepth(40);
    this.cinematicLayer = this.add.container(0, 0).setDepth(55);
    this.rewardLayer = this.add.container(0, 0).setDepth(85);
    this.createPools();
    (this as any).sys.scale.on('resize', this.refreshLayout, this);
    (this as any).sys.events.once('shutdown', this.shutdown, this);
    this.refreshLayout();
    this.input.keyboard?.on('keydown-S', () => this.saveState());
    this.input.once('pointerdown', () => { this.audio.startAmbience(); this.audio.setMusicIntensity(this.state.level); });
    this.ambientTimer = this.time.delayedCall(700, () => this.spawnAmbientAction());
    if (!this.state.tutorialComplete && this.state.phase === 'waiting' && !this.state.current) {
      this.time.delayedCall(450, () => this.startTutorialCinematic());
    }
  }

  private shutdown(): void {
    (this as any).sys.scale.off('resize', this.refreshLayout, this);
    this.ambientTimer?.remove(false);
    this.tweens.killAll();
    this.audio.destroy();
  }

  private refreshLayout(): void {
    this.layout.width = (this as any).sys.scale.width || 1280;
    this.layout.height = (this as any).sys.scale.height || 760;
    this.render();
  }

  private createPools(): void {
    for (let i = 0; i < 18; i++) {
      this.coinPool.push(this.add.image(-100, -100, 'coin').setScale(0.38).setVisible(false).setDepth(70));
    }
    for (let i = 0; i < 4; i++) {
      const toast = this.add.container(-1000, -1000).setVisible(false).setDepth(80);
      toast.add(this.roundedPanel(0, 0, 520, 46, 16, 0x0f172a, 0.9, 0x38bdf8, 0.45));
      toast.add(this.add.text(0, 0, '', { fontFamily: 'Inter, Arial', fontSize: '17px', color: '#fef3c7', fontStyle: '700' }).setOrigin(0.5));
      this.toastPool.push(toast);
    }
  }

  private newState(): ImportState {
    const now = Date.now();
    return this.normalizeState({ money: 0, level: 1, reputation: 1, xp: 0, containerPrice: 350, containersOpened: 0, storedVehicles: 0, phase: 'waiting', boostUntil: 0, market: 'Rusty Containers', lastSave: now, tutorialComplete: false, tutorialStep: 0 } as ImportState);
  }

  private loadState(): ImportState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return this.newState();
      const parsed = JSON.parse(raw) as ImportState;
      if (!Number.isFinite(parsed.money) || !parsed.phase) return this.newState();
      this.normalizeState(parsed);
      const offline = Math.min(6 * 3600, Math.max(0, (Date.now() - parsed.lastSave) / 1000));
      if (offline > 90) parsed.money += Math.floor(offline * parsed.reputation * 1.8);
      this.refreshMissions(parsed);
      this.applyUnlocks(parsed);
      return parsed;
    } catch {
      return this.newState();
    }
  }


  private normalizeState(state: ImportState): ImportState {
    const now = Date.now();
    state.dayStamp ??= this.dayStamp(now);
    state.weekStamp ??= this.weekStamp(now);
    state.dailyMissions ??= this.createMissions('daily');
    state.weeklyMissions ??= this.createMissions('weekly');
    state.achievements ??= this.createMissions('achievement');
    state.collection ??= [];
    state.collectionBook ??= {};
    state.unlockedLocations ??= ['Abandoned Junkyard'];
    state.unlockedFeatures ??= [];
    state.workers ??= 0;
    state.yardStage ??= 0;
    state.bestVehicleValue ??= 0;
    state.totalEarned ??= 0;
    state.vipCustomers ??= 0;
    state.collectors ??= 0;
    state.specialAuctions ??= 0;
    state.secretContainers ??= 0;
    state.vehiclesSold ??= 0;
    state.vehiclesRestored ??= 0;
    state.storedVehicles ??= 0;
    state.favoriteVehicles ??= [];
    state.displayedVehicles ??= [];
    state.dailyStreak ??= 1;
    state.workerXp ??= 0;
    state.expansions ??= [];
    this.rebuildCollectionBook(state);
    state.eventName ??= eventNames[Math.floor(now / 86_400_000) % eventNames.length];
    state.tutorialComplete ??= state.containersOpened > 0 || state.vehiclesSold > 0;
    state.tutorialStep ??= state.tutorialComplete ? tutorialSteps.length : 0;
    if (state.current) this.normalizeVehicle(state.current);
    return state;
  }

  private normalizeVehicle(vehicle: ImportVehicle): void {
    vehicle.trash ??= 0;
    vehicle.inspected ??= 0;
    vehicle.polish ??= 0;
    vehicle.engineStart ??= 0;
    vehicle.customerPreference ??= this.rng.pick(['paint', 'engine', 'originality', 'perfect']);
    vehicle.containerTier ??= vehicle.rarity as ContainerTier;
    vehicle.conditionTags ??= this.conditionTags(vehicle);
    vehicle.repairCostEstimate ??= this.estimateRepairCost(vehicle);
    vehicle.potentialSale ??= this.estimatePotentialSale(vehicle);
    vehicle.instantSaleOffer ??= this.estimateInstantSale(vehicle);
    vehicle.scrapValue ??= this.estimateScrapValue(vehicle);
  }


  private rebuildCollectionBook(state = this.state): void {
    for (const name of state.collection) {
      state.collectionBook[name] ??= {
        vehicleName: name, vehicleClass: 'Unknown', rarity: 'common', discovered: true, firstCondition: 0, bestCondition: 0, estimatedValue: 0, timesRestored: 0, timesSold: 0, bestSalePrice: 0, favorite: false, displayed: false
      };
    }
  }

  private updateCollectionDiscovery(vehicle: ImportVehicle): boolean {
    const existing = this.state.collectionBook[vehicle.name];
    const firstDiscovery = !existing?.discovered;
    const record: CollectionRecord = existing ?? {
      vehicleName: vehicle.name,
      vehicleClass: classDisplay[vehicle.class],
      rarity: vehicle.rarity,
      discovered: true,
      firstCondition: vehicle.condition,
      bestCondition: vehicle.condition,
      estimatedValue: vehicle.value,
      timesRestored: 0,
      timesSold: 0,
      bestSalePrice: 0,
      favorite: false,
      displayed: false
    };
    record.discovered = true;
    record.vehicleClass = classDisplay[vehicle.class];
    record.rarity = vehicle.rarity;
    record.bestCondition = Math.max(record.bestCondition, vehicle.condition);
    record.estimatedValue = Math.max(record.estimatedValue, vehicle.value);
    this.state.collectionBook[vehicle.name] = record;
    if (!this.state.collection.includes(vehicle.name)) this.state.collection.push(vehicle.name);
    if (firstDiscovery) {
      const reward = 180 + Object.keys(this.state.collectionBook).length * 35 + Math.floor(vehicle.value * 0.015);
      this.state.money += reward;
      this.state.xp += 25;
      this.flyCoins(reward);
      this.showRewardWindow('NEW DISCOVERY', `${vehicle.name} card added • +${money(reward)} • +25 XP`, vehicle.rarity);
      this.particles.burst(this.layout.width / 2, this.layout.height * 0.45, rarityTint[vehicle.rarity], 64);
    }
    return firstDiscovery;
  }

  private collectionCompletion(state = this.state): number {
    const discovered = Object.values(state.collectionBook).filter((entry) => entry.discovered).length;
    const target = Object.values(vehicleNames).reduce((sum, names) => sum + names.length, 0);
    return Math.min(1, discovered / target);
  }

  private updateCollectionSale(vehicle: ImportVehicle, offer: number, restored = true): void {
    this.updateCollectionDiscovery(vehicle);
    const record = this.state.collectionBook[vehicle.name];
    record.timesSold += 1;
    if (restored) record.timesRestored += 1;
    record.bestSalePrice = Math.max(record.bestSalePrice, offer);
    vehicle.bestSalePrice = record.bestSalePrice;
    if (this.collectionCompletion() >= 1 && !this.state.achievements.find((m) => m.id === 'ach_collection')?.claimed) {
      this.state.reputation += 5;
      this.showRewardWindow('COLLECTION COMPLETE', 'Museum-grade archive finished • +5 reputation', 'legendary');
    }
  }

  private showCollectionBook(): void {
    const completion = Math.floor(this.collectionCompletion() * 100);
    const records = Object.values(this.state.collectionBook).filter((entry) => entry.discovered).sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 5);
    if (!records.length) return this.toast('Collection Book: unknown silhouettes remain hidden. Discover a vehicle first.');
    const lines = records.map((entry) => `${entry.favorite ? '★ ' : ''}${entry.vehicleName} • ${entry.vehicleClass} • ${entry.rarity.toUpperCase()} • restored ${entry.timesRestored} • best ${money(entry.bestSalePrice)}`);
    this.showRewardWindow(`COLLECTION BOOK ${completion}%`, lines.join('\n'), records[0].rarity);
    this.toast(`${records.length} discovered cards shown. Unknown vehicles stay hidden until found.`);
  }

  private toggleFavoriteVehicle(): void {
    const vehicle = this.state.current;
    if (!vehicle) return this.showCollectionBook();
    this.updateCollectionDiscovery(vehicle);
    const record = this.state.collectionBook[vehicle.name];
    record.favorite = !record.favorite;
    record.displayed = record.favorite;
    this.state.favoriteVehicles = Object.values(this.state.collectionBook).filter((entry) => entry.favorite).map((entry) => entry.vehicleName);
    this.state.displayedVehicles = Object.values(this.state.collectionBook).filter((entry) => entry.displayed).map((entry) => entry.vehicleName);
    if (record.favorite && vehicle.rarity !== 'common') this.state.reputation += 1;
    this.toast(record.favorite ? `${vehicle.name} displayed in showroom.` : `${vehicle.name} removed from showroom.`);
    this.render();
  }

  private createMissions(cadence: MissionCadence): Mission[] {
    const source = cadence === 'daily' ? dailyTemplates : cadence === 'weekly' ? weeklyTemplates : achievementTemplates;
    return source.map(([id, title, target, reward]) => ({ id, title, target, reward, progress: 0, cadence, claimed: false }));
  }

  private dayStamp(time: number): number { return Math.floor(time / 86_400_000); }
  private weekStamp(time: number): number { return Math.floor(time / (7 * 86_400_000)); }

  private refreshMissions(state = this.state): void {
    const now = Date.now();
    const today = this.dayStamp(now);
    const week = this.weekStamp(now);
    if (state.dayStamp !== today) {
      state.dailyStreak = state.dayStamp === today - 1 ? (state.dailyStreak ?? 0) + 1 : 1;
      state.dayStamp = today;
      state.dailyMissions = this.createMissions('daily');
      state.eventName = eventNames[today % eventNames.length];
      state.money += 120 + Math.min(7, state.dailyStreak) * 80;
    }
    if (state.weekStamp !== week) {
      state.weekStamp = week;
      state.weeklyMissions = this.createMissions('weekly');
    }
    const opened = state.containersOpened;
    const collection = state.collection.length;
    const earned = state.totalEarned;
    for (const mission of [...state.dailyMissions, ...state.weeklyMissions, ...state.achievements]) {
      if (mission.id.includes('open')) mission.progress = opened;
      if (mission.id.includes('collect')) mission.progress = collection;
      if (mission.id.includes('earn')) mission.progress = earned;
      if (mission.id.includes('sell')) mission.progress = state.vehiclesSold;
      if (mission.id.includes('restore')) mission.progress = state.vehiclesRestored;
      if (mission.id === 'ach_first_flip') mission.progress = state.vehiclesSold > 0 ? 1 : 0;
      if (mission.id === 'daily_repair') mission.progress = state.vehiclesRestored * repairParts.length;
      if (mission.id === 'daily_wash') mission.progress = state.vehiclesRestored;
      if (mission.id === 'daily_upgrade') mission.progress = state.expansions.length;
      if (mission.id === 'weekly_legendary') mission.progress = Object.values(state.collectionBook).some((entry) => entry.rarity === 'legendary' && entry.discovered) ? 1 : 0;
      if (mission.id === 'weekly_reputation') mission.progress = state.reputation > 1 ? 1 : 0;
      if (mission.id === 'ach_perfect') mission.progress = state.vehiclesRestored > 0 ? 1 : 0;
      if (mission.id === 'ach_rare') mission.progress = Object.values(state.collectionBook).some((entry) => entry.rarity === 'rare' && entry.discovered) ? 1 : 0;
      if (mission.id === 'ach_epic') mission.progress = Object.values(state.collectionBook).some((entry) => entry.rarity === 'epic' && entry.discovered) ? 1 : 0;
      if (mission.id === 'ach_legend') mission.progress = Object.values(state.collectionBook).some((entry) => entry.rarity === 'legendary' && entry.discovered) ? 1 : 0;
      if (mission.id === 'ach_mythic') mission.progress = Object.values(state.collectionBook).some((entry) => entry.rarity === 'mythic' && entry.discovered) ? 1 : 0;
      if (mission.id === 'ach_million') mission.progress = state.totalEarned;
      if (mission.id === 'ach_ten_million') mission.progress = state.totalEarned;
      if (mission.id === 'ach_restore_100') mission.progress = state.vehiclesRestored;
      if (mission.id === 'ach_open_1000') mission.progress = opened;
      if (mission.id === 'ach_all_collection') mission.progress = this.collectionCompletion(state) >= 1 ? 1 : 0;
    }
  }

  private applyUnlocks(state = this.state): void {
    for (const unlock of locationUnlocks) if (state.level >= unlock.level && !state.unlockedLocations.includes(unlock.name)) state.unlockedLocations.push(unlock.name);
    for (const unlock of featureUnlocks) if (state.level >= unlock.level && !state.unlockedFeatures.includes(unlock.name)) state.unlockedFeatures.push(unlock.name);
    state.workers = Math.max(state.workers, Math.min(6, Math.floor((state.level + 1) / 2)));
    state.yardStage = Math.min(5, Math.floor((state.level - 1) / 2));
  }

  private claimReadyMissions(): void {
    this.refreshMissions();
    for (const mission of [...this.state.dailyMissions, ...this.state.weeklyMissions, ...this.state.achievements]) {
      if (!mission.claimed && mission.progress >= mission.target) {
        mission.claimed = true;
        this.state.money += mission.reward;
        this.toast(`${mission.title} complete: +${money(mission.reward)}`);
      }
    }
  }

  private saveState(): void {
    this.state.lastSave = Date.now();
    this.safeLocalSave();
    void this.yandex.save(this.state);
    this.toast('Business saved.');
  }

  private safeLocalSave(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[GameScene] Local save unavailable; continuing without crashing.', error);
    }
  }

  private drawWorld(): void {
    if (this.world.length > 0) return;
    this.add.rectangle(640, 380, 1280, 760, 0x07111f, 1);
    this.add.circle(215, 120, 280, 0x0ea5e9, 0.09);
    this.add.circle(1135, 105, 260, 0xf97316, 0.07);
    this.world.push(this.add.image(640, 526, 'workshop').setScale(1.28));
    this.world.push(this.add.image(194, 520, 'fence').setScale(1.12));
    this.world.push(this.add.image(1044, 520, 'fence').setScale(1.12));
    this.world.push(this.add.ellipse(640, 650, 1160, 145, 0x020617, 0.38));
    this.world.push(this.add.image(165, 698, 'grass_patch').setScale(1.08));
    this.world.push(this.add.image(1130, 698, 'grass_patch').setScale(1.02));
    this.world.push(this.add.image(170, 575, 'scrap_pile').setScale(1.15));
    this.world.push(this.add.image(1110, 545, 'container').setScale(0.92));
    this.world.push(this.add.image(1050, 650, 'dumpster').setScale(0.95));
    const tow = this.add.image(350, 635, 'tow_truck').setScale(0.82);
    this.world.push(tow);
    this.tweens.add({ targets: tow, x: tow.x + 14, yoyo: true, repeat: -1, duration: 4200, ease: 'Sine.InOut' });
    const forklift = this.add.image(925, 592, 'forklift').setScale(0.85);
    this.world.push(forklift);
    this.tweens.add({ targets: forklift, x: forklift.x - 18, yoyo: true, repeat: -1, duration: 5200, ease: 'Sine.InOut' });
    const workerA = this.add.image(792, 625, 'worker').setScale(0.72);
    const workerB = this.add.image(488, 626, 'worker').setScale(0.68).setFlipX(true);
    this.world.push(workerA, workerB);
    this.tweens.add({ targets: workerA, y: workerA.y - 8, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut' });
    this.tweens.add({ targets: workerB, x: workerB.x + 20, yoyo: true, repeat: -1, duration: 3000, ease: 'Sine.InOut' });
    this.world.push(this.add.image(230, 690, 'tire_stack').setScale(0.82));
    this.world.push(this.add.image(1185, 245, 'tree').setScale(0.9));
    this.world.push(this.add.image(85, 250, 'tree').setScale(0.85));
    const lightLeft = this.add.image(70, 388, 'yard_light').setScale(0.86);
    const lightRight = this.add.image(1210, 388, 'yard_light').setScale(0.86).setFlipX(true);
    this.world.push(lightLeft, lightRight);
    const steam = this.add.image(760, 430, 'steam').setScale(0.72).setAlpha(0.54);
    this.world.push(steam);
    this.tweens.add({ targets: steam, y: steam.y - 24, alpha: 0.18, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.InOut' });
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.ellipse(140 + i * 320, 72 + (i % 2) * 28, 150, 34, 0xffffff, 0.08);
      this.tweens.add({ targets: cloud, x: cloud.x + 70, yoyo: true, repeat: -1, duration: 11000 + i * 950 });
      this.world.push(cloud);
    }
    const floorGlow = this.add.ellipse(640, 612, 820, 120, 0x38bdf8, 0.08).setBlendMode('ADD');
    const sunBeam = this.add.rectangle(820, 290, 520, 42, 0xfef3c7, 0.08).setAngle(-18).setBlendMode('ADD');
    this.world.push(floorGlow, sunBeam);
    this.tweens.add({ targets: floorGlow, alpha: 0.14, scaleX: 1.04, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let i = 0; i < 3; i++) {
      const bird = this.add.text(-80 - i * 240, 105 + i * 22, '⌁', { fontFamily: 'Inter, Arial', fontSize: '28px', color: '#bae6fd' }).setAlpha(0.32);
      this.world.push(bird);
      this.tweens.add({ targets: bird, x: this.layout.width + 140, y: bird.y - 18, duration: 15000 + i * 2200, repeat: -1, ease: 'Sine.InOut', delay: i * 1800 });
    }
  }

  private render(): void {
    this.clearLayer(this.stageLayer);
    this.clearLayer(this.hudLayer);
    this.clearLayer(this.navLayer);
    this.drawPremiumHud();
    this.drawBusinessProgression();
    this.drawContainerStage();
    this.drawContextActions();
    this.drawBottomNavigation();
    if (!this.state.tutorialComplete) this.drawTutorialOverlay();
    if (!this.hasRendered) {
      this.animateLayer(this.stageLayer, 10);
      this.animateLayer(this.navLayer, 0);
      this.animateLayer(this.hudLayer, -12);
      this.hasRendered = true;
    }
  }

  private animateLayer(layer: Phaser.GameObjects.Container, yOffset: number): void {
    (layer as any).setAlpha(0.001).setY(yOffset);
    this.tweens.add({ targets: layer, alpha: 1, y: 0, duration: 180, ease: 'Sine.Out' });
  }

  private clearLayer(layer?: Phaser.GameObjects.Container): void {
    if (!layer) return;
    this.tweens.killTweensOf(layer);
    const children = [...(layer as Phaser.GameObjects.Container & { list: Phaser.GameObjects.GameObject[] }).list];
    children.forEach((child) => {
      this.tweens.killTweensOf(child);
      child.destroy();
    });
  }

  private drawPremiumHud(): void {
    const w = Math.min(1160, this.layout.width - 44);
    const x = this.layout.width / 2;
    const y = 18;
    const panel = this.glassPanel(x, y + 56, w, 112, 18, 0x0b1626, 0.78, 0x38bdf8, 0.32);
    this.hudLayer.add(panel);
    const objective = this.currentObjective();
    const xpNeeded = this.state.level * 100;
    const xpPercent = Math.max(0, Math.min(1, this.state.xp / xpNeeded));
    const items = [
      ['💰', 'Money', money(this.state.money), '#facc15'],
      ['⭐', 'Level', `${this.state.level}  Rep ${this.state.reputation}`, '#93c5fd'],
      ['🎯', 'Objective', objective, '#e2e8f0'],
      ['🏭', 'Workshop', this.state.expansions[this.state.expansions.length - 1] ?? this.state.unlockedLocations[this.state.unlockedLocations.length - 1] ?? 'Starter Bay', '#86efac'],
      ['🔓', 'Next Unlock', featureUnlocks.find((u) => u.level > this.state.level)?.name ?? 'Showroom Prestige', '#fb923c']
    ];
    const gap = w / items.length;
    items.forEach(([icon, label, value, color], index) => {
      const ix = x - w / 2 + gap * index + gap / 2;
      this.hudLayer.add(this.add.text(ix, y + 27, icon, { fontFamily: 'Inter, Arial', fontSize: '20px' }).setOrigin(0.5));
      this.hudLayer.add(this.add.text(ix, y + 50, label, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#94a3b8', fontStyle: '700' }).setOrigin(0.5));
      this.hudLayer.add(this.add.text(ix, y + 75, value, { fontFamily: 'Inter, Arial', fontSize: index === 2 ? '15px' : '20px', color, fontStyle: '800', align: 'center', wordWrap: { width: gap - 16 } }).setOrigin(0.5));
    });
    this.hudLayer.add(this.add.rectangle(x - w / 2 + gap * 1 + gap / 2, y + 100, gap - 34, 7, 0x1e293b, 0.9));
    this.hudLayer.add(this.add.rectangle(x - w / 2 + gap * 1 + gap / 2 - (gap - 34) / 2 + ((gap - 34) * xpPercent) / 2, y + 100, (gap - 34) * xpPercent, 7, 0xf59e0b, 0.95));
  }

  private drawBusinessProgression(): void {
    const stage = this.state.yardStage;
    const left = Math.max(120, this.layout.width / 2 - 520);
    const y = Math.max(205, this.layout.height * 0.36);
    this.stageLayer.add(this.glassPanel(left, y + 38, 220, 190, 22, 0x0b1220, 0.56, 0xfacc15, 0.18));
    this.stageLayer.add(this.add.text(left, y - 38, `Stage ${stage + 1}: ${this.state.unlockedLocations[this.state.unlockedLocations.length - 1]}`, { fontFamily: 'Inter, Arial', fontSize: '15px', color: '#fde68a', fontStyle: '900', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5));
    const props = ['scrap_pile', 'dumpster', 'tow_truck', 'forklift', 'yard_light', 'workshop'];
    for (let i = 0; i <= stage; i++) this.stageLayer.add(this.add.image(left - 75 + (i % 3) * 75, y + 10 + Math.floor(i / 3) * 54, props[i]).setScale(i === 5 ? 0.36 : 0.46));
    for (let i = 0; i < this.state.workers; i++) this.stageLayer.add(this.add.image(left - 72 + i * 28, y + 95, 'worker').setScale(0.32));
    this.stageLayer.add(this.add.text(left, y + 136, `Workers ${this.state.workers} • Collection ${Math.floor(this.collectionCompletion() * 100)}% • Garage ${this.state.storedVehicles}`, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#cbd5e1', fontStyle: '800' }).setOrigin(0.5));

    const right = Math.min(this.layout.width - 120, this.layout.width / 2 + 520);
    this.stageLayer.add(this.glassPanel(right, y + 38, 220, 190, 22, 0x0b1220, 0.56, 0x38bdf8, 0.18));
    this.stageLayer.add(this.add.text(right, y - 38, `Event: ${this.state.eventName}`, { fontFamily: 'Inter, Arial', fontSize: '15px', color: '#bae6fd', fontStyle: '900', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5));
    const nextDaily = this.state.dailyMissions.find((mission) => !mission.claimed) ?? this.state.dailyMissions[0];
    const nextWeekly = this.state.weeklyMissions.find((mission) => !mission.claimed) ?? this.state.weeklyMissions[0];
    this.missionLine(right, y + 8, 'Daily', nextDaily);
    this.missionLine(right, y + 62, 'Weekly', nextWeekly);
    this.stageLayer.add(this.add.text(right, y + 120, `VIP ${this.state.vipCustomers} • Showroom ${this.state.displayedVehicles.length} • Expansion ${this.state.expansions.length}`, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#fef3c7', fontStyle: '800', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5));
  }

  private missionLine(x: number, y: number, label: string, mission: Mission): void {
    const pct = Math.min(1, mission.progress / mission.target);
    this.stageLayer.add(this.add.text(x, y - 16, `${label}: ${mission.title}`, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#e2e8f0', fontStyle: '800', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5));
    this.stageLayer.add(this.add.rectangle(x, y + 8, 150, 8, 0x1e293b, 0.9));
    this.stageLayer.add(this.add.rectangle(x - 75 + (150 * pct) / 2, y + 8, 150 * pct, 8, 0x22c55e, 0.95));
    this.stageLayer.add(this.add.text(x, y + 24, `${Math.floor(mission.progress)}/${mission.target} • ${money(mission.reward)}`, { fontFamily: 'Inter, Arial', fontSize: '11px', color: '#94a3b8', fontStyle: '700' }).setOrigin(0.5));
  }

  private drawContainerStage(): void {
    const cx = this.layout.width / 2;
    const stageY = Math.max(215, this.layout.height * 0.47);
    this.stageLayer.add(this.glassPanel(cx, stageY + 42, Math.min(760, this.layout.width - 80), 276, 28, 0x111827, 0.42, 0x64748b, 0.22));
    if (this.state.phase === 'waiting') {
      const idleContainer = this.add.image(cx, stageY, 'container_closed').setScale(1.02);
      this.stageLayer.add(idleContainer);
      this.tweens.add({ targets: idleContainer, y: stageY - 5, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.stageCopy('Choose your next container', 'Paid containers only. Compare price, rarity and profit potential before taking the risk.', '#e0f2fe');
      return;
    }
    if (this.state.phase === 'delivering' || this.state.phase === 'delivered' || this.state.phase === 'opening') {
      const container = this.add.image(cx, stageY, this.state.phase === 'opening' ? 'container_open' : 'container_closed').setScale(1.05);
      this.stageLayer.add(container);
      if (this.state.phase === 'delivering' || this.state.phase === 'opening') this.tweens.add({ targets: container, x: cx + 8, duration: 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.stageCopy(this.state.phase === 'opening' ? 'Doors unlocking...' : this.state.phase === 'delivered' ? 'Container secured' : 'Forklift unloading...', this.state.phase === 'opening' ? 'Metal groans. Dust leaks from the seal. Watch for the silhouette.' : this.state.phase === 'delivered' ? 'Press OPEN CONTAINER when you are ready for the reveal.' : 'The crew guides the container into the bay.', '#fde68a');
      return;
    }
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.stageLayer.add(this.add.image(cx, stageY - 45, 'container_open').setScale(1.02));
    const vehicleBody = this.add.image(cx, stageY + 35, 'vehicle_body').setScale(1.12).setTint(vehicle.color);
    this.stageLayer.add(vehicleBody);
    this.tweens.add({ targets: vehicleBody, y: vehicleBody.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.drawVehicleStageDetails(cx, stageY, vehicle);
    const visibleDirt = this.state.tutorialComplete ? vehicle.dirt * (1 - vehicle.clean) : vehicle.dirt * (1 - vehicle.trash) * (1 - vehicle.clean * 0.45);
    for (let i = 0; i < Math.ceil(visibleDirt * 5); i++) this.stageLayer.add(this.add.image(cx - 80 + i * 38, stageY + 25 + (i % 2) * 18, 'dirt_cluster').setScale(0.7));
    for (let i = 0; i < Math.ceil(vehicle.damage * 4 * (1 - vehicle.repair)); i++) this.stageLayer.add(this.add.image(cx - 55 + i * 48, stageY + 60, 'rust_patch').setScale(0.76));
    this.stageLayer.add(this.add.image(cx - 145, stageY - 88, `rarity_${vehicle.rarity}`).setScale(0.72));
    this.drawContainerInfo(cx, stageY, vehicle);
    const vehicleTitle = this.add.text(cx, stageY + 158, `${vehicle.name}  •  ${vehicle.rarity.toUpperCase()}  •  ${money(vehicle.value)}`, { fontFamily: 'Inter, Arial', fontSize: '23px', color: rarityText[vehicle.rarity], fontStyle: '800' }).setOrigin(0.5);
    this.stageLayer.add(vehicleTitle);
    this.tweens.add({ targets: vehicleTitle, scale: 1.03, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.drawRestorationChecklist(cx, stageY + 212, vehicle);
  }



  private drawVehicleStageDetails(cx: number, stageY: number, vehicle: ImportVehicle): void {
    const shadow = this.add.ellipse(cx, stageY + 100, 310, 46, 0x020617, 0.44);
    this.stageLayer.add(shadow);
    const shineAlpha = 0.08 + vehicle.polish * 0.34 + vehicle.paint * 0.12;
    const shine = this.add.rectangle(cx - 18, stageY + 4, 260, 16, 0xffffff, shineAlpha).setAngle(-9).setBlendMode('ADD');
    this.stageLayer.add(shine);
    if (vehicle.repair >= 0.65 || vehicle.engineStart >= 1) {
      const leftLight = this.add.circle(cx - 118, stageY + 35, 12, 0xfef3c7, vehicle.engineStart >= 1 ? 0.9 : 0.35).setBlendMode('ADD');
      const rightLight = this.add.circle(cx + 118, stageY + 35, 12, 0xfef3c7, vehicle.engineStart >= 1 ? 0.9 : 0.35).setBlendMode('ADD');
      this.stageLayer.add([leftLight, rightLight]);
    }
    if (vehicle.repair >= 0.45) {
      this.stageLayer.add(this.add.rectangle(cx - 50, stageY + 20, 44, 24, 0xbae6fd, 0.22).setAngle(-4));
      this.stageLayer.add(this.add.rectangle(cx + 50, stageY + 20, 44, 24, 0xbae6fd, 0.22).setAngle(4));
    }
    const tireScale = 0.75 + vehicle.repair * 0.18;
    this.stageLayer.add(this.add.circle(cx - 92, stageY + 88, 21 * tireScale, 0x020617, 0.86));
    this.stageLayer.add(this.add.circle(cx + 92, stageY + 88, 21 * tireScale, 0x020617, 0.86));
    if (vehicle.polish >= 1 && vehicle.engineStart >= 1) this.stageLayer.add(this.add.text(cx, stageY - 118, 'SHOWCASE READY', { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#fde68a', fontStyle: '900' }).setOrigin(0.5));
  }

  private drawRestorationChecklist(cx: number, y: number, vehicle: ImportVehicle): void {
    const values = [
      vehicle.inspected,
      vehicle.trash, vehicle.clean, vehicle.repair, vehicle.paint, vehicle.polish, vehicle.engineStart
    ];
    const icons = ['🔎', '🧹', '💦', '🔧', '🎨', '✨', '🔑'];
    const width = Math.min(760, this.layout.width - 110);
    this.stageLayer.add(this.glassPanel(cx, y, width, 76, 20, 0x020617, 0.62, 0x38bdf8, 0.22));
    restorationStages.forEach((label, index) => {
      const x = cx - width / 2 + 58 + index * ((width - 116) / (restorationStages.length - 1));
      const done = values[index] >= 1;
      const active = this.nextRestorationStep(vehicle) === index;
      const color = done ? '#86efac' : active ? '#fde68a' : '#94a3b8';
      this.stageLayer.add(this.add.circle(x, y - 10, active ? 16 : 13, done ? 0x22c55e : active ? 0xfacc15 : 0x334155, 0.92));
      this.stageLayer.add(this.add.text(x, y - 10, done ? '✓' : icons[index], { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#020617', fontStyle: '900' }).setOrigin(0.5));
      this.stageLayer.add(this.add.text(x, y + 22, `${label} ${Math.floor(values[index] * 100)}%`, { fontFamily: 'Inter, Arial', fontSize: '10px', color, fontStyle: '800', align: 'center' }).setOrigin(0.5));
    });
  }

  private nextRestorationStep(vehicle: ImportVehicle): number {
    if (vehicle.inspected < 1) return 0;
    if (vehicle.trash < 1) return 1;
    if (vehicle.clean < 1) return 2;
    if (vehicle.repair < 1) return 3;
    if (vehicle.paint < 1) return 4;
    if (vehicle.polish < 1) return 5;
    if (vehicle.engineStart < 1) return 6;
    return 6;
  }

  private stageCopy(title: string, body: string, color: string): void {
    const cx = this.layout.width / 2;
    const y = Math.min(this.layout.height - 210, this.layout.height * 0.7);
    const titleText = this.add.text(cx, y - 10, title, { fontFamily: 'Inter, Arial', fontSize: '26px', color, fontStyle: '800' }).setOrigin(0.5).setAlpha(0);
    const bodyText = this.add.text(cx, y + 46, body, { fontFamily: 'Inter, Arial', fontSize: '17px', color: '#cbd5e1', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5).setAlpha(0);
    this.stageLayer.add([titleText, bodyText]);
    this.tweens.add({ targets: titleText, y, alpha: 1, duration: 320, ease: 'Cubic.Out' });
    this.tweens.add({ targets: bodyText, y: y + 34, alpha: 1, duration: 360, delay: 90, ease: 'Cubic.Out' });
  }

  private progressPill(x: number, y: number, label: string, value: number, icon: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y + 18).setAlpha(0);
    c.add(this.glassPanel(0, 0, 178, 58, 18, 0x0f172a, 0.72, 0x38bdf8, 0.22));
    c.add(this.add.image(-62, 0, icon).setScale(0.34));
    c.add(this.add.text(-28, -16, label, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#cbd5e1', fontStyle: '800' }));
    c.add(this.add.rectangle(26, 12, 92, 8, 0x1e293b, 0.92));
    c.add(this.add.rectangle(26 - 46 + (92 * value) / 2, 12, 92 * value, 8, 0xfacc15, 0.95));
    c.add(this.add.text(76, -16, `${Math.floor(value * 100)}%`, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#fff7ed', fontStyle: '800' }).setOrigin(0.5, 0));
    this.tweens.add({ targets: c, y, alpha: 1, duration: 260, ease: 'Back.Out' });
    return c;
  }

  private drawContextActions(): void {
    const y = this.layout.height - 154;
    if (this.state.phase === 'delivered') {
      this.navLayer.add(this.actionButton(this.layout.width / 2, y, '🔓', 'Open Container', () => this.openContainer(), !this.stageBusy, 0xfacc15, Math.min(220, this.layout.width - 48)));
    }
    if (this.state.phase === 'waiting' && this.state.tutorialComplete) this.drawContainerTierActions(y);
    if (this.state.current && !this.state.tutorialComplete && ['revealed', 'inspecting', 'trashing', 'cleaning', 'repairing', 'painting', 'polishing', 'starting'].includes(this.state.phase)) {
      const actions = [
        () => this.inspectVehicle(),
        () => this.restore('trash'),
        () => this.restore('clean'),
        () => this.restore('repair'),
        () => this.restore('paint'),
        () => this.restore('polish'),
        () => this.startEngine()
      ];
      const icons = ['🔎', '🧹', '💦', '🔧', '🎨', '✨', '🔑'];
      const colors = [0x60a5fa, 0xfacc15, 0x38bdf8, 0xf97316, 0xa855f7, 0xf8fafc, 0x22c55e];
      const labels = ['Inspect', 'Trash', 'Wash', 'Repair', 'Paint', 'Polish', 'Start'];
      const step = Math.min(this.state.tutorialStep, 6);
      this.navLayer.add(this.actionButton(this.layout.width / 2, y, icons[step], labels[step], actions[step], !this.stageBusy, colors[step], Math.min(176, this.layout.width - 48)));
    }
    if (this.state.current && this.state.tutorialComplete && this.state.phase === 'revealed') {
      this.navLayer.add(this.actionButton(this.layout.width / 2, y, '🔎', 'Inspect', () => this.inspectVehicle(), !this.stageBusy, 0x60a5fa, Math.min(176, this.layout.width - 48)));
    }
    if (this.state.current && this.state.tutorialComplete && ['inspecting', 'trashing', 'cleaning', 'repairing', 'painting', 'polishing', 'starting'].includes(this.state.phase)) {
      const cx = this.layout.width / 2;
      const spacing = Math.min(170, Math.max(112, this.layout.width / 4.1));
      const buttonWidth = Math.min(146, Math.max(96, spacing - 18));
      const step = this.nextRestorationStep(this.state.current);
      const configs = [
        ['🧹', 'Trash', () => this.restore('trash'), 1, 0xfacc15],
        ['💦', 'Wash', () => this.restore('clean'), 2, 0x38bdf8],
        ['🔧', 'Repair', () => this.restore('repair'), 3, 0xf97316],
        ['🎨', 'Paint', () => this.restore('paint'), 4, 0xa855f7],
        ['✨', 'Polish', () => this.restore('polish'), 5, 0xf8fafc],
        ['🔑', 'Start', () => this.startEngine(), 6, 0x22c55e]
      ] as const;
      configs.slice(Math.max(0, step - 1), Math.max(3, step + 2)).slice(0, 3).forEach(([icon, label, action, required, tint], index) => {
        this.navLayer.add(this.actionButton(cx + (index - 1) * spacing, y, icon, label, action, step === required && !this.stageBusy, tint, buttonWidth));
      });
    }
  }

  private drawDecisionActions(y: number): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    const cx = this.layout.width / 2;
    const spacing = Math.min(150, Math.max(104, this.layout.width / 5.8));
    const width = Math.min(134, Math.max(92, spacing - 12));
    const actions = [
      ['🔧', 'Restore', 0x22c55e, () => this.startRestoration()],
      ['💵', money(vehicle.instantSaleOffer), 0xfacc15, () => this.sellVehicleNow()],
      ['♻️', money(vehicle.scrapValue), 0xef4444, () => this.scrapVehicle()],
      ['🏠', 'Garage', 0x60a5fa, () => this.storeVehicle()],
      ['⭐', 'Keep', rarityTint[vehicle.rarity], () => this.keepForCollection()]
    ] as const;
    actions.forEach(([icon, title, tint, action], index) => {
      this.navLayer.add(this.actionButton(cx + (index - 2) * spacing, y, icon, title, action, !this.stageBusy, tint, width));
    });
  }

  private startRestoration(): void {
    if (!this.state.current) return;
    this.inspectVehicle();
  }

  private sellVehicleNow(): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    const offer = vehicle.instantSaleOffer;
    this.state.money += offer;
    this.state.totalEarned += offer;
    this.state.vehiclesSold += 1;
    this.updateCollectionSale(vehicle, offer, false);
    this.flyCoins(offer);
    this.showRewardWindow('QUICK SALE', `${vehicle.name} • ${money(offer)}`, vehicle.rarity);
    this.finishVehicleDecision(`Sold immediately for ${money(offer)}.`);
  }

  private scrapVehicle(): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    const value = vehicle.scrapValue;
    this.state.money += value;
    this.state.totalEarned += value;
    this.flyCoins(value);
    this.particles.burst(this.layout.width / 2, this.layout.height * 0.55, 0xef4444, 32);
    this.showRewardWindow('SCRAPPED FOR PARTS', `${vehicle.name} • ${money(value)}`, vehicle.rarity);
    this.finishVehicleDecision(`Scrapped for ${money(value)} in usable parts.`);
  }

  private storeVehicle(): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.state.storedVehicles += 1;
    this.updateCollectionDiscovery(vehicle);
    this.showRewardWindow('GARAGE STORED', `${vehicle.name} is waiting for a better market.`, vehicle.rarity);
    this.finishVehicleDecision(`${vehicle.name} moved to garage storage.`);
  }

  private keepForCollection(): void {
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.updateCollectionDiscovery(vehicle);
    this.toggleFavoriteVehicle();
    this.state.reputation += vehicle.rarity === 'legendary' || vehicle.rarity === 'mythic' ? 2 : 1;
    this.showRewardWindow('COLLECTION PIECE', `${vehicle.name} increased your reputation.`, vehicle.rarity);
    this.finishVehicleDecision(`${vehicle.name} kept for the collection.`);
  }

  private finishVehicleDecision(message: string): void {
    this.state.current = undefined;
    this.state.phase = 'waiting';
    this.claimReadyMissions();
    this.saveState();
    this.render();
    this.toast(message);
  }

  private drawBottomNavigation(): void {
    const actions: NavAction[] = [
      { icon: '🚚', title: this.state.tutorialComplete ? 'Market' : 'Locked', tint: 0xf97316, action: () => this.toast('Choose a paid container tier above. Higher tiers raise risk and profit.'), enabled: () => this.state.tutorialComplete && this.state.phase === 'waiting' },
      { icon: '🎬', title: 'Ads', tint: 0x38bdf8, action: () => this.showAdRewards(), enabled: () => true },
      { icon: '💰', title: 'Sell', tint: 0xfacc15, action: () => this.sellVehicle(), enabled: () => this.state.phase === 'ready' },
      { icon: '🔧', title: 'Upgrade', tint: 0x22c55e, action: () => this.shop(), enabled: () => true },
      { icon: '📖', title: 'Book', tint: 0x93c5fd, action: () => this.showCollectionBook(), enabled: () => true },
      { icon: '⚙', title: 'Save', tint: 0xa3a3a3, action: () => this.saveState(), enabled: () => true }
    ];
    const barW = Math.max(340, Math.min(980, this.layout.width - 36));
    const y = this.layout.height - 76;
    this.navLayer.add(this.glassPanel(this.layout.width / 2, y, barW, 88, 26, 0x07111f, 0.88, 0x38bdf8, 0.26));
    const gap = barW / actions.length;
    actions.forEach((item, index) => {
      const x = this.layout.width / 2 - barW / 2 + gap * index + gap / 2;
      this.navLayer.add(this.actionButton(x, y, item.icon, item.title, item.action, item.enabled(), item.tint, Math.min(128, gap - 12)));
    });
  }


  private drawContainerTierActions(y: number): void {
    const tiers = (Object.keys(containerTiers) as ContainerTier[]).filter((tier) => this.state.level >= containerTiers[tier].unlock);
    const shown = tiers.slice(-Math.min(4, tiers.length));
    const cx = this.layout.width / 2;
    const spacing = Math.min(165, Math.max(112, this.layout.width / (shown.length + 1)));
    shown.forEach((tier, index) => {
      const cfg = containerTiers[tier];
      const price = this.containerPrice(tier);
      this.navLayer.add(this.actionButton(cx + (index - (shown.length - 1) / 2) * spacing, y, tier === 'mythic' ? '💎' : '📦', `${cfg.label} ${money(price)}`, () => this.buyContainer(tier), this.state.money >= price && !this.stageBusy, cfg.color, Math.min(158, spacing - 10)));
    });
    if (this.state.level < containerTiers.mythic.unlock && this.rng.next() > 0.985) {
      this.toast('Rumor: a Mythic container was spotted. Build reputation to unlock it.');
    }
  }

  private containerPrice(tier: ContainerTier): number {
    const cfg = containerTiers[tier];
    const discount = Math.min(0.28, (this.state.reputation - 1) * 0.012);
    return Math.floor(cfg.price * (1 + this.state.level * 0.055) * (1 - discount));
  }

  private actionButton(x: number, y: number, icon: string, title: string, action: () => void, enabled: boolean, tint: number, width: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y + 22).setAlpha(0);
    const shadow = this.add.rectangle(4, 8, width - 8, 52, 0x020617, enabled ? 0.34 : 0.18).setOrigin(0.5);
    const bg = this.glassPanel(0, 0, width, 58, 18, 0x172033, enabled ? 0.82 : 0.38, tint, enabled ? 0.45 : 0.12);
    const gradient = this.add.rectangle(0, -12, width - 18, 22, 0xffffff, enabled ? 0.07 : 0.025).setBlendMode('ADD');
    const glow = this.add.rectangle(0, 0, width - 12, 48, tint, 0).setBlendMode('ADD');
    c.add([shadow, bg, gradient, glow]);
    c.add(this.add.text(0, -11, icon, { fontFamily: 'Inter, Arial', fontSize: '21px' }).setOrigin(0.5));
    c.add(this.add.text(0, 16, title, { fontFamily: 'Inter, Arial', fontSize: '12px', color: enabled ? '#f8fafc' : '#64748b', fontStyle: '800' }).setOrigin(0.5));
    this.tweens.add({ targets: c, y, alpha: enabled ? 1 : 0.58, duration: 260, ease: 'Back.Out' });
    if (!enabled) this.tweens.add({ targets: c, alpha: 0.38, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    c.setSize(width, 58).setInteractive({ useHandCursor: enabled })
      .on('pointerover', () => { if (enabled) this.tweens.add({ targets: [c], scale: 1.06, duration: 120, ease: 'Back.Out' }); if (enabled) glow.setAlpha(0.16); })
      .on('pointerout', () => { this.tweens.add({ targets: c, scale: 1, duration: 130 }); glow.setAlpha(0); })
      .on('pointerdown', () => {
        if (!enabled) { this.audio.play('error'); return this.toast('Action unavailable right now.'); }
        this.audio.play('click');
        this.particles.burst(x, y, tint, 8);
        this.audio.startAmbience();
        glow.setAlpha(0.24);
        this.tweens.add({ targets: c, scale: 0.92, angle: -1.5, duration: 80, ease: 'Quad.Out' });
      })
      .on('pointerup', () => {
        if (!enabled) return;
        this.tweens.add({ targets: c, scale: 1.04, angle: 0, yoyo: true, duration: 120, ease: 'Back.Out' });
        glow.setAlpha(0.08);
        action();
      });
    return c;
  }

  private glassPanel(x: number, y: number, width: number, height: number, radius: number, fill: number, alpha: number, stroke: number, strokeAlpha: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(this.add.graphics()
      .fillStyle(0x020617, 0.22)
      .fillRoundedRect(-width / 2 + 4, -height / 2 + 8, width, height, radius));
    c.add(this.add.graphics()
      .fillStyle(fill, alpha)
      .fillRoundedRect(-width / 2, -height / 2, width, height, radius)
      .lineStyle(1.5, stroke, strokeAlpha)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, radius));
    c.add(this.add.graphics()
      .fillStyle(0xffffff, 0.045)
      .fillRoundedRect(-width / 2 + 10, -height / 2 + 8, width - 20, Math.max(8, height * 0.18), Math.max(6, radius - 6)));
    return c;
  }

  private roundedPanel(x: number, y: number, width: number, height: number, radius: number, fill: number, alpha: number, stroke: number, strokeAlpha: number): Phaser.GameObjects.Graphics {
    return this.add.graphics({ x, y })
      .fillStyle(fill, alpha)
      .fillRoundedRect(-width / 2, -height / 2, width, height, radius)
      .lineStyle(1.5, stroke, strokeAlpha)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }

  private currentObjective(): string {
    if (this.state.phase === 'delivered') return 'Open container';
    if (!this.state.tutorialComplete) return tutorialSteps[Math.min(this.state.tutorialStep, tutorialSteps.length - 1)];
    const mission = this.state.dailyMissions?.find((item) => !item.claimed);
    if (mission) return mission.title;
    if (this.state.phase === 'waiting') return 'Buy next container';
    if (this.state.phase === 'ready') return 'Sell restored vehicle';
    if (this.state.current) return 'Restore import';
    return 'Grow the yard';
  }

  private buyContainer(tier: ContainerTier = 'common', sponsored = false): void {
    if (!this.state.tutorialComplete && !sponsored) return this.toast('Finish the first flip to unlock container buying.');
    if (this.stageBusy) return this.toast('Crew is already working on this container.');
    if (this.state.phase !== 'waiting') return this.toast('Finish the current container first.');
    const price = this.containerPrice(tier);
    if (!sponsored && this.state.money < price) return this.toast(`Need ${money(price)} for a ${containerTiers[tier].label} container.`);
    if (!sponsored) this.state.money -= price;
    this.state.currentContainerTier = tier;
    this.state.current = this.rollVehicle(tier, sponsored ? 1 : 0);
    this.state.current.buyPrice = sponsored ? 0 : price;
    this.state.phase = 'delivering';
    this.stageBusy = true;
    this.audio.startAmbience();
    this.audio.setMusicIntensity(this.state.level + 2);
    this.audio.play('engine');
    this.clearLayer(this.cinematicLayer);
    this.render();
    this.playDeliveryCinematic(() => this.containerDelivered());
  }

  private containerDelivered(): void {
    this.state.phase = 'delivered';
    this.stageBusy = false;
    this.clearLayer(this.cinematicLayer);
    this.render();
    this.toast('Container delivered. Open it when ready!');
  }

  private openContainer(): void {
    if (this.state.phase !== 'delivered' || this.stageBusy) return;
    this.stageBusy = true;
    this.state.phase = 'opening';
    this.clearLayer(this.cinematicLayer);
    this.render();
    this.playOpeningCinematic();
    this.time.delayedCall(2200, () => {
      this.state.phase = 'revealed';
      this.state.containersOpened += 1;
      if (this.state.containersOpened % 10 === 0 && this.state.level >= 4) this.state.specialAuctions += 1;
      if (this.state.containersOpened % 15 === 0 && this.state.level >= 8) this.state.secretContainers += 1;
      const discovered = this.state.current ? this.updateCollectionDiscovery(this.state.current) : false;
      this.refreshMissions();
      this.stageBusy = false;
      this.playRarityReveal(this.state.current?.rarity ?? 'common');
      this.clearLayer(this.cinematicLayer);
      this.render();
      this.toast(discovered ? `NEW DISCOVERY: ${this.state.current?.name}! Collection updated.` : `Found ${this.state.current?.name}! Restore it for profit.`);
      if (!discovered) this.showRewardWindow(this.state.current?.specialContainer ? specialContainerNames[this.state.current.specialContainer] : 'CONTAINER REVEALED', `${this.state.current?.name} • ${this.state.current?.rarity.toUpperCase()}`, this.state.current?.rarity ?? 'common');
      this.audio.play('reward');
      this.audio.setMusicIntensity(this.state.level);
      this.cameraPulse();
    });
  }

  private showAdRewards(): void {
    const bonusCoins = Math.floor(260 + this.state.level * 160 + this.state.reputation * 90);
    const choices = [
      ['Epic sponsored container', () => this.yandex.showRewarded('epic-container', () => this.buyContainer('epic', true))],
      [`Bonus coins ${money(bonusCoins)}`, () => this.yandex.showRewarded('bonus-coins', () => { this.state.money += bonusCoins; this.flyCoins(bonusCoins); this.render(); })],
      ['Double next sale', () => this.yandex.showRewarded('double-sale', () => { this.state.boostUntil = Date.now() + 15 * 60_000; this.toast('Next sale boost active for 15 minutes.'); })],
      ['Instant repair', () => this.yandex.showRewarded('instant-repair', () => { if (this.state.current) { this.state.current.repair = 1; this.particles.burst(this.layout.width / 2, this.layout.height * 0.55, 0xf97316, 42); this.render(); } })]
    ] as const;
    const pick = choices[this.rng.int(0, choices.length - 1)];
    this.toast(`Optional ad offer: ${pick[0]}`);
    pick[1]();
  }

  private triggerRandomEvent(): void {
    const events = ['Insurance auction: Rare containers discounted', 'Police auction: Common containers have low mileage', 'Flood shipment: risky cheap luxury', 'Collector event: museums pay extra', 'Military container rumor', 'Celebrity collection lead'];
    this.state.eventName = this.rng.pick(events);
    this.particles.burst(this.layout.width / 2, 150, 0xfacc15, 30);
    this.toast(this.state.eventName);
    this.render();
  }

  private inspectVehicle(): void {
    if (this.stageBusy) return this.toast('Inspection already in progress.');
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.stageBusy = true;
    this.state.phase = 'inspecting';
    vehicle.inspected = 1;
    this.audio.play('click');
    this.render();
    const cx = this.layout.width / 2;
    const y = this.layout.height * 0.55;
    vehicle.conditionTags.forEach((tag, index) => {
      this.time.delayedCall(index * 180, () => {
        this.particles.burst(cx - 150 + index * 75, y - 50 + (index % 2) * 55, 0x60a5fa, 14);
        this.toast(`Inspection: ${tag}`);
      });
    });
    this.giveTaskReward('Inspection complete', 45, 12, 0x60a5fa);
    this.time.delayedCall(900, () => {
      this.stageBusy = false;
      if (!this.state.tutorialComplete) this.rewardTutorialStep('inspect');
      this.render();
    });
  }

  private restore(step: 'trash' | 'clean' | 'repair' | 'paint' | 'polish'): void {
    if (this.stageBusy) return this.toast('Crew is finishing the current job.');
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.stageBusy = true;
    const before = vehicle[step];
    const stepAmount = this.state.tutorialComplete ? 0.34 + this.state.reputation * 0.02 : (step === 'paint' || step === 'polish' ? 1 : 1);
    vehicle[step] = Math.min(1, vehicle[step] + stepAmount);
    const complete = this.state.tutorialComplete
      ? vehicle.trash >= 1 && vehicle.clean >= 1 && vehicle.repair >= 1 && vehicle.paint >= 1 && vehicle.polish >= 1 && vehicle.engineStart >= 1
      : vehicle.trash >= 1 && vehicle.clean >= 1 && vehicle.repair >= 1 && vehicle.paint >= 1 && vehicle.polish >= 1 && vehicle.engineStart >= 1;
    this.state.phase = complete ? 'ready' : step === 'trash' ? 'trashing' : step === 'clean' ? 'cleaning' : step === 'repair' ? 'repairing' : step === 'polish' ? 'polishing' : 'painting';
    if (complete) {
      this.state.vehiclesRestored += 1;
      this.claimReadyMissions();
    }
    this.audio.play(step === 'trash' || step === 'clean' ? 'dust' : step === 'paint' || step === 'polish' ? 'reward' : 'tool');
    this.giveTaskReward(this.stepLabel(step), step === 'repair' ? 85 : 60, step === 'repair' ? 18 : 14, step === 'clean' ? 0x38bdf8 : step === 'trash' ? 0xfacc15 : step === 'paint' ? 0xa855f7 : step === 'polish' ? 0xf8fafc : 0xf97316);
    this.render();
    this.playWorkAnimation(step, vehicle[step] - before);
    this.time.delayedCall(1100, () => { this.stageBusy = false; });
    if (!this.state.tutorialComplete) this.rewardTutorialStep(step);
    if (complete) {
      this.toast(this.state.tutorialComplete ? 'Restoration complete. Customers are making offers!' : 'Great work. Now sell the restored car!');
      this.showRewardWindow('RESTORATION COMPLETE', `${vehicle.name} is ready for buyers`, vehicle.rarity);
      this.audio.play('upgrade');
    }
  }

  private startEngine(): void {
    if (this.stageBusy) return this.toast('Engine test already running.');
    const vehicle = this.state.current;
    if (!vehicle || vehicle.polish < 1) return this.toast('Polish the vehicle before starting the engine.');
    this.stageBusy = true;
    this.state.phase = 'starting';
    this.audio.play('engine');
    this.render();
    const cx = this.layout.width / 2;
    const y = this.layout.height * 0.55;
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 230, () => this.emitSmoke(cx + 110, y + 10));
    this.time.delayedCall(850, () => {
      vehicle.engineStart = 1;
      this.state.phase = 'ready';
      this.giveTaskReward('Engine started', 120, 25, 0x22c55e);
      if (!this.state.tutorialComplete) this.rewardTutorialStep('engine');
      this.stageBusy = false;
      this.showRewardWindow('ENGINE START SUCCESS', 'Lights on • exhaust smoke • customer ready', vehicle.rarity);
      this.playShowcaseMoment(vehicle);
      this.render();
    });
  }


  private playShowcaseMoment(vehicle: ImportVehicle): void {
    const cx = this.layout.width / 2;
    const y = this.layout.height * 0.52;
    const halo = this.add.ellipse(cx, y, 560, 190, rarityTint[vehicle.rarity], 0.12).setDepth(58).setBlendMode('ADD');
    const car = this.add.image(cx, y + 20, 'vehicle_body').setTint(vehicle.color).setScale(1.18).setDepth(59).setAlpha(0);
    const flare = this.add.rectangle(cx - 90, y - 35, 300, 14, 0xffffff, 0.28).setAngle(-12).setDepth(60).setBlendMode('ADD');
    this.cinematicLayer.add([halo, car, flare]);
    this.cameras.main.pan(cx, y, 420, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.06, 420, 'Sine.easeInOut');
    this.tweens.add({ targets: car, alpha: 1, scale: 1.28, duration: 360, ease: 'Back.Out' });
    this.tweens.add({ targets: [halo, flare], alpha: 0, scaleX: 1.25, duration: 1200, delay: 700, ease: 'Sine.In', onComplete: () => { halo.destroy(); flare.destroy(); } });
    this.tweens.add({ targets: car, angle: 2, x: cx + 14, duration: 900, yoyo: true, ease: 'Sine.InOut', onComplete: () => { car.destroy(); this.cameras.main.zoomTo(1, 500, 'Sine.easeInOut'); } });
  }

  private sellVehicle(): void {
    const vehicle = this.state.current;
    if (!vehicle || this.state.phase !== 'ready') return this.toast('Fully restore the vehicle before selling.');
    const quality = (vehicle.clean + vehicle.repair + vehicle.paint) / 3;
    const boost = Date.now() < this.state.boostUntil ? 2 : 1;
    const vip = this.state.level >= 5 && vehicle.rarity !== 'common' && this.rng.next() > 0.58;
    const collector = this.state.level >= 6 && (vehicle.rarity === 'epic' || vehicle.rarity === 'legendary' || vehicle.rarity === 'mythic') && this.rng.next() > 0.42;
    const preferenceBonus = vehicle.customerPreference === 'paint' ? 1 + vehicle.paint * 0.16 : vehicle.customerPreference === 'engine' ? 1 + vehicle.engineStart * 0.18 : vehicle.customerPreference === 'originality' ? 1 + (1 - Math.abs(vehicle.condition - 0.5)) * 0.1 : vehicle.customerPreference === 'perfect' ? 1 + Math.min(vehicle.clean, vehicle.repair, vehicle.paint, vehicle.polish, vehicle.engineStart) * 0.22 : 1;
    const offer = Math.floor(vehicle.value * (0.58 + quality * 0.85 + this.state.reputation * 0.03) * boost * preferenceBonus * (vip ? 1.25 : 1) * (collector ? 1.45 : 1));
    this.state.money += offer;
    this.state.totalEarned += offer;
    this.state.bestVehicleValue = Math.max(this.state.bestVehicleValue, vehicle.value);
    this.state.vehiclesSold += 1;
    this.updateCollectionSale(vehicle, offer);
    if (vip) this.state.vipCustomers += 1;
    if (collector) this.state.collectors += 1;
    if (vehicle.rarity === 'legendary' || vehicle.rarity === 'mythic') { const ach = this.state.achievements.find((m) => m.id === 'ach_legend'); if (ach) ach.progress = 1; }
    if (!this.state.tutorialComplete) {
      this.state.tutorialComplete = true;
      this.state.tutorialStep = tutorialSteps.length;
      this.state.money += 350;
      this.state.xp += 35;
      this.toast('Tutorial complete! Container purchasing unlocked.');
    }
    this.state.xp += Math.floor(25 + offer / 120);
    while (this.state.xp >= this.state.level * 100) {
      this.state.xp -= this.state.level * 100;
      this.state.level += 1;
      this.state.reputation += 1;
      if (workshopExpansions[this.state.expansions.length]) this.state.expansions.push(workshopExpansions[this.state.expansions.length]);
      this.applyUnlocks();
      if (this.state.level === 3) this.state.market = 'Japanese Imports';
      if (this.state.level === 5) this.state.market = 'European Imports';
      if (this.state.level === 7) this.state.market = 'Luxury Imports';
    }
    this.state.containerPrice = Math.floor(900 + this.state.level * 260 + this.state.reputation * 120);
    this.flyCoins(offer);
    this.claimReadyMissions();
    this.showRewardWindow(collector ? 'COLLECTOR SALE' : vip ? 'VIP SALE' : 'VEHICLE SOLD', `${vehicle.name} • ${money(offer)}\nProfit ${money(offer - vehicle.buyPrice - vehicle.repairCostEstimate)} • Quality ${Math.floor(quality * 100)}%`, vehicle.rarity);
    this.toast(`${collector ? 'Collector bought' : vip ? 'VIP bought' : 'Sold'} ${vehicle.name} for ${money(offer)}.`);
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
    if (workshopExpansions[this.state.expansions.length]) this.state.expansions.push(workshopExpansions[this.state.expansions.length]);
    this.applyUnlocks();
    this.claimReadyMissions();
    this.audio.play('upgrade');
    this.render();
    this.showRewardWindow('BUSINESS UPGRADED', `Reputation ${this.state.reputation} • Stage ${this.state.yardStage + 1}`, 'uncommon');
    this.toast('Import contacts upgraded. The yard looks more professional.');
  }

  private rollVehicle(tier: ContainerTier, bonus: number): ImportVehicle {
    const cfg = containerTiers[tier];
    const vehicleClass = this.rng.pick(cfg.classes);
    const rarity: Rarity = tier === 'mythic' ? 'mythic' : tier === 'legendary' ? this.rng.pick(['epic', 'legendary', 'legendary']) : tier === 'epic' ? this.rng.pick(['rare', 'epic', 'epic']) : tier === 'rare' ? this.rng.pick(['uncommon', 'rare', 'rare']) : tier === 'uncommon' ? this.rng.pick(['common', 'uncommon', 'uncommon']) : this.rng.pick(['common', 'common', 'uncommon']);
    const variance = 0.72 + this.rng.next() * (tier === 'common' ? 0.75 : tier === 'mythic' ? 1.8 : 1.05 + bonus * 0.15);
    const base = cfg.value * variance;
    const condition = 0.22 + this.rng.next() * 0.38;
    const vehicle: ImportVehicle = {
      id: this.createId(), name: this.rng.pick(vehicleNames[vehicleClass]), class: vehicleClass, rarity,
      value: Math.floor(base * (1 + this.state.level * 0.11) * (0.75 + condition)), buyPrice: this.containerPrice(tier), condition,
      dirt: 0.45 + this.rng.next() * 0.5, damage: 0.35 + this.rng.next() * 0.55, color: this.rng.pick(paintColors), trash: 0, inspected: 0, clean: 0, repair: 0, paint: 0, polish: 0, engineStart: 0, customerPreference: this.rng.pick(['paint', 'engine', 'originality', 'perfect']), containerTier: tier,
      conditionTags: [], repairCostEstimate: 0, instantSaleOffer: 0, scrapValue: 0, potentialSale: 0
    };
    vehicle.specialContainer = this.rollSpecialContainer(rarity);
    vehicle.conditionTags = this.conditionTags(vehicle);
    vehicle.repairCostEstimate = this.estimateRepairCost(vehicle);
    vehicle.potentialSale = this.estimatePotentialSale(vehicle);
    vehicle.instantSaleOffer = this.estimateInstantSale(vehicle);
    vehicle.scrapValue = this.estimateScrapValue(vehicle);
    return vehicle;
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `vehicle-${Date.now().toString(36)}-${Math.floor(this.rng.next() * 1_000_000).toString(36)}`;
  }

  private rollSpecialContainer(rarity: Rarity): SpecialContainer | undefined {
    const roll = this.rng.next();
    if (rarity === 'mythic' || roll > 0.992) return 'golden';
    if (roll > 0.982) return 'collector';
    if (roll > 0.972) return 'military';
    if (roll > 0.958) return 'classic';
    return undefined;
  }

  private conditionTags(vehicle: ImportVehicle): string[] {
    const tags: string[] = [];
    if (vehicle.dirt > 0.72) tags.push('Covered with mud');
    if (vehicle.dirt > 0.55) tags.push('Trash-filled cabin');
    if (vehicle.damage > 0.72) tags.push('Heavy rust');
    if (vehicle.damage > 0.62) tags.push('Damaged bumper');
    if (vehicle.condition < 0.34) tags.push('Broken windows');
    if (vehicle.condition < 0.3) tags.push('Flat tires');
    if (vehicle.damage > 0.8) tags.push('Broken engine');
    if (vehicle.condition < 0.42 && this.rng.next() > 0.5) tags.push('Missing mirrors');
    if (vehicle.condition < 0.45 && this.rng.next() > 0.55) tags.push('Broken headlights');
    return tags.slice(0, 5);
  }

  private estimateRepairCost(vehicle: ImportVehicle): number {
    return Math.floor(vehicle.value * (0.10 + vehicle.damage * 0.20 + vehicle.dirt * 0.055) * (containerTiers[vehicle.containerTier]?.costRisk ?? 1));
  }

  private estimatePotentialSale(vehicle: ImportVehicle): number {
    const special = vehicle.specialContainer ? 1.15 : 1;
    const tierUpside = vehicle.containerTier === 'common' ? 0.98 : vehicle.containerTier === 'mythic' ? 1.45 : 1.08 + (containerTiers[vehicle.containerTier]?.unlock ?? 1) * 0.025;
    return Math.floor(vehicle.value * (1.02 + this.state.reputation * 0.025) * special * tierUpside);
  }

  private estimateInstantSale(vehicle: ImportVehicle): number {
    return Math.floor(vehicle.value * (0.42 + vehicle.condition * 0.25));
  }

  private estimateScrapValue(vehicle: ImportVehicle): number {
    return Math.floor(vehicle.value * (0.22 + vehicle.damage * 0.12));
  }

  private drawContainerInfo(cx: number, stageY: number, vehicle: ImportVehicle): void {
    if (this.state.phase !== 'revealed' && this.state.phase !== 'ready') return;
    const x = Math.min(this.layout.width - 170, cx + 410);
    const y = stageY + 25;
    this.stageLayer.add(this.glassPanel(x, y, 300, 212, 22, 0x020617, 0.78, rarityTint[vehicle.rarity], 0.38));
    this.stageLayer.add(this.add.text(x, y - 82, vehicle.specialContainer ? specialContainerNames[vehicle.specialContainer] : `${vehicle.rarity.toUpperCase()} FIND`, {
      fontFamily: 'Inter, Arial', fontSize: '16px', color: rarityText[vehicle.rarity], fontStyle: '900', align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5));
    const tags = vehicle.conditionTags.length ? vehicle.conditionTags.join(' • ') : 'Surprisingly intact';
    this.stageLayer.add(this.add.text(x, y - 45, tags, {
      fontFamily: 'Inter, Arial', fontSize: '12px', color: '#e2e8f0', fontStyle: '800', align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5));
    const customerType = customerTypes[Math.abs([...vehicle.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % customerTypes.length];
    const customer = `${customerType}: ${{ paint: 'Paint lover', engine: 'Engine purist', originality: 'Originality buyer', perfect: 'Perfectionist' }[vehicle.customerPreference]}`;
    const rows = [
      ['Customer', customer, '#fef3c7'],
      ['Est. value', money(vehicle.value), '#facc15'],
      ['Restore cost', money(vehicle.repairCostEstimate), '#fb923c'],
      ['Potential sale', money(vehicle.potentialSale), '#86efac'],
      ['Profit est.', money(vehicle.potentialSale - vehicle.repairCostEstimate - vehicle.buyPrice), '#38bdf8']
    ];
    rows.forEach(([label, value, color], index) => {
      const rowY = y - 18 + index * 28;
      this.stageLayer.add(this.add.text(x - 118, rowY, label, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#94a3b8', fontStyle: '800' }).setOrigin(0, 0.5));
      this.stageLayer.add(this.add.text(x + 118, rowY, value, { fontFamily: 'Inter, Arial', fontSize: '14px', color, fontStyle: '900' }).setOrigin(1, 0.5));
    });
  }


  private startTutorialCinematic(): void {
    if (this.state.tutorialComplete || this.state.current || this.stageBusy) return;
    this.state.current = this.rollVehicle('uncommon', 1);
    this.state.current.paint = 1;
    this.state.phase = 'delivering';
    this.stageBusy = true;
    this.render();
    this.playDeliveryCinematic(() => this.containerDelivered());
    this.toast('A tow truck just found your first flip!');
  }

  private playDeliveryCinematic(onComplete: () => void): void {
    const cx = this.layout.width / 2;
    const y = Math.max(215, this.layout.height * 0.47);
    this.cameras.main.pan(cx, y, 650, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.045, 650, 'Sine.easeInOut');
    const truck = this.add.image(-220, y + 120, 'tow_truck').setScale(0.82).setDepth(56);
    const forklift = this.add.image(-160, y + 98, 'forklift').setScale(0.92).setDepth(58);
    const container = this.add.image(-30, y + 10, 'container_closed').setScale(0.92).setDepth(57);
    const worker = this.add.image(-70, y + 128, 'worker').setScale(0.58).setDepth(59);
    this.cinematicLayer.add([truck, forklift, container, worker]);
    this.activeVehicle = container;
    this.tweens.add({ targets: truck, x: cx - 360, duration: 1250, ease: 'Cubic.InOut' });
    this.tweens.add({ targets: forklift, x: cx - 210, duration: 1250, ease: 'Cubic.InOut' });
    this.tweens.add({ targets: container, x: cx - 36, duration: 1250, ease: 'Cubic.InOut' });
    this.tweens.add({ targets: worker, x: cx + 210, duration: 1250, ease: 'Sine.InOut' });
    this.tweens.add({ targets: [container, forklift, truck], y: '+=7', duration: 105, yoyo: true, repeat: 12, ease: 'Sine.InOut' });
    this.time.delayedCall(350, () => this.emitDust(cx - 250, y + 100, 18));
    this.time.delayedCall(1050, () => this.emitDust(cx - 70, y + 108, 24));
    this.time.delayedCall(1450, () => {
      this.cameras.main.zoomTo(1, 480, 'Sine.easeInOut');
      onComplete();
    });
  }

  private playOpeningCinematic(): void {
    const cx = this.layout.width / 2;
    const y = Math.max(215, this.layout.height * 0.47);
    this.audio.play('door');
    this.cameras.main.pan(cx, y - 15, 900, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.06, 900, 'Sine.easeInOut');
    const worker = this.add.image(cx - 230, y + 112, 'worker').setScale(0.62).setDepth(63);
    this.cinematicLayer.add(worker);
    this.tweens.add({ targets: worker, x: cx - 118, duration: 520, ease: 'Sine.Out' });
    this.tweens.add({ targets: worker, y: worker.y - 10, duration: 160, yoyo: true, repeat: 5, delay: 420 });
    this.tweens.add({ targets: worker, x: cx + 210, alpha: 0, duration: 540, delay: 1650, ease: 'Sine.In', onComplete: () => worker.destroy() });
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 260, () => this.emitSmoke(cx - 130 + i * 60, y - 20 + (i % 2) * 24));
    for (let i = 0; i < 4; i++) this.time.delayedCall(280 + i * 260, () => this.emitDust(cx - 150 + i * 95, y + 88, 18));
    const silhouette = this.add.image(cx, y + 35, 'vehicle_body').setScale(1.05).setTint(0x020617).setAlpha(0).setDepth(61);
    const interior = this.add.rectangle(cx, y - 28, 340, 92, 0x38bdf8, 0).setDepth(60).setBlendMode('ADD');
    const flashlight = this.add.ellipse(cx - 20, y + 12, 360, 120, 0xfef3c7, 0).setDepth(64).setBlendMode('ADD');
    const reveal = this.add.image(cx, y + 35, 'vehicle_body').setScale(0.15).setAlpha(0).setTint(this.state.current?.color ?? 0xffffff).setDepth(62);
    this.cinematicLayer.add([interior, silhouette, flashlight, reveal]);
    this.tweens.add({ targets: interior, alpha: 0.28, duration: 700, delay: 520, ease: 'Sine.Out' });
    this.tweens.add({ targets: silhouette, alpha: 0.72, duration: 260, delay: 420, ease: 'Sine.Out' });
    this.tweens.add({ targets: flashlight, alpha: 0.38, duration: 160, delay: 900, yoyo: true, repeat: 1, ease: 'Sine.Out' });
    this.tweens.add({ targets: reveal, alpha: 1, scale: 1.15, x: cx + 8, duration: 1500, delay: 1150, ease: 'Elastic.Out' });
    this.tweens.add({ targets: silhouette, alpha: 0, duration: 260, delay: 1150, ease: 'Sine.In' });
    this.tweens.add({ targets: reveal, angle: 2, duration: 80, yoyo: true, repeat: 15, delay: 550 });
    this.time.delayedCall(1900, () => this.cameras.main.zoomTo(1, 500, 'Sine.easeInOut'));
  }

  private playWorkAnimation(step: 'trash' | 'clean' | 'repair' | 'paint' | 'polish', delta: number): void {
    const cx = this.layout.width / 2;
    const y = this.layout.height * 0.55;
    const color = step === 'paint' ? this.state.current?.color ?? 0xa855f7 : step === 'clean' ? 0x38bdf8 : step === 'trash' ? 0xfacc15 : 0xf97316;
    this.particles.burst(cx, y, color, 22 + Math.ceil(delta * 20));
    this.emitDust(cx - 80, y + 40, step === 'trash' ? 30 : step === 'clean' ? 24 : 12);
    const worker = this.add.image(cx - 260, y + 78, 'worker').setScale(0.55).setDepth(60);
    this.cinematicLayer.add(worker);
    this.tweens.add({ targets: worker, x: cx - 80, duration: 360, ease: 'Sine.Out' });
    this.tweens.add({ targets: worker, y: worker.y - 10, duration: 160, yoyo: true, repeat: 4, delay: 240 });
    this.tweens.add({ targets: worker, x: cx + 230, alpha: 0, duration: 460, delay: 950, ease: 'Sine.In', onComplete: () => worker.destroy() });
    this.cameraPulse();
  }

  private emitSmoke(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const puff = this.add.image(x + Phaser.Math.Between(-18, 18), y + Phaser.Math.Between(-8, 14), 'steam').setScale(0.28 + i * 0.08).setAlpha(0.42).setDepth(61);
      this.cinematicLayer.add(puff);
      this.tweens.add({ targets: puff, y: puff.y - 85 - i * 12, x: puff.x + Phaser.Math.Between(-45, 45), alpha: 0, scale: 0.95 + i * 0.12, duration: 1500 + i * 180, ease: 'Sine.Out', onComplete: () => puff.destroy() });
    }
  }

  private emitDust(x: number, y: number, count: number): void {
    this.audio.play('dust');
    for (let i = 0; i < count; i++) {
      const mote = this.add.image(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-14, 18), 'dirt_cluster').setScale(0.18 + Math.random() * 0.2).setAlpha(0.58).setDepth(60);
      this.cinematicLayer.add(mote);
      this.tweens.add({ targets: mote, x: mote.x + Phaser.Math.Between(-120, 120), y: mote.y - Phaser.Math.Between(20, 95), alpha: 0, scale: 0.05, duration: 620 + Phaser.Math.Between(0, 420), ease: 'Cubic.Out', onComplete: () => mote.destroy() });
    }
  }

  private showRewardWindow(title: string, detail: string, rarity: Rarity): void {
    const cx = this.layout.width / 2;
    const y = 218;
    const card = this.add.container(cx, y + 35).setAlpha(0).setScale(0.78).setDepth(88);
    const strokeColor = rarityTint[rarity];
    card.add(this.glassPanel(0, 0, 430, 128, 26, 0x111827, 0.92, strokeColor, 0.6));
    card.add(this.add.text(0, -30, title, { fontFamily: 'Inter, Arial', fontSize: '25px', color: '#fef3c7', fontStyle: '900' }).setOrigin(0.5));
    card.add(this.add.text(0, 12, detail, { fontFamily: 'Inter, Arial', fontSize: '17px', color: rarityText[rarity], fontStyle: '800', align: 'center', wordWrap: { width: 370 } }).setOrigin(0.5));
    this.rewardLayer.add(card);
    this.tweens.add({ targets: card, y, alpha: 1, scale: 1, duration: 360, ease: 'Back.Out' });
    this.tweens.add({ targets: card, y: y - 28, alpha: 0, scale: 0.9, duration: 420, delay: 1800, ease: 'Sine.In', onComplete: () => card.destroy() });
  }

  private playRarityReveal(rarity: Rarity): void {
    const tier = this.state.current?.containerTier;
    const color = tier === 'mythic' ? containerTiers.mythic.color : rarityTint[rarity];
    const cx = this.layout.width / 2;
    const y = Math.max(215, this.layout.height * 0.47) + 35;
    const intensity = tier === 'mythic' ? 150 : { common: 16, uncommon: 22, rare: 30, epic: 42, legendary: 64, mythic: 90 }[rarity];
    this.particles.burst(cx, y, color, intensity);
    this.cameras.main.flash(tier === 'mythic' ? 420 : rarity === 'common' ? 90 : 180, (color >> 16) & 255, (color >> 8) & 255, color & 255);
    this.cameras.main.shake(tier === 'mythic' ? 520 : rarity === 'legendary' || rarity === 'mythic' ? 280 : 150, tier === 'mythic' ? 0.012 : rarity === 'legendary' || rarity === 'mythic' ? 0.006 : 0.003);
    this.cameras.main.zoomTo(rarity === 'legendary' || rarity === 'mythic' ? 1.075 : 1.035, 180, 'Sine.easeOut');
    this.time.delayedCall(230, () => this.cameras.main.zoomTo(1, 520, 'Sine.easeInOut'));
    if (tier === 'mythic') {
      this.showRewardWindow('MYTHIC CONTAINER!', 'Unique lights • rare music sting • huge market value', 'mythic');
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 110, () => this.particles.burst(cx, y - 45, color, 42));
      this.audio.play('upgrade');
      this.audio.setMusicIntensity(this.state.level + 5);
    } else if (rarity === 'legendary' || rarity === 'mythic') {
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 140, () => this.particles.burst(cx, y - 35, color, 34));
      this.audio.play('upgrade');
    } else {
      this.audio.play(rarity === 'rare' || rarity === 'epic' ? 'reward' : 'cash');
    }
  }

  private stepLabel(step: 'trash' | 'clean' | 'repair' | 'paint' | 'polish'): string {
    if (step === 'clean') return 'Pressure wash';
    if (step === 'trash') return 'Trash removed';
    if (step === 'repair') return `${this.rng.pick([...repairParts])} repaired`;
    if (step === 'paint') return `${this.rng.pick([...paintFinishes])} paint applied`;
    return 'Paint polished';
  }

  private giveTaskReward(label: string, coins: number, xp: number, color: number): void {
    this.state.money += coins;
    this.state.xp += xp;
    this.particles.burst(this.layout.width / 2, this.layout.height * 0.55, color, 26);
    this.flyCoins(coins);
    this.toast(`${label}: +${money(coins)} • +${xp} XP`);
  }

  private rewardTutorialStep(step: 'inspect' | 'trash' | 'clean' | 'repair' | 'paint' | 'polish' | 'engine'): void {
    const order: Array<'inspect' | 'trash' | 'clean' | 'repair' | 'paint' | 'polish' | 'engine'> = ['inspect', 'trash', 'clean', 'repair', 'paint', 'polish', 'engine'];
    const expected = order[this.state.tutorialStep];
    if (step !== expected) return;
    const reward = 80 + this.state.tutorialStep * 45;
    this.state.money += reward;
    this.state.xp += 18;
    this.flyCoins(reward);
    this.showRewardWindow('STEP COMPLETE', `${tutorialSteps[this.state.tutorialStep]} • +${money(reward)} • +18 XP`, 'uncommon');
    this.state.tutorialStep += 1;
    this.time.delayedCall(850, () => this.render());
  }

  private drawTutorialOverlay(): void {
    const x = Math.min(this.layout.width - 185, Math.max(185, this.layout.width / 2));
    const y = 156;
    this.navLayer.add(this.glassPanel(x, y, 360, 104, 22, 0x020617, 0.86, 0xfacc15, 0.5));
    this.navLayer.add(this.add.text(x, y - 34, 'FIRST FLIP', { fontFamily: 'Inter, Arial', fontSize: '18px', color: '#facc15', fontStyle: '900' }).setOrigin(0.5));
    const labels = tutorialSteps.map((label, index) => `${index === this.state.tutorialStep ? '👉' : index < this.state.tutorialStep ? '✅' : '⬇'} ${index + 1}. ${label}`);
    this.navLayer.add(this.add.text(x, y + 15, labels.join('   '), { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#f8fafc', fontStyle: '800', align: 'center', wordWrap: { width: 320 } }).setOrigin(0.5));
  }

  private cameraPulse(): void {
    this.cameras.main.shake(120, 0.0025);
    this.cameras.main.zoomTo(1.018, 140, 'Sine.easeOut');
    this.time.delayedCall(150, () => this.cameras.main.zoomTo(1, 260, 'Sine.easeInOut'));
  }

  private spawnAmbientAction(): void {
    if (!this.scene.isActive('Game') || this.stageBusy) {
      this.ambientTimer = this.time.delayedCall(1200, () => this.spawnAmbientAction());
      return;
    }
    const y = 610 + Phaser.Math.Between(-18, 28);
    const fromLeft = Math.random() > 0.5;
    if (Math.random() > 0.45) {
      const forklift = this.add.image(fromLeft ? -110 : this.layout.width + 110, y, 'forklift').setScale(0.52).setFlipX(!fromLeft).setDepth(8);
      this.activeForklift = forklift;
      this.tweens.add({ targets: forklift, x: fromLeft ? this.layout.width + 120 : -120, duration: 5200, ease: 'Sine.InOut', onComplete: () => { if (this.activeForklift === forklift) this.activeForklift = undefined; forklift.destroy(); } });
    } else {
      const worker = this.add.image(fromLeft ? -60 : this.layout.width + 60, y + 28, 'worker').setScale(0.45).setFlipX(!fromLeft).setDepth(9);
      this.activeWorkers.push(worker);
      this.tweens.add({ targets: worker, x: fromLeft ? this.layout.width + 80 : -80, duration: 6200, ease: 'Sine.InOut', onComplete: () => { this.activeWorkers = this.activeWorkers.filter((item) => item !== worker); worker.destroy(); } });
      this.tweens.add({ targets: worker, y: worker.y - 7, duration: 240, yoyo: true, repeat: 24, ease: 'Sine.InOut' });
    }
    this.ambientTimer = this.time.delayedCall(2400 + Phaser.Math.Between(0, 2800), () => this.spawnAmbientAction());
  }

  private flyCoins(amount: number): void {
    const targetX = this.layout.width / 2 - Math.min(1160, this.layout.width - 44) / 2 + 116;
    for (let i = 0; i < 10; i++) {
      const coin = this.coinPool[i % this.coinPool.length];
      this.tweens.killTweensOf(coin);
      coin.setPosition(this.layout.width / 2, this.layout.height * 0.55).setAlpha(1).setScale(0.38).setVisible(true);
      this.tweens.add({ targets: coin, x: targetX + i * 5, y: 72, alpha: 0, scale: 0.18, duration: 650, delay: i * 25, ease: 'Cubic.Out', onComplete: () => coin.setVisible(false) });
    }
    this.audio.play('cash');
    this.toast(`+${money(amount)}`);
  }

  private toast(message: string): void {
    const toast = this.toastPool.find((item) => !item.visible) ?? this.toastPool[0];
    this.tweens.killTweensOf(toast);
    const label = toast.list[1] as Phaser.GameObjects.Text;
    label.setText(message);
    toast.setPosition(this.layout.width / 2, 132).setAlpha(0).setScale(0.96).setVisible(true);
    this.audio.play('whoosh');
    this.tweens.add({ targets: toast, y: 148, alpha: 1, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: toast, y: 178, alpha: 0, delay: 2200, duration: 520, ease: 'Sine.In', onComplete: () => toast.setVisible(false) });
  }

  update(_: number, delta: number): void {
    this.autosaveTimer += delta / 1000;
    if (this.autosaveTimer >= 20) {
      this.autosaveTimer = 0;
      this.state.lastSave = Date.now();
      this.safeLocalSave();
    }
  }
}
