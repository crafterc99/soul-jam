import Phaser from 'phaser';
import { SCENE_PRELOAD, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS } from '../data/Characters';
import { COURTS } from '../data/courts';
import { buildAssetRegistry, getAssetRegistry } from '../services/AssetRegistry';
import { AnimationLoader } from '../rendering/AnimationLoader';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_PRELOAD });
  }

  preload(): void {
    // Progress bar
    const barWidth = 400;
    const barHeight = 30;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2 + 40;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRect(barX, barY, barWidth, barHeight);

    const progressBar = this.add.graphics();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xff6600, 1);
      progressBar.fillRect(barX + 5, barY + 5, (barWidth - 10) * value, barHeight - 10);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Build asset registry from all character + court defs
    const registry = buildAssetRegistry(CHARACTERS, COURTS);

    // Load all registered assets
    for (const [key, entry] of registry.getAll()) {
      if (entry.type === 'image') {
        this.load.image(key, entry.path);
      } else if (entry.type === 'spritesheet' && entry.config) {
        this.load.spritesheet(key, entry.path, entry.config);
      }
    }

    // Legacy defense slides (kept for Breezy compatibility)
    this.load.spritesheet('breezy-defensive-slide-left', 'assets/images/breezy-defensive-slide-left.png', {
      frameWidth: 480, frameHeight: 717,
    });
    this.load.spritesheet('breezy-defensive-slide-right', 'assets/images/breezy-defensive-slide-right.png', {
      frameWidth: 480, frameHeight: 717,
    });
  }

  create(): void {
    // Create all animations from character definitions (data-driven)
    AnimationLoader.createAllAnimations(this, Object.values(CHARACTERS));

    // Legacy defense slides
    this.anims.create({
      key: 'breezy-defensive-slide-left-anim',
      frames: this.anims.generateFrameNumbers('breezy-defensive-slide-left', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'breezy-defensive-slide-right-anim',
      frames: this.anims.generateFrameNumbers('breezy-defensive-slide-right', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start(SCENE_CHARACTER_SELECT, { mode: 'cpu' });
  }
}
