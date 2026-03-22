import Phaser from 'phaser';
import { CharacterDef } from '../data/types';

export class AnimationLoader {
  /**
   * Creates all Phaser animations from a character's sprite definitions.
   * Animation keys follow the pattern: `{textureKey}-anim`
   */
  static createCharacterAnimations(scene: Phaser.Scene, charDef: CharacterDef): void {
    for (const [_name, animDef] of Object.entries(charDef.sprites.animations)) {
      const animKey = `${animDef.textureKey}-anim`;

      // Skip if already created
      if (scene.anims.exists(animKey)) continue;

      // Skip if texture not loaded
      if (!scene.textures.exists(animDef.textureKey)) {
        console.warn(`[AnimationLoader] Texture '${animDef.textureKey}' not found, skipping anim '${animKey}'`);
        continue;
      }

      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(animDef.textureKey, {
          start: animDef.startFrame,
          end: animDef.endFrame,
        }),
        frameRate: animDef.fps,
        repeat: animDef.repeat,
        hideOnComplete: false,
      });
    }
  }

  /**
   * Get the animation key for a specific animation name on a character.
   * Returns the Phaser animation key (e.g., "99-dribble-anim")
   */
  static getAnimKey(charDef: CharacterDef, animName: string): string | undefined {
    const animDef = charDef.sprites.animations[animName];
    if (!animDef) return undefined;
    return `${animDef.textureKey}-anim`;
  }

  /**
   * Loads all animations for an array of characters.
   */
  static createAllAnimations(scene: Phaser.Scene, characters: CharacterDef[]): void {
    for (const char of characters) {
      AnimationLoader.createCharacterAnimations(scene, char);
    }
  }
}
