import Phaser from 'phaser';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { GAME_WIDTH, GAME_HEIGHT, SHOT_TIMING_WINDOW } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';
import { HUDSkinDef } from '../data/skins/types';
import { getActiveSkin } from '../data/skins';

export class HUDRenderer {
  private scoreBackground: Phaser.GameObjects.Rectangle;
  private scoreText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
  private shotFeedback: Phaser.GameObjects.Text;
  private feedbackBackground: Phaser.GameObjects.Rectangle;
  private timingMeter: Phaser.GameObjects.Graphics;
  private controlsText: Phaser.GameObjects.Text;

  private feedbackTimer: number = 0;
  private lastScores: [number, number] = [0, 0];
  private scorePopTimer: number = 0;

  private skin: HUDSkinDef;

  constructor(private scene: Phaser.Scene, private sim: GameSimulation, hudSkin?: HUDSkinDef) {
    this.skin = hudSkin ?? getActiveSkin().hud;
    const sb = this.skin.scoreboard;
    const fb = this.skin.feedback;
    const ch = this.skin.controlsHint;

    // Dark background to cover the baked-in scoreboard in court image
    this.scoreBackground = scene.add.rectangle(
      sb.position.x, sb.position.y,
      sb.bgSize.width, sb.bgSize.height,
      sb.bgColor, sb.bgAlpha,
    ).setDepth(100);

    // Score display
    this.scoreText = scene.add.text(sb.position.x, sb.position.y, '', {
      fontSize: sb.scoreSize,
      fontFamily: sb.scoreFont,
      color: sb.scoreColor,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    // Phase text - just below scoreboard
    this.phaseText = scene.add.text(sb.position.x, sb.position.y + 32, '', {
      fontSize: sb.phaseSize,
      color: sb.phaseColors.default,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(101);

    // Feedback background
    this.feedbackBackground = scene.add.rectangle(
      fb.position.x, fb.position.y,
      fb.bgSize.width, fb.bgSize.height,
      fb.bgColor, fb.bgAlpha,
    ).setDepth(100);

    // Shot feedback
    this.shotFeedback = scene.add.text(fb.position.x, fb.position.y, '', {
      fontSize: fb.fontSize,
      fontFamily: fb.font,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    // Timing meter
    this.timingMeter = scene.add.graphics().setDepth(100);

    // Controls hint
    this.controlsText = scene.add.text(ch.position.x, ch.position.y,
      'WASD: Move | SPACE: Shoot | Q: Stepback | E: Crossover | F: Steal | SHIFT: Defend', {
      fontSize: ch.fontSize,
      color: ch.color,
    }).setOrigin(0.5).setDepth(101);
  }

  update(dt: number): void {
    const snap = this.sim.getSnapshot();
    const sb = this.skin.scoreboard;
    const fb = this.skin.feedback;
    const tm = this.skin.timingMeter;

    // Score with pop animation on change
    const scoresChanged =
      snap.scores[0] !== this.lastScores[0] || snap.scores[1] !== this.lastScores[1];
    if (scoresChanged) {
      this.scorePopTimer = 0.25;
      this.lastScores = [...snap.scores] as [number, number];
    }

    if (this.scorePopTimer > 0) {
      this.scorePopTimer -= dt;
      const popScale = 1 + this.scorePopTimer * 0.6;
      this.scoreText.setScale(popScale);
      this.scoreText.setColor(sb.scorePopColor);
    } else {
      this.scoreText.setScale(1);
      this.scoreText.setColor(sb.scoreColor);
    }
    this.scoreText.setText(`${snap.scores[0]}  -  ${snap.scores[1]}`);

    // Phase text with contextual color
    let phaseLabel = '';
    let phaseColor = sb.phaseColors.default;
    switch (snap.phase) {
      case GamePhase.CheckBall:
        if (this.sim.lastStealResult === 'success') {
          phaseLabel = 'STOLEN!';
          phaseColor = sb.phaseColors.stolen;
        } else {
          phaseLabel = 'CHECK BALL';
        }
        break;
      case GamePhase.Inbound: phaseLabel = 'INBOUND'; break;
      case GamePhase.Live: phaseLabel = ''; break;
      case GamePhase.Shooting: phaseLabel = ''; break;
      case GamePhase.Scored:
        phaseLabel = `SCORED! +${this.sim.lastShotPoints}`;
        phaseColor = sb.phaseColors.scored;
        break;
      case GamePhase.Missed:
        phaseLabel = 'MISS!';
        phaseColor = sb.phaseColors.missed;
        break;
      case GamePhase.Violation:
        phaseLabel = 'OUT OF BOUNDS';
        phaseColor = sb.phaseColors.violation;
        break;
      case GamePhase.GameOver: {
        const winner = this.sim.scoreKeeper.getWinner();
        phaseLabel = winner !== null ? `PLAYER ${winner + 1} WINS!` : 'GAME OVER';
        phaseColor = sb.phaseColors.gameOver;
        break;
      }
    }
    this.phaseText.setText(phaseLabel);
    this.phaseText.setColor(phaseColor);

    // Shot feedback in the feedback bar area
    this.feedbackTimer -= dt;
    if (this.feedbackTimer <= 0) {
      this.shotFeedback.setText('');
      this.feedbackBackground.setAlpha(0);
    }

    // Shot result feedback
    if (snap.phase === GamePhase.Scored || snap.phase === GamePhase.Missed) {
      if (this.feedbackTimer <= 0) {
        const made = snap.phase === GamePhase.Scored;
        const timing = this.sim.lastTimingGrade;
        const contest = Math.round(this.sim.lastContestPercent * 100);
        const points = this.sim.lastShotPoints;
        const shotType = points === 3 ? '3PT' : '2PT';
        this.shotFeedback.setText(
          `${shotType} / ${timing} / ${contest > 0 ? `${contest}% CONTESTED` : 'OPEN'} / ${made ? 'SPLASH!' : 'BRICK!'}`
        );
        this.shotFeedback.setColor(made ? fb.madeColor : fb.missedColor);
        this.feedbackBackground.setAlpha(fb.bgAlpha);
        this.feedbackTimer = 2.5;
      }
    }

    // Steal feedback
    if (this.sim.lastStealResult === 'success' && snap.phase === GamePhase.CheckBall) {
      if (this.feedbackTimer <= 0) {
        this.shotFeedback.setText('BALL STOLEN!');
        this.shotFeedback.setColor(fb.stealColor);
        this.feedbackBackground.setAlpha(fb.bgAlpha);
        this.feedbackTimer = 1.5;
      }
    }

    // Timing meter (show when shooting) - Top center rectangle bar
    this.timingMeter.clear();
    const offense = this.sim.offensePlayer;
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && !offense.shotReleased) {
      const meterW = tm.size.width;
      const meterH = tm.size.height;
      const spriteTopOffset = 180 * 1.1 * 0.97; // ~192px above player feet
      const meterX = offense.position.x - meterW / 2;
      const meterY = Math.max(8, offense.position.y - spriteTopOffset - 16);

      // Outer border
      this.timingMeter.lineStyle(3, tm.borderColor, 1);
      this.timingMeter.fillStyle(tm.bgColor, 0.9);
      this.timingMeter.fillRect(meterX, meterY, meterW, meterH);
      this.timingMeter.strokeRect(meterX, meterY, meterW, meterH);

      // Fill based on timing
      const progress = Math.min(offense.stateTimer / SHOT_TIMING_WINDOW, 1);

      let color = tm.zones.early;
      let alpha = 1;
      if (progress > 0.80 && progress < 0.92) {
        color = tm.zones.perfect;
        alpha = 1;
      } else if (progress > 0.65) {
        color = tm.zones.good;
        alpha = 0.95;
      } else if (progress > 0.45) {
        color = tm.zones.decent;
        alpha = 0.9;
      }

      this.timingMeter.fillStyle(color, alpha);
      this.timingMeter.fillRect(meterX + 2, meterY + 2, (meterW - 4) * progress, meterH - 4);

      // Perfect zone highlight box
      const zoneStart = 0.80;
      const zoneEnd = 0.92;
      this.timingMeter.lineStyle(2, tm.zones.perfect, 0.4);
      this.timingMeter.fillStyle(tm.zones.perfect, 0.12);
      this.timingMeter.fillRect(
        meterX + 2 + (meterW - 4) * zoneStart, meterY + 2,
        (meterW - 4) * (zoneEnd - zoneStart), meterH - 4,
      );
      this.timingMeter.strokeRect(
        meterX + 2 + (meterW - 4) * zoneStart, meterY + 2,
        (meterW - 4) * (zoneEnd - zoneStart), meterH - 4,
      );

      // Perfect zone center marker with pulse
      const perfectZone = 0.85;
      const glowPulse = 0.5 + Math.sin(Date.now() * 0.012) * 0.5;
      this.timingMeter.lineStyle(2, tm.perfectMarker, glowPulse);
      this.timingMeter.lineBetween(
        meterX + 2 + (meterW - 4) * perfectZone, meterY,
        meterX + 2 + (meterW - 4) * perfectZone, meterY + meterH,
      );
    }
  }

  destroy(): void {
    this.scoreBackground.destroy();
    this.scoreText.destroy();
    this.phaseText.destroy();
    this.shotFeedback.destroy();
    this.feedbackBackground.destroy();
    this.timingMeter.destroy();
    this.controlsText.destroy();
  }
}
