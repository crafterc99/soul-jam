import { describe, it, expect } from 'vitest';
import { ShotModel, ShotContext } from '../src/simulation/models/ShotModel';
import { CharacterRatings } from '../src/data/CharacterRatings';

const flashRatings: CharacterRatings = {
  speed: 92, acceleration: 88, ballHandle: 90,
  shotRating: 72, defense: 65, lateralQuickness: 85, contestResistance: 60,
};

const tankRatings: CharacterRatings = {
  speed: 65, acceleration: 60, ballHandle: 55,
  shotRating: 80, defense: 90, lateralQuickness: 58, contestResistance: 88,
};

describe('ShotModel', () => {
  it('should return higher probability for higher shot rating', () => {
    const ctxFlash: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    const ctxTank: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0,
      timingValue: 0.4,
      ratings: tankRatings,
    };
    const flashProb = ShotModel.calculateProbability(ctxFlash);
    const tankProb = ShotModel.calculateProbability(ctxTank);
    expect(tankProb).toBeGreaterThan(flashProb);
  });

  it('should penalize distance', () => {
    const close: ShotContext = {
      distanceToHoop: 50,
      contestPercent: 0,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    const far: ShotContext = {
      distanceToHoop: 350,
      contestPercent: 0,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    expect(ShotModel.calculateProbability(close)).toBeGreaterThan(
      ShotModel.calculateProbability(far),
    );
  });

  it('should penalize contest', () => {
    const open: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    const contested: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0.8,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    expect(ShotModel.calculateProbability(open)).toBeGreaterThan(
      ShotModel.calculateProbability(contested),
    );
  });

  it('should reward contest resistance', () => {
    // Tank has high contestResistance, Flash has low
    const flashContested: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0.7,
      timingValue: 0.4,
      ratings: flashRatings,
    };
    const tankContested: ShotContext = {
      distanceToHoop: 200,
      contestPercent: 0.7,
      timingValue: 0.4,
      ratings: tankRatings,
    };
    // Tank should lose less from contest than Flash (per unit of shot rating)
    const flashOpen = ShotModel.calculateProbability({ ...flashContested, contestPercent: 0 });
    const tankOpen = ShotModel.calculateProbability({ ...tankContested, contestPercent: 0 });
    const flashDrop = flashOpen - ShotModel.calculateProbability(flashContested);
    const tankDrop = tankOpen - ShotModel.calculateProbability(tankContested);
    expect(tankDrop).toBeLessThan(flashDrop);
  });

  it('should clamp probability between 0.02 and 0.95', () => {
    const terrible: ShotContext = {
      distanceToHoop: 900,
      contestPercent: 1.0,
      timingValue: 0.05,
      ratings: flashRatings,
    };
    const perfect: ShotContext = {
      distanceToHoop: 30,
      contestPercent: 0,
      timingValue: 0.425,
      ratings: { ...tankRatings, shotRating: 99, contestResistance: 99 },
    };
    expect(ShotModel.calculateProbability(terrible)).toBeGreaterThanOrEqual(0.02);
    expect(ShotModel.calculateProbability(perfect)).toBeLessThanOrEqual(0.95);
  });

  it('should give timing grades', () => {
    expect(ShotModel.getTimingGrade(0.425)).toBe('PERFECT');
    expect(ShotModel.getTimingGrade(0.05)).toBe('EARLY');
  });
});
