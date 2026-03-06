import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_GAME, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS } from '../data/Characters';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

// Map character IDs to their player-select background keys
const SELECT_BG_KEYS: Record<string, string> = {
  ninetynine: 'select-99',
  breezy: 'select-breezy',
};

// Card positions matching the playerselect images
const LEFT_CARD_X = GAME_WIDTH * 0.27;
const RIGHT_CARD_X = GAME_WIDTH * 0.73;
const CARD_CENTER_Y = GAME_HEIGHT * 0.52;
const CARD_WIDTH = 240;
const CARD_HEIGHT = 360;

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private p1Confirmed = false;
  private p2Confirmed = false;
  private characterIds = Object.keys(CHARACTERS);
  private selectionGroup!: Phaser.GameObjects.Group;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private pressStartText: Phaser.GameObjects.Text | null = null;
  private pressStartTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: SCENE_CHARACTER_SELECT });
  }

  init(data: SceneData): void {
    this.mode = data.mode;
    this.p1Selection = 0;
    this.p2Selection = Math.min(1, this.characterIds.length - 1);
    this.p1Confirmed = false;
    this.p2Confirmed = false;
  }

  create(): void {
    this.selectionGroup = this.add.group();

    // Player select background - swaps based on P1's selection
    this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playerselect-bg');
    this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.updateBackground();

    // "PRESS START" overlay
    this.pressStartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.92, 'PRESS START', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);

    this.pressStartTween = this.tweens.add({
      targets: this.pressStartText,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.drawSelectionIndicators();

    // Controls
    this.input.keyboard?.on('keydown-A', () => this.navigate(1, -1));
    this.input.keyboard?.on('keydown-D', () => this.navigate(1, 1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm(1));
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    if (this.mode === 'local2p') {
      this.input.keyboard?.on('keydown-LEFT', () => this.navigate(2, -1));
      this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(2, 1));
      this.input.keyboard?.on('keydown-ENTER', () => this.confirm(2));
    }
  }

  private updateBackground(): void {
    const selectedCharId = this.characterIds[this.p1Selection];
    const bgKey = SELECT_BG_KEYS[selectedCharId];
    if (bgKey && this.textures.exists(bgKey) && this.bgImage) {
      this.bgImage.setTexture(bgKey);
      this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
  }

  private drawSelectionIndicators(): void {
    this.selectionGroup.clear(true, true);

    const cardPositions = [LEFT_CARD_X, RIGHT_CARD_X];

    // P1 selection glow
    const p1CardX = cardPositions[this.p1Selection];
    const p1Glow = this.add.rectangle(p1CardX, CARD_CENTER_Y, CARD_WIDTH + 16, CARD_HEIGHT + 16);
    p1Glow.setStrokeStyle(4, 0x00ccff);
    p1Glow.setFillStyle(0x00ccff, 0.08);
    this.selectionGroup.add(p1Glow);

    // P1 label
    const p1Label = this.add.text(p1CardX, CARD_CENTER_Y - CARD_HEIGHT / 2 - 18,
      this.p1Confirmed ? 'P1 READY!' : 'P1', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.selectionGroup.add(p1Label);

    // Blink P1 glow when not confirmed
    if (!this.p1Confirmed) {
      this.tweens.add({
        targets: p1Glow,
        alpha: 0.4,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }

    // P2 selection glow
    const p2CardX = cardPositions[this.p2Selection];
    const p2Glow = this.add.rectangle(p2CardX, CARD_CENTER_Y, CARD_WIDTH + 24, CARD_HEIGHT + 24);
    p2Glow.setStrokeStyle(4, 0xff4444);
    p2Glow.setFillStyle(0xff4444, 0.08);
    this.selectionGroup.add(p2Glow);

    // P2 label
    const p2LabelText = this.mode === 'cpu' ? 'CPU' : (this.p2Confirmed ? 'P2 READY!' : 'P2');
    const p2Label = this.add.text(p2CardX, CARD_CENTER_Y - CARD_HEIGHT / 2 - 18, p2LabelText, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.selectionGroup.add(p2Label);

    if (!this.p2Confirmed && this.mode === 'local2p') {
      this.tweens.add({
        targets: p2Glow,
        alpha: 0.4,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }

    // Controls hint at bottom
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12,
      'A/D: Select | SPACE: Confirm | ESC: Back', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.selectionGroup.add(hint);
  }

  private navigate(player: number, direction: number): void {
    if (player === 1 && !this.p1Confirmed) {
      this.p1Selection = (this.p1Selection + direction + this.characterIds.length) % this.characterIds.length;
      this.updateBackground();
    } else if (player === 2 && !this.p2Confirmed) {
      this.p2Selection = (this.p2Selection + direction + this.characterIds.length) % this.characterIds.length;
    }
    this.drawSelectionIndicators();
  }

  private confirm(player: number): void {
    if (player === 1) this.p1Confirmed = true;
    if (player === 2) this.p2Confirmed = true;

    if (this.mode === 'cpu') {
      this.p2Confirmed = true;
    }

    this.drawSelectionIndicators();

    // Hide "PRESS START" once both confirmed
    if (this.p1Confirmed && this.p2Confirmed && this.pressStartText) {
      this.pressStartTween?.stop();
      this.pressStartText.setVisible(false);
    }

    if (this.p1Confirmed && this.p2Confirmed) {
      this.time.delayedCall(300, () => {
        this.scene.start(SCENE_GAME, {
          mode: this.mode,
          p1CharacterId: this.characterIds[this.p1Selection],
          p2CharacterId: this.characterIds[this.p2Selection],
        });
      });
    }
  }

  private goBack(): void {
    if (this.p1Confirmed || this.p2Confirmed) {
      this.p1Confirmed = false;
      this.p2Confirmed = false;
      if (this.pressStartText) this.pressStartText.setVisible(true);
      if (this.pressStartTween) this.pressStartTween.resume();
      this.drawSelectionIndicators();
    } else {
      this.scene.start(SCENE_MENU);
    }
  }
}
