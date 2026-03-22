import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_COURT_SELECT, SCENE_BOOT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getStorageService } from '../services/StorageService';
import { getTheme } from '../data/theme';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private characterIds: string[] = [];
  private bgImage: Phaser.GameObjects.Image | null = null;
  private gamepadNavTimer = 0;
  private lockOverlays: Phaser.GameObjects.Group | null = null;
  private charNameText: Phaser.GameObjects.Text | null = null;
  private charTitleText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: SCENE_CHARACTER_SELECT });
  }

  init(data: SceneData): void {
    this.mode = data.mode;
    this.characterIds = getCharacterIds();
    const breezyIdx = this.characterIds.indexOf('breezy');
    this.p1Selection = breezyIdx >= 0 ? breezyIdx : 0;
    this.p2Selection = (this.p1Selection + 1) % this.characterIds.length;
  }

  create(): void {
    const theme = getTheme();
    const storage = getStorageService();

    // Background — swaps based on selection
    this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playerselect-bg');
    this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.updateBackground();

    // Character name display
    this.charNameText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.12, '', {
      fontSize: '42px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(100);

    this.charTitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.18, '', {
      fontSize: '18px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.updateCharacterInfo();

    // Lock overlay for locked characters
    const unlockState = storage.getUnlockState();
    this.lockOverlays = this.add.group();

    // Show lock indicator if current selection is locked
    this.updateLockState(unlockState.characters);

    // Blinking "PRESS START"
    const pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.92, 'PRESS START', {
      fontSize: '28px',
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Navigation hints
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'A/D or Stick: Select | SPACE or A Button: Start | ESC or B: Back', {
      fontSize: '11px',
      fontFamily: theme.fonts.body,
      color: theme.colors.textDim,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Keyboard controls
    this.input.keyboard?.on('keydown-A', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-D', () => this.navigate(1));
    this.input.keyboard?.on('keydown-LEFT', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_BOOT));

    // Gamepad controls
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0) this.confirm();
      if (button.index === 1) this.scene.start(SCENE_BOOT);
      if (button.index === 14) this.navigate(-1);
      if (button.index === 15) this.navigate(1);
    });

    this.gamepadNavTimer = 0;
  }

  private updateBackground(): void {
    const selectedCharId = this.characterIds[this.p1Selection];
    const charDef = CHARACTERS[selectedCharId];
    if (charDef && this.bgImage) {
      const bgKey = charDef.assets.selectBg;
      if (bgKey && this.textures.exists(bgKey)) {
        this.bgImage.setTexture(bgKey);
        this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      }
    }
  }

  private updateCharacterInfo(): void {
    const selectedCharId = this.characterIds[this.p1Selection];
    const charDef = CHARACTERS[selectedCharId];
    if (charDef) {
      this.charNameText?.setText(charDef.name);
      this.charTitleText?.setText(charDef.title);
    }
  }

  private updateLockState(charUnlocks: Record<string, boolean>): void {
    // We'll show a lock indicator text if current character is locked
    const selectedCharId = this.characterIds[this.p1Selection];
    const isLocked = !(charUnlocks[selectedCharId] ?? CHARACTERS[selectedCharId]?.unlocked);

    if (isLocked && this.charTitleText) {
      this.charTitleText.setText('🔒 LOCKED');
      this.charTitleText.setColor('#ff4444');
    } else if (this.charTitleText) {
      const charDef = CHARACTERS[selectedCharId];
      this.charTitleText.setText(charDef?.title ?? '');
      this.charTitleText.setColor(getTheme().colors.textDim);
    }
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
    this.p1Selection = (this.p1Selection + direction + this.characterIds.length) % this.characterIds.length;
    this.p2Selection = (this.p1Selection + 1) % this.characterIds.length;
    this.updateBackground();
    this.updateCharacterInfo();

    const storage = getStorageService();
    this.updateLockState(storage.getUnlockState().characters);
  }

  private confirm(): void {
    const selectedCharId = this.characterIds[this.p1Selection];
    const storage = getStorageService();

    // Block selection of locked characters
    if (!storage.isCharacterUnlocked(selectedCharId) && !CHARACTERS[selectedCharId]?.unlocked) {
      // Flash lock text red
      if (this.charTitleText) {
        this.tweens.add({
          targets: this.charTitleText,
          alpha: 0.2,
          duration: 100,
          yoyo: true,
          repeat: 2,
        });
      }
      return;
    }

    // Go to court select instead of directly to game
    this.scene.start(SCENE_COURT_SELECT, {
      mode: this.mode,
      p1CharacterId: this.characterIds[this.p1Selection],
      p2CharacterId: this.characterIds[this.p2Selection],
    });
  }
}
