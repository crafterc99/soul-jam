import Phaser from 'phaser';
import { BallSim } from '../simulation/BallSim';
import { HOOP_X, HOOP_Y, NET_BOTTOM_Y } from '../config/Constants';

// Net string geometry (relative to HOOP_X, HOOP_Y)
const NET_STRINGS = 5;
const NET_CROSS = 2;
const TOP_HALF_W = 17;   // half-width of net at rim level
const BOT_HALF_W = 7;    // half-width at net bottom
const NET_TOP_DY = 5;    // y offset from HOOP_Y to top of strings (just inside rim ring)
const NET_BOT_DY = (NET_BOTTOM_Y - HOOP_Y) + 3; // how far strings hang

// Animation durations match ball physics phases
const SCORE_DUR = 0.57; // matches dropping phase (0.55s) with slight tail
const MISS_DUR  = 0.45; // quick shake

type NetAnimState = 'idle' | 'score' | 'miss';

export class NetRenderer {
  private g: Phaser.GameObjects.Graphics;
  private animState: NetAnimState = 'idle';
  private animTimer = 0;
  private prevBallState = '';

  constructor(private scene: Phaser.Scene, private ball: BallSim) {
    this.g = scene.add.graphics();
    this.g.setDepth(9); // above dropping ball (8), below players (10+)
    this.render(0, 0, 0, 0.35); // idle: subtle visible net overlay
  }

  update(dt: number): void {
    const state = this.ball.state;

    // Detect ball landing transitions
    if (this.prevBallState === 'flight' && state === 'dropping') {
      this.animState = 'score';
      this.animTimer = 0;
    } else if (this.prevBallState === 'flight' && state === 'rimBounce') {
      this.animState = 'miss';
      this.animTimer = 0;
    }
    this.prevBallState = state;

    // Advance timer, return to idle
    if (this.animState !== 'idle') {
      this.animTimer += dt;
      const dur = this.animState === 'score' ? SCORE_DUR : MISS_DUR;
      if (this.animTimer >= dur) {
        this.animState = 'idle';
        this.animTimer = 0;
      }
    }

    // Compute animation displacement
    let bulgeX = 0;
    let bulgeY = 0;
    let shakeX = 0;
    let alpha = 0.35;

    if (this.animState === 'score') {
      const t = this.animTimer / SCORE_DUR;
      // Billow: swell out and down, then snap back with a secondary ripple
      const billow = Math.sin(t * Math.PI) + Math.sin(t * Math.PI * 2) * 0.25;
      bulgeX = billow * 9;
      bulgeY = billow * 8;
      // Fade in quickly, fade out gently
      alpha = 0.35 + 0.55 * Math.min(t * 5, 1) * Math.min((1 - t) * 4, 1);
    } else if (this.animState === 'miss') {
      const t = this.animTimer / MISS_DUR;
      // Quick lateral shake, exponentially damped
      shakeX = Math.sin(t * Math.PI * 4.5) * 6 * Math.exp(-t * 5);
      alpha = 0.35 + 0.45 * Math.min(t * 6, 1) * Math.min((1 - t) * 5, 1);
    }

    this.g.clear();
    this.render(bulgeX, bulgeY, shakeX, alpha);
  }

  private render(bulgeX: number, bulgeY: number, shakeX: number, alpha: number): void {
    const cx  = HOOP_X;
    const topY = HOOP_Y + NET_TOP_DY;
    const botY = HOOP_Y + NET_BOT_DY + bulgeY;

    // --- Vertical strings ---
    this.g.lineStyle(1.5, 0xffffff, alpha);

    for (let i = 0; i < NET_STRINGS; i++) {
      const frac = i / (NET_STRINGS - 1);   // 0..1
      const side = (frac - 0.5) * 2;         // -1..1

      const topX = cx + shakeX + side * TOP_HALF_W;
      const midX = cx + shakeX * 0.5 + side * (TOP_HALF_W + bulgeX);
      const midY = topY + (botY - topY) * 0.45;
      const botX = cx + shakeX * 0.15 + side * (BOT_HALF_W + bulgeX * 0.25);

      this.g.beginPath();
      this.g.moveTo(topX, topY);
      this.g.lineTo(midX, midY);
      this.g.lineTo(botX, botY);
      this.g.strokePath();
    }

    // --- Horizontal cross-strings ---
    this.g.lineStyle(1, 0xffffff, alpha * 0.6);

    for (let j = 0; j < NET_CROSS; j++) {
      const t = (j + 1) / (NET_CROSS + 1); // 0.33, 0.67
      // Width interpolated + outward bulge peaks in the middle of the net height
      const halfW = TOP_HALF_W * (1 - t) + BOT_HALF_W * t + bulgeX * t * (1 - t) * 4;
      const crossY = topY + (botY - topY) * t;
      this.g.lineBetween(cx + shakeX - halfW, crossY, cx + shakeX + halfW, crossY);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
