import { Vector2 } from '../../utils/Vector2';
import { CharacterRatings } from '../../data/CharacterRatings';
import { clamp } from '../../utils/MathUtils';
import {
  MAX_SPEED_MULTIPLIER,
  ACCEL_MULTIPLIER,
  DECELERATION,
  LATERAL_SPEED_MULTIPLIER,
} from '../../config/Constants';

export class MovementModel {
  static getMaxSpeed(ratings: CharacterRatings): number {
    return ratings.speed * MAX_SPEED_MULTIPLIER;
  }

  static getAcceleration(ratings: CharacterRatings): number {
    return ratings.acceleration * ACCEL_MULTIPLIER;
  }

  static getLateralSpeed(ratings: CharacterRatings): number {
    return ratings.lateralQuickness * LATERAL_SPEED_MULTIPLIER;
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
      // Normalize input
      const inputLen = Math.sqrt(inputX * inputX + inputY * inputY);
      const nx = inputX / Math.max(inputLen, 1);
      const ny = inputY / Math.max(inputLen, 1);

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
      // Decelerate
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0) {
        const decelAmount = DECELERATION * dt;
        const newSpeed = Math.max(0, speed - decelAmount);
        const ratio = speed > 0 ? newSpeed / speed : 0;
        vx *= ratio;
        vy *= ratio;
      }
    }

    // Snap to zero if very slow
    if (Math.abs(vx) < 1 && Math.abs(vy) < 1 && !hasInput) {
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
