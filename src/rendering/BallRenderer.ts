import Phaser from 'phaser';
import { BallSim } from '../simulation/BallSim';
import { BALL_RADIUS } from '../config/Constants';

export class BallRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image | null = null;
  hidden: boolean = false; // hide when dribble animation includes the ball

  constructor(private scene: Phaser.Scene, private ball: BallSim) {
    this.shadow = scene.add.graphics().setDepth(5);
    this.graphics = scene.add.graphics().setDepth(50);

    // Use basketball sprite if the cropped frame exists
    const tex = scene.textures.get('basketball');
    if (tex && tex.has('ball')) {
      this.sprite = scene.add.image(0, 0, 'basketball', 'ball');
      const diameter = BALL_RADIUS * 2;
      this.sprite.setDisplaySize(diameter, diameter);
      this.sprite.setDepth(50);
      this.sprite.setVisible(false);
    }
  }

  update(): void {
    const b = this.ball;

    this.graphics.clear();
    this.shadow.clear();
    if (this.sprite) this.sprite.setVisible(false);

    if (b.state === 'dead') return;
    if (this.hidden) return;

    // Draw Y: position.y minus displayHeight
    const drawY = b.position.y - b.displayHeight;

    // Shadow on the ground (only when ball is elevated above ground)
    if (b.displayHeight > 5) {
      const shadowAlpha = Math.min(0.35, 0.35 * (1 - b.displayHeight / 300));
      const shadowScale = Math.max(0.5, 1 - b.displayHeight / 400);
      this.shadow.fillStyle(0x000000, shadowAlpha);
      this.shadow.fillEllipse(b.position.x, b.position.y + 3, BALL_RADIUS * 2 * shadowScale, BALL_RADIUS * shadowScale);
    }

    // Ball depth: high when in flight arc, lower when near/below rim
    let depth = 15;
    if (b.state === 'flight' && b.displayHeight > 30) {
      depth = 50;
    } else if (b.state === 'dropping' && b.displayHeight < 0) {
      depth = 8;
    }
    this.graphics.setDepth(depth);

    // Fade out slightly as ball drops through the net
    let alpha = 1;
    if (b.state === 'dropping' && b.displayHeight < -20) {
      alpha = Math.max(0.2, 1 + b.displayHeight / 40);
    }

    if (this.sprite) {
      // Render basketball sprite
      this.sprite.setVisible(true);
      this.sprite.setPosition(b.position.x, drawY);
      this.sprite.setDepth(depth);
      this.sprite.setAlpha(alpha);
    } else {
      // Fallback: drawn circle
      this.graphics.fillStyle(0xff8800, alpha);
      this.graphics.fillCircle(b.position.x, drawY, BALL_RADIUS);
      this.graphics.lineStyle(1.5, 0x663300, 0.8 * alpha);
      this.graphics.strokeCircle(b.position.x, drawY, BALL_RADIUS);

      this.graphics.lineStyle(1, 0x663300, 0.4 * alpha);
      this.graphics.lineBetween(
        b.position.x - BALL_RADIUS, drawY,
        b.position.x + BALL_RADIUS, drawY,
      );
      this.graphics.lineBetween(
        b.position.x, drawY - BALL_RADIUS,
        b.position.x, drawY + BALL_RADIUS,
      );
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
    this.sprite?.destroy();
  }
}
