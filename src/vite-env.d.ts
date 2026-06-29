declare module '*.css';
declare module 'phaser' {
  namespace Phaser {
    class Scene { constructor(config?: string | object); add: any; load: any; scene: any; cameras: any; input: any; tweens: any; time: any; }
    class Game { constructor(config: any); }
    const AUTO: number;
    namespace Scale { const FIT: number; const CENTER_BOTH: number; }
    namespace Math { function Between(min:number,max:number):number; }
    namespace GameObjects { class Text { setText(v:string):this; setScrollFactor(v:number):this; setOrigin(x?:number,y?:number):this; setDepth(v:number):this; destroy():void; } class Rectangle { setOrigin(x?:number,y?:number):this; setScrollFactor(v:number):this; setStrokeStyle(w:number,c:number):this; } class Container { add(o:any):this; setSize(w:number,h:number):this; setInteractive(o?:any):this; on(e:string,cb:Function):this; destroy():void; } }
  }
  export = Phaser;
}
