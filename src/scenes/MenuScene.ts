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

    this.add.text(GAME_WIDTH / 2, 160, 'SOUL JAM', {
      fontSize: '72px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 240, 'Street Basketball', {
      fontSize: '24px',
      color: '#cccccc',
    }).setOrigin(0.5);

    this.menuItems = this.options.map((label, i) => {
      const text = this.add.text(GAME_WIDTH / 2, 380 + i * 70, label, {
        fontSize: '36px',
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
    const mode = index === 0 ? 'cpu' : 'local2p';
    this.scene.start(SCENE_CHARACTER_SELECT, { mode });
  }
}
