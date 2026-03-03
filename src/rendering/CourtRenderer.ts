import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class CourtRenderer {
  private courtImage: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene) {
    if (scene.textures.exists('court')) {
      this.courtImage = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'court');
      this.courtImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      this.courtImage.setDepth(0);
    }
  }

  destroy(): void {
    this.courtImage?.destroy();
  }
}
