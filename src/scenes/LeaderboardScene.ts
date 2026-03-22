import Phaser from 'phaser';
import { SCENE_LEADERBOARD, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getTheme } from '../data/theme';
import { getStorageService } from '../services/StorageService';
import { LeaderboardEntry } from '../data/types';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_LEADERBOARD });
  }

  create(): void {
    const theme = getTheme();
    const storage = getStorageService();
    const leaderboard = storage.getLeaderboard();

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
      parseInt(theme.colors.background.replace('#', ''), 16));

    // Title
    this.add.text(GAME_WIDTH / 2, 50, 'LEADERBOARD', {
      fontSize: '40px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Column headers
    const headerY = 120;
    const cols = { name: 200, wins: 420, losses: 540, streak: 660, best: 800 };

    this.add.text(cols.name, headerY, 'CHARACTER', {
      fontSize: '16px', fontFamily: theme.fonts.heading, color: theme.colors.textDim, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cols.wins, headerY, 'WINS', {
      fontSize: '16px', fontFamily: theme.fonts.heading, color: theme.colors.textDim, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cols.losses, headerY, 'LOSSES', {
      fontSize: '16px', fontFamily: theme.fonts.heading, color: theme.colors.textDim, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cols.streak, headerY, 'STREAK', {
      fontSize: '16px', fontFamily: theme.fonts.heading, color: theme.colors.textDim, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cols.best, headerY, 'BEST STREAK', {
      fontSize: '16px', fontFamily: theme.fonts.heading, color: theme.colors.textDim, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider line
    const line = this.add.graphics();
    line.lineStyle(1, 0x444466);
    line.lineBetween(100, headerY + 20, GAME_WIDTH - 100, headerY + 20);

    // Character rows - sorted by wins descending
    const charIds = getCharacterIds();
    const entries: (LeaderboardEntry & { charId: string })[] = charIds.map((id: string) => ({
      charId: id,
      ...storage.getCharacterEntry(id),
    }));
    entries.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    entries.forEach((entry, i) => {
      const y = 165 + i * 50;
      const charDef = CHARACTERS[entry.charId];
      const name = charDef?.name ?? entry.charId;

      // Row background (alternating)
      if (i % 2 === 0) {
        this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 160, 40, 0x1a1a3e, 0.5);
      }

      // Portrait thumbnail
      if (charDef && this.textures.exists(charDef.sprites.staticKey)) {
        const thumb = this.add.image(100, y, charDef.sprites.staticKey);
        thumb.setDisplaySize(36, 36);
      }

      this.add.text(cols.name, y, name, {
        fontSize: '20px', fontFamily: theme.fonts.body, color: theme.colors.text, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(cols.wins, y, `${entry.wins}`, {
        fontSize: '20px', fontFamily: theme.fonts.score, color: '#44ff44',
      }).setOrigin(0.5);
      this.add.text(cols.losses, y, `${entry.losses}`, {
        fontSize: '20px', fontFamily: theme.fonts.score, color: '#ff4444',
      }).setOrigin(0.5);
      this.add.text(cols.streak, y, `${entry.streak}`, {
        fontSize: '20px', fontFamily: theme.fonts.score, color: theme.colors.text,
      }).setOrigin(0.5);
      this.add.text(cols.best, y, `${entry.bestStreak}`, {
        fontSize: '20px', fontFamily: theme.fonts.score, color: theme.colors.primary,
      }).setOrigin(0.5);
    });

    // Total stats
    const unlockState = storage.getUnlockState();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100,
      `Total Games: ${unlockState.totalGames}  |  Total Wins: ${unlockState.totalWins}`, {
      fontSize: '16px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'BACK TO MENU (ESC)', {
      fontSize: '20px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setScale(1.1));
    backBtn.on('pointerout', () => backBtn.setScale(1.0));
    backBtn.on('pointerdown', () => this.goBack());

    // Keyboard
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-SPACE', () => this.goBack());
    this.input.keyboard?.on('keydown-ENTER', () => this.goBack());

    // Gamepad
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0 || button.index === 1) this.goBack();
    });
  }

  private goBack(): void {
    this.scene.start(SCENE_MENU);
  }
}
