import Phaser from 'phaser';
import { HoopSkinDef } from '../data/skins/types';
import { BallSim } from '../simulation/BallSim';
import { HOOP_X, HOOP_Y } from '../config/Constants';

/**
 * Procedural hoop renderer — draws the full goal (gooseneck pole, support
 * struts, perspective backboard with glass + shooter's square, mount bracket
 * and the orange rim ring) as vector graphics instead of relying on the hoop
 * baked into the court image. Every part is drawn from the GEO table below
 * (coordinates measured off the reference art in a 1920x1080 space, anchored
 * at the rim center), so each piece can be animated independently.
 *
 * The net itself stays in NetRenderer, which already animates with the ball.
 * The rim ring lives on its own Graphics object and flexes on score
 * (dips + springs back) and rattles on miss, mirroring NetRenderer's
 * ball-state transitions.
 */

// Reference-space anchor: rim ring center in the 1920x1080 source art
const REF_RIM = { x: 1148, y: 430 };
// Reference → game scale (rim rx 96px → ~22px, matching NetRenderer's net width)
const STRUCTURE_SCALE = 0.23;

// Rim ring geometry (reference space)
const RIM_RX = 96;
const RIM_RY = 36;
const RIM_TILT_DEG = -7;

// Palette measured off the reference art (border/pole/rim fall back to these
// when the skin doesn't override them)
const PALETTE = {
  poleLight: 0x7a818d,
  poleDark: 0x3a3f48,
  boardDark: 0xb53e22,
  glass: 0xcfe9f5,
  glassShade: 0xaed6e9,
  rimDark: 0xc75d18,
};

// Animation durations matched to NetRenderer / ball physics phases
const SCORE_DUR = 0.57;
const MISS_DUR = 0.45;

type RimAnimState = 'idle' | 'score' | 'miss';

export class HoopRenderer {
  private structure: Phaser.GameObjects.Graphics;
  private rim: Phaser.GameObjects.Graphics;

  private animState: RimAnimState = 'idle';
  private animTimer = 0;
  private prevBallState = '';

  constructor(
    private scene: Phaser.Scene,
    private skin: HoopSkinDef,
    private ball?: BallSim,
  ) {
    // Static structure: behind shadows (5), ball (8+) and players (10+)
    this.structure = scene.add.graphics();
    this.structure.setDepth(4);
    this.drawStructure();

    // Rim ring: same layer as the net — above the dropping ball, below players
    this.rim = scene.add.graphics({ x: HOOP_X, y: HOOP_Y });
    this.rim.setDepth(9.2);
    this.rim.setRotation(Phaser.Math.DegToRad(RIM_TILT_DEG));
    this.drawRim();
  }

  /** Map a reference-art point to game coordinates (rim center → HOOP_X/Y) */
  private pt(rx: number, ry: number): Phaser.Types.Math.Vector2Like {
    return {
      x: HOOP_X + (rx - REF_RIM.x) * STRUCTURE_SCALE,
      y: HOOP_Y + (ry - REF_RIM.y) * STRUCTURE_SCALE,
    };
  }

  private poly(points: number[][]): Phaser.Types.Math.Vector2Like[] {
    return points.map(([x, y]) => this.pt(x, y));
  }

