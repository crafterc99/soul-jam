import { Vector2 } from '../utils/Vector2';
import { SHOT_FLIGHT_DURATION, SHOT_ARC_HEIGHT, SHOT_ARRIVAL_HEIGHT } from '../config/Constants';

export type BallState = 'held' | 'flight' | 'dropping' | 'rimBounce' | 'dead';

export class BallSim {
  position: Vector2 = Vector2.zero();
  state: BallState = 'held';
  possessorIndex: number = 0;

  // Flight properties
  flightStart: Vector2 = Vector2.zero();
  flightTarget: Vector2 = Vector2.zero();
  flightTimer: number = 0;
  flightDuration: number = SHOT_FLIGHT_DURATION;
  arcHeight: number = SHOT_ARC_HEIGHT;
  willScore: boolean = false;

  // Post-arrival
  postTimer: number = 0;
  rimBounceVelocity: Vector2 = Vector2.zero();

  // Visual height above the XY position (positive = above, negative = below)
  // This is the KEY to the ball-through-rim effect:
  //   During flight: positive (ball arcs above the court)
  //   At arrival: positive (ball is ABOVE the rim)
  //   During drop: goes positive -> 0 -> negative (ball passes THROUGH rim, down through net)
  displayHeight: number = 0;

  shotFinished: boolean = false;

  setPossessor(playerIndex: number, playerPosition: Vector2): void {
    this.state = 'held';
    this.possessorIndex = playerIndex;
    this.position = playerPosition.clone();
    this.displayHeight = 0;
    this.shotFinished = false;
  }

  launchShot(from: Vector2, target: Vector2, willScore: boolean): void {
    this.state = 'flight';
    this.flightStart = from.clone();
    this.flightTarget = target.clone();
    this.flightTimer = 0;
    this.willScore = willScore;
    this.position = from.clone();
    this.shotFinished = false;
    this.postTimer = 0;
  }

  update(dt: number, possessorPosition?: Vector2): void {
    if (this.state === 'held' && possessorPosition) {
      this.position = new Vector2(possessorPosition.x - 12, possessorPosition.y - 8);
      this.displayHeight = 0;
      return;
    }

    if (this.state === 'flight') {
      this.flightTimer += dt;
      const t = Math.min(this.flightTimer / this.flightDuration, 1);

      // Lerp XY position from shooter to hoop
      this.position = new Vector2(
        this.flightStart.x + (this.flightTarget.x - this.flightStart.x) * t,
        this.flightStart.y + (this.flightTarget.y - this.flightStart.y) * t,
      );

      // Arc: parabolic curve + linear lift so ball ARRIVES ABOVE the rim
      // At t=0: displayHeight = 0 (at player hands)
      // At t=0.5: displayHeight = arcHeight + arrivalHeight/2 (peak)
      // At t=1.0: displayHeight = arrivalHeight (ABOVE the rim, ready to drop through)
      const arcPart = Math.sin(t * Math.PI) * this.arcHeight;
      const liftPart = SHOT_ARRIVAL_HEIGHT * t;
      this.displayHeight = arcPart + liftPart;

      if (t >= 1) {
        // Ball has arrived at hoop XY, hovering above it
        this.position = this.flightTarget.clone();
        this.displayHeight = SHOT_ARRIVAL_HEIGHT;

        if (this.willScore) {
          this.state = 'dropping';
          this.postTimer = 0;
        } else {
          this.state = 'rimBounce';
          this.postTimer = 0;
          // Bounce rightward away from backboard (hoop is on left)
          const angle = -Math.PI * 0.3 + Math.random() * Math.PI * 0.6;
          const bounceSpeed = 100 + Math.random() * 80;
          this.rimBounceVelocity = new Vector2(
            Math.abs(Math.cos(angle)) * bounceSpeed + 60, // always rightward
            Math.sin(angle) * bounceSpeed,
          );
        }
      }
      return;
    }

    if (this.state === 'dropping') {
      // BALL DROPS THROUGH THE RIM AND NET
      // displayHeight goes: +45 (above rim) -> 0 (at rim, passing through) -> -45 (below rim, out of net)
      this.postTimer += dt;
      this.displayHeight = SHOT_ARRIVAL_HEIGHT - this.postTimer * 180;

      // Slight wobble to simulate brushing through the net
      this.position = new Vector2(
        this.flightTarget.x + Math.sin(this.postTimer * 25) * 1.5,
        this.flightTarget.y,
      );

      if (this.postTimer >= 0.55) {
        this.state = 'dead';
        this.shotFinished = true;
        this.displayHeight = 0;
      }
      return;
    }

    if (this.state === 'rimBounce') {
      this.postTimer += dt;

      // Move away from rim
      this.position = new Vector2(
        this.position.x + this.rimBounceVelocity.x * dt,
        this.position.y + this.rimBounceVelocity.y * dt,
      );

      // Height starts above rim, bounces and decays to ground
      this.displayHeight = SHOT_ARRIVAL_HEIGHT * Math.abs(Math.cos(this.postTimer * 7)) * Math.exp(-this.postTimer * 3.5);

      // Gravity
      this.rimBounceVelocity = new Vector2(
        this.rimBounceVelocity.x * 0.97,
        this.rimBounceVelocity.y + 250 * dt,
      );

      if (this.postTimer >= 0.7) {
        this.state = 'dead';
        this.shotFinished = true;
        this.displayHeight = 0;
      }
      return;
    }
  }

  get isInFlight(): boolean {
    return this.state === 'flight' || this.state === 'dropping' || this.state === 'rimBounce';
  }

  get flightProgress(): number {
    if (this.state !== 'flight') return this.state === 'dropping' || this.state === 'rimBounce' ? 1 : 0;
    return Math.min(this.flightTimer / this.flightDuration, 1);
  }
}
