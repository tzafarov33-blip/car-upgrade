import type { AreaDefinition, Defect, Rarity, VehicleClass, WorkerSpecialization } from '../types/game';

export const rarityMultiplier: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.28,
  rare: 1.72,
  epic: 2.45,
  legendary: 3.8
};

export const rarityColor: Record<Rarity, number> = {
  common: 0xb8c2cc,
  uncommon: 0x43d17a,
  rare: 0x4aa3ff,
  epic: 0xc084fc,
  legendary: 0xfacc15
};

export const classes: Record<VehicleClass, { base: number; names: string[]; unlock: number; size: number }> = {
  compact: { base: 1200, unlock: 1, size: 0.9, names: ['Metro Nipper', 'Corsa Finch', 'Urban Pebble', 'Hatch Comet'] },
  sedan: { base: 2400, unlock: 2, size: 1.0, names: ['Velora Regent', 'Aster Crown', 'Nord Sedan', 'Mistral LX'] },
  muscle: { base: 4700, unlock: 4, size: 1.08, names: ['Iron Stallion', 'V8 Barrage', 'Road Howler', 'Cinder Coupe'] },
  offroad: { base: 5600, unlock: 5, size: 1.16, names: ['Trail Ox', 'Ridge Runner', 'Mud Baron', 'Summit Wagon'] },
  sports: { base: 9800, unlock: 7, size: 0.96, names: ['Aero Veloce', 'Sprint Raptor', 'Nimble GT', 'Pulse RS'] },
  super: { base: 24000, unlock: 10, size: 1.02, names: ['Zenith XR', 'Aurora V12', 'Phantom Corsa', 'Solaris S'] }
};

export const areas: AreaDefinition[] = [
  { id: 1, name: 'Old Backyard', incomeMultiplier: 1, priceMultiplier: 1, unlockCost: 10000, mechanic: 'Manual inspections and compact cars' },
  { id: 2, name: 'City Workshop', incomeMultiplier: 2, priceMultiplier: 1.85, unlockCost: 42000, mechanic: 'Paint booth bonuses and sedans' },
  { id: 3, name: 'Industrial Zone', incomeMultiplier: 4, priceMultiplier: 3.2, unlockCost: 135000, mechanic: 'Parallel repairs and muscle/offroad vehicles' },
  { id: 4, name: 'Collector District', incomeMultiplier: 7, priceMultiplier: 5.4, unlockCost: 390000, mechanic: 'Rare auctions and sports vehicles' },
  { id: 5, name: 'Supercar Row', incomeMultiplier: 12, priceMultiplier: 9, unlockCost: 0, mechanic: 'Legendary supercar restoration contracts' }
];

export const defectPool: Defect[] = [
  { id: 'engine_knock', name: 'Engine knock', severity: 0.7, repairCost: 650, valuePenalty: 1200 },
  { id: 'bent_frame', name: 'Bent frame', severity: 0.9, repairCost: 900, valuePenalty: 1600 },
  { id: 'bad_paint', name: 'Ruined paint', severity: 0.35, repairCost: 260, valuePenalty: 520 },
  { id: 'worn_brakes', name: 'Worn brakes', severity: 0.25, repairCost: 180, valuePenalty: 360 },
  { id: 'torn_interior', name: 'Torn interior', severity: 0.3, repairCost: 240, valuePenalty: 470 },
  { id: 'dead_electrics', name: 'Dead electrics', severity: 0.55, repairCost: 480, valuePenalty: 900 },
  { id: 'rusted_panels', name: 'Rusted panels', severity: 0.5, repairCost: 420, valuePenalty: 850 }
];

export const workerNames = ['Mia', 'Alex', 'Sam', 'Nika', 'Oleg', 'Rin', 'Kai', 'Vera'];
export const specializations: WorkerSpecialization[] = ['mechanic', 'painter', 'dismantler', 'driver'];

export const upgradeInfo = [
  ['towTruck', 'Tow Truck', 'Faster deliveries and stronger free-car rewards'],
  ['storage', 'Storage', 'More parking, parts shelves, and collection space'],
  ['repairSpeed', 'Repair Speed', 'Workers finish inspections and repairs faster'],
  ['paintQuality', 'Paint Quality', 'Restored cars sell for premium prices'],
  ['workerCount', 'Crew Size', 'Hire additional specialists'],
  ['workerEfficiency', 'Crew Training', 'All staff move and work faster'],
  ['workshopSize', 'Workshop Size', 'Unlock more simultaneous jobs'],
  ['reputation', 'Reputation', 'Better customers, bonuses, and XP'],
  ['auctionQuality', 'Auction Quality', 'Rarer listings and lower risk']
] as const;
