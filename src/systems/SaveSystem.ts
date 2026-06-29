import type { GameState } from '../types/game';
const KEY='junkyard-empire-save-v1';
export class SaveSystem{load():GameState|null{try{const raw=localStorage.getItem(KEY); return raw?JSON.parse(raw) as GameState:null}catch{return null}} save(state:GameState){state.stats.lastSave=Date.now(); localStorage.setItem(KEY,JSON.stringify(state));} offlineSeconds(state:GameState){return Math.max(0,Math.min(8*3600,(Date.now()-state.stats.lastSave)/1000));} reset(){localStorage.removeItem(KEY)}}
