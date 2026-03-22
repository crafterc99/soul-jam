import Phaser from 'phaser';
import { SCENE_COURT_SELECT, SCENE_GAME, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { COURTS, getCourtIds, getDefaultCourtId } from '../data/courts';
import { createDefaultMatchConfig } from '../data/match';
import { getTheme } from '../data/theme';
import { getStorageService } from '../services/StorageService';

interface SceneData {
  mode: 'cpu' | 'local2p';
  p1CharacterId: string;
  p2CharacterId: string;
}

export class CourtSelectScene extends Phaser.Scene {
  private sceneData!: SceneData;
  private courtIds: string[] = [];
  private selection = 0;
  private courtCards: Phaser.GameObjects.Container[] = [];
  private courtNameText: Phaser.GameObjects.Text | null = null;
  private courtStatusText: Phaser.GameObjects.Text | null = null;
  private gamepadNavTimer = 0;

  constructor() {
    super({ key: SCENE_COURT_SELECT });
  }

  init(data: SceneData): void {
    this.sceneData = data;
    this.courtIds = getCourtIds();
    this.selection = 0;
  }

  create(): void {
    const theme = getTheme();
    const storage = getStorageService();

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
      parseInt(theme.colors.background.replace('#', ''), 16));

    // Title
    this.add.text(GAME_WIDTH / 2, 60, 'SELECT COURT', {
      fontSize: '36px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Court name below title
    this.courtNameText = this.add.text(GAME_WIDTH / 2, 110, '', {
      fontSize: '24px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.courtStatusText = this.add.text(GAME_WIDTH / 2, 140, '', {
      fontSize: '16px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
    }).setOrigin(0.5);

    // Create court cards horizontally
    const cardWidth = 280;
    const cardHeight = 180;
    const gap = 40;
    const totalWidth = this.courtIds.length * cardWidth + (this.courtIds.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;

    this.courtCards = this.courtIds.map((id, i) => {
      const courtDef = COURTS[id];
      const x = startX + i * (cardWidth + gap);
      const y = GAME_HEIGHT / 2 + 20;

      const container = this.add.container(x, y);

      // Card background
      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x222244, 1);
      bg.setStrokeStyle(3, 0x444466);
      container.add(bg);

      // Court thumbnail
      if (this.textures.exists(courtDef.assets.thumbnail)) {
        const thumb = this.add.image(0, 0, courtDef.assets.thumbnail);
        thumb.setDisplaySize(cardWidth - 10, cardHeight - 10);
        thumb.setAlpha(0.6);
        container.add(thumb);
      }

      // Court name on card
      const nameText = this.add.text(0, cardHeight / 2 - 20, courtDef.name, {
        fontSize: '18px',
        fontFamily: theme.fonts.heading,
        color: theme.colors.text,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      container.add(nameText);

      // Lock overlay
      const isLocked = !storage.isCourtUnlocked(id) && !courtDef.unlocked;
      if (isLocked) {
        const lockOverlay = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x000000, 0.7);
        container.add(lockOverlay);

        const lockIcon = this.add.text(0, -15, '🔒', {
          fontSize: '36px',
        }).setOrigin(0.5);
        container.add(lockIcon);

        const lockLabel = this.add.text(0, 25, courtDef.unlockCondition?.replace(/_/g, ' ').toUpperCase() ?? 'LOCKED', {
          fontSize: '12px',
          fontFamily: theme.fonts.body,
          color: '#ff6666',
        }).setOrigin(0.5);
        container.add(lockLabel);
      }

      return container;
    });

    this.updateSelection();

    // Navigation hints
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'A/D: Select | SPACE: Confirm | ESC: Back', {
      fontSize: '14px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Keyboard
    this.input.keyboard?.on('keydown-A', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-D', () => this.navigate(1));
    this.input.keyboard?.on('keydown-LEFT', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    // Gamepad
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0) this.confirm();
      if (button.index === 1) this.goBack();
      if (button.index === 14) this.navigate(-1);
      if (button.index === 15) this.navigate(1);
    });

    this.gamepadNavTimer = 0;
  }

  update(_time: number, delta: number): void {
    if (this.gamepadNavTimer > 0) {
      this.gamepadNavTimer -= delta;
      return;
    }
    const pad = this.input.gamepad?.getPad(0);
    if (pad && pad.connected) {
      const lx = pad.leftStick.x;
      if (lx < -0.5) { this.navigate(-1); this.gamepadNavTimer = 250; }
      else if (lx > 0.5) { this.navigate(1); this.gamepadNavTimer = 250; }
    }
  }

  private navigate(direction: number): void {
    this.selection = (this.selection + direction + this.courtIds.length) % this.courtIds.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    const storage = getStorageService();

    this.courtCards.forEach((card, i) => {
      if (i === this.selection) {
        card.setScale(1.1);
        card.setAlpha(1);
      } else {
        card.setScale(0.9);
        card.setAlpha(0.6);
      }
    });

    const courtDef = COURTS[this.courtIds[this.selection]];
    const isLocked = !storage.isCourtUnlocked(this.courtIds[this.selection]) && !courtDef.unlocked;

    this.courtNameText?.setText(courtDef.name);
    if (isLocked) {
      this.courtStatusText?.setText('🔒 LOCKED — ' + (courtDef.unlockCondition?.replace(/_/g, ' ').toUpperCase() ?? ''));
      this.courtStatusText?.setColor('#ff6666');
    } else {
      this.courtStatusText?.setText('AVAILABLE');
      this.courtStatusText?.setColor('#44ff44');
    }
  }

  private confirm(): void {
    const courtId = this.courtIds[this.selection];
    const courtDef = COURTS[courtId];
    const storage = getStorageService();

    // Block locked courts
    if (!storage.isCourtUnlocked(courtId) && !courtDef.unlocked) {
      this.courtStatusText?.setColor('#ff0000');
      this.tweens.add({
        targets: this.courtStatusText,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
      return;
    }

    const matchConfig = createDefaultMatchConfig({
      courtId,
      p1CharacterId: this.sceneData.p1CharacterId,
      p2CharacterId: this.sceneData.p2CharacterId,
      mode: this.sceneData.mode,
    });

    this.scene.start(SCENE_GAME, matchConfig);
  }

  private goBack(): void {
    this.scene.start(SCENE_CHARACTER_SELECT, { mode: this.sceneData.mode });
  }
}
