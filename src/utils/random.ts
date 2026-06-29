export class RNG{constructor(public seed=Date.now()%2147483647){} next(){this.seed=this.seed*48271%2147483647;return this.seed/2147483647} int(min:number,max:number){return Math.floor(this.next()*(max-min+1))+min} pick<T>(a:T[]){return a[this.int(0,a.length-1)]}}
export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
export const money=(v:number)=>'$'+Math.floor(v).toLocaleString('en-US');
