import Phaser from 'phaser';
import { SCENE_MENU, SCENE_CHARACTER_SELECT, SCENE_LEADERBOARD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { getTheme } from '../data/theme';
import { getActiveSkin } from '../data/skins';
import { ScreenBackgroundRenderer } from '../rendering/ScreenBackgroundRenderer';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_MENU });
  }

  create(): void {
    const theme = getTheme();
    const skin = getActiveSkin();

    // Background from skin
    ScreenBackgroundRenderer.render(this, skin.screens.menu);

    // Blinking "PRESS START" at bottom
    const pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'PRESS START', {
      fontSize: '32px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Leaderboard button
    const lbBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'LEADERBOARD (L)', {
      fontSize: '16px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerover', () => lbBtn.setColor(theme.colors.primary));
    lbBtn.on('pointerout', () => lbBtn.setColor(theme.colors.textDim));
    lbBtn.on('pointerdown', () => this.scene.start(SCENE_LEADERBOARD));

    // Any key/click/gamepad starts
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-L', () => this.scene.start(SCENE_LEADERBOARD));
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      // Don't start game if clicking leaderboard button
      // pointerdown on scene fires after button handler
    });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0) this.startGame();
      if (button.index === 2) this.scene.start(SCENE_LEADERBOARD); // X button
    });

    // Fallback: any key besides L starts game
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key !== 'l' && event.key !== 'L' &&
          event.key !== ' ' && event.key !== 'Enter') {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    this.scene.start(SCENE_CHARACTER_SELECT, { mode: 'cpu' });
  }
}
