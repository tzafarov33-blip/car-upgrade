declare module '*.css';
declare module 'phaser' {
  namespace Phaser {
    class Scene { constructor(config?: string | object); add: any; load: any; scene: any; cameras: any; input: any; tweens: any; time: any; textures: any; }
    class Game { constructor(config: any); }
    const AUTO: number;
    namespace Scale { const FIT: number; const CENTER_BOTH: number; }
    namespace Math { function Between(min:number,max:number):number; }
    namespace GameObjects {
      class GameObject { destroy(): void; }
      class Text extends GameObject { setText(v:string):this; setScrollFactor(v:number):this; setOrigin(x?:number,y?:number):this; setDepth(v:number):this; setAlpha(v:number):this; }
      class Rectangle extends GameObject { setOrigin(x?:number,y?:number):this; setScrollFactor(v:number):this; setStrokeStyle(w:number,c:number,a?:number):this; }
      class Image extends GameObject { x:number; y:number; setOrigin(x?:number,y?:number):this; setScrollFactor(v:number):this; setScale(x:number,y?:number):this; setTint(c:number):this; }
      class Graphics extends GameObject { fillStyle(c:number,a?:number):this; fillRoundedRect(...args:any[]):this; fillCircle(...args:any[]):this; generateTexture(k:string,w:number,h:number):this; clear():this; lineStyle(...args:any[]):this; strokeCircle(...args:any[]):this; destroy():void; beginPath():this; moveTo(x:number,y:number):this; lineTo(x:number,y:number):this; closePath():this; fillPath():this; fillTriangle(...args:any[]):this; fillEllipse(...args:any[]):this; lineBetween(...args:any[]):this; strokeRoundedRect(...args:any[]):this; }
      class Arc extends GameObject { setVisible(v:boolean):this; setPosition(x:number,y:number):this; setFillStyle(c:number,a?:number):this; setAlpha(v:number):this; setScale(v:number):this; }
      class Container extends GameObject { x:number; y:number; add(o:any):this; setSize(w:number,h:number):this; setInteractive(o?:any):this; on(e:string,cb:Function):this; setScale(x:number,y?:number):this; }
    }
  }
  export = Phaser;
}
