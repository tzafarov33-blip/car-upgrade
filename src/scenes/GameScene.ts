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
  country?: string;
  year?: number;
  clueTags?: string[];
  risk?: number;
}

interface ContainerOffer {
  id: string;
  tier: ContainerTier;
  country: string;
  year: number;
  estimatedCondition: number;
  vehicleClass: VehicleClass;
  rarity: Rarity;
  risk: number;
  price: number;
  color: number;
  clues: string[];
  botBid: number;
  estimatedRepairCost: number;
  demand: number;
  popularity: number;
  timer: number;
  botPersonality: string;
  history: string[];
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

type WorkerTask = 'Ожидает' | 'Осмотр' | 'Уборка мусора' | 'Мойка' | 'Ремонт' | 'Покраска' | 'Полировка' | 'Запуск двигателя' | 'Перегон машины' | 'Отдых';
interface WorkerUpgradeSet { speed: number; cleaning: number; repair: number; painting: number; efficiency: number; movement: number; }
interface WorkshopWorker { id: string; name: string; task: WorkerTask; vehicleId?: string; upgrades: WorkerUpgradeSet; x: number; y: number; targetX: number; targetY: number; anim: 'walking' | 'working' | 'carrying' | 'resting'; cooldown: number; }

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
  workerRoster: WorkshopWorker[];
  repairSlots: number;
  containerSlots: number;
  containerQueue: ContainerTier[];
  automationEnabled: boolean;
  equipmentLevel: number;
  marketOffers: ContainerOffer[];
  auctionOffer?: ContainerOffer;
  auctionBid: number;
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
  compact: ['Кэй Спарк', 'Метро Финч', 'Токио Бин'],
  sedan: ['Бавария Краун', 'Евро Регент', 'Астерлайн С'],
  muscle: ['Детройт Хаулер', 'Айрон V8', 'Синдер Чарджер'],
  offroad: ['Трэйл Барон', 'Дезерт Окс', 'Ридж Патрол'],
  sports: ['Спринт Велоче', 'Аэро Пульс', 'Найт ГТ'],
  super: ['Аврора X', 'Зенит R', 'Фантом Двенадцать']
};
const rarityDeck: Rarity[] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const paintColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0xf8fafc, 0x0f172a, 0x14b8a6];
const rarityText: Record<Rarity, string> = { common: '#cbd5e1', uncommon: '#34d399', rare: '#60a5fa', epic: '#c084fc', legendary: '#facc15', mythic: '#ff3df2' };
const rarityTint: Record<Rarity, number> = { common: 0xcbd5e1, uncommon: 0x34d399, rare: 0x60a5fa, epic: 0xc084fc, legendary: 0xfacc15, mythic: 0xff3df2 };
const specialContainerNames: Record<SpecialContainer, string> = { golden: 'Золотой контейнер', collector: 'Контейнер коллекционера', military: 'Закрытый военный контейнер', classic: 'Забытая классика' };

