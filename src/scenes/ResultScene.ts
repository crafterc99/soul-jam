import Phaser from 'phaser';
import { SCENE_RESULT, SCENE_GAME, SCENE_MENU, SCENE_LEADERBOARD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS } from '../data/Characters';
import { COURTS } from '../data/courts';
import { MatchConfig } from '../data/types';
import { getTheme } from '../data/theme';
import { getActiveSkin } from '../data/skins';
import { getStorageService } from '../services/StorageService';
import { createDefaultMatchConfig } from '../data/match';
import { ScreenBackgroundRenderer } from '../rendering/ScreenBackgroundRenderer';

interface ResultData {
  matchConfig: MatchConfig;
  scores: [number, number];
  winner: number | null;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  private selectedIndex = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private readonly options = ['Rematch', 'Menu', 'Leaderboard'];

  constructor() {
    super({ key: SCENE_RESULT });
  }

  init(data: ResultData): void {
    this.resultData = data;
    this.selectedIndex = 0;
  }

  create(): void {
    const theme = getTheme();
    const skin = getActiveSkin();
    const { matchConfig, scores, winner } = this.resultData;
    const storage = getStorageService();

    // Record match result
    const winnerCharId = winner === 0 ? matchConfig.p1CharacterId : matchConfig.p2CharacterId;
    const loserCharId = winner === 0 ? matchConfig.p2CharacterId : matchConfig.p1CharacterId;
    let newUnlocks: string[] = [];

    if (winner !== null) {
      newUnlocks = storage.recordMatch(winnerCharId, loserCharId);
    } else {
      storage.incrementTotalGames();
    }

    // Background from skin
    ScreenBackgroundRenderer.render(this, skin.screens.result);

    // Winner portrait
    if (winner !== null) {
      const winChar = winner === 0 ? CHARACTERS[matchConfig.p1CharacterId] : CHARACTERS[matchConfig.p2CharacterId];
      if (winChar && this.textures.exists(winChar.assets.portrait)) {
        const portrait = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, winChar.assets.portrait);
        portrait.setAlpha(0.15);
        const maxSize = 400;
        const scaleX = maxSize / portrait.width;
        const scaleY = maxSize / portrait.height;
        portrait.setScale(Math.min(scaleX, scaleY));
      }
    }

    // Winner text
    let winnerLabel = 'DRAW';
    if (winner !== null) {
      const winChar = winner === 0 ? CHARACTERS[matchConfig.p1CharacterId] : CHARACTERS[matchConfig.p2CharacterId];
      winnerLabel = winChar ? `${winChar.name} WINS!` : `PLAYER ${winner + 1} WINS!`;
    }

    this.add.text(GAME_WIDTH / 2, 100, winnerLabel, {
      fontSize: '48px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Final score
    const p1Char = CHARACTERS[matchConfig.p1CharacterId];
    const p2Char = CHARACTERS[matchConfig.p2CharacterId];
    this.add.text(GAME_WIDTH / 2, 170, `${p1Char?.name ?? 'P1'}  ${scores[0]}  -  ${scores[1]}  ${p2Char?.name ?? 'P2'}`, {
      fontSize: '32px',
      fontFamily: theme.fonts.score,
      color: theme.colors.text,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Match stats
    const courtDef = COURTS[matchConfig.courtId];
    this.add.text(GAME_WIDTH / 2, 220, `Court: ${courtDef?.name ?? matchConfig.courtId}`, {
      fontSize: '16px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
    }).setOrigin(0.5);

    // Unlock popup
    if (newUnlocks.length > 0) {
      const unlockY = 280;
      this.add.text(GAME_WIDTH / 2, unlockY, '\u2728 NEW UNLOCK! \u2728', {
        fontSize: '24px',
        fontFamily: theme.fonts.heading,
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

      newUnlocks.forEach((unlock, i) => {
        const [type, id] = unlock.split(':');
        let unlockLabel = id;
        if (type === 'court' && COURTS[id]) unlockLabel = `Court: ${COURTS[id].name}`;
        if (type === 'character' && CHARACTERS[id]) unlockLabel = `Character: ${CHARACTERS[id].name}`;

        const text = this.add.text(GAME_WIDTH / 2, unlockY + 35 + i * 30, unlockLabel, {
          fontSize: '18px',
          fontFamily: theme.fonts.body,
          color: '#ffcc00',
        }).setOrigin(0.5);

        this.tweens.add({
          targets: text,
          alpha: 0.5,
          duration: 400,
          yoyo: true,
          repeat: -1,
        });
      });
    }

    // Menu buttons
    const menuY = newUnlocks.length > 0 ? 400 : 340;
    this.menuItems = this.options.map((label, i) => {
      const text = this.add.text(GAME_WIDTH / 2, menuY + i * 55, label, {
        fontSize: '24px',
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        fontStyle: 'bold',
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

    // Keyboard
    this.input.keyboard?.on('keydown-UP', () => this.nav(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.nav(1));
    this.input.keyboard?.on('keydown-W', () => this.nav(-1));
    this.input.keyboard?.on('keydown-S', () => this.nav(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.selectOption(this.selectedIndex));
    this.input.keyboard?.on('keydown-SPACE', () => this.selectOption(this.selectedIndex));

    // Gamepad
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0) this.selectOption(this.selectedIndex);
      if (button.index === 12) this.nav(-1);
      if (button.index === 13) this.nav(1);
    });
  }

  private nav(dir: number): void {
    this.selectedIndex = (this.selectedIndex + dir + this.options.length) % this.options.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    const theme = getTheme();
    this.menuItems.forEach((item, i) => {
      if (i === this.selectedIndex) {
        item.setColor(theme.colors.primary);
        item.setScale(1.1);
      } else {
        item.setColor(theme.colors.text);
        item.setScale(1.0);
      }
    });
  }

  private selectOption(index: number): void {
    const { matchConfig } = this.resultData;

    switch (index) {
      case 0: // Rematch
        this.scene.start(SCENE_GAME, matchConfig);
        break;
      case 1: // Menu
        this.scene.start(SCENE_MENU);
        break;
      case 2: // Leaderboard
        this.scene.start(SCENE_LEADERBOARD);
        break;
    }
  }
}
