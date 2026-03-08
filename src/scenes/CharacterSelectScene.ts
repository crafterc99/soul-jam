import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_GAME, SCENE_BOOT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS } from '../data/Characters';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

// Map character IDs to their player-select background keys
const SELECT_BG_KEYS: Record<string, string> = {
  ninetynine: 'select-99',
  breezy: 'select-breezy',
};

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private characterIds = Object.keys(CHARACTERS);
  private bgImage: Phaser.GameObjects.Image | null = null;
  private gamepadNavTimer = 0;

  constructor() {
    super({ key: SCENE_CHARACTER_SELECT });
  }

  init(data: SceneData): void {
    this.mode = data.mode;
    // Default to Breezy (index 1) since she has all the animations
    const breezyIdx = this.characterIds.indexOf('breezy');
    this.p1Selection = breezyIdx >= 0 ? breezyIdx : 0;
    this.p2Selection = (this.p1Selection + 1) % this.characterIds.length;
  }

  create(): void {
    // Player select background — swaps based on selection
    this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playerselect-bg');
    this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.updateBackground();

    // Blinking "PRESS START"
    const pressStart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.92, 'PRESS START', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffcc00',
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

    // Controls hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'A/D or Stick: Select | SPACE or A Button: Start | ESC or B: Back', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
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
      if (button.index === 0) this.confirm();           // A = confirm
      if (button.index === 1) this.scene.start(SCENE_BOOT); // B = back
      if (button.index === 14) this.navigate(-1);       // D-pad left
      if (button.index === 15) this.navigate(1);        // D-pad right
    });

    // Gamepad stick navigation (with debounce)
    this.gamepadNavTimer = 0;
  }

  private updateBackground(): void {
    const selectedCharId = this.characterIds[this.p1Selection];
    const bgKey = SELECT_BG_KEYS[selectedCharId];
    if (bgKey && this.textures.exists(bgKey) && this.bgImage) {
      this.bgImage.setTexture(bgKey);
      this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
  }

  update(_time: number, delta: number): void {
    // Gamepad stick navigation with debounce
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
    // P2 gets the other character in CPU mode
    this.p2Selection = (this.p1Selection + 1) % this.characterIds.length;
    this.updateBackground();
  }

  private confirm(): void {
    this.scene.start(SCENE_GAME, {
      mode: this.mode,
      p1CharacterId: this.characterIds[this.p1Selection],
      p2CharacterId: this.characterIds[this.p2Selection],
    });
  }
}
