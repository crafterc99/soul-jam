import Phaser from 'phaser';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { GAME_WIDTH, GAME_HEIGHT, SHOT_TIMING_WINDOW } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';
import { ThemeDef } from '../data/types';
import { getTheme } from '../data/theme';

// Positions matched to the scoreboard and feedback bar baked into court.webp
const SCOREBOARD_X = GAME_WIDTH / 2;
const SCOREBOARD_Y = 38;
const FEEDBACK_X = GAME_WIDTH / 2;
const FEEDBACK_Y = GAME_HEIGHT - 52;

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

  private theme: ThemeDef;

  constructor(private scene: Phaser.Scene, private sim: GameSimulation, theme?: ThemeDef) {
    this.theme = theme ?? getTheme();
    const t = this.theme;

    // Dark background to cover the baked-in scoreboard in court image
    this.scoreBackground = scene.add.rectangle(SCOREBOARD_X, SCOREBOARD_Y, 200, 48,
      parseInt(t.colors.surface.replace('#', ''), 16), 0.95)
      .setDepth(100);

    // Score display - positioned over the built-in scoreboard
    this.scoreText = scene.add.text(SCOREBOARD_X, SCOREBOARD_Y, '', {
      fontSize: '32px',
      fontFamily: t.fonts.score,
      color: t.colors.primary,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    // Phase text - just below scoreboard
    this.phaseText = scene.add.text(SCOREBOARD_X, SCOREBOARD_Y + 32, '', {
      fontSize: '20px',
      color: '#ffaa00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(101);

    // Feedback background - covers the built-in feedback bar
    this.feedbackBackground = scene.add.rectangle(FEEDBACK_X, FEEDBACK_Y, 480, 40,
      parseInt(t.colors.surface.replace('#', ''), 16), 0.9)
      .setDepth(100);

    // Shot feedback - positioned over the built-in feedback bar
    this.shotFeedback = scene.add.text(FEEDBACK_X, FEEDBACK_Y, '', {
      fontSize: '18px',
      fontFamily: t.fonts.body,
      color: t.colors.text,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    // Timing meter
    this.timingMeter = scene.add.graphics().setDepth(100);

    // Controls hint
    this.controlsText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12,
      'WASD: Move | SPACE: Shoot | Q: Stepback | E: Crossover | F: Steal | SHIFT: Defend', {
      fontSize: '10px',
      color: t.colors.textDim,
    }).setOrigin(0.5).setDepth(101);
  }

  update(dt: number): void {
    const snap = this.sim.getSnapshot();

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
      this.scoreText.setColor('#ffffff');
    } else {
      this.scoreText.setScale(1);
      this.scoreText.setColor(this.theme.colors.primary);
    }
    this.scoreText.setText(`${snap.scores[0]}  -  ${snap.scores[1]}`);

    // Phase text with contextual color
    let phaseLabel = '';
    let phaseColor = '#ffaa00';
    switch (snap.phase) {
      case GamePhase.CheckBall:
        if (this.sim.lastStealResult === 'success') {
          phaseLabel = 'STOLEN!';
          phaseColor = '#ff4444';
        } else {
          phaseLabel = 'CHECK BALL';
        }
        break;
      case GamePhase.Inbound: phaseLabel = 'INBOUND'; break;
      case GamePhase.Live: phaseLabel = ''; break;
      case GamePhase.Shooting: phaseLabel = ''; break;
      case GamePhase.Scored:
        phaseLabel = `SCORED! +${this.sim.lastShotPoints}`;
        phaseColor = '#44ff44';
        break;
      case GamePhase.Missed:
        phaseLabel = 'MISS!';
        phaseColor = '#ff4444';
        break;
      case GamePhase.Violation:
        phaseLabel = 'OUT OF BOUNDS';
        phaseColor = '#ff6644';
        break;
      case GamePhase.GameOver: {
        const winner = this.sim.scoreKeeper.getWinner();
        phaseLabel = winner !== null ? `PLAYER ${winner + 1} WINS!` : 'GAME OVER';
        phaseColor = '#ffffff';
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
        this.shotFeedback.setColor(made ? '#44ff44' : '#ff4444');
        this.feedbackBackground.setAlpha(0.9);
        this.feedbackTimer = 2.5;
      }
    }

    // Steal feedback
    if (this.sim.lastStealResult === 'success' && snap.phase === GamePhase.CheckBall) {
      if (this.feedbackTimer <= 0) {
        this.shotFeedback.setText('BALL STOLEN!');
        this.shotFeedback.setColor('#ff6644');
        this.feedbackBackground.setAlpha(0.9);
        this.feedbackTimer = 1.5;
      }
    }

    // Timing meter (show when shooting) - Top center rectangle bar
    this.timingMeter.clear();
    const offense = this.sim.offensePlayer;
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && !offense.shotReleased) {
      const meterW = 220;
      const meterH = 24;
      const meterX = (GAME_WIDTH - meterW) / 2;
      const meterY = 12;

      // Outer border
      this.timingMeter.lineStyle(3, 0x1a1a3a, 1);
      this.timingMeter.fillStyle(0x0a0a2a, 0.9);
      this.timingMeter.fillRect(meterX, meterY, meterW, meterH);
      this.timingMeter.strokeRect(meterX, meterY, meterW, meterH);

      // Fill based on timing
      const progress = Math.min(offense.stateTimer / SHOT_TIMING_WINDOW, 1);

      let color = 0xff4444;
      let alpha = 1;
      if (progress > 0.80 && progress < 0.92) {
        color = 0x44ff44;
        alpha = 1;
      } else if (progress > 0.65) {
        color = 0x88ff44;
        alpha = 0.95;
      } else if (progress > 0.45) {
        color = 0xffaa00;
        alpha = 0.9;
      }

      this.timingMeter.fillStyle(color, alpha);
      this.timingMeter.fillRect(meterX + 2, meterY + 2, (meterW - 4) * progress, meterH - 4);

      // Perfect zone highlight box
      const zoneStart = 0.80;
      const zoneEnd = 0.92;
      this.timingMeter.lineStyle(2, 0x44ff44, 0.4);
      this.timingMeter.fillStyle(0x44ff44, 0.12);
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
      this.timingMeter.lineStyle(2, 0xffffff, glowPulse);
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
