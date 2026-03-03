import { GamePhase } from './GameState';
import {
  CHECK_BALL_DURATION,
  INBOUND_DURATION,
  SCORED_CELEBRATION_DURATION,
} from '../config/Constants';

export class PhaseManager {
  phase: GamePhase = GamePhase.CheckBall;
  phaseTimer: number = 0;
  possession: number = 0; // which player has/gets the ball (0 or 1)

  setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.phaseTimer = 0;
  }

  update(dt: number): GamePhase | null {
    this.phaseTimer += dt;

    switch (this.phase) {
      case GamePhase.CheckBall:
        if (this.phaseTimer >= CHECK_BALL_DURATION) {
          return GamePhase.Inbound;
        }
        break;

      case GamePhase.Inbound:
        if (this.phaseTimer >= INBOUND_DURATION) {
          return GamePhase.Live;
        }
        break;

      case GamePhase.Scored:
        if (this.phaseTimer >= SCORED_CELEBRATION_DURATION) {
          return GamePhase.CheckBall;
        }
        break;

      case GamePhase.Missed:
        if (this.phaseTimer >= 1.0) {
          return GamePhase.CheckBall;
        }
        break;

      case GamePhase.Violation:
        if (this.phaseTimer >= 1.5) {
          return GamePhase.CheckBall;
        }
        break;

      // Live, Shooting, GameOver - no auto-transition
    }

    return null;
  }

  flipPossession(): void {
    this.possession = this.possession === 0 ? 1 : 0;
  }
}
