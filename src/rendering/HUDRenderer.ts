import Phaser from 'phaser';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { GAME_WIDTH, GAME_HEIGHT, SHOT_TIMING_WINDOW } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

export class HUDRenderer {
  private scoreText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
  private shotFeedback: Phaser.GameObjects.Text;
  private timingMeter: Phaser.GameObjects.Graphics;
  private controlsText: Phaser.GameObjects.Text;

  private feedbackTimer: number = 0;

  constructor(private scene: Phaser.Scene, private sim: GameSimulation) {
    // Score display
    this.scoreText = scene.add.text(GAME_WIDTH / 2, 15, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    // Phase text
    this.phaseText = scene.add.text(GAME_WIDTH / 2, 50, '', {
      fontSize: '20px',
      color: '#ffaa00',
    }).setOrigin(0.5).setDepth(100);

    // Shot feedback
    this.shotFeedback = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    // Timing meter
    this.timingMeter = scene.add.graphics().setDepth(100);

    // Controls hint
    this.controlsText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20,
      'WASD: Move | SPACE: Shoot (hold+release) | Q: Stepback | SHIFT: Defend | ESC: Pause', {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5).setDepth(100);
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
      case GamePhase.GameOver: {
        const winner = this.sim.scoreKeeper.getWinner();
        phaseLabel = winner !== null ? `PLAYER ${winner + 1} WINS!` : 'GAME OVER';
        break;
      }
    }
    this.phaseText.setText(phaseLabel);

    // Shot feedback
    this.feedbackTimer -= dt;
    if (this.feedbackTimer <= 0) {
      this.shotFeedback.setText('');
    }

    // Show feedback on shot result
    if (snap.phase === GamePhase.Scored || snap.phase === GamePhase.Missed) {
      if (this.feedbackTimer <= 0) {
        const made = snap.phase === GamePhase.Scored;
        const prob = Math.round(this.sim.lastShotProbability * 100);
        const timing = this.sim.lastTimingGrade;
        const contest = Math.round(this.sim.lastContestPercent * 100);
        this.shotFeedback.setText(
          `${made ? 'SPLASH!' : 'BRICK!'} | ${timing} | ${prob}% | Contest: ${contest}%`
        );
        this.shotFeedback.setColor(made ? '#44ff44' : '#ff4444');
        this.feedbackTimer = 2.0;
      }
    }

    // Timing meter (show when shooting)
    this.timingMeter.clear();
    const offense = this.sim.offensePlayer;
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && !offense.shotReleased) {
      const meterX = offense.position.x - 25;
      const meterY = offense.position.y - 45;
      const meterW = 50;
      const meterH = 8;

      // Background
      this.timingMeter.fillStyle(0x333333, 0.8);
      this.timingMeter.fillRect(meterX, meterY, meterW, meterH);

      // Fill based on timing
      const progress = Math.min(offense.stateTimer / SHOT_TIMING_WINDOW, 1);
      const perfectZone = 0.85;

      // Color based on timing zone
      let color = 0xff4444; // early
      if (progress > 0.65 && progress < 0.95) color = 0x44ff44; // good/perfect zone
      else if (progress > 0.45) color = 0xffaa00; // decent

      this.timingMeter.fillStyle(color, 1);
      this.timingMeter.fillRect(meterX, meterY, meterW * progress, meterH);

      // Perfect zone marker
      this.timingMeter.lineStyle(2, 0xffffff, 0.8);
      this.timingMeter.lineBetween(
        meterX + meterW * perfectZone, meterY - 2,
        meterX + meterW * perfectZone, meterY + meterH + 2,
      );
    }
  }

  destroy(): void {
    this.scoreText.destroy();
    this.phaseText.destroy();
    this.shotFeedback.destroy();
    this.timingMeter.destroy();
    this.controlsText.destroy();
  }
}
