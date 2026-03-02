import { Vector2 } from '../../utils/Vector2';
import { CharacterRatings } from '../../data/CharacterRatings';
import { clamp } from '../../utils/MathUtils';
import { STEPBACK_DISTANCE } from '../../config/Constants';

export interface SeparationContext {
  offenseRatings: CharacterRatings;
  defenseRatings: CharacterRatings;
  offenseVelocity: Vector2;
}

export interface SeparationResult {
  separationDistance: number; // in court units
  burstVelocity: number;     // burst speed during stepback
}

export class SeparationModel {
  static calculate(ctx: SeparationContext): SeparationResult {
    const handleFactor = ctx.offenseRatings.ballHandle / 100;
    const lateralFactor = ctx.defenseRatings.lateralQuickness / 100;

    // Base separation from ball handling
    const baseSeparation = STEPBACK_DISTANCE + handleFactor * 70;

    // Defender's lateral quickness reduces separation
    const defenseReduction = lateralFactor * 0.5;
    const separation = baseSeparation * (1 - defenseReduction);

    // Movement bonus: moving before stepback helps
    const speed = ctx.offenseVelocity.length();
    const movementBonus = clamp(speed / 300, 0, 0.3);
    const finalSeparation = separation * (1 + movementBonus);

    // Burst velocity during stepback animation
    const burstVelocity = finalSeparation / 0.3 * 1.5; // cover distance in ~0.3s

    return {
      separationDistance: finalSeparation,
      burstVelocity,
    };
  }
}
