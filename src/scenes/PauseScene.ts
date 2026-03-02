import Phaser from 'phaser';
import { SCENE_PAUSE, SCENE_GAME, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class PauseScene extends Phaser.Scene {
  private selectedIndex = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private readonly options = ['Resume', 'Quit to Menu'];

  constructor() {
    super({ key: SCENE_PAUSE });
  }

  create(): void {
    this.selectedIndex = 0;

    // Dim overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    this.add.text(GAME_WIDTH / 2, 200, 'PAUSED', {
      fontSize: '48px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.menuItems = this.options.map((label, i) => {
      const text = this.add.text(GAME_WIDTH / 2, 340 + i * 60, label, {
        fontSize: '28px',
        color: '#ffffff',
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

    this.input.keyboard?.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-W', () => {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-S', () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-ENTER', () => this.selectOption(this.selectedIndex));
    this.input.keyboard?.on('keydown-SPACE', () => this.selectOption(this.selectedIndex));
    this.input.keyboard?.on('keydown-ESC', () => this.selectOption(0)); // Resume
  }

  private updateSelection(): void {
    this.menuItems.forEach((item, i) => {
      if (i === this.selectedIndex) {
        item.setColor('#ff6600');
        item.setScale(1.1);
      } else {
        item.setColor('#ffffff');
        item.setScale(1.0);
      }
    });
  }

  private selectOption(index: number): void {
    if (index === 0) {
      // Resume
      this.scene.resume(SCENE_GAME);
      this.scene.stop();
    } else {
      // Quit to menu
      this.scene.stop(SCENE_GAME);
      this.scene.start(SCENE_MENU);
    }
  }
}
