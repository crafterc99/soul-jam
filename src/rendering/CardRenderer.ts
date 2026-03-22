import Phaser from 'phaser';
import { CardSkinDef } from '../data/skins/types';

export interface CardConfig {
  x: number;
  y: number;
  name: string;
  thumbnailKey?: string;
  isLocked: boolean;
  lockLabel?: string;
}

export class CardRenderer {
  /**
   * Creates a card container from a CardSkinDef and CardConfig.
   */
  static create(
    scene: Phaser.Scene,
    skin: CardSkinDef,
    config: CardConfig,
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(config.x, config.y);
    const { width, height } = skin.size;

    // Card background
    const bg = scene.add.rectangle(0, 0, width, height, skin.bgColor, 1);
    bg.setStrokeStyle(skin.borderWidth, skin.borderColor);
    container.add(bg);

    // Thumbnail
    if (config.thumbnailKey && scene.textures.exists(config.thumbnailKey)) {
      const thumb = scene.add.image(0, 0, config.thumbnailKey);
      thumb.setDisplaySize(width - 10, height - 10);
      thumb.setAlpha(0.6);
      container.add(thumb);
    }

    // Card name
    const nameText = scene.add.text(0, height / 2 - 20, config.name, {
      fontSize: skin.nameSize,
      fontFamily: skin.nameFont,
      color: skin.nameColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(nameText);

    // Lock overlay
    if (config.isLocked) {
      const lockOverlay = scene.add.rectangle(0, 0, width, height, skin.lockOverlay.color, skin.lockOverlay.alpha);
      container.add(lockOverlay);

      const lockIcon = scene.add.text(0, -15, '\uD83D\uDD12', {
        fontSize: '36px',
      }).setOrigin(0.5);
      container.add(lockIcon);

      const lockLabel = scene.add.text(0, 25, config.lockLabel ?? 'LOCKED', {
        fontSize: '12px',
        fontFamily: skin.nameFont,
        color: skin.lockTextColor,
      }).setOrigin(0.5);
      container.add(lockLabel);
    }

    return container;
  }

  /**
   * Applies selection state to a set of card containers.
   */
  static updateSelection(
    cards: Phaser.GameObjects.Container[],
    selectedIndex: number,
    skin: CardSkinDef,
  ): void {
    cards.forEach((card, i) => {
      if (i === selectedIndex) {
        card.setScale(skin.selectedScale);
        card.setAlpha(1);
      } else {
        card.setScale(skin.unselectedScale);
        card.setAlpha(skin.unselectedAlpha);
      }
    });
  }
}
