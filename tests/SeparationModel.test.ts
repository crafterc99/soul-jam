import { describe, it, expect } from 'vitest';
import { SeparationModel, SeparationContext } from '../src/simulation/models/SeparationModel';
import { Vector2 } from '../src/utils/Vector2';
import { CharacterRatings } from '../src/data/CharacterRatings';

const flashRatings: CharacterRatings = {
  speed: 92, acceleration: 88, ballHandle: 90,
  shotRating: 72, defense: 65, lateralQuickness: 85, contestResistance: 60,
};

const tankRatings: CharacterRatings = {
  speed: 65, acceleration: 60, ballHandle: 55,
  shotRating: 80, defense: 90, lateralQuickness: 58, contestResistance: 88,
};

describe('SeparationModel', () => {
  it('should give more separation to better ball handler', () => {
    const flashCtx: SeparationContext = {
      offenseRatings: flashRatings,
      defenseRatings: tankRatings,
      offenseVelocity: Vector2.zero(),
    };
    const tankCtx: SeparationContext = {
      offenseRatings: tankRatings,
      defenseRatings: flashRatings,
      offenseVelocity: Vector2.zero(),
    };
    const flashSep = SeparationModel.calculate(flashCtx);
    const tankSep = SeparationModel.calculate(tankCtx);
    expect(flashSep.separationDistance).toBeGreaterThan(tankSep.separationDistance);
  });

  it('should give more separation when moving', () => {
    const still: SeparationContext = {
      offenseRatings: flashRatings,
      defenseRatings: tankRatings,
      offenseVelocity: Vector2.zero(),
    };
    const moving: SeparationContext = {
      offenseRatings: flashRatings,
      defenseRatings: tankRatings,
      offenseVelocity: new Vector2(300, 0),
    };
    expect(SeparationModel.calculate(moving).separationDistance).toBeGreaterThan(
      SeparationModel.calculate(still).separationDistance,
    );
  });

  it('should give positive separation distance', () => {
    const ctx: SeparationContext = {
      offenseRatings: tankRatings,
      defenseRatings: flashRatings,
      offenseVelocity: Vector2.zero(),
    };
    const result = SeparationModel.calculate(ctx);
    expect(result.separationDistance).toBeGreaterThan(0);
    expect(result.burstVelocity).toBeGreaterThan(0);
  });

  it('should be reduced by high lateral quickness', () => {
    const vsSlowDef: SeparationContext = {
      offenseRatings: flashRatings,
      defenseRatings: { ...tankRatings, lateralQuickness: 30 },
      offenseVelocity: Vector2.zero(),
    };
    const vsFastDef: SeparationContext = {
      offenseRatings: flashRatings,
      defenseRatings: { ...tankRatings, lateralQuickness: 95 },
      offenseVelocity: Vector2.zero(),
    };
    expect(SeparationModel.calculate(vsSlowDef).separationDistance).toBeGreaterThan(
      SeparationModel.calculate(vsFastDef).separationDistance,
    );
  });
});
