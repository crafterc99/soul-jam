import { describe, it, expect } from 'vitest';
import { ShotModel, ShotContext } from '../src/simulation/models/ShotModel';
import { CharacterRatings } from '../src/data/CharacterRatings';

const ninetyNineRatings: CharacterRatings = {
  speed: 92, power: 68, range: 72, defense: 65, steal: 90, clutchEnergy: 60,
};

const breezyRatings: CharacterRatings = {
  speed: 75, power: 82, range: 85, defense: 88, steal: 58, clutchEnergy: 90,
};

describe('ShotModel', () => {
  it('should return higher probability for higher range rating', () => {
    const ctx99: ShotContext = { distanceToHoop: 200, contestPercent: 0, timingValue: 0.4, ratings: ninetyNineRatings };
    const ctxBreezy: ShotContext = { distanceToHoop: 200, contestPercent: 0, timingValue: 0.4, ratings: breezyRatings };
    expect(ShotModel.calculateProbability(ctxBreezy)).toBeGreaterThan(ShotModel.calculateProbability(ctx99));
  });

  it('should penalize distance', () => {
    const close: ShotContext = { distanceToHoop: 50, contestPercent: 0, timingValue: 0.4, ratings: ninetyNineRatings };
    const far: ShotContext = { distanceToHoop: 350, contestPercent: 0, timingValue: 0.4, ratings: ninetyNineRatings };
    expect(ShotModel.calculateProbability(close)).toBeGreaterThan(ShotModel.calculateProbability(far));
  });

  it('should penalize contest', () => {
    const open: ShotContext = { distanceToHoop: 200, contestPercent: 0, timingValue: 0.4, ratings: ninetyNineRatings };
    const contested: ShotContext = { distanceToHoop: 200, contestPercent: 0.8, timingValue: 0.4, ratings: ninetyNineRatings };
    expect(ShotModel.calculateProbability(open)).toBeGreaterThan(ShotModel.calculateProbability(contested));
  });

  it('should reward clutch energy (contest resistance)', () => {
    const ctx99: ShotContext = { distanceToHoop: 200, contestPercent: 0.7, timingValue: 0.4, ratings: ninetyNineRatings };
    const ctxBreezy: ShotContext = { distanceToHoop: 200, contestPercent: 0.7, timingValue: 0.4, ratings: breezyRatings };
    const openN = ShotModel.calculateProbability({ ...ctx99, contestPercent: 0 });
    const openB = ShotModel.calculateProbability({ ...ctxBreezy, contestPercent: 0 });
    const dropN = openN - ShotModel.calculateProbability(ctx99);
    const dropB = openB - ShotModel.calculateProbability(ctxBreezy);
    expect(dropB).toBeLessThan(dropN);
  });

  it('should clamp probability between 0.02 and 0.95', () => {
    const terrible: ShotContext = { distanceToHoop: 900, contestPercent: 1.0, timingValue: 0.05, ratings: ninetyNineRatings };
    const perfect: ShotContext = {
      distanceToHoop: 30, contestPercent: 0, timingValue: 0.425,
      ratings: { ...breezyRatings, range: 99, clutchEnergy: 99 },
    };
    expect(ShotModel.calculateProbability(terrible)).toBeGreaterThanOrEqual(0.02);
    expect(ShotModel.calculateProbability(perfect)).toBeLessThanOrEqual(0.95);
  });

  it('should give timing grades', () => {
    expect(ShotModel.getTimingGrade(0.425)).toBe('PERFECT');
    expect(ShotModel.getTimingGrade(0.05)).toBe('EARLY');
  });
});
