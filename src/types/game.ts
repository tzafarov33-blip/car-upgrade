export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type VehicleClass = 'compact' | 'sedan' | 'muscle' | 'offroad' | 'sports' | 'super';
export type Station = 'auction' | 'delivery' | 'inspection' | 'repair' | 'paint' | 'crusher' | 'parking' | 'sold';
export type WorkerSpecialization = 'mechanic' | 'painter' | 'dismantler' | 'driver';
export type JobType = 'inspect' | 'repair' | 'restore' | 'dismantle' | 'scrap';

export interface Defect {
  id: string;
  name: string;
  severity: number;
  repairCost: number;
  valuePenalty: number;
}

export interface Vehicle {
  id: string;
  name: string;
  class: VehicleClass;
  condition: number;
  dirt: number;
  rust: number;
  damage: number;
  value: number;
  rarity: Rarity;
  mileage: number;
  defects: Defect[];
  color: number;
  accent: number;
  size: number;
  station: Station;
  repaired: boolean;
  discovered: boolean;
  progress: number;
  x: number;
  y: number;
}

export interface Worker {
  id: string;
  name: string;
  level: number;
  experience: number;
  salary: number;
  efficiency: number;
  skill: number;
  mood: number;
  specialization: WorkerSpecialization;
  assignedVehicleId?: string;
  x: number;
  y: number;
}

export interface AreaDefinition {
  id: number;
  name: string;
  incomeMultiplier: number;
  priceMultiplier: number;
  unlockCost: number;
  mechanic: string;
}

export interface Upgrades {
  towTruck: number;
  storage: number;
  repairSpeed: number;
  paintQuality: number;
  workerCount: number;
  workerEfficiency: number;
  workshopSize: number;
  reputation: number;
  auctionQuality: number;
}

export interface InventoryPart {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Task {
  id: string;
  title: string;
  detail: string;
  cadence: 'daily' | 'weekly' | 'milestone' | 'collection';
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
}

export interface CollectionEntry {
  vehicleName: string;
  class: VehicleClass;
  rarity: Rarity;
  discovered: boolean;
  bestCondition: number;
  timesRestored: number;
}

export interface Stats {
  day: number;
  carsBought: number;
  carsSold: number;
  partsSold: number;
  totalEarned: number;
  achievements: string[];
  lastSave: number;
}

export interface GameState {
  money: number;
  level: number;
  area: number;
  xp: number;
  vehicles: Vehicle[];
  workers: Worker[];
  parts: InventoryPart[];
  upgrades: Upgrades;
  tasks: Task[];
  collection: CollectionEntry[];
  stats: Stats;
  marketSeed: number;
  adBoostUntil: number;
  extraAuctionSlots: number;
}
