import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_GAME, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS } from '../data/Characters';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private p1Confirmed = false;
  private p2Confirmed = false;
  private characterIds = Object.keys(CHARACTERS);
  private cardGroup!: Phaser.GameObjects.Group;

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
    this.cardGroup = this.add.group();

    // Background
    if (this.textures.exists('playerselect-bg')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'playerselect-bg');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setAlpha(0.5);
    }

    // Dark overlay for readability
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.4);

    this.add.text(GAME_WIDTH / 2, 35, 'SOUL JAM', {
      fontSize: '42px',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 72, '16-BIT EDITION', {
      fontSize: '18px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.drawCharacterCards();

    // Blinking press space
    const pressText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 35, '.. PRESS SPACE ..', {
      fontSize: '18px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.tweens.add({ targets: pressText, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 15, 'A/D to select | ESC to go back', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);

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

  private drawCharacterCards(): void {
    // Clear previous cards
    this.cardGroup.clear(true, true);

    const ratingLabels = ['SPEED', 'POWER', 'RANGE', 'DEFENSE', 'STEAL', 'CLUTCH ENERGY'];

    this.characterIds.forEach((id, i) => {
      const char = CHARACTERS[id];
      const isLeft = i === 0;
      const x = isLeft ? GAME_WIDTH * 0.28 : GAME_WIDTH * 0.72;
      const cardY = GAME_HEIGHT / 2 + 20;
      const cardW = 260;
      const cardH = 420;

      const isP1 = this.p1Selection === i;
      const isP2 = this.p2Selection === i;

      // Card frame - gold/cyan border like the design
      const frameColor = isLeft ? 0x00cccc : 0xccaa00;
      const frame = this.add.rectangle(x, cardY, cardW + 8, cardH + 8);
      frame.setStrokeStyle(4, frameColor);
      this.cardGroup.add(frame);

      // Card background
      const bg = this.add.rectangle(x, cardY, cardW, cardH, 0x111122, 0.95);
      this.cardGroup.add(bg);

      // Selection glow
      if (isP1) {
        const glow = this.add.rectangle(x, cardY, cardW + 14, cardH + 14);
        glow.setStrokeStyle(3, 0x00aaff);
        this.cardGroup.add(glow);
      }
      if (isP2) {
        const glow = this.add.rectangle(x, cardY, cardW + 18, cardH + 18);
        glow.setStrokeStyle(3, 0xff4444);
        this.cardGroup.add(glow);
      }

      // Character portrait
      if (this.textures.exists(char.spriteKey)) {
        const portrait = this.add.image(x, cardY - 95, char.spriteKey);
        // Scale to fit in card, maintaining aspect ratio
        const maxW = cardW - 20;
        const maxH = 180;
        const scale = Math.min(maxW / portrait.width, maxH / portrait.height);
        portrait.setScale(scale);
        this.cardGroup.add(portrait);
      } else {
        const placeholder = this.add.rectangle(x, cardY - 95, 100, 120, char.color);
        this.cardGroup.add(placeholder);
      }

      // Name
      const nameText = this.add.text(x, cardY + 10, char.name, {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.cardGroup.add(nameText);

      // Title
      const titleText = this.add.text(x, cardY + 35, char.title, {
        fontSize: '14px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.cardGroup.add(titleText);

      // Rating bars - NBA Jam style
      const ratings = char.ratings;
      const ratingValues = [
        ratings.speed, ratings.power, ratings.range,
        ratings.defense, ratings.steal, ratings.clutchEnergy,
      ];

      const barStartY = cardY + 58;
      ratingLabels.forEach((label, ri) => {
        const ry = barStartY + ri * 22;
        const val = ratingValues[ri];

        const lbl = this.add.text(x - 115, ry, label, {
          fontSize: '11px',
          color: '#999999',
          fontStyle: 'bold',
        });
        this.cardGroup.add(lbl);

        // Bar segments (like the pixel art design)
        const barX = x + 15;
        const totalSegments = 10;
        const filledSegments = Math.round(val / 10);
        for (let s = 0; s < totalSegments; s++) {
          const segX = barX + s * 11;
          const filled = s < filledSegments;
          const seg = this.add.rectangle(segX, ry + 5, 9, 10,
            filled ? (val >= 80 ? 0x44ff44 : val >= 60 ? 0xffaa00 : 0xff4444) : 0x333333,
          );
          this.cardGroup.add(seg);
        }
      });

      // Selection label
      if (isP1) {
        const label = this.add.text(x, cardY - 200, this.p1Confirmed ? 'P1 READY!' : 'P1', {
          fontSize: '20px',
          color: '#00aaff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5);
        this.cardGroup.add(label);
      }
      if (isP2) {
        const p2label = this.mode === 'cpu' ? 'CPU' : (this.p2Confirmed ? 'P2 READY!' : 'P2');
        const label = this.add.text(x, cardY - 200, p2label, {
          fontSize: '20px',
          color: '#ff4444',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5);
        this.cardGroup.add(label);
      }
    });
  }

  private navigate(player: number, direction: number): void {
    if (player === 1 && !this.p1Confirmed) {
      this.p1Selection = (this.p1Selection + direction + this.characterIds.length) % this.characterIds.length;
    } else if (player === 2 && !this.p2Confirmed) {
      this.p2Selection = (this.p2Selection + direction + this.characterIds.length) % this.characterIds.length;
    }
    this.drawCharacterCards();
  }

  private confirm(player: number): void {
    if (player === 1) this.p1Confirmed = true;
    if (player === 2) this.p2Confirmed = true;

    if (this.mode === 'cpu') {
      this.p2Confirmed = true;
    }

    this.drawCharacterCards();

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
      this.drawCharacterCards();
    } else {
      this.scene.start(SCENE_MENU);
    }
  }
}
