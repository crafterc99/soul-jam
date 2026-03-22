import Phaser from 'phaser';
import { ScreenSkinDef, PauseScreenSkinDef, HexColor } from '../data/skins/types';
import { renderScreenBg, renderSlot } from './slotUtils';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class ScreenBackgroundRenderer {
  /**
   * Renders a screen background from a ScreenSkinDef.
   * Returns the created game objects for cleanup.
   */
  static render(
    scene: Phaser.Scene,
    def: ScreenSkinDef,
  ): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];

    const bg = renderScreenBg(scene, def);
    if (bg) objects.push(bg);

    // Overlay
    if (def.overlay) {
      if ('key' in def.overlay) {
        const overlay = renderSlot(scene, def.overlay, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        if (overlay) objects.push(overlay);
      } else {
        const ov = def.overlay as { color: HexColor; alpha: number };
        const rect = scene.add.rectangle(
          GAME_WIDTH / 2, GAME_HEIGHT / 2,
          GAME_WIDTH, GAME_HEIGHT,
          ov.color, ov.alpha,
        );
        objects.push(rect);
      }
    }

    return objects;
  }

  /**
   * Renders the pause screen overlay from PauseScreenSkinDef.
   */
  static renderPause(
    scene: Phaser.Scene,
    def: PauseScreenSkinDef,
  ): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      def.overlayColor, def.overlayAlpha,
    );
  }
}
