import { describe, it, expect } from 'vitest';
import { SeparationModel, SeparationContext } from '../src/simulation/models/SeparationModel';
import { Vector2 } from '../src/utils/Vector2';
import { CharacterRatings } from '../src/data/CharacterRatings';

const ninetyNineRatings: CharacterRatings = {
  speed: 92, power: 68, range: 72, defense: 65, steal: 90, clutchEnergy: 60,
};

const breezyRatings: CharacterRatings = {
  speed: 75, power: 82, range: 85, defense: 88, steal: 58, clutchEnergy: 90,
};

describe('SeparationModel', () => {
  it('should give more separation to better ball handler (higher steal)', () => {
    const ctx99: SeparationContext = {
      offenseRatings: ninetyNineRatings,
      defenseRatings: breezyRatings,
      offenseVelocity: Vector2.zero(),
    };
    const ctxBreezy: SeparationContext = {
      offenseRatings: breezyRatings,
      defenseRatings: ninetyNineRatings,
      offenseVelocity: Vector2.zero(),
    };
    expect(SeparationModel.calculate(ctx99).separationDistance).toBeGreaterThan(
      SeparationModel.calculate(ctxBreezy).separationDistance,
    );
  });

  it('should give more separation when moving', () => {
    const still: SeparationContext = {
      offenseRatings: ninetyNineRatings,
      defenseRatings: breezyRatings,
      offenseVelocity: Vector2.zero(),
    };
    const moving: SeparationContext = {
      offenseRatings: ninetyNineRatings,
      defenseRatings: breezyRatings,
      offenseVelocity: new Vector2(300, 0),
    };
    expect(SeparationModel.calculate(moving).separationDistance).toBeGreaterThan(
      SeparationModel.calculate(still).separationDistance,
    );
  });

  it('should give positive separation distance', () => {
    const ctx: SeparationContext = {
      offenseRatings: breezyRatings,
      defenseRatings: ninetyNineRatings,
      offenseVelocity: Vector2.zero(),
    };
    const result = SeparationModel.calculate(ctx);
    expect(result.separationDistance).toBeGreaterThan(0);
    expect(result.burstVelocity).toBeGreaterThan(0);
  });

  it('should be reduced by high defense rating', () => {
    const vsLowDef: SeparationContext = {
      offenseRatings: ninetyNineRatings,
      defenseRatings: { ...breezyRatings, defense: 30 },
      offenseVelocity: Vector2.zero(),
    };
    const vsHighDef: SeparationContext = {
      offenseRatings: ninetyNineRatings,
      defenseRatings: { ...breezyRatings, defense: 95 },
      offenseVelocity: Vector2.zero(),
    };
    expect(SeparationModel.calculate(vsLowDef).separationDistance).toBeGreaterThan(
      SeparationModel.calculate(vsHighDef).separationDistance,
    );
  });
});
