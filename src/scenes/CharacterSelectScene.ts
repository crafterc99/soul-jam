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
  private activePlayer = 1; // which player is currently selecting (1 or 2)
  private p1Confirmed = false;
  private p2Confirmed = false;
  private characterIds = Object.keys(CHARACTERS);

  constructor() {
    super({ key: SCENE_CHARACTER_SELECT });
  }

  init(data: SceneData): void {
    this.mode = data.mode;
    this.p1Selection = 0;
    this.p2Selection = Math.min(1, this.characterIds.length - 1);
    this.activePlayer = 1;
    this.p1Confirmed = false;
    this.p2Confirmed = false;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 40, 'SELECT YOUR PLAYER', {
      fontSize: '36px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 80, this.mode === 'cpu' ? 'VS CPU' : 'LOCAL 2P', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    this.drawCharacterCards();

    // P1 controls (WASD)
    this.input.keyboard?.on('keydown-A', () => this.navigate(1, -1));
    this.input.keyboard?.on('keydown-D', () => this.navigate(1, 1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm(1));
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    // P2 controls (arrows) - only in local 2p
    if (this.mode === 'local2p') {
      this.input.keyboard?.on('keydown-LEFT', () => this.navigate(2, -1));
      this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(2, 1));
      this.input.keyboard?.on('keydown-ENTER', () => this.confirm(2));
    }

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'ESC - Back', {
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private drawCharacterCards(): void {
    // Clear previous cards
    this.children.getAll().filter(c => (c as any).__card).forEach(c => c.destroy());

    const cardWidth = 240;
    const cardHeight = 350;
    const startX = GAME_WIDTH / 2 - (this.characterIds.length * (cardWidth + 40)) / 2 + cardWidth / 2 + 20;
    const cardY = GAME_HEIGHT / 2 + 10;

    this.characterIds.forEach((id, i) => {
      const char = CHARACTERS[id];
      const x = startX + i * (cardWidth + 40);

      const isP1 = this.p1Selection === i;
      const isP2 = this.p2Selection === i;

      // Card background
      const bg = this.add.rectangle(x, cardY, cardWidth, cardHeight, 0x222244, 0.9);
      (bg as any).__card = true;

      if (isP1) {
        const border = this.add.rectangle(x, cardY, cardWidth + 6, cardHeight + 6);
        border.setStrokeStyle(3, 0x00aaff);
        (border as any).__card = true;
      }
      if (isP2) {
        const border = this.add.rectangle(x, cardY, cardWidth + 12, cardHeight + 12);
        border.setStrokeStyle(3, 0xff4444);
        (border as any).__card = true;
      }

      // Character name
      const nameText = this.add.text(x, cardY - 140, char.name, {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      (nameText as any).__card = true;

      // Placeholder avatar
      const avatar = this.add.rectangle(x, cardY - 70, 80, 80, char.color);
      (avatar as any).__card = true;

      // Ratings
      const ratings = char.ratings;
      const ratingLabels = ['SPD', 'ACC', 'HND', 'SHT', 'DEF', 'LAT', 'RES'];
      const ratingValues = [
        ratings.speed, ratings.acceleration, ratings.ballHandle, ratings.shotRating,
        ratings.defense, ratings.lateralQuickness, ratings.contestResistance,
      ];

      ratingLabels.forEach((label, ri) => {
        const ry = cardY - 15 + ri * 26;
        const labelText = this.add.text(x - 90, ry, label, {
          fontSize: '14px',
          color: '#aaaaaa',
        });
        (labelText as any).__card = true;

        const val = ratingValues[ri];
        const barBg = this.add.rectangle(x + 10, ry + 7, 100, 10, 0x333333);
        (barBg as any).__card = true;
        const barFill = this.add.rectangle(
          x + 10 - 50 + (val / 100 * 100) / 2, ry + 7,
          val / 100 * 100, 10,
          val >= 80 ? 0x44ff44 : val >= 60 ? 0xffaa00 : 0xff4444
        );
        (barFill as any).__card = true;

        const valText = this.add.text(x + 70, ry, `${val}`, {
          fontSize: '14px',
          color: '#ffffff',
        });
        (valText as any).__card = true;
      });

      // Selection indicators
      if (isP1) {
        const p1Label = this.add.text(x - 40, cardY + 155, this.p1Confirmed ? 'P1 READY' : 'P1', {
          fontSize: '18px',
          color: '#00aaff',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        (p1Label as any).__card = true;
      }
      if (isP2) {
        const p2Label = this.add.text(x + 40, cardY + 155, this.p2Confirmed ? 'P2 READY' : 'P2', {
          fontSize: '18px',
          color: '#ff4444',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        (p2Label as any).__card = true;
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
      // In CPU mode, auto-confirm P2
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
