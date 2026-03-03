import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  preload(): void {
    // Load only the splash screen here so it shows immediately
    this.load.image('loading-screen', 'assets/images/loading-screen.webp');
  }

  create(): void {
    // Show splash screen
    const splash = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading-screen');
    splash.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.time.delayedCall(2000, () => {
      this.scene.start(SCENE_PRELOAD);
    });
  }
}
