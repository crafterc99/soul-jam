import Phaser from 'phaser';
import { SCENE_MENU, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private readonly options = ['VS CPU', 'LOCAL 2P'];

  constructor() {
    super({ key: SCENE_MENU });
  }

  create(): void {
    this.selectedIndex = 0;

    // Background - use loading screen as menu bg
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading-screen');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    bg.setAlpha(0.4);

    this.add.text(GAME_WIDTH / 2, 120, 'SOUL JAM', {
      fontSize: '80px',
      color: '#ff4400',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 200, '16-BIT EDITION', {
      fontSize: '28px',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.menuItems = this.options.map((label, i) => {
      const text = this.add.text(GAME_WIDTH / 2, 380 + i * 80, label, {
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.selectOption(i));
      text.on('pointerover', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });
      return text;
    });

    this.updateSelection();

    // Blinking "PRESS START" vibe
    const pressText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '.. PRESS SPACE ..', {
      fontSize: '20px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.selectOption(this.selectedIndex));
    this.input.keyboard?.on('keydown-SPACE', () => this.selectOption(this.selectedIndex));
  }

  private moveSelection(dir: number): void {
    this.selectedIndex = (this.selectedIndex + dir + this.options.length) % this.options.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    this.menuItems.forEach((item, i) => {
      if (i === this.selectedIndex) {
        item.setColor('#ff6600');
        item.setScale(1.15);
      } else {
        item.setColor('#ffffff');
        item.setScale(1.0);
      }
    });
  }

  private selectOption(index: number): void {
    const mode = index === 0 ? 'cpu' : 'local2p';
    this.scene.start(SCENE_CHARACTER_SELECT, { mode });
  }
}
