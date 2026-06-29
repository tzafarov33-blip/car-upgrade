import type { Defect, Rarity, VehicleClass } from '../types/game';
export const rarityMultiplier:Record<Rarity,number>={common:1,uncommon:1.25,rare:1.65,epic:2.25,legendary:3.4};
export const classes:Record<VehicleClass,{base:number;names:string[];unlock:number}>={
 compact:{base:1200,unlock:1,names:['Metro Nipper','Corsa Finch','Urban Pebble','Hatch Comet']},
 sedan:{base:2200,unlock:2,names:['Velora Regent','Aster Crown','Nord Sedan','Mistral LX']},
 muscle:{base:4200,unlock:4,names:['Iron Stallion','V8 Barrage','Road Howler','Cinder Coupe']},
 offroad:{base:5200,unlock:5,names:['Trail Ox','Ridge Runner','Mud Baron','Summit Wagon']},
 sports:{base:9000,unlock:7,names:['Aero Veloce','Sprint Raptor','Nimble GT','Pulse RS']},
 super:{base:22000,unlock:10,names:['Zenith XR','Aurora V12','Phantom Corsa','Solaris S']}
};
export const defectPool:Defect[]=[
 {id:'engine_knock',name:'Engine knock',severity:.7,repairCost:650,valuePenalty:1200},
 {id:'bent_frame',name:'Bent frame',severity:.9,repairCost:900,valuePenalty:1600},
 {id:'bad_paint',name:'Ruined paint',severity:.35,repairCost:260,valuePenalty:520},
 {id:'worn_brakes',name:'Worn brakes',severity:.25,repairCost:180,valuePenalty:360},
 {id:'torn_interior',name:'Torn interior',severity:.3,repairCost:240,valuePenalty:470},
 {id:'dead_electrics',name:'Dead electrics',severity:.55,repairCost:480,valuePenalty:900},
 {id:'rusted_panels',name:'Rusted panels',severity:.5,repairCost:420,valuePenalty:850}
];
export const upgradeInfo=[
 ['towTruck','Tow truck','Cheaper vehicle delivery and better free-car ads'],['storage','Storage','More parts and vehicle capacity'],['repairSpeed','Repair speed','Workers finish repairs faster'],['paintQuality','Paint quality','Higher restored sale value'],['workerCount','Worker count','Hire additional staff'],['workerEfficiency','Worker efficiency','All staff work faster'],['workshopSize','Workshop size','More simultaneous jobs'],['reputation','Customer reputation','Better prices and XP'],['auctionQuality','Auction quality','Rarer auction listings']
] as const;
