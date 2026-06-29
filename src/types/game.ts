export type Rarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export type VehicleClass='compact'|'sedan'|'muscle'|'offroad'|'sports'|'super';
export type Station='inspection'|'repair'|'paint'|'crusher'|'parking';
export interface Defect{ id:string; name:string; severity:number; repairCost:number; valuePenalty:number; }
export interface Vehicle{ id:string; name:string; class:VehicleClass; condition:number; dirt:number; rust:number; damage:number; value:number; rarity:Rarity; mileage:number; defects:Defect[]; color:number; accent:number; station:Station; repaired:boolean; progress:number; }
export interface Worker{ id:string; name:string; experience:number; salary:number; efficiency:number; skill:number; mood:number; assigned?:string; }
export interface Upgrades{ towTruck:number; storage:number; repairSpeed:number; paintQuality:number; workerCount:number; workerEfficiency:number; workshopSize:number; reputation:number; auctionQuality:number; }
export interface InventoryPart{ id:string; name:string; quantity:number; price:number; }
export interface Task{ id:string; title:string; detail:string; progress:number; target:number; reward:number; claimed:boolean; }
export interface Stats{ day:number; carsBought:number; carsSold:number; partsSold:number; totalEarned:number; achievements:string[]; lastSave:number; }
export interface GameState{ money:number; level:number; xp:number; vehicles:Vehicle[]; workers:Worker[]; parts:InventoryPart[]; upgrades:Upgrades; tasks:Task[]; stats:Stats; marketSeed:number; adBoostUntil:number; extraAuctionSlots:number; }
