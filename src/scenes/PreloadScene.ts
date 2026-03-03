import Phaser from 'phaser';
import { SCENE_PRELOAD, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

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

    // Load game assets
    this.load.image('court', 'assets/images/court.webp');
    this.load.image('loading-screen', 'assets/images/loading-screen.webp');
    this.load.image('playerselect-bg', 'assets/images/playerselect.jpg');
    this.load.image('char-99', 'assets/images/99full.webp');
    this.load.image('char-breezy', 'assets/images/breezyfull.webp');

    // Breezy running dribble: 4 cols x 2 rows = 8 frames, each 480x717
    this.load.spritesheet('breezy-dribble', 'assets/images/breezy-dribble.png', {
      frameWidth: 480,
      frameHeight: 717,
    });

    // Breezy idle/standing dribble: 6 cols x 1 row = 6 frames, each 320x1434
    this.load.spritesheet('breezy-idle-dribble', 'assets/images/breezy-idle-dribble.png', {
      frameWidth: 320,
      frameHeight: 1434,
    });
  }

  create(): void {
    // Running dribble animation (fast, for movement)
    this.anims.create({
      key: 'breezy-dribble-anim',
      frames: this.anims.generateFrameNumbers('breezy-dribble', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    // Idle dribble animation (slower, for standing with ball)
    this.anims.create({
      key: 'breezy-idle-dribble-anim',
      frames: this.anims.generateFrameNumbers('breezy-idle-dribble', { start: 0, end: 5 }),
      frameRate: 5,
      repeat: -1,
    });

    this.scene.start(SCENE_MENU);
  }
}
