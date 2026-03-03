import { clamp } from '../../utils/MathUtils';
import { CharacterRatings } from '../../data/CharacterRatings';
import { THREE_POINT_RADIUS, SHOT_TIMING_WINDOW, TIMING_PERFECT_BONUS, TIMING_GOOD_BONUS, TIMING_EARLY_PENALTY } from '../../config/Constants';

export interface ShotContext {
  distanceToHoop: number;
  contestPercent: number;   // 0-1, how contested the shot is
  timingValue: number;      // seconds the button was held
  ratings: CharacterRatings;
}

export class ShotModel {
  static calculateProbability(ctx: ShotContext): number {
    // Base probability from range rating
    const baseProbability = 0.20 + (ctx.ratings.range / 100) * 0.55;

    // Distance penalty
    let distancePenalty = 0;
    if (ctx.distanceToHoop > 100) {
      distancePenalty = (ctx.distanceToHoop - 100) / 500 * 0.25;
    }
    if (ctx.distanceToHoop > THREE_POINT_RADIUS) {
      distancePenalty += 0.08;
    }

    // Contest penalty, mitigated by clutchEnergy
    const resistanceFactor = 1 - (ctx.ratings.clutchEnergy / 100) * 0.6;
    const contestPenalty = ctx.contestPercent * 0.35 * resistanceFactor;

    // Timing bonus
    const timingBonus = ShotModel.getTimingBonus(ctx.timingValue);

    const probability = baseProbability - distancePenalty - contestPenalty + timingBonus;

    return clamp(probability, 0.02, 0.95);
  }

  static getTimingBonus(timingValue: number): number {
    // Perfect timing: release at ~0.4-0.5s
    const perfectCenter = SHOT_TIMING_WINDOW * 0.85;
    const diff = Math.abs(timingValue - perfectCenter);

    if (diff < 0.05) return TIMING_PERFECT_BONUS;   // Perfect
    if (diff < 0.12) return TIMING_GOOD_BONUS;       // Good
    if (timingValue < 0.15) return TIMING_EARLY_PENALTY; // Too early
    return 0; // Late/ok
  }

  static getTimingGrade(timingValue: number): string {
    const perfectCenter = SHOT_TIMING_WINDOW * 0.85;
    const diff = Math.abs(timingValue - perfectCenter);

    if (diff < 0.05) return 'PERFECT';
    if (diff < 0.12) return 'GOOD';
    if (timingValue < 0.15) return 'EARLY';
    return 'LATE';
  }

  static rollShot(probability: number): boolean {
    return Math.random() < probability;
  }
}
