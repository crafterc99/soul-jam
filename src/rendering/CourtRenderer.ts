import Phaser from 'phaser';
import {
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  HOOP_X, HOOP_Y, THREE_POINT_RADIUS,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config/Constants';

export class CourtRenderer {
  private courtImage: Phaser.GameObjects.Image | null = null;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    // Use court image if available
    if (scene.textures.exists('court')) {
      this.courtImage = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'court');
      this.courtImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    this.graphics = scene.add.graphics();

    if (!this.courtImage) {
      this.drawFallbackCourt();
    }
  }

  private drawFallbackCourt(): void {
    const g = this.graphics;

    g.fillStyle(0x2d5016, 1);
    g.fillRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP);

    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP);

    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.arc(HOOP_X, HOOP_Y, THREE_POINT_RADIUS, -Math.PI / 2, Math.PI / 2, false);
    g.strokePath();

    g.lineBetween(HOOP_X, HOOP_Y - THREE_POINT_RADIUS, COURT_RIGHT, HOOP_Y - THREE_POINT_RADIUS);
    g.lineBetween(HOOP_X, HOOP_Y + THREE_POINT_RADIUS, COURT_RIGHT, HOOP_Y + THREE_POINT_RADIUS);

    const laneWidth = 120;
    const laneDepth = 160;
    g.lineStyle(2, 0xffffff, 0.4);
    g.strokeRect(COURT_RIGHT - laneDepth, HOOP_Y - laneWidth / 2, laneDepth, laneWidth);

    g.fillStyle(0xff6600, 1);
    g.fillCircle(HOOP_X, HOOP_Y, 12);
    g.lineStyle(3, 0xff4400, 1);
    g.strokeCircle(HOOP_X, HOOP_Y, 12);

    g.lineStyle(4, 0xffffff, 0.9);
    g.lineBetween(HOOP_X + 20, HOOP_Y - 30, HOOP_X + 20, HOOP_Y + 30);
  }

  destroy(): void {
    this.courtImage?.destroy();
    this.graphics.destroy();
  }
}
