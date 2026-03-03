import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

const SPRITE_SCALE = 0.06; // scale down the full character art to game size

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image | null = null;
  private nameText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSim,
    private label: string,
    spriteKey: string,
  ) {
    this.shadow = scene.add.graphics();
    this.graphics = scene.add.graphics();

    // Try to use character sprite
    if (scene.textures.exists(spriteKey)) {
      this.sprite = scene.add.image(0, 0, spriteKey);
      this.sprite.setScale(SPRITE_SCALE);
      this.sprite.setOrigin(0.5, 0.85); // anchor near feet
    }

    this.nameText = scene.add.text(0, 0, label, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
  }

  update(): void {
    const p = this.player;
    const g = this.graphics;

    g.clear();
    this.shadow.clear();

    const isDefending = p.fsm.isInState(PLAYER_STATE.DEFENDING);
    const isShooting = p.fsm.isInState(PLAYER_STATE.SHOOTING);
    const isStepback = p.fsm.isInState(PLAYER_STATE.STEPBACK);

    // Shadow under player
    this.shadow.fillStyle(0x000000, 0.3);
    this.shadow.fillEllipse(p.position.x, p.position.y + 5, PLAYER_RADIUS * 2.2, PLAYER_RADIUS * 0.8);

    if (this.sprite) {
      // Position sprite
      this.sprite.setPosition(p.position.x, p.position.y);

      // Flip based on facing direction
      this.sprite.setFlipX(Math.cos(p.facingAngle) < 0);

      // Visual state feedback
      let scale = SPRITE_SCALE;
      let tint = 0xffffff;

      if (isDefending) {
        scale = SPRITE_SCALE * 0.95; // slight crouch
        // Yellow ring around feet
        g.lineStyle(2, 0xffff00, 0.5);
        g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);
      }

      if (isShooting) {
        scale = SPRITE_SCALE * 1.05; // slight rise
        tint = 0xffffcc;
      }

      if (isStepback) {
        this.sprite.setAlpha(0.85);
      } else {
        this.sprite.setAlpha(1);
      }

      this.sprite.setScale(scale);
      this.sprite.setTint(tint);

      // Ball possession glow
      if (p.hasBall) {
        g.lineStyle(2, 0xff6600, 0.6);
        g.strokeCircle(p.position.x, p.position.y - 15, PLAYER_RADIUS + 6);
      }
    } else {
      // Fallback: colored circle
      let bodyColor = p.color;
      if (isShooting) bodyColor = 0xffaa00;

      g.fillStyle(bodyColor, isStepback ? 0.8 : 1);
      g.fillCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS);

      if (isDefending) {
        g.lineStyle(2, 0xffff00, 0.6);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 6);
      }

      if (p.hasBall) {
        g.lineStyle(2, 0xff6600, 0.8);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 3);
      }
    }

    // Name label above head
    const spriteHeight = this.sprite ? this.sprite.displayHeight : PLAYER_RADIUS * 2;
    this.nameText.setPosition(p.position.x, p.position.y - spriteHeight * 0.5 - 8);
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
    this.sprite?.destroy();
    this.nameText.destroy();
  }
}
