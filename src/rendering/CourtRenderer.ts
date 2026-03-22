import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CourtDef } from '../data/types';

export class CourtRenderer {
  private courtImage: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, courtDef?: CourtDef) {
    const floorKey = courtDef?.assets.floor ?? 'court';

    if (scene.textures.exists(floorKey)) {
      this.courtImage = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, floorKey);
      this.courtImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      this.courtImage.setDepth(0);
    }
  }

  destroy(): void {
    this.courtImage?.destroy();
  }
}
