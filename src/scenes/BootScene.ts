import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'SOUL JAM', {
      fontSize: '64px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      this.scene.start(SCENE_PRELOAD);
    });
  }
}
