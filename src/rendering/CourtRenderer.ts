import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CourtSkinDef } from '../data/skins/types';
import { renderSlot } from './slotUtils';

export class CourtRenderer {
  private layers: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, skin: CourtSkinDef) {
    // Floor layer
    const floor = renderSlot(scene, skin.floor, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    if (floor) {
      if (!skin.floor.size) floor.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      if (skin.floor.depth === undefined) floor.setDepth(0);
      this.layers.push(floor);
    }

    // Optional overlay layers
    if (skin.paintOverlay) {
      const paint = renderSlot(scene, skin.paintOverlay, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      if (paint) this.layers.push(paint);
    }
    if (skin.lineOverlay) {
      const lines = renderSlot(scene, skin.lineOverlay, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      if (lines) this.layers.push(lines);
    }
    if (skin.centerLogo) {
      const logo = renderSlot(scene, skin.centerLogo, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      if (logo) this.layers.push(logo);
    }
    if (skin.arenaBg) {
      const bg = renderSlot(scene, skin.arenaBg, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      if (bg) this.layers.push(bg);
    }
  }

  destroy(): void {
    for (const layer of this.layers) layer.destroy();
  }
}
