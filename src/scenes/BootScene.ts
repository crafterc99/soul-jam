import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  preload(): void {
    this.load.video('loading-video', 'assets/images/loading-screen.mp4', true);
  }

  create(): void {
    const video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading-video');
    video.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    video.play();

    const advance = () => {
      video.stop();
      this.scene.start(SCENE_PRELOAD);
    };

    video.on('complete', advance);
    this.input.keyboard?.once('keydown', advance);
    this.input.once('pointerdown', advance);
  }
}
