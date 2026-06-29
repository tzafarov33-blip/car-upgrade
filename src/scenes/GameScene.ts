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
const rarityDeck: Rarity[] = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'epic', 'legendary'];
const paintColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0xf8fafc, 0x0f172a, 0x14b8a6];
const rarityText: Record<Rarity, string> = { common: '#cbd5e1', uncommon: '#34d399', rare: '#60a5fa', epic: '#c084fc', legendary: '#facc15' };

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
  private autosaveTimer = 0;
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
    this.createPools();
    (this as any).sys.scale.on('resize', this.refreshLayout, this);
    this.refreshLayout();
    this.input.keyboard?.on('keydown-S', () => this.saveState());
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
    if (this.world.length > 0) return;
    this.add.rectangle(640, 380, 1280, 760, 0x07111f, 1);
    this.add.circle(215, 120, 280, 0x0ea5e9, 0.09);
    this.add.circle(1135, 105, 260, 0xf97316, 0.07);
    this.world.push(this.add.ellipse(640, 650, 1160, 145, 0x020617, 0.38));
    this.world.push(this.add.image(170, 575, 'scrap_pile').setScale(1.15));
    this.world.push(this.add.image(1110, 545, 'container').setScale(0.92));
    this.world.push(this.add.image(1050, 650, 'dumpster').setScale(0.95));
    this.world.push(this.add.image(925, 592, 'forklift').setScale(0.85));
    this.world.push(this.add.image(230, 690, 'tire_stack').setScale(0.82));
    this.world.push(this.add.image(1185, 245, 'tree').setScale(0.9));
    this.world.push(this.add.image(85, 250, 'tree').setScale(0.85));
    for (let i = 0; i < 4; i++) {
      const cloud = this.add.ellipse(140 + i * 320, 72 + (i % 2) * 28, 150, 34, 0xffffff, 0.08);
      this.tweens.add({ targets: cloud, x: cloud.x + 70, yoyo: true, repeat: -1, duration: 11000 + i * 950 });
      this.world.push(cloud);
    }
  }

  private render(): void {
    this.clearLayer(this.stageLayer);
    this.clearLayer(this.hudLayer);
    this.clearLayer(this.navLayer);
    this.drawPremiumHud();
    this.drawContainerStage();
    this.drawContextActions();
    this.drawBottomNavigation();
    this.animateLayer(this.stageLayer, 10);
    this.animateLayer(this.navLayer, 0);
  }

  private animateLayer(layer: Phaser.GameObjects.Container, yOffset: number): void {
    (layer as any).setAlpha(0.001).setY(yOffset);
    this.tweens.add({ targets: layer, alpha: 1, y: 0, duration: 180, ease: 'Sine.Out' });
  }

  private clearLayer(layer?: Phaser.GameObjects.Container): void {
    if (!layer) return;
    const children = [...(layer as Phaser.GameObjects.Container & { list: Phaser.GameObjects.GameObject[] }).list];
    children.forEach((child) => child.destroy());
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
      ['⭐', 'Level', `${this.state.level}`, '#93c5fd'],
      ['🎯', 'Objective', objective, '#e2e8f0'],
      ['📦', 'Storage', this.state.current ? '1 / 1' : '0 / 1', '#86efac'],
      ['🚚', 'Container', money(this.state.containerPrice), '#fb923c']
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

  private drawContainerStage(): void {
    const cx = this.layout.width / 2;
    const stageY = Math.max(215, this.layout.height * 0.47);
    this.stageLayer.add(this.glassPanel(cx, stageY + 42, Math.min(760, this.layout.width - 80), 276, 28, 0x111827, 0.42, 0x64748b, 0.22));
    if (this.state.phase === 'waiting') {
      this.stageLayer.add(this.add.image(cx, stageY, 'container_closed').setScale(1.02));
      this.stageCopy('Sealed import container', 'Buy a container, claim a sponsored one, or upgrade your contacts.', '#e0f2fe');
      return;
    }
    if (this.state.phase === 'delivering' || this.state.phase === 'opening') {
      this.stageLayer.add(this.add.image(cx, stageY, this.state.phase === 'opening' ? 'container_open' : 'container_closed').setScale(1.05));
      this.stageCopy(this.state.phase === 'opening' ? 'Doors opening...' : 'Forklift unloading...', this.state.phase === 'opening' ? 'Smoke, dust, and mystery inside.' : 'Your new import is rolling into the bay.', '#fde68a');
      return;
    }
    const vehicle = this.state.current;
    if (!vehicle) return;
    this.stageLayer.add(this.add.image(cx, stageY - 45, 'container_open').setScale(1.02));
    this.stageLayer.add(this.add.image(cx, stageY + 35, 'vehicle_body').setScale(1.12).setTint(vehicle.color));
    for (let i = 0; i < Math.ceil(vehicle.dirt * 5 * (1 - vehicle.clean)); i++) this.stageLayer.add(this.add.image(cx - 80 + i * 38, stageY + 25 + (i % 2) * 18, 'dirt_cluster').setScale(0.7));
    for (let i = 0; i < Math.ceil(vehicle.damage * 4 * (1 - vehicle.repair)); i++) this.stageLayer.add(this.add.image(cx - 55 + i * 48, stageY + 60, 'rust_patch').setScale(0.76));
    this.stageLayer.add(this.add.image(cx - 145, stageY - 88, `rarity_${vehicle.rarity}`).setScale(0.72));
    this.stageLayer.add(this.add.text(cx, stageY + 158, `${vehicle.name}  •  ${vehicle.rarity.toUpperCase()}  •  ${money(vehicle.value)}`, { fontFamily: 'Inter, Arial', fontSize: '23px', color: rarityText[vehicle.rarity], fontStyle: '800' }).setOrigin(0.5));
    this.stageLayer.add(this.progressPill(cx - 220, stageY + 207, 'Clean', vehicle.clean, 'icon_clean'));
    this.stageLayer.add(this.progressPill(cx, stageY + 207, 'Repair', vehicle.repair, 'icon_repair'));
    this.stageLayer.add(this.progressPill(cx + 220, stageY + 207, 'Paint', vehicle.paint, 'icon_paint'));
  }

  private stageCopy(title: string, body: string, color: string): void {
    const cx = this.layout.width / 2;
    const y = Math.min(this.layout.height - 210, this.layout.height * 0.7);
    this.stageLayer.add(this.add.text(cx, y, title, { fontFamily: 'Inter, Arial', fontSize: '26px', color, fontStyle: '800' }).setOrigin(0.5));
    this.stageLayer.add(this.add.text(cx, y + 34, body, { fontFamily: 'Inter, Arial', fontSize: '17px', color: '#cbd5e1', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5));
  }

  private progressPill(x: number, y: number, label: string, value: number, icon: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(this.glassPanel(0, 0, 178, 58, 18, 0x0f172a, 0.72, 0x38bdf8, 0.22));
    c.add(this.add.image(-62, 0, icon).setScale(0.34));
    c.add(this.add.text(-28, -16, label, { fontFamily: 'Inter, Arial', fontSize: '13px', color: '#cbd5e1', fontStyle: '800' }));
    c.add(this.add.rectangle(26, 12, 92, 8, 0x1e293b, 0.92));
    c.add(this.add.rectangle(26 - 46 + (92 * value) / 2, 12, 92 * value, 8, 0xfacc15, 0.95));
    c.add(this.add.text(76, -16, `${Math.floor(value * 100)}%`, { fontFamily: 'Inter, Arial', fontSize: '12px', color: '#fff7ed', fontStyle: '800' }).setOrigin(0.5, 0));
    return c;
  }

  private drawContextActions(): void {
    const y = this.layout.height - 154;
    if (this.state.phase === 'waiting') {
      this.navLayer.add(this.actionButton(this.layout.width / 2, y, '🎁', 'Free', () => this.freeContainer(), true, 0x22c55e, Math.min(156, this.layout.width - 48)));
    }
    if (this.state.current && this.state.phase !== 'ready') {
      const cx = this.layout.width / 2;
      const spacing = Math.min(170, Math.max(112, this.layout.width / 4.1));
      const buttonWidth = Math.min(146, Math.max(96, spacing - 18));
      this.navLayer.add(this.actionButton(cx - spacing, y, '🧽', 'Clean', () => this.restore('clean'), this.state.current.clean < 1, 0x38bdf8, buttonWidth));
      this.navLayer.add(this.actionButton(cx, y, '🔧', 'Repair', () => this.restore('repair'), this.state.current.repair < 1, 0xf97316, buttonWidth));
      this.navLayer.add(this.actionButton(cx + spacing, y, '🎨', 'Paint', () => this.restore('paint'), this.state.current.paint < 1, 0xa855f7, buttonWidth));
    }
  }

  private drawBottomNavigation(): void {
    const actions: NavAction[] = [
      { icon: '🚚', title: 'Buy', tint: 0xf97316, action: () => this.buyContainer(), enabled: () => this.state.phase === 'waiting' && this.state.money >= this.state.containerPrice },
      { icon: '🏪', title: 'Garage', tint: 0x38bdf8, action: () => this.toast('Garage shows the current mystery vehicle and restoration steps.'), enabled: () => Boolean(this.state.current) },
      { icon: '💰', title: 'Sell', tint: 0xfacc15, action: () => this.sellVehicle(), enabled: () => Boolean(this.state.current) },
      { icon: '🔧', title: 'Upgrade', tint: 0x22c55e, action: () => this.shop(), enabled: () => true },
      { icon: '📦', title: 'Stock', tint: 0x93c5fd, action: () => this.toast(this.state.current ? 'One vehicle is occupying your import bay.' : 'Import bay is empty.'), enabled: () => true },
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

  private actionButton(x: number, y: number, icon: string, title: string, action: () => void, enabled: boolean, tint: number, width: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.glassPanel(0, 0, width, 58, 18, 0x172033, enabled ? 0.82 : 0.38, tint, enabled ? 0.45 : 0.12);
    const glow = this.add.rectangle(0, 0, width - 12, 48, tint, 0).setBlendMode('ADD');
    c.add([bg, glow]);
    c.add(this.add.text(0, -11, icon, { fontFamily: 'Inter, Arial', fontSize: '21px' }).setOrigin(0.5));
    c.add(this.add.text(0, 16, title, { fontFamily: 'Inter, Arial', fontSize: '12px', color: enabled ? '#f8fafc' : '#64748b', fontStyle: '800' }).setOrigin(0.5));
    c.setSize(width, 58).setAlpha(enabled ? 1 : 0.58).setInteractive({ useHandCursor: enabled })
      .on('pointerover', () => { if (enabled) this.tweens.add({ targets: [c], scale: 1.06, duration: 120, ease: 'Back.Out' }); if (enabled) glow.setAlpha(0.16); })
      .on('pointerout', () => { this.tweens.add({ targets: c, scale: 1, duration: 130 }); glow.setAlpha(0); })
      .on('pointerdown', () => {
        if (!enabled) return this.toast('Action unavailable right now.');
        this.audio.play('click');
        this.particles.burst(x, y, tint, 8);
        this.tweens.add({ targets: c, scale: 0.94, yoyo: true, duration: 90, ease: 'Quad.Out' });
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
    if (this.state.phase === 'waiting') return 'Buy next container';
    if (this.state.phase === 'ready') return 'Sell restored vehicle';
    if (this.state.current) return 'Restore import';
    return 'Grow the yard';
  }

  private buyContainer(free = false): void {
    if (this.state.phase !== 'waiting') return this.toast('Finish the current container first.');
    if (!free && this.state.money < this.state.containerPrice) return this.toast(`Need ${money(this.state.containerPrice)} to buy this container.`);
    if (!free) this.state.money -= this.state.containerPrice;
    this.state.current = this.rollVehicle(free ? 2 : 0);
    this.state.phase = 'delivering';
    this.audio.play('engine');
    this.render();
    this.tweens.add({ targets: this.cameras.main, zoom: 1.035, yoyo: true, duration: 450, ease: 'Sine.InOut', onComplete: () => this.openContainer() });
  }

  private openContainer(): void {
    this.state.phase = 'opening';
    this.render();
    this.particles.burst(this.layout.width / 2, this.layout.height * 0.52, 0xcbd5e1, 24);
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
    this.particles.burst(this.layout.width / 2, this.layout.height * 0.55, step === 'paint' ? vehicle.color : 0xfacc15, 18);
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
    const targetX = this.layout.width / 2 - Math.min(1160, this.layout.width - 44) / 2 + 116;
    for (let i = 0; i < 10; i++) {
      const coin = this.coinPool[i % this.coinPool.length];
      this.tweens.killTweensOf(coin);
      coin.setPosition(this.layout.width / 2, this.layout.height * 0.55).setAlpha(1).setScale(0.38).setVisible(true);
      this.tweens.add({ targets: coin, x: targetX + i * 5, y: 72, alpha: 0, scale: 0.18, duration: 650, delay: i * 25, ease: 'Cubic.Out', onComplete: () => coin.setVisible(false) });
    }
    this.toast(`+${money(amount)}`);
  }

  private toast(message: string): void {
    const toast = this.toastPool.find((item) => !item.visible) ?? this.toastPool[0];
    this.tweens.killTweensOf(toast);
    const label = toast.list[1] as Phaser.GameObjects.Text;
    label.setText(message);
    toast.setPosition(this.layout.width / 2, 132).setAlpha(0).setScale(0.96).setVisible(true);
    this.tweens.add({ targets: toast, y: 148, alpha: 1, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: toast, y: 178, alpha: 0, delay: 2200, duration: 520, ease: 'Sine.In', onComplete: () => toast.setVisible(false) });
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
