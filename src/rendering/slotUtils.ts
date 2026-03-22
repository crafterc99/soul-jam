import Phaser from 'phaser';
import { AssetSlot, ScreenSkinDef, HexColor } from '../data/skins/types';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

/**
 * Resolves which texture key to use: primary or fallback.
 * Returns undefined if neither exists.
 */
export function resolveSlotKey(scene: Phaser.Scene, slot: AssetSlot): string | undefined {
  if (scene.textures.exists(slot.key)) return slot.key;
  if (slot.fallback && scene.textures.exists(slot.fallback)) return slot.fallback;
  return undefined;
}

/**
 * Renders an AssetSlot as a Phaser Image, applying origin/size/depth from the slot.
 * Returns the Image or null if texture not found.
 */
export function renderSlot(
  scene: Phaser.Scene,
  slot: AssetSlot,
  x: number,
  y: number,
): Phaser.GameObjects.Image | null {
  const key = resolveSlotKey(scene, slot);
  if (!key) return null;

  const img = scene.add.image(x, y, key);

  if (slot.origin) {
    img.setOrigin(slot.origin.x, slot.origin.y);
  }
  if (slot.size) {
    img.setDisplaySize(slot.size.width, slot.size.height);
  }
  if (slot.depth !== undefined) {
    img.setDepth(slot.depth);
  }

  return img;
}

/**
 * Renders a ScreenSkinDef background (either an AssetSlot image or a solid color fill).
 */
export function renderScreenBg(
  scene: Phaser.Scene,
  def: ScreenSkinDef,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null {
  const bg = def.bg;

  if ('key' in bg) {
    // AssetSlot background
    return renderSlot(scene, bg, GAME_WIDTH / 2, GAME_HEIGHT / 2);
  } else {
    // Solid color background
    return scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      (bg as { color: HexColor }).color,
    );
  }
}

/**
 * Collects all AssetSlots from a SkinBundle for registration.
 */
export function collectAllSlots(skin: Record<string, unknown>): AssetSlot[] {
  const slots: AssetSlot[] = [];

  function walk(obj: unknown): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;

    const record = obj as Record<string, unknown>;

    // If this looks like an AssetSlot (has a 'key' property that's a string)
    if (typeof record['key'] === 'string' && !('bg' in record)) {
      slots.push(record as unknown as AssetSlot);
      return;
    }

    // Check for ScreenSkinDef bg that's an AssetSlot
    if ('bg' in record && typeof record['bg'] === 'object' && record['bg'] !== null) {
      const bg = record['bg'] as Record<string, unknown>;
      if (typeof bg['key'] === 'string') {
        slots.push(bg as unknown as AssetSlot);
      }
    }

    // Recurse into child objects
    for (const val of Object.values(record)) {
      if (typeof val === 'object' && val !== null) {
        walk(val);
      }
    }
  }

  walk(skin);
  return slots;
}
