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

    // Static images
    this.load.image('court', 'assets/images/court.webp');
    this.load.image('loading-screen', 'assets/images/loading-screen.webp');
    this.load.image('playerselect-bg', 'assets/images/playerselect.jpg');
    this.load.image('char-99', 'assets/images/99full.png');
    this.load.image('char-breezy', 'assets/images/breezyfull.png');
    this.load.image('basketball', 'assets/images/basketball.png');  // pre-cropped 124x124

    // Player select backgrounds
    this.load.image('select-99', 'assets/images/99-player-select.webp');
    this.load.image('select-breezy', 'assets/images/breezy-player-select.webp');

    // All Breezy animations use uniform 176x176 frame cells (4 cols x 2 rows grids)
    this.load.spritesheet('breezy-dribble', 'assets/images/breezy-dribble.png', {
      frameWidth: 176, frameHeight: 176,
    });
    this.load.spritesheet('breezy-idle-dribble', 'assets/images/breezy-idle-dribble.png', {
      frameWidth: 320, frameHeight: 1434,
    });
    this.load.spritesheet('breezy-defensive-slide-left', 'assets/images/breezy-defensive-slide-left.png', {
      frameWidth: 480, frameHeight: 717,
    });
    this.load.spritesheet('breezy-defensive-slide-right', 'assets/images/breezy-defensive-slide-right.png', {
      frameWidth: 480, frameHeight: 717,
    });
    this.load.spritesheet('breezy-jumpshot', 'assets/images/breezy-jumpshot.png', {
      frameWidth: 176, frameHeight: 176,
    });
    this.load.spritesheet('breezy-stepback', 'assets/images/breezy-stepback.png', {
      frameWidth: 176, frameHeight: 176,
    });
    this.load.spritesheet('breezy-static-dribble', 'assets/images/breezy-static-dribble.png', {
      frameWidth: 176, frameHeight: 176,
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

    // Defensive slide left
    this.anims.create({
      key: 'breezy-defensive-slide-left-anim',
      frames: this.anims.generateFrameNumbers('breezy-defensive-slide-left', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    // Defensive slide right
    this.anims.create({
      key: 'breezy-defensive-slide-right-anim',
      frames: this.anims.generateFrameNumbers('breezy-defensive-slide-right', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });

    // Jumpshot (play once, hold last frame)
    this.anims.create({
      key: 'breezy-jumpshot-anim',
      frames: this.anims.generateFrameNumbers('breezy-jumpshot', { start: 0, end: 6 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: false,
    });

    // Step back (play once, hold last frame — dead ball after)
    this.anims.create({
      key: 'breezy-stepback-anim',
      frames: this.anims.generateFrameNumbers('breezy-stepback', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: false,
    });

    // Static dribble animation (standing with ball, better proportions)
    this.anims.create({
      key: 'breezy-static-dribble-anim',
      frames: this.anims.generateFrameNumbers('breezy-static-dribble', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.start(SCENE_MENU);
  }
}