const locationUnlocks = [
  { level: 1, name: 'Аукционный двор' },
  { level: 3, name: 'Импортный склад' },
  { level: 5, name: 'Портовый терминал' },
  { level: 7, name: 'Квартал коллекционеров' },
  { level: 10, name: 'Закрытый остров торгов' }
];
const featureUnlocks = [
  { level: 2, name: 'Найм второго мастера' },
  { level: 3, name: 'Качественный импорт' },
  { level: 4, name: 'Особые торги' },
  { level: 5, name: 'ВИП-покупатели' },
  { level: 6, name: 'Коллекционеры' },
  { level: 8, name: 'Секретные контейнеры' },
  { level: 10, name: 'Легендарный шоурум' }
];
const dailyTemplates = [
  ['daily_open', 'Открыть 3 контейнера', 3, 950],
  ['daily_restore', 'Восстановить одну машину', 1, 900],
  ['daily_sell', 'Продать две машины', 2, 1200],
  ['daily_repair', 'Отремонтировать пять узлов', 5, 1100],
  ['daily_wash', 'Помыть три машины', 3, 1000],
  ['daily_upgrade', 'Сделать одно улучшение', 1, 1400]
] as const;
const weeklyTemplates = [
  ['weekly_restore', 'Восстановить 20 машин', 20, 18000],
  ['weekly_earn', 'Заработать 500 000 монет', 500000, 36000],
  ['weekly_open', 'Открыть 30 контейнеров', 30, 22000],
  ['weekly_legendary', 'Найти легендарную машину', 1, 30000],
  ['weekly_reputation', 'Повысить репутацию', 1, 16000]
] as const;
const achievementTemplates = [
  ['ach_first_flip', 'Первая продажа', 1, 900],
  ['ach_perfect', 'Первая идеальная реставрация', 1, 1800],
  ['ach_rare', 'Первая редкая машина', 1, 2500],
  ['ach_epic', 'Первая эпическая машина', 1, 5000],
  ['ach_legend', 'Первая легендарная машина', 1, 12000],
  ['ach_mythic', 'Первая мифическая машина', 1, 50000],
  ['ach_million', 'Первый миллион монет', 1000000, 75000],
  ['ach_ten_million', 'Десять миллионов монет', 10000000, 300000],
  ['ach_restore_100', '100 восстановленных машин', 100, 90000],
  ['ach_open_1000', '1000 открытых контейнеров', 1000, 180000],
  ['ach_all_collection', 'Полная коллекция', 1, 500000]
] as const;
const eventNames = ['Скидки дождливого порта', 'Телевизионный аукцион', 'Слёт коллекционеров', 'Ночные слухи о контейнерах'];
const tutorialSteps = ['Осмотр', 'Уборка', 'Мойка', 'Ремонт', 'Покраска', 'Запуск', 'Продажа'] as const;
const restorationStages = ['Осмотр', 'Мусор', 'Мойка', 'Ремонт', 'Краска', 'Блеск', 'Двигатель'] as const;
const repairParts = ['Фары', 'Дверь', 'Стёкла', 'Зеркало', 'Двигатель', 'Подвеска', 'Колёса', 'Тормоза'] as const;
const paintFinishes = ['Глянец', 'Металлик', 'Матовый слой', 'Перламутр'] as const;
const containerTiers: Record<ContainerTier, { label: string; unlock: number; price: number; rate: number; color: number; classes: VehicleClass[]; value: number; costRisk: number }> = {
  common: { label: 'Обычный', unlock: 1, price: 420, rate: 0.70, color: 0xcbd5e1, classes: ['compact', 'sedan', 'offroad'], value: 950, costRisk: 0.9 },
  uncommon: { label: 'Необычный', unlock: 2, price: 1250, rate: 0.20, color: 0x34d399, classes: ['compact', 'sedan', 'offroad'], value: 2400, costRisk: 1.0 },
  rare: { label: 'Редкий', unlock: 4, price: 4200, rate: 0.07, color: 0x60a5fa, classes: ['sedan', 'offroad', 'sports'], value: 7600, costRisk: 1.12 },
  epic: { label: 'Эпический', unlock: 6, price: 12500, rate: 0.025, color: 0xc084fc, classes: ['sports', 'muscle', 'super'], value: 22000, costRisk: 1.22 },
  legendary: { label: 'Легендарный', unlock: 9, price: 42000, rate: 0.0045, color: 0xfacc15, classes: ['muscle', 'sports', 'super'], value: 84000, costRisk: 1.35 },
  mythic: { label: 'Мифический', unlock: 12, price: 140000, rate: 0.0005, color: 0xff3df2, classes: ['super'], value: 320000, costRisk: 1.5 }
};
const customerTypes = ['Практичный покупатель', 'Коллекционер', 'Премиум-дилер', 'Музей', 'Экспортная компания'] as const;
const collectionClasses = ['Городские авто', 'Седаны', 'Внедорожники', 'Пикапы', 'Классика', 'Спорткары', 'Премиум', 'Электромобили', 'Концепты', 'Лимитированные серии', 'Прототипы', 'Секретные машины'] as const;
const classDisplay: Record<VehicleClass, string> = { compact: 'Городские авто', sedan: 'Седаны', offroad: 'Внедорожники', muscle: 'Классика', sports: 'Спорткары', super: 'Премиум' };
const workshopExpansions = ['Дополнительные посты', 'Второй гараж', 'Покрасочный цех', 'Тюнинг-зона', 'Моторная лаборатория', 'Цех премиум-реставрации', 'Фотостудия продаж', 'Аукционный зал'];
const workerHireCosts = [0, 100000, 350000, 900000, 2000000, 5000000];
const workerNames = ['Миша', 'Роман', 'Лина', 'Олег', 'Вера', 'Глеб'];
const slotUnlockCosts = [0, 250000, 1250000];
const equipmentUpgradeCosts = [0, 25000, 150000, 650000, 1800000];
const countries = ['Япония', 'Германия', 'США', 'Италия', 'Франция', 'Великобритания', 'Корея', 'Швеция'];
const countryClasses: Record<string, VehicleClass[]> = { Япония: ['compact', 'sports', 'offroad'], Германия: ['sedan', 'sports', 'super'], США: ['muscle', 'offroad', 'sedan'], Италия: ['sports', 'super'], Франция: ['compact', 'sedan'], Великобритания: ['sedan', 'sports', 'offroad'], Корея: ['compact', 'sedan', 'offroad'], Швеция: ['sedan', 'offroad'] };
const classRu: Record<VehicleClass, string> = { compact: 'компакт', sedan: 'седан', muscle: 'маслкар', offroad: 'внедорожник', sports: 'спорткар', super: 'суперкар' };
const rarityRu: Record<Rarity, string> = { common: 'обычная', uncommon: 'необычная', rare: 'редкая', epic: 'эпическая', legendary: 'легендарная', mythic: 'мифическая' };
const marketClues = ['люкс', 'спорт', 'полиция', 'классика', 'электро', 'повреждён', 'после воды', 'после пожара', 'экспорт', 'неизвестно', 'гаражное хранение', 'редкая серия'];
const auctionPersonalities = ['агрессивный дилер', 'осторожный покупатель', 'коллекционер', 'люксовый салон', 'любитель риска'];

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
    this.time.addEvent({ delay: 850, loop: true, callback: () => this.automationTick() });
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
    return this.normalizeState({ money: 1200, level: 1, reputation: 1, xp: 0, containerPrice: 350, containersOpened: 0, storedVehicles: 0, phase: 'waiting', boostUntil: 0, market: 'Rusty Containers', lastSave: now, tutorialComplete: false, tutorialStep: 0 } as ImportState);
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
    state.unlockedLocations ??= ['Аукционный двор'];
    state.unlockedFeatures ??= [];
    state.workers ??= 1;
    state.workerRoster ??= [this.createWorkerProfile(0)];
    state.repairSlots ??= 1;
    state.containerSlots ??= 1;
    state.containerQueue ??= [];
    state.automationEnabled ??= true;
    state.equipmentLevel ??= 1;
    state.marketOffers ??= [];
    state.auctionBid ??= 0;
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
    while (state.workerRoster.length < Math.max(1, state.workers)) state.workerRoster.push(this.createWorkerProfile(state.workerRoster.length));
    state.workerRoster = state.workerRoster.slice(0, 6);
    state.workers = Math.max(1, Math.min(6, state.workerRoster.length));
    state.repairSlots = Math.max(1, Math.min(3, state.repairSlots));
    state.containerSlots = Math.max(1, Math.min(3, state.containerSlots));
    state.equipmentLevel = Math.max(1, Math.min(5, state.equipmentLevel));
    this.rebuildCollectionBook(state);
    state.eventName ??= eventNames[Math.floor(now / 86_400_000) % eventNames.length];
    state.tutorialComplete = true;
    state.tutorialStep = tutorialSteps.length;
    if (state.marketOffers.length !== 5) state.marketOffers = this.generateMarketOffers();
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
      this.showRewardWindow('НОВАЯ НАХОДКА', `${vehicle.name} добавлена в альбом • +${money(reward)} • +25 опыта`, vehicle.rarity);
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
      this.showRewardWindow('КОЛЛЕКЦИЯ СОБРАНА', 'Музейный архив завершён • +5 репутации', 'legendary');
    }
  }

  private showCollectionBook(): void {
    const completion = Math.floor(this.collectionCompletion() * 100);
    const records = Object.values(this.state.collectionBook).filter((entry) => entry.discovered).sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 5);
    if (!records.length) return this.toast('Альбом: неизвестные силуэты откроются после находки машины.');
    const lines = records.map((entry) => `${entry.favorite ? '★ ' : ''}${entry.vehicleName} • ${entry.vehicleClass} • ${rarityRu[entry.rarity]} • реставраций ${entry.timesRestored} • рекорд ${money(entry.bestSalePrice)}`);
    this.showRewardWindow(`АЛЬБОМ ${completion}%`, lines.join('\n'), records[0].rarity);
    this.toast(`Показано карточек: ${records.length}. Остальные откроются после находок.`);
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
    this.toast(record.favorite ? `${vehicle.name} выставлена в шоуруме.` : `${vehicle.name} убрана из шоурума.`);
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
    state.workers = Math.max(1, Math.min(6, state.workerRoster?.length ?? state.workers ?? 1));
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
    this.toast('Бизнес сохранён.');
  }

  private safeLocalSave(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[GameScene] Local save unavailable; continuing without crashing.', error);
    }
  }


  private createWorkerProfile(index: number): WorkshopWorker {
    return {
      id: `worker-${index + 1}`,
      name: workerNames[index] ?? `Мастер ${index + 1}`,
      task: index === 0 ? 'Ожидает' : 'Отдых',
      upgrades: { speed: 1, cleaning: 1, repair: 1, painting: 1, efficiency: 1, movement: 1 },
      x: 500 + index * 42,
      y: 620,
      targetX: 590 + index * 28,
      targetY: 520,
      anim: 'resting',
      cooldown: 0
    };
  }

  private automationTick(): void {
    if (!this.state?.automationEnabled || this.stageBusy || !this.state.tutorialComplete) return;
    if (!this.state.current && this.state.phase === 'waiting' && this.state.containerQueue.length > 0) {
      this.buyContainer(this.state.containerQueue.shift());
      return;
    }
    const vehicle = this.state.current;
    if (!vehicle) return;
    const worker = this.state.workerRoster.find((item) => item.cooldown <= Date.now()) ?? this.state.workerRoster[0];
    if (!worker) return;
    const next = this.nextRestorationStep(vehicle);
    if (this.state.phase === 'delivered') { worker.task = 'Перегон машины'; worker.anim = 'carrying'; this.openContainer(); return; }
    if (this.state.phase === 'revealed' && next === 0) { this.assignWorker(worker, 'Осмотр'); this.inspectVehicle(); return; }
    if (!['inspecting', 'trashing', 'cleaning', 'repairing', 'painting', 'polishing', 'starting'].includes(this.state.phase)) return;
    if (next === 1) return this.automatedRestore(worker, 'trash', 'Уборка мусора');
    if (next === 2) return this.automatedRestore(worker, 'clean', 'Мойка');
    if (next === 3) return this.automatedRestore(worker, 'repair', 'Ремонт');
    if (next === 4) return this.automatedRestore(worker, 'paint', 'Покраска');
    if (next === 5) return this.automatedRestore(worker, 'polish', 'Полировка');
    if (next === 6 && vehicle.polish >= 1 && vehicle.engineStart < 1) { this.assignWorker(worker, 'Запуск двигателя'); this.startEngine(); }
  }

  private automatedRestore(worker: WorkshopWorker, step: 'trash' | 'clean' | 'repair' | 'paint' | 'polish', task: WorkerTask): void {
    this.assignWorker(worker, task);
    this.restore(step);
  }

  private assignWorker(worker: WorkshopWorker, task: WorkerTask): void {
    const skill = task === 'Мойка' || task === 'Уборка мусора' ? worker.upgrades.cleaning : task === 'Ремонт' ? worker.upgrades.repair : task === 'Покраска' || task === 'Полировка' ? worker.upgrades.painting : worker.upgrades.speed;
    worker.task = task;
    worker.vehicleId = this.state.current?.id;
    worker.anim = task === 'Перегон машины' ? 'carrying' : 'working';
    worker.cooldown = Date.now() + Math.max(320, 1250 - skill * 140 - worker.upgrades.efficiency * 70 - this.state.equipmentLevel * 60);
    worker.targetX = this.layout.width / 2 + this.rng.int(-120, 120);
    worker.targetY = Math.max(280, this.layout.height * 0.47) + this.rng.int(10, 92);
  }

  private queueContainer(tier: ContainerTier): void {
    if (this.state.containerQueue.length >= this.state.containerSlots) return this.toast('Очередь контейнеров заполнена. Расширьте склад.');
    const price = this.containerPrice(tier);
    if (this.state.money < price) return this.toast(`Нужно ${money(price)} на контейнер: ${containerTiers[tier].label}.`);
    this.state.money -= price;
    this.state.containerQueue.push(tier);
    this.toast(`Контейнер «${containerTiers[tier].label}» поставлен в очередь.`);
    this.render();
  }

  private hireWorker(): void {
    const index = this.state.workerRoster.length;
    if (index >= 6) return this.toast('Нанято максимум 6 мастеров.');
    const cost = workerHireCosts[index];
    if (this.state.money < cost) return this.toast(`Мастер ${index + 1} стоит ${money(cost)}.`);
    this.state.money -= cost;
    this.state.workerRoster.push(this.createWorkerProfile(index));
    this.state.workers = this.state.workerRoster.length;
    this.toast(`${workerNames[index]} нанят. Мастерская работает быстрее.`);
    this.render();
  }

  private upgradeWorker(worker: WorkshopWorker, key: keyof WorkerUpgradeSet): void {
    const current = worker.upgrades[key];
    if (current >= 5) return this.toast(`${worker.name}: улучшение уже на максимуме.`);
    const cost = Math.floor(2500 * current * current * (key === 'efficiency' ? 1.4 : 1));
    if (this.state.money < cost) return this.toast(`${worker.name}: уровень ${current + 1} стоит ${money(cost)}.`);
    this.state.money -= cost;
    worker.upgrades[key] += 1;
    this.toast(`${worker.name}: улучшение до уровня ${worker.upgrades[key]}. Скорость выросла.`);
    this.render();
  }

  private expandRepairSlot(): void {
    if (this.state.repairSlots >= 3) return this.toast('Все 3 ремонтных поста уже открыты.');
    const cost = slotUnlockCosts[this.state.repairSlots];
    if (this.state.money < cost) return this.toast(`Пост ${this.state.repairSlots + 1} стоит ${money(cost)}.`);
    this.state.money -= cost;
    this.state.repairSlots += 1;
    this.state.expansions.push(`Ремонтный пост ${this.state.repairSlots}`);
    this.applyUnlocks();
    this.toast(`Ремонтный пост ${this.state.repairSlots} открыт.`);
    this.render();
  }

  private upgradeEquipment(): void {
    if (this.state.equipmentLevel >= 5) return this.toast('Оборудование улучшено до максимума.');
    const cost = equipmentUpgradeCosts[this.state.equipmentLevel];
    if (this.state.money < cost) return this.toast(`Улучшение оборудования стоит ${money(cost)}.`);
    this.state.money -= cost;
    this.state.equipmentLevel += 1;
    this.state.expansions.push(`Оборудование ${this.state.equipmentLevel}`);
    this.toast('Пол, инструменты, свет и склад заметно улучшены.');
    this.render();
  }


  private generateMarketOffers(): ContainerOffer[] {
    return Array.from({ length: 5 }, () => this.generateMarketOffer());
  }

  private generateMarketOffer(): ContainerOffer {
    const roll = this.rng.next();
    const tier: ContainerTier = roll < 0.001 ? 'mythic' : roll < 0.01 ? 'legendary' : roll < 0.04 ? 'epic' : roll < 0.12 ? 'rare' : roll < 0.30 ? 'uncommon' : 'common';
    const country = this.rng.pick(countries);
    const cfg = containerTiers[tier];
    const vehicleClass = this.rng.pick(countryClasses[country] ?? cfg.classes);
    const rarity: Rarity = tier === 'mythic' ? 'mythic' : tier === 'legendary' ? 'legendary' : tier === 'epic' ? 'epic' : tier === 'rare' ? 'rare' : tier === 'uncommon' ? 'uncommon' : 'common';
    const risk = Math.min(0.95, 0.18 + cfg.unlock * 0.055 + this.rng.next() * 0.28);
    const estimatedCondition = Math.max(0.08, Math.min(0.92, 0.62 - risk * 0.38 + this.rng.next() * 0.28));
    const year = this.rng.int(1968, 2025);
    const price = Math.floor(this.containerPrice(tier) * (0.72 + risk * 0.85 + this.rng.next() * 0.28));
    const estimatedRepairCost = Math.floor(price * (0.35 + risk * 0.95));
    const demand = Math.min(99, Math.floor(35 + cfg.unlock * 7 + this.rng.next() * 35));
    const popularity = Math.min(99, Math.floor(30 + (rarity === 'legendary' || rarity === 'mythic' ? 45 : cfg.unlock * 6) + this.rng.next() * 28));
    const timer = this.rng.int(45, 120);
    const botPersonality = this.rng.pick(auctionPersonalities);
    const clues = [country, classRu[vehicleClass], ...Array.from({ length: 3 }, () => this.rng.pick(marketClues))].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 5);
    return { id: this.createId(), tier, country, year, estimatedCondition, vehicleClass, rarity, risk, price, color: cfg.color, clues, botBid: Math.floor(price * (0.35 + this.rng.next() * 0.35)), estimatedRepairCost, demand, popularity, timer, botPersonality, history: ['Открытие торгов'] };
  }

  private refreshContainerMarket(): void {
    const cost = 10000;
    if (this.state.money < cost) return this.toast(`Обновление рынка стоит ${money(cost)}.`);
    this.state.money -= cost;
    this.state.marketOffers = this.generateMarketOffers();
    this.toast('Новые контейнеры выставлены на торги.');
    this.render();
  }

  private startAuction(offer: ContainerOffer): void {
    if (this.stageBusy || this.state.phase !== 'waiting') return this.toast('Сначала завершите текущую машину.');
    this.state.auctionOffer = offer;
    this.state.auctionBid = Math.max(offer.price, offer.botBid + this.rng.int(120, 900));
    offer.history.unshift(`${offer.botPersonality} поднял ставку до ${money(this.state.auctionBid)}`);
    this.toast(`Живой аукцион: ${offer.country}, ${offer.year}, риск ${Math.floor(offer.risk * 100)}%.`);
    this.render();
  }

  private raiseAuctionBid(): void {
    const offer = this.state.auctionOffer;
    if (!offer) return;
    const raise = Math.max(500, Math.floor(offer.price * (0.08 + this.rng.next() * 0.08)));
    const nextBid = this.state.auctionBid + raise;
    if (this.state.money < nextBid) return this.toast(`Для ставки нужно ${money(nextBid)}.`);
    this.state.auctionBid = nextBid;
    offer.history.unshift(`Вы предложили ${money(nextBid)}`);
    if (this.rng.next() < 0.45 + offer.risk * 0.35) {
      this.state.auctionBid += Math.floor(raise * (0.6 + this.rng.next()));
      offer.history.unshift(`${offer.botPersonality} ответил: ${money(this.state.auctionBid)}`);
    } else {
      this.winAuction();
      return;
    }
    this.render();
  }

  private stopAuction(): void {
    this.state.auctionOffer = undefined;
    this.state.auctionBid = 0;
    this.toast('Вы вышли из аукциона без покупки.');
    this.render();
  }

  private winAuction(): void {
    const offer = this.state.auctionOffer;
    if (!offer) return;
    if (this.state.money < this.state.auctionBid) return this.toast(`Недостаточно монет для ставки ${money(this.state.auctionBid)}.`);
    this.state.money -= this.state.auctionBid;
    this.state.marketOffers = this.state.marketOffers.filter((item) => item.id !== offer.id);
    while (this.state.marketOffers.length < 5) this.state.marketOffers.push(this.generateMarketOffer());
    this.state.auctionOffer = undefined;
    this.buyContainerFromOffer(offer, this.state.auctionBid);
  }

  private buyContainerFromOffer(offer: ContainerOffer, paid: number): void {
    this.state.currentContainerTier = offer.tier;
    this.state.current = this.rollVehicle(offer.tier, offer.rarity === 'mythic' ? 1 : 0);
    Object.assign(this.state.current, { buyPrice: paid, country: offer.country, year: offer.year, clueTags: offer.clues, risk: offer.risk, containerTier: offer.tier });
    this.state.phase = 'delivering';
    this.stageBusy = true;
    this.audio.startAmbience();
    this.audio.setMusicIntensity(this.state.level + 2);
    this.audio.play(offer.rarity === 'mythic' ? 'reward' : 'engine');
    this.clearLayer(this.cinematicLayer);
    this.render();
    this.playDeliveryCinematic(() => this.containerDelivered());
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
    this.drawRepairSlots();
    this.drawContainerStage();
    this.drawContextActions();
    this.drawWorkerPanel();
    this.drawBottomNavigation();
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
      ['💰', 'Монеты', money(this.state.money), '#facc15'],
      ['⭐', 'Уровень', `${this.state.level}  Реп. ${this.state.reputation}`, '#93c5fd'],
      ['🎯', 'Цель', objective, '#e2e8f0'],
      ['🏭', 'Мастерская', this.state.expansions[this.state.expansions.length - 1] ?? this.state.unlockedLocations[this.state.unlockedLocations.length - 1] ?? 'Стартовый бокс', '#86efac'],
      ['🔓', 'Далее', featureUnlocks.find((u) => u.level > this.state.level)?.name ?? 'Престиж шоурума', '#fb923c']
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
    this.stageLayer.add(this.add.text(left, y + 136, `Мастера ${this.state.workers} • Коллекция ${Math.floor(this.collectionCompletion() * 100)}% • Гараж ${this.state.storedVehicles}`, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#cbd5e1', fontStyle: '800' }).setOrigin(0.5));

    const right = Math.min(this.layout.width - 120, this.layout.width / 2 + 520);
    this.stageLayer.add(this.glassPanel(right, y + 38, 220, 190, 22, 0x0b1220, 0.56, 0x38bdf8, 0.18));
    this.stageLayer.add(this.add.text(right, y - 38, `Событие: ${this.state.eventName}`, { fontFamily: 'Inter, Arial', fontSize: '15px', color: '#bae6fd', fontStyle: '900', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5));
    const nextDaily = this.state.dailyMissions.find((mission) => !mission.claimed) ?? this.state.dailyMissions[0];
    const nextWeekly = this.state.weeklyMissions.find((mission) => !mission.claimed) ?? this.state.weeklyMissions[0];
    this.missionLine(right, y + 8, 'День', nextDaily);
    this.missionLine(right, y + 62, 'Неделя', nextWeekly);
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
      this.stageCopy('Выберите контейнер', 'Пять предложений с разной ценой, редкостью и риском.', '#e0f2fe');
      return;
    }
    if (this.state.phase === 'delivering' || this.state.phase === 'delivered' || this.state.phase === 'opening') {
      const container = this.add.image(cx, stageY, this.state.phase === 'opening' ? 'container_open' : 'container_closed').setScale(1.05);
      this.stageLayer.add(container);
      if (this.state.phase === 'delivering' || this.state.phase === 'opening') this.tweens.add({ targets: container, x: cx + 8, duration: 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.stageCopy(this.state.phase === 'opening' ? 'Замки открываются...' : this.state.phase === 'delivered' ? 'Контейнер доставлен' : 'Погрузчик разгружает...', this.state.phase === 'opening' ? 'Металл скрипит, из щелей идёт пыль. Скоро увидим находку.' : this.state.phase === 'delivered' ? 'Нажмите «Открыть», чтобы показать машину.' : 'Бригада ставит контейнер на пост.', '#fde68a');
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
    if (vehicle.polish >= 1 && vehicle.engineStart >= 1) this.stageLayer.add(this.add.text(cx, stageY - 118, 'ГОТОВО К ПОКАЗУ', { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#fde68a', fontStyle: '900' }).setOrigin(0.5));
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


  private drawRepairSlots(): void {
    const cx = this.layout.width / 2;
    const y = Math.max(190, this.layout.height * 0.31);
    const spacing = 190;
    for (let i = 0; i < 3; i++) {
      const unlocked = i < this.state.repairSlots;
      const x = cx + (i - 1) * spacing;
      this.stageLayer.add(this.glassPanel(x, y, 160, 72, 18, unlocked ? 0x102033 : 0x020617, unlocked ? 0.5 : 0.28, unlocked ? 0x22c55e : 0x64748b, 0.22));
      this.stageLayer.add(this.add.text(x, y - 16, `Пост ${i + 1}`, { fontFamily: 'Inter, Arial', fontSize: '13px', color: unlocked ? '#bbf7d0' : '#64748b', fontStyle: '900' }).setOrigin(0.5));
      this.stageLayer.add(this.add.text(x, y + 12, unlocked ? (this.state.current && i === 0 ? 'МАШИНА В РАБОТЕ' : 'Готов к очереди') : `Открыть ${money(slotUnlockCosts[i])}`, { fontFamily: 'Inter, Arial', fontSize: '11px', color: '#cbd5e1', fontStyle: '800' }).setOrigin(0.5));
    }
  }

  private drawWorkerPanel(): void {
    const workers = this.state.workerRoster;
    const panelW = Math.min(520, this.layout.width - 44);
    const x = this.layout.width - panelW / 2 - 22;
    const y = 146;
    this.navLayer.add(this.glassPanel(x, y + 54, panelW, 126, 20, 0x07111f, 0.84, 0x22c55e, 0.24));
    this.navLayer.add(this.add.text(x - panelW / 2 + 18, y + 4, `МАСТЕРА  ${workers.length}/6  •  Посты ${this.state.repairSlots}/3  •  Очередь ${this.state.containerQueue.length}/${this.state.containerSlots}`, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#bbf7d0', fontStyle: '900' }));
    workers.slice(0, 6).forEach((worker, index) => {
      const wx = x - panelW / 2 + 56 + index * Math.min(76, (panelW - 110) / 6);
      const wy = y + 50;
      const workerIcon = this.add.image(wx, wy, 'worker').setScale(0.28 + worker.upgrades.movement * 0.015);
      if (worker.anim === 'working') this.tweens.add({ targets: workerIcon, angle: 8, yoyo: true, repeat: -1, duration: 180 - worker.upgrades.speed * 12 });
      if (worker.anim === 'walking' || worker.anim === 'carrying') this.tweens.add({ targets: workerIcon, x: wx + 8, yoyo: true, repeat: -1, duration: 360 - worker.upgrades.movement * 28 });
      this.navLayer.add(workerIcon);
      this.navLayer.add(this.add.text(wx, wy + 26, worker.name, { fontFamily: 'Inter, Arial', fontSize: '10px', color: '#f8fafc', fontStyle: '900' }).setOrigin(0.5));
      this.navLayer.add(this.add.text(wx, wy + 40, worker.task, { fontFamily: 'Inter, Arial', fontSize: '9px', color: '#fde68a', fontStyle: '800', align: 'center', wordWrap: { width: 70 } }).setOrigin(0.5));
      this.navLayer.add(this.add.text(wx, wy + 56, `Spd ${worker.upgrades.speed} Eff ${worker.upgrades.efficiency}`, { fontFamily: 'Inter, Arial', fontSize: '8px', color: '#93c5fd', fontStyle: '800' }).setOrigin(0.5));
    });
    const hireX = x + panelW / 2 - 84;
    this.navLayer.add(this.actionButton(hireX, y + 116, '👷', workers.length < 6 ? `Нанять ${money(workerHireCosts[workers.length])}` : 'Бригада полная', () => this.hireWorker(), workers.length < 6, 0x22c55e, 132));
    this.navLayer.add(this.actionButton(hireX - 142, y + 116, '🏗️', this.state.repairSlots < 3 ? `Пост ${this.state.repairSlots + 1}` : 'Посты открыты', () => this.expandRepairSlot(), this.state.repairSlots < 3, 0x38bdf8, 118));
    this.navLayer.add(this.actionButton(hireX - 270, y + 116, '⚡', `Оборуд. ${this.state.equipmentLevel}`, () => this.upgradeEquipment(), this.state.equipmentLevel < 5, 0xfacc15, 112));
    if (workers[0]) this.navLayer.add(this.actionButton(x - panelW / 2 + 74, y + 116, '⬆️', 'Скорость', () => this.upgradeWorker(workers[0], 'speed'), workers[0].upgrades.speed < 5, 0xa855f7, 116));
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
      this.navLayer.add(this.actionButton(this.layout.width / 2, y, '🔓', 'Открыть', () => this.openContainer(), !this.stageBusy, 0xfacc15, Math.min(220, this.layout.width - 48)));
    }
    if (this.state.phase === 'waiting' && this.state.tutorialComplete) this.drawContainerMarket();
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
      const labels = ['Осмотр', 'Мусор', 'Мойка', 'Ремонт', 'Краска', 'Блеск', 'Запуск'];
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
      ['🔧', 'Реставр.', 0x22c55e, () => this.startRestoration()],
      ['💵', money(vehicle.instantSaleOffer), 0xfacc15, () => this.sellVehicleNow()],
      ['♻️', money(vehicle.scrapValue), 0xef4444, () => this.scrapVehicle()],
      ['🏠', 'Гараж', 0x60a5fa, () => this.storeVehicle()],
      ['⭐', 'Оставить', rarityTint[vehicle.rarity], () => this.keepForCollection()]
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
      { icon: '🚚', title: this.state.tutorialComplete ? 'Рынок' : 'Закрыто', tint: 0xf97316, action: () => this.toast('Выберите контейнер на рынке. Чем выше редкость, тем выше риск и прибыль.'), enabled: () => this.state.tutorialComplete && this.state.phase === 'waiting' },
      { icon: '🎬', title: 'Бонусы', tint: 0x38bdf8, action: () => this.showAdRewards(), enabled: () => true },
      { icon: '💰', title: 'Продать', tint: 0xfacc15, action: () => this.sellVehicle(), enabled: () => this.state.phase === 'ready' },
      { icon: '🔧', title: 'Улучшить', tint: 0x22c55e, action: () => this.shop(), enabled: () => true },
      { icon: '📖', title: 'Альбом', tint: 0x93c5fd, action: () => this.showCollectionBook(), enabled: () => true },
      { icon: '⚙', title: 'Сохранить', tint: 0xa3a3a3, action: () => this.saveState(), enabled: () => true }
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



  private drawContainerMarket(): void {
    const w = Math.min(1080, this.layout.width - 40);
    const cardW = Math.max(150, Math.min(204, (w - 64) / 5));
    const y = this.layout.height - 252;
    const x0 = this.layout.width / 2 - w / 2 + cardW / 2;
    this.navLayer.add(this.glassPanel(this.layout.width / 2, y - 26, w, 178, 24, 0x07111f, 0.9, 0xfacc15, 0.2));
    this.navLayer.add(this.add.text(this.layout.width / 2 - w / 2 + 20, y - 100, 'РЫНОК КОНТЕЙНЕРОВ', { fontFamily: 'Inter, Arial', fontSize: '16px', color: '#fde68a', fontStyle: '900' }));
    this.navLayer.add(this.actionButton(this.layout.width / 2 + w / 2 - 98, y - 96, '🔄', `Обновить ${money(10000)}`, () => this.refreshContainerMarket(), this.state.money >= 10000, 0x38bdf8, 176));
    this.state.marketOffers.forEach((offer, index) => {
      const x = x0 + index * (cardW + 12);
      this.navLayer.add(this.glassPanel(x, y - 18, cardW, 132, 18, 0x111827, 0.86, offer.color, 0.42));
      this.navLayer.add(this.add.text(x, y - 58, `${offer.country} • ${offer.year}`, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#f8fafc', fontStyle: '900' }).setOrigin(0.5));
      this.navLayer.add(this.add.text(x, y - 34, `${classRu[offer.vehicleClass]} • ${rarityRu[offer.rarity]}`, { fontFamily: 'Inter, Arial', fontSize: '10px', color: rarityText[offer.rarity], fontStyle: '800' }).setOrigin(0.5));
      this.navLayer.add(this.add.text(x, y - 12, `сост. ${Math.floor(offer.estimatedCondition * 100)}%  риск ${Math.floor(offer.risk * 100)}%`, { fontFamily: 'Inter, Arial', fontSize: '10px', color: '#cbd5e1', fontStyle: '800' }).setOrigin(0.5));
      this.navLayer.add(this.add.text(x, y + 2, `ремонт ${money(offer.estimatedRepairCost)}`, { fontFamily: 'Inter, Arial', fontSize: '9px', color: '#fb923c', fontStyle: '800' }).setOrigin(0.5));
      this.navLayer.add(this.add.text(x, y + 16, offer.clues.slice(0, 3).join(' • '), { fontFamily: 'Inter, Arial', fontSize: '9px', color: '#93c5fd', fontStyle: '800', align: 'center', wordWrap: { width: cardW - 22 } }).setOrigin(0.5));
      this.navLayer.add(this.actionButton(x, y + 44, '⚡', money(offer.price), () => this.startAuction(offer), this.state.money >= offer.price && !this.stageBusy, offer.color, cardW - 28));
    });
    if (this.state.auctionOffer) this.drawAuctionPanel();
  }

  private drawAuctionPanel(): void {
    const offer = this.state.auctionOffer;
    if (!offer) return;
    const x = this.layout.width / 2;
    const y = Math.max(170, this.layout.height * 0.43);
    this.navLayer.add(this.glassPanel(x, y, 520, 238, 26, 0x020617, 0.94, offer.color, 0.65));
    this.navLayer.add(this.add.text(x, y - 92, 'ЖИВОЙ АУКЦИОН', { fontFamily: 'Inter, Arial', fontSize: '22px', color: '#fde68a', fontStyle: '900' }).setOrigin(0.5));
    this.navLayer.add(this.add.text(x, y - 58, `${offer.country} • ${offer.year} • ${classRu[offer.vehicleClass]} • ${rarityRu[offer.rarity]}`, { fontFamily: 'Inter, Arial', fontSize: '14px', color: '#f8fafc', fontStyle: '800' }).setOrigin(0.5));
    this.navLayer.add(this.add.text(x, y - 24, `Ставка: ${money(this.state.auctionBid)}  Ремонт: ${money(offer.estimatedRepairCost)}  Таймер: ${offer.timer}с`, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#cbd5e1', fontStyle: '800' }).setOrigin(0.5));
    this.navLayer.add(this.add.text(x, y - 2, `Спрос ${offer.demand}% • Популярность ${offer.popularity}% • Риск ${Math.floor(offer.risk * 100)}%`, { fontFamily: 'Inter, Arial', fontSize: '11px', color: '#fef3c7', fontStyle: '800' }).setOrigin(0.5));
    this.navLayer.add(this.add.text(x, y + 24, offer.history.slice(0, 3).join('\n'), { fontFamily: 'Inter, Arial', fontSize: '11px', color: '#93c5fd', fontStyle: '800', align: 'center' }).setOrigin(0.5));
    this.navLayer.add(this.actionButton(x - 110, y + 78, '⬆️', 'Повысить', () => this.raiseAuctionBid(), this.state.money >= this.state.auctionBid, 0x22c55e, 150));
    this.navLayer.add(this.actionButton(x + 110, y + 78, '🛑', 'Стоп', () => this.stopAuction(), true, 0xef4444, 150));
  }

  private drawContainerTierActions(y: number): void {
    const tiers = (Object.keys(containerTiers) as ContainerTier[]).filter((tier) => this.state.level >= containerTiers[tier].unlock);
    const shown = tiers.slice(-Math.min(4, tiers.length));
    const cx = this.layout.width / 2;
    const spacing = Math.min(165, Math.max(112, this.layout.width / (shown.length + 1)));
    shown.forEach((tier, index) => {
      const cfg = containerTiers[tier];
      const price = this.containerPrice(tier);
      this.navLayer.add(this.actionButton(cx + (index - (shown.length - 1) / 2) * spacing, y, tier === 'mythic' ? '💎' : '📦', `${cfg.label} ${money(price)}`, () => (this.state.phase === 'waiting' && !this.state.current ? this.buyContainer(tier) : this.queueContainer(tier)), this.state.money >= price && !this.stageBusy, cfg.color, Math.min(158, spacing - 10)));
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
    if (this.state.phase === 'delivered') return 'Открыть контейнер';
    if (!this.state.tutorialComplete) return tutorialSteps[Math.min(this.state.tutorialStep, tutorialSteps.length - 1)];
    const mission = this.state.dailyMissions?.find((item) => !item.claimed);
    if (mission) return mission.title;
    if (this.state.phase === 'waiting') return 'Купить контейнер';
    if (this.state.phase === 'ready') return 'Продать машину';
    if (this.state.current) return 'Восстановить машину';
    return 'Развивать мастерскую';
  }

  private buyContainer(tier: ContainerTier = 'common', sponsored = false): void {
    if (!this.state.tutorialComplete && !sponsored) return this.toast('Завершите первую продажу, чтобы открыть контейнеры.');
    if (this.stageBusy) return this.toast('Бригада уже работает с контейнером.');
    if (this.state.phase !== 'waiting') return this.toast('Сначала завершите текущий контейнер.');
    const price = this.containerPrice(tier);
    if (!sponsored && this.state.money < price) return this.toast(`Нужно ${money(price)} на контейнер: ${containerTiers[tier].label}.`);
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
    this.toast('Контейнер доставлен. Откройте его, когда будете готовы!');
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
      this.toast(discovered ? `НОВАЯ НАХОДКА: ${this.state.current?.name}! Альбом обновлён.` : `Найдена машина: ${this.state.current?.name}. Восстановите её для прибыли.`);
      if (!discovered) this.showRewardWindow(this.state.current?.specialContainer ? specialContainerNames[this.state.current.specialContainer] : 'КОНТЕЙНЕР ОТКРЫТ', `${this.state.current?.name} • ${this.state.current?.rarity.toUpperCase()}`, this.state.current?.rarity ?? 'common');
      this.audio.play('reward');
      this.audio.setMusicIntensity(this.state.level);
      this.cameraPulse();
    });
  }

  private showAdRewards(): void {
    const bonusCoins = Math.floor(260 + this.state.level * 160 + this.state.reputation * 90);
    const choices = [
      ['Эпический контейнер', () => this.yandex.showRewarded('epic-container', () => this.buyContainer('epic', true))],
      [`Монеты ${money(bonusCoins)}`, () => this.yandex.showRewarded('bonus-coins', () => { this.state.money += bonusCoins; this.flyCoins(bonusCoins); this.render(); })],
      ['Двойная следующая продажа', () => this.yandex.showRewarded('double-sale', () => { this.state.boostUntil = Date.now() + 15 * 60_000; this.toast('Бонус следующей продажи активен 15 минут.'); })],
      ['Мгновенный ремонт', () => this.yandex.showRewarded('instant-repair', () => { if (this.state.current) { this.state.current.repair = 1; this.particles.burst(this.layout.width / 2, this.layout.height * 0.55, 0xf97316, 42); this.render(); } })]
    ] as const;
    const pick = choices[this.rng.int(0, choices.length - 1)];
    this.toast(`Бесплатная награда: ${pick[0]}`);
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
    if (this.stageBusy) return this.toast('Осмотр уже идёт.');
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
        this.toast(`Осмотр: ${tag}`);
      });
    });
    this.giveTaskReward('Осмотр завершён', 45, 12, 0x60a5fa);
    this.time.delayedCall(900, () => {
      this.stageBusy = false;
      if (!this.state.tutorialComplete) this.rewardTutorialStep('inspect');
      this.render();
    });
  }

  private restore(step: 'trash' | 'clean' | 'repair' | 'paint' | 'polish'): void {
    if (this.stageBusy) return this.toast('Бригада завершает текущую работу.');
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.stageBusy = true;
    const before = vehicle[step];
    const bestWorkerBoost = this.state.workerRoster.reduce((best, worker) => Math.max(best, worker.upgrades.speed + worker.upgrades.efficiency + (step === 'clean' || step === 'trash' ? worker.upgrades.cleaning : step === 'repair' ? worker.upgrades.repair : step === 'paint' || step === 'polish' ? worker.upgrades.painting : 1)), 3);
    const stepAmount = this.state.tutorialComplete ? Math.min(1, 0.18 + this.state.reputation * 0.015 + this.state.equipmentLevel * 0.035 + bestWorkerBoost * 0.018) : (step === 'paint' || step === 'polish' ? 1 : 1);
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
    this.time.delayedCall(Math.max(420, 1200 - this.state.equipmentLevel * 80 - bestWorkerBoost * 28), () => { this.stageBusy = false; });
    if (!this.state.tutorialComplete) this.rewardTutorialStep(step);
    if (complete) {
      this.toast('Реставрация завершена. Покупатели делают предложения!');
      this.showRewardWindow('РЕСТАВРАЦИЯ ЗАВЕРШЕНА', `${vehicle.name} готова к продаже`, vehicle.rarity);
      this.audio.play('upgrade');
    }
  }

  private startEngine(): void {
    if (this.stageBusy) return this.toast('Engine test already running.');
    const vehicle = this.state.current;
    if (!vehicle || vehicle.polish < 1) return this.toast('Перед запуском отполируйте машину.');
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
      this.showRewardWindow('ДВИГАТЕЛЬ ЗАПУЩЕН', 'Фары горят • дым из выхлопа • покупатель готов', vehicle.rarity);
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
    if (!vehicle || this.state.phase !== 'ready') return this.toast('Перед продажей полностью восстановите машину.');
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
      this.toast('Первая продажа завершена! Контейнеры открыты.');
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
    this.showRewardWindow(collector ? 'ПРОДАЖА КОЛЛЕКЦИОНЕРУ' : vip ? 'ВИП-ПРОДАЖА' : 'МАШИНА ПРОДАНА', `${vehicle.name} • ${money(offer)}\nProfit ${money(offer - vehicle.buyPrice - vehicle.repairCostEstimate)} • Quality ${Math.floor(quality * 100)}%`, vehicle.rarity);
    this.toast(`${collector ? 'Коллекционер купил' : vip ? 'ВИП купил' : 'Продано'} ${vehicle.name} за ${money(offer)}.`);
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
    if (vehicle.dirt > 0.72) tags.push('Весь в грязи');
    if (vehicle.dirt > 0.55) tags.push('Мусор в салоне');
    if (vehicle.damage > 0.72) tags.push('Сильная ржавчина');
    if (vehicle.damage > 0.62) tags.push('Повреждённый бампер');
    if (vehicle.condition < 0.34) tags.push('Разбитые стёкла');
    if (vehicle.condition < 0.3) tags.push('Спущенные шины');
    if (vehicle.damage > 0.8) tags.push('Неисправный двигатель');
    if (vehicle.condition < 0.42 && this.rng.next() > 0.5) tags.push('Нет зеркал');
    if (vehicle.condition < 0.45 && this.rng.next() > 0.55) tags.push('Разбитые фары');
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
    this.stageLayer.add(this.add.text(x, y - 82, vehicle.specialContainer ? specialContainerNames[vehicle.specialContainer] : `${rarityRu[vehicle.rarity].toUpperCase()} НАХОДКА`, {
      fontFamily: 'Inter, Arial', fontSize: '16px', color: rarityText[vehicle.rarity], fontStyle: '900', align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5));
    const tags = vehicle.conditionTags.length ? vehicle.conditionTags.join(' • ') : 'Удивительно целая';
    this.stageLayer.add(this.add.text(x, y - 45, tags, {
      fontFamily: 'Inter, Arial', fontSize: '12px', color: '#e2e8f0', fontStyle: '800', align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5));
    const customerType = customerTypes[Math.abs([...vehicle.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % customerTypes.length];
    const customer = `${customerType}: ${{ paint: 'любит покраску', engine: 'ценит двигатель', originality: 'ищет оригинал', perfect: 'хочет идеал' }[vehicle.customerPreference]}`;
    const rows = [
      ['Покупатель', customer, '#fef3c7'],
      ['Оценка', money(vehicle.value), '#facc15'],
      ['Ремонт', money(vehicle.repairCostEstimate), '#fb923c'],
      ['Продажа', money(vehicle.potentialSale), '#86efac'],
      ['Прибыль', money(vehicle.potentialSale - vehicle.repairCostEstimate - vehicle.buyPrice), '#38bdf8']
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
    if (step === 'clean') return 'Мойка кузова';
    if (step === 'trash') return 'Мусор убран';
    if (step === 'repair') return `${this.rng.pick([...repairParts])}: ремонт`;
    if (step === 'paint') return `${this.rng.pick([...paintFinishes])}: покраска`;
    return 'Кузов отполирован';
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
