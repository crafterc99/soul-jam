import Phaser from 'phaser';
import { BallSim } from '../simulation/BallSim';
import { BALL_RADIUS } from '../config/Constants';

export class BallRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private ball: BallSim) {
    this.shadow = scene.add.graphics();
    this.graphics = scene.add.graphics();
  }

  update(): void {
    const b = this.ball;

    this.graphics.clear();
    this.shadow.clear();

    // Draw shadow on ground
    if (b.displayHeight > 0) {
      const shadowScale = 1 - (b.displayHeight / 200) * 0.3;
      this.shadow.fillStyle(0x000000, 0.3);
      this.shadow.fillEllipse(b.position.x, b.position.y, BALL_RADIUS * 2 * shadowScale, BALL_RADIUS * shadowScale);
    }

    // Draw ball (elevated by displayHeight)
    const drawY = b.position.y - b.displayHeight;
    this.graphics.fillStyle(0xff8800, 1);
    this.graphics.fillCircle(b.position.x, drawY, BALL_RADIUS);
    this.graphics.lineStyle(1.5, 0x663300, 0.8);
    this.graphics.strokeCircle(b.position.x, drawY, BALL_RADIUS);

    // Ball stripes
    this.graphics.lineStyle(1, 0x663300, 0.4);
    this.graphics.lineBetween(
      b.position.x - BALL_RADIUS, drawY,
      b.position.x + BALL_RADIUS, drawY,
    );
    this.graphics.lineBetween(
      b.position.x, drawY - BALL_RADIUS,
      b.position.x, drawY + BALL_RADIUS,
    );
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
  }
}
