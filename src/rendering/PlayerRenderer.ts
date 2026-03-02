import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private stateText: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSim,
    private label: string,
  ) {
    this.graphics = scene.add.graphics();
    this.nameText = scene.add.text(0, 0, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.stateText = scene.add.text(0, 0, '', {
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  update(): void {
    const p = this.player;
    const g = this.graphics;

    g.clear();

    // Draw player body
    let bodyColor = p.color;
    let alpha = 1;

    // Visual feedback based on state
    if (p.fsm.isInState(PLAYER_STATE.DEFENDING)) {
      // Wider stance indicator
      g.lineStyle(2, 0xffff00, 0.6);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 6);
    }

    if (p.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      bodyColor = 0xffaa00;
    }

    if (p.fsm.isInState(PLAYER_STATE.STEPBACK)) {
      alpha = 0.8;
    }

    // Player circle
    g.fillStyle(bodyColor, alpha);
    g.fillCircle(p.position.x, p.position.y, PLAYER_RADIUS);

    // Outline
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS);

    // Facing direction indicator
    const dirX = Math.cos(p.facingAngle) * PLAYER_RADIUS;
    const dirY = Math.sin(p.facingAngle) * PLAYER_RADIUS;
    g.lineStyle(2, 0xffffff, 0.8);
    g.lineBetween(p.position.x, p.position.y, p.position.x + dirX, p.position.y + dirY);

    // Ball possession indicator
    if (p.hasBall) {
      g.lineStyle(2, 0xff6600, 0.8);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 3);
    }

    // Name label
    this.nameText.setPosition(p.position.x, p.position.y - PLAYER_RADIUS - 15);

    // State label (debug)
    this.stateText.setPosition(p.position.x, p.position.y + PLAYER_RADIUS + 10);
    this.stateText.setText(p.stateName);
  }

  destroy(): void {
    this.graphics.destroy();
    this.nameText.destroy();
    this.stateText.destroy();
  }
}
