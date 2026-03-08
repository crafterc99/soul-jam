import Phaser from 'phaser';
import { SCENE_MENU, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_MENU });
  }

  create(): void {
    // Loading screen IS the menu screen
    if (this.textures.exists('loading-screen')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading-screen');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    // Blinking "PRESS START" at bottom
    const pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'PRESS START', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Any key/click/gamepad starts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.on('pointerdown', () => this.startGame());
    this.input.gamepad?.on('down', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start(SCENE_CHARACTER_SELECT, { mode: 'cpu' });
  }
}
