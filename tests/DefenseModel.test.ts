import { describe, it, expect } from 'vitest';
import { DefenseModel, DefenseContext } from '../src/simulation/models/DefenseModel';
import { Vector2 } from '../src/utils/Vector2';
import { CharacterRatings } from '../src/data/CharacterRatings';

const goodDefender: CharacterRatings = {
  speed: 65, acceleration: 60, ballHandle: 55,
  shotRating: 80, defense: 90, lateralQuickness: 58, contestResistance: 88,
};

const poorDefender: CharacterRatings = {
  speed: 92, acceleration: 88, ballHandle: 90,
  shotRating: 72, defense: 65, lateralQuickness: 85, contestResistance: 60,
};

describe('DefenseModel', () => {
  it('should return 0 contest when too far', () => {
    const ctx: DefenseContext = {
      defenderPosition: new Vector2(0, 0),
      shooterPosition: new Vector2(200, 0),
      defenderVelocity: Vector2.zero(),
      defenderRatings: goodDefender,
      isInDefenseStance: true,
    };
    expect(DefenseModel.calculateContestPercent(ctx)).toBe(0);
  });

  it('should return high contest when close and in stance', () => {
    const ctx: DefenseContext = {
      defenderPosition: new Vector2(100, 100),
      shooterPosition: new Vector2(120, 100),
      defenderVelocity: Vector2.zero(),
      defenderRatings: goodDefender,
      isInDefenseStance: true,
    };
    const contest = DefenseModel.calculateContestPercent(ctx);
    expect(contest).toBeGreaterThan(0.5);
  });

  it('should give higher contest to better defender', () => {
    const baseCtx = {
      defenderPosition: new Vector2(100, 100),
      shooterPosition: new Vector2(140, 100),
      defenderVelocity: Vector2.zero(),
      isInDefenseStance: true,
    };
    const good = DefenseModel.calculateContestPercent({ ...baseCtx, defenderRatings: goodDefender });
    const poor = DefenseModel.calculateContestPercent({ ...baseCtx, defenderRatings: poorDefender });
    expect(good).toBeGreaterThan(poor);
  });

  it('should boost contest with defense stance', () => {
    const baseCtx = {
      defenderPosition: new Vector2(100, 100),
      shooterPosition: new Vector2(140, 100),
      defenderVelocity: Vector2.zero(),
      defenderRatings: goodDefender,
    };
    const withStance = DefenseModel.calculateContestPercent({ ...baseCtx, isInDefenseStance: true });
    const noStance = DefenseModel.calculateContestPercent({ ...baseCtx, isInDefenseStance: false });
    expect(withStance).toBeGreaterThan(noStance);
  });

  it('should return contest between 0 and 1', () => {
    const ctx: DefenseContext = {
      defenderPosition: new Vector2(100, 100),
      shooterPosition: new Vector2(101, 100),
      defenderVelocity: Vector2.zero(),
      defenderRatings: goodDefender,
      isInDefenseStance: true,
    };
    const contest = DefenseModel.calculateContestPercent(ctx);
    expect(contest).toBeGreaterThanOrEqual(0);
    expect(contest).toBeLessThanOrEqual(1);
  });
});
