import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { getActiveSkin } from '../data/skins';
import { ScreenBackgroundRenderer } from '../rendering/ScreenBackgroundRenderer';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  preload(): void {
    // Load only the splash screen here so it shows immediately
    this.load.image('loading-screen', 'assets/images/loading-screen.webp');
  }

  create(): void {
    const skin = getActiveSkin();

    // Show splash screen from skin
    ScreenBackgroundRenderer.render(this, skin.screens.boot);

    // "you are agenius" text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, 'you are agenius', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // "PRESS START" overlay
    const pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.82, 'PRESS START', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Wait for any key press to proceed
    this.input.keyboard?.once('keydown', () => {
      this.scene.start(SCENE_PRELOAD);
    });
  }
}
