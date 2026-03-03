import { Vector2 } from '../../utils/Vector2';
import { CharacterRatings } from '../../data/CharacterRatings';
import {
  MAX_SPEED_MULTIPLIER,
  ACCEL_MULTIPLIER,
  DECELERATION,
  LATERAL_SPEED_MULTIPLIER,
  FRICTION,
  TURN_SPEED_PENALTY,
} from '../../config/Constants';

export class MovementModel {
  static getMaxSpeed(ratings: CharacterRatings): number {
    return ratings.speed * MAX_SPEED_MULTIPLIER;
  }

  static getAcceleration(ratings: CharacterRatings): number {
    return ratings.power * ACCEL_MULTIPLIER;
  }

  static getLateralSpeed(ratings: CharacterRatings): number {
    return ratings.defense * LATERAL_SPEED_MULTIPLIER;
  }

  static applyMovement(
    position: Vector2,
    velocity: Vector2,
    inputX: number,
    inputY: number,
    ratings: CharacterRatings,
    isDefenseStance: boolean,
    dt: number,
  ): { position: Vector2; velocity: Vector2 } {
    const hasInput = inputX !== 0 || inputY !== 0;
    const maxSpeed = isDefenseStance
      ? MovementModel.getLateralSpeed(ratings)
      : MovementModel.getMaxSpeed(ratings);
    const accel = MovementModel.getAcceleration(ratings);

    let vx = velocity.x;
    let vy = velocity.y;

    if (hasInput) {
      // Normalize input direction
      const inputLen = Math.sqrt(inputX * inputX + inputY * inputY);
      const nx = inputX / Math.max(inputLen, 1);
      const ny = inputY / Math.max(inputLen, 1);

      // Check if changing direction sharply (dot product of velocity vs input)
      const currentSpeed = Math.sqrt(vx * vx + vy * vy);
      if (currentSpeed > 10) {
        const velNx = vx / currentSpeed;
        const velNy = vy / currentSpeed;
        const dot = velNx * nx + velNy * ny;

        // If moving opposite to input, apply extra braking for responsive direction changes
        if (dot < 0) {
          const brakeFactor = 1 + Math.abs(dot) * 2; // stronger brake when reversing
          const brakeAmount = DECELERATION * brakeFactor * dt;
          const newSpeed = Math.max(0, currentSpeed - brakeAmount);
          const ratio = newSpeed / currentSpeed;
          vx *= ratio;
          vy *= ratio;
        } else if (dot < 0.5) {
          // Turning - apply turn speed penalty
          vx *= TURN_SPEED_PENALTY;
          vy *= TURN_SPEED_PENALTY;
        }
      }

      // Accelerate toward input direction
      vx += nx * accel * dt;
      vy += ny * accel * dt;

      // Clamp to max speed
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxSpeed) {
        const ratio = maxSpeed / speed;
        vx *= ratio;
        vy *= ratio;
      }
    } else {
      // No input: apply strong friction-based deceleration (stops quickly, no sliding)
      vx *= Math.pow(FRICTION, dt * 60); // normalize to ~60fps feel
      vy *= Math.pow(FRICTION, dt * 60);

      // Also apply flat deceleration for extra crispness
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0) {
        const decelAmount = DECELERATION * dt;
        const newSpeed = Math.max(0, speed - decelAmount);
        const ratio = newSpeed / speed;
        vx *= ratio;
        vy *= ratio;
      }
    }

    // Snap to zero if very slow
    if (Math.abs(vx) < 5 && Math.abs(vy) < 5 && !hasInput) {
      vx = 0;
      vy = 0;
    }

    const newPos = new Vector2(
      position.x + vx * dt,
      position.y + vy * dt,
    );

    return {
      position: newPos,
      velocity: new Vector2(vx, vy),
    };
  }
}