  private drawStructure(): void {
    const g = this.structure;
    const s = STRUCTURE_SCALE;
    const pole = this.skin.colors.stanchion;
    const border = this.skin.colors.backboard;

    g.clear();

    // ── Pole: vertical shaft + horizontal arm with mitred elbow ──
    const poleFace = this.poly([
      [668, 1060], [668, 490], [700, 430], [905, 430],
      [905, 478], [730, 478], [718, 500], [718, 1060],
    ]);
    g.fillStyle(pole, 1);
    g.fillPoints(poleFace, true);
    g.lineStyle(6 * s, PALETTE.poleDark, 1);
    g.strokePoints(poleFace, true, true);
    // shaft highlight + arm underside shadow
    g.fillStyle(PALETTE.poleLight, 0.55);
    g.fillPoints(this.poly([[700, 1060], [700, 505], [718, 505], [718, 1060]]), true);
    g.fillStyle(PALETTE.poleDark, 0.45);
    g.fillPoints(this.poly([[730, 478], [905, 478], [905, 462], [730, 462]]), true);

    // ── Support struts (elbow → back of the backboard top) ──
    g.lineStyle(11 * s, PALETTE.poleDark, 1);
    const s1a = this.pt(762, 432); const s1b = this.pt(884, 196);
    const s2a = this.pt(790, 448); const s2b = this.pt(892, 252);
    g.lineBetween(s1a.x!, s1a.y!, s1b.x!, s1b.y!);
    g.lineBetween(s2a.x!, s2a.y!, s2b.x!, s2b.y!);

    // ── Backboard (3/4 view — right edge nearest the viewer) ──
    // depth faces (left edge + bottom)
    g.fillStyle(PALETTE.boardDark, 1);
    g.fillPoints(this.poly([[880, 170], [858, 182], [860, 556], [882, 540]]), true);
    g.fillPoints(this.poly([[882, 540], [860, 556], [1086, 608], [1105, 590]]), true);
    // right-side depth tab (sliver behind the rim bracket)
    g.fillStyle(border, 1);
    g.fillPoints(this.poly([[1095, 45], [1123, 62], [1133, 575], [1105, 590]]), true);
    g.fillStyle(0x000000, 0.18);
    g.fillPoints(this.poly([[1095, 45], [1123, 62], [1133, 575], [1105, 590]]), true);
    // front face border
    g.fillStyle(border, 1);
    g.fillPoints(this.poly([[880, 170], [1095, 45], [1105, 590], [882, 540]]), true);
    // glass
    g.fillStyle(PALETTE.glass, 1);
    g.fillPoints(this.poly([[901, 180], [1074, 80], [1083, 560], [903, 520]]), true);
    g.fillStyle(PALETTE.glassShade, 0.5);
    g.fillPoints(this.poly([[901, 180], [1074, 80], [1080, 300], [902, 330]]), true);
    // diagonal shine streaks
    g.fillStyle(0xffffff, 0.65);
    g.fillPoints(this.poly([[955, 170], [990, 150], [935, 505], [915, 500]]), true);
    g.fillStyle(0xffffff, 0.5);
    g.fillPoints(this.poly([[1010, 140], [1026, 131], [975, 512], [962, 509]]), true);
    // inner shooter's square
    g.lineStyle(14 * s, this.skin.colors.rim, 1);
    g.strokePoints(this.poly([[962, 302], [1042, 262], [1046, 468], [966, 452]]), true, true);

    // ── Rim mount bracket (glass → rim) ──
    const bracket = this.poly([[1046, 420], [1076, 408], [1076, 468], [1046, 470]]);
    g.fillStyle(this.skin.colors.rim, 1);
    g.fillPoints(bracket, true);
    g.lineStyle(5 * s, PALETTE.rimDark, 1);
    g.strokePoints(bracket, true, true);
    const bolt = this.pt(1061, 442);
    g.fillStyle(PALETTE.rimDark, 1);
    g.fillCircle(bolt.x!, bolt.y!, 9 * s);
  }

  private drawRim(dipY = 0): void {
    const g = this.rim;
    const s = STRUCTURE_SCALE;
    const w = RIM_RX * 2 * s;
    const h = RIM_RY * 2 * s;

    g.clear();
    g.lineStyle(22 * s, PALETTE.rimDark, 1);
    g.strokeEllipse(0, dipY, w, h);
    g.lineStyle(14 * s, this.skin.colors.rim, 1);
    g.strokeEllipse(0, dipY, w, h);
  }

  update(dt = 0): void {
    if (!this.ball) return;
    const state = this.ball.state;

    // Same transitions NetRenderer reacts to
    if (this.prevBallState === 'flight' && state === 'dropping') {
      this.animState = 'score';
      this.animTimer = 0;
    } else if (this.prevBallState === 'flight' && state === 'rimBounce') {
      this.animState = 'miss';
      this.animTimer = 0;
    }
    this.prevBallState = state;

    if (this.animState === 'idle') return;

    this.animTimer += dt;
    const dur = this.animState === 'score' ? SCORE_DUR : MISS_DUR;
    if (this.animTimer >= dur) {
      this.animState = 'idle';
      this.animTimer = 0;
      this.rim.setRotation(Phaser.Math.DegToRad(RIM_TILT_DEG));
      this.drawRim(0);
      return;
    }

    const t = this.animTimer / dur;
    if (this.animState === 'score') {
      // Rim dips under the ball and springs back (same billow curve as the net)
      const billow = Math.sin(t * Math.PI) + Math.sin(t * Math.PI * 2) * 0.25;
      this.rim.setRotation(Phaser.Math.DegToRad(RIM_TILT_DEG + billow * 4));
      this.drawRim(billow * 2.5);
    } else {
      // Miss: quick damped rattle
      const rattle = Math.sin(t * Math.PI * 4.5) * Math.exp(-t * 5);
      this.rim.setRotation(Phaser.Math.DegToRad(RIM_TILT_DEG + rattle * 3));
      this.drawRim(0);
    }
  }

  destroy(): void {
    this.structure.destroy();
    this.rim.destroy();
  }
}
