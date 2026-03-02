import { Vector2 } from '../utils/Vector2';
import { SHOT_FLIGHT_DURATION, SHOT_ARC_HEIGHT } from '../config/Constants';

export type BallState = 'held' | 'flight' | 'dead';

export class BallSim {
  position: Vector2 = Vector2.zero();
  state: BallState = 'held';
  possessorIndex: number = 0; // which player holds the ball

  // Flight properties
  flightStart: Vector2 = Vector2.zero();
  flightTarget: Vector2 = Vector2.zero();
  flightTimer: number = 0;
  flightDuration: number = SHOT_FLIGHT_DURATION;
  arcHeight: number = SHOT_ARC_HEIGHT;
  willScore: boolean = false; // determined at shot time

  // Visual height (for rendering the arc)
  displayHeight: number = 0;

  setPossessor(playerIndex: number, playerPosition: Vector2): void {
    this.state = 'held';
    this.possessorIndex = playerIndex;
    this.position = playerPosition.clone();
    this.displayHeight = 0;
  }

  launchShot(from: Vector2, target: Vector2, willScore: boolean): void {
    this.state = 'flight';
    this.flightStart = from.clone();
    this.flightTarget = target.clone();
    this.flightTimer = 0;
    this.willScore = willScore;
    this.position = from.clone();
  }

  update(dt: number, possessorPosition?: Vector2): void {
    if (this.state === 'held' && possessorPosition) {
      // Ball follows possessor with slight offset
      this.position = new Vector2(possessorPosition.x + 15, possessorPosition.y - 5);
      this.displayHeight = 0;
    } else if (this.state === 'flight') {
      this.flightTimer += dt;
      const t = Math.min(this.flightTimer / this.flightDuration, 1);

      // Lerp XY position
      this.position = new Vector2(
        this.flightStart.x + (this.flightTarget.x - this.flightStart.x) * t,
        this.flightStart.y + (this.flightTarget.y - this.flightStart.y) * t,
      );

      // Parabolic arc for height
      this.displayHeight = Math.sin(t * Math.PI) * this.arcHeight;

      if (t >= 1) {
        this.state = 'dead'; // simulation will handle scoring
      }
    }
  }

  get isInFlight(): boolean {
    return this.state === 'flight';
  }

  get flightProgress(): number {
    if (this.state !== 'flight') return 0;
    return Math.min(this.flightTimer / this.flightDuration, 1);
  }
}
