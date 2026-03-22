import Phaser from 'phaser';
import { HoopSkinDef } from '../data/skins/types';

/**
 * Stub renderer for future hoop asset layers (rim, net, backboard, stanchion).
 * Currently a no-op — hoop visuals are baked into the court image.
 * When individual hoop assets are available, this renderer will composite them
 * from HoopSkinDef slots and colors.
 */
export class HoopRenderer {
  constructor(_scene: Phaser.Scene, _skin: HoopSkinDef) {
    // Future: render rim, net, backboard, stanchion from skin slots
  }

  update(): void {
    // No-op until hoop assets are available
  }

  destroy(): void {
    // No-op
  }
}
