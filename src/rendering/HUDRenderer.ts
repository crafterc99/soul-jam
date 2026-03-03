import Phaser from 'phaser';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { GAME_WIDTH, GAME_HEIGHT, SHOT_TIMING_WINDOW } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

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

  constructor(private scene: Phaser.Scene, private sim: GameSimulation) {
    // Dark background to cover the baked-in scoreboard in court image
    this.scoreBackground = scene.add.rectangle(SCOREBOARD_X, SCOREBOARD_Y, 200, 48, 0x0a0a2a, 0.95)
      .setDepth(100);

    // Score display - positioned over the built-in scoreboard
    this.scoreText = scene.add.text(SCOREBOARD_X, SCOREBOARD_Y, '', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
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
    this.feedbackBackground = scene.add.rectangle(FEEDBACK_X, FEEDBACK_Y, 480, 40, 0x0a0a2a, 0.9)
      .setDepth(100);

    // Shot feedback - positioned over the built-in feedback bar
    this.shotFeedback = scene.add.text(FEEDBACK_X, FEEDBACK_Y, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    // Timing meter
    this.timingMeter = scene.add.graphics().setDepth(100);

    // Controls hint
    this.controlsText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12,
      'WASD: Move | SPACE: Shoot (hold+release) | Q: Stepback | SHIFT: Defend | ESC: Pause', {
      fontSize: '10px',
      color: '#444444',
    }).setOrigin(0.5).setDepth(101);
  }

  update(dt: number): void {
    const snap = this.sim.getSnapshot();

    // Score
    this.scoreText.setText(`${snap.scores[0]}  -  ${snap.scores[1]}`);

    // Phase
    let phaseLabel = '';
    switch (snap.phase) {
      case GamePhase.CheckBall: phaseLabel = 'CHECK BALL'; break;
      case GamePhase.Inbound: phaseLabel = 'INBOUND'; break;
      case GamePhase.Live: phaseLabel = ''; break;
      case GamePhase.Shooting: phaseLabel = ''; break;
      case GamePhase.Scored: phaseLabel = `SCORED! +${this.sim.lastShotPoints}`; break;
      case GamePhase.Missed: phaseLabel = 'MISS!'; break;
      case GamePhase.Violation: phaseLabel = 'OUT OF BOUNDS'; break;
      case GamePhase.GameOver: {
        const winner = this.sim.scoreKeeper.getWinner();
        phaseLabel = winner !== null ? `PLAYER ${winner + 1} WINS!` : 'GAME OVER';
        break;
      }
    }
    this.phaseText.setText(phaseLabel);

    // Shot feedback in the feedback bar area
    this.feedbackTimer -= dt;
    if (this.feedbackTimer <= 0) {
      this.shotFeedback.setText('');
      this.feedbackBackground.setAlpha(0);
    }

    if (snap.phase === GamePhase.Scored || snap.phase === GamePhase.Missed) {
      if (this.feedbackTimer <= 0) {
        const made = snap.phase === GamePhase.Scored;
        const timing = this.sim.lastTimingGrade;
        const contest = Math.round(this.sim.lastContestPercent * 100);
        this.shotFeedback.setText(
          `${timing} / ${contest > 0 ? 'CONTESTED' : 'OPEN'} / ${made ? 'SPLASH!' : 'BRICK!'}`
        );
        this.shotFeedback.setColor(made ? '#44ff44' : '#ff4444');
        this.feedbackBackground.setAlpha(0.9);
        this.feedbackTimer = 2.5;
      }
    }

    // Timing meter (show when shooting)
    this.timingMeter.clear();
    const offense = this.sim.offensePlayer;
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && !offense.shotReleased) {
      const meterX = offense.position.x - 25;
      const meterY = offense.position.y - 50;
      const meterW = 50;
      const meterH = 8;

      // Background
      this.timingMeter.fillStyle(0x333333, 0.8);
      this.timingMeter.fillRect(meterX, meterY, meterW, meterH);

      // Fill based on timing
      const progress = Math.min(offense.stateTimer / SHOT_TIMING_WINDOW, 1);

      // Color based on timing zone
      let color = 0xff4444; // early
      if (progress > 0.65 && progress < 0.95) color = 0x44ff44; // good/perfect zone
      else if (progress > 0.45) color = 0xffaa00; // decent

      this.timingMeter.fillStyle(color, 1);
      this.timingMeter.fillRect(meterX, meterY, meterW * progress, meterH);

      // Perfect zone marker
      const perfectZone = 0.85;
      this.timingMeter.lineStyle(2, 0xffffff, 0.8);
      this.timingMeter.lineBetween(
        meterX + meterW * perfectZone, meterY - 2,
        meterX + meterW * perfectZone, meterY + meterH + 2,
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
