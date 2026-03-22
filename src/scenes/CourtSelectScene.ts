import Phaser from 'phaser';
import { SCENE_COURT_SELECT, SCENE_GAME, SCENE_CHARACTER_SELECT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { COURTS, getCourtIds } from '../data/courts';
import { createDefaultMatchConfig } from '../data/match';
import { getTheme } from '../data/theme';
import { getActiveSkin } from '../data/skins';
import { getStorageService } from '../services/StorageService';
import { ScreenBackgroundRenderer } from '../rendering/ScreenBackgroundRenderer';
import { CardRenderer } from '../rendering/CardRenderer';

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
    const skin = getActiveSkin();
    const storage = getStorageService();
    const cardSkin = skin.courtCard;

    // Background from skin
    ScreenBackgroundRenderer.render(this, skin.screens.courtSelect);

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

    // Create court cards using CardRenderer
    const { width } = cardSkin.size;
    const gap = 40;
    const totalWidth = this.courtIds.length * width + (this.courtIds.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + width / 2;

    this.courtCards = this.courtIds.map((id, i) => {
      const courtDef = COURTS[id];
      const x = startX + i * (width + gap);
      const y = GAME_HEIGHT / 2 + 20;
      const isLocked = !storage.isCourtUnlocked(id) && !courtDef.unlocked;

      return CardRenderer.create(this, cardSkin, {
        x,
        y,
        name: courtDef.name,
        thumbnailKey: courtDef.assets.thumbnail,
        isLocked,
        lockLabel: courtDef.unlockCondition?.replace(/_/g, ' ').toUpperCase() ?? 'LOCKED',
      });
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
    const skin = getActiveSkin();

    CardRenderer.updateSelection(this.courtCards, this.selection, skin.courtCard);

    const courtDef = COURTS[this.courtIds[this.selection]];
    const isLocked = !storage.isCourtUnlocked(this.courtIds[this.selection]) && !courtDef.unlocked;

    this.courtNameText?.setText(courtDef.name);
    if (isLocked) {
      this.courtStatusText?.setText('\uD83D\uDD12 LOCKED \u2014 ' + (courtDef.unlockCondition?.replace(/_/g, ' ').toUpperCase() ?? ''));
      this.courtStatusText?.setColor(skin.courtCard.lockTextColor);
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
