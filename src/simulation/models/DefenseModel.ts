import { Vector2 } from '../../utils/Vector2';
import { CharacterRatings } from '../../data/CharacterRatings';
import { clamp } from '../../utils/MathUtils';
import { CONTEST_MAX_DISTANCE } from '../../config/Constants';

export interface DefenseContext {
  defenderPosition: Vector2;
  shooterPosition: Vector2;
  defenderVelocity: Vector2;
  defenderRatings: CharacterRatings;
  isInDefenseStance: boolean;
}

export class DefenseModel {
  static calculateContestPercent(ctx: DefenseContext): number {
    const dist = ctx.defenderPosition.distanceTo(ctx.shooterPosition);

    // Too far away = no contest
    if (dist > CONTEST_MAX_DISTANCE) return 0;

    // Distance factor: closer = more contest (1 at dist 0, 0 at max dist)
    const distanceFactor = 1 - (dist / CONTEST_MAX_DISTANCE);

    // Facing factor: are they facing the shooter?
    const toShooter = ctx.shooterPosition.subtract(ctx.defenderPosition).normalize();
    const defenderDir = Vector2.fromAngle(
      Math.atan2(ctx.defenderVelocity.y, ctx.defenderVelocity.x)
    );
    const facingDot = toShooter.dot(defenderDir);
    // If velocity is near zero, assume they're facing the shooter
    const isStationary = ctx.defenderVelocity.length() < 10;
    const facingFactor = isStationary ? 0.8 : clamp((facingDot + 1) / 2, 0.2, 1.0);

    // Rating multiplier
    const ratingMultiplier = 0.5 + (ctx.defenderRatings.defense / 100) * 0.5;

    // Stance bonus
    const stanceBonus = ctx.isInDefenseStance ? 0.15 : 0;

    // Velocity penalty: moving fast while defending is less effective
    const speed = ctx.defenderVelocity.length();
    const velocityPenalty = clamp(speed / 500 * 0.15, 0, 0.15);

    const contest = distanceFactor * facingFactor * ratingMultiplier + stanceBonus - velocityPenalty;

    return clamp(contest, 0, 1);
  }
}
