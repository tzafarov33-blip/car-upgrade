import Phaser from 'phaser';
export class BootScene extends Phaser.Scene{constructor(){super('Boot')} preload(){this.load.script('yandex','https://yandex.ru/games/sdk/v2');} create(){this.scene.start('Game')}}
