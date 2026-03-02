import Phaser from 'phaser';
import { CourtSim } from '../simulation/CourtSim';
import {
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  HOOP_X, HOOP_Y, THREE_POINT_RADIUS,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config/Constants';

export class CourtRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.drawCourt();
  }

  private drawCourt(): void {
    const g = this.graphics;

    // Court floor
    g.fillStyle(0x2d5016, 1);
    g.fillRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP);

    // Court boundary lines
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRect(COURT_LEFT, COURT_TOP, COURT_RIGHT - COURT_LEFT, COURT_BOTTOM - COURT_TOP);

    // Three-point arc
    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.arc(HOOP_X, HOOP_Y, THREE_POINT_RADIUS, -Math.PI / 2, Math.PI / 2, false);
    g.strokePath();

    // Connect arc to baseline with straight lines
    g.lineStyle(2, 0xffffff, 0.6);
    g.lineBetween(HOOP_X, HOOP_Y - THREE_POINT_RADIUS, COURT_RIGHT, HOOP_Y - THREE_POINT_RADIUS);
    g.lineBetween(HOOP_X, HOOP_Y + THREE_POINT_RADIUS, COURT_RIGHT, HOOP_Y + THREE_POINT_RADIUS);

    // Free throw lane
    const laneWidth = 120;
    const laneDepth = 160;
    g.lineStyle(2, 0xffffff, 0.4);
    g.strokeRect(
      COURT_RIGHT - laneDepth,
      HOOP_Y - laneWidth / 2,
      laneDepth,
      laneWidth,
    );

    // Hoop
    g.fillStyle(0xff6600, 1);
    g.fillCircle(HOOP_X, HOOP_Y, 12);
    g.lineStyle(3, 0xff4400, 1);
    g.strokeCircle(HOOP_X, HOOP_Y, 12);

    // Backboard
    g.lineStyle(4, 0xffffff, 0.9);
    g.lineBetween(HOOP_X + 20, HOOP_Y - 30, HOOP_X + 20, HOOP_Y + 30);

    // Half-court line
    g.lineStyle(2, 0xffffff, 0.3);
    g.lineBetween(COURT_LEFT, COURT_TOP, COURT_LEFT, COURT_BOTTOM);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
