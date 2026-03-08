import Phaser from 'phaser';
import { SCENE_PRELOAD, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

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
    this.load.image('basketball', 'assets/images/basketball.png');

    // Player select backgrounds
    this.load.image('select-99', 'assets/images/99-player-select.webp');
    this.load.image('select-breezy', 'assets/images/breezy-player-select.webp');

    // All Breezy animations use uniform 180x180 frame cells
    const F = { frameWidth: 180, frameHeight: 180 };

    this.load.spritesheet('breezy-static-dribble', 'assets/images/breezy-static-dribble.png', F);
    this.load.spritesheet('breezy-dribble', 'assets/images/breezy-dribble.png', F);
    this.load.spritesheet('breezy-jumpshot', 'assets/images/breezy-jumpshot.png', F);
    this.load.spritesheet('breezy-stepback', 'assets/images/breezy-stepback.png', F);
    this.load.spritesheet('breezy-crossover', 'assets/images/breezy-crossover.png', F);
    this.load.spritesheet('breezy-defense-backpedal', 'assets/images/breezy-defense-backpedal.png', F);
    this.load.spritesheet('breezy-defense-shuffle', 'assets/images/breezy-defense-shuffle.png', F);
    this.load.spritesheet('breezy-steal', 'assets/images/breezy-steal.png', F);

    // Legacy defense slides (kept for now, can be removed later)
    this.load.spritesheet('breezy-defensive-slide-left', 'assets/images/breezy-defensive-slide-left.png', {
      frameWidth: 480, frameHeight: 717,
    });
    this.load.spritesheet('breezy-defensive-slide-right', 'assets/images/breezy-defensive-slide-right.png', {
      frameWidth: 480, frameHeight: 717,
    });
  }

  create(): void {
    // Static dribble (idle with ball) — loop
    this.anims.create({
      key: 'breezy-static-dribble-anim',
      frames: this.anims.generateFrameNumbers('breezy-static-dribble', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    // Running dribble — loop
    this.anims.create({
      key: 'breezy-dribble-anim',
      frames: this.anims.generateFrameNumbers('breezy-dribble', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    // Jumpshot — play once, hold last frame
    this.anims.create({
      key: 'breezy-jumpshot-anim',
      frames: this.anims.generateFrameNumbers('breezy-jumpshot', { start: 0, end: 6 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: false,
    });

    // Step back — play once, hold last frame (dead ball)
    this.anims.create({
      key: 'breezy-stepback-anim',
      frames: this.anims.generateFrameNumbers('breezy-stepback', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: false,
    });

    // Crossover — play once, hold last frame, very slow
    this.anims.create({
      key: 'breezy-crossover-anim',
      frames: this.anims.generateFrameNumbers('breezy-crossover', { start: 0, end: 3 }),
      frameRate: 3,
      repeat: 0,
      hideOnComplete: false,
    });

    // Defense back pedal — loop
    this.anims.create({
      key: 'breezy-defense-backpedal-anim',
      frames: this.anims.generateFrameNumbers('breezy-defense-backpedal', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    // Defense shuffle — frame 0 = static stance, loop both frames when moving
    this.anims.create({
      key: 'breezy-defense-shuffle-anim',
      frames: this.anims.generateFrameNumbers('breezy-defense-shuffle', { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1,
    });

    // Steal reach-in — play once, hold last frame
    this.anims.create({
      key: 'breezy-steal-anim',
      frames: this.anims.generateFrameNumbers('breezy-steal', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: 0,
      hideOnComplete: false,
    });

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
