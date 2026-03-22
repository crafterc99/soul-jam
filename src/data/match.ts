import { MatchConfig } from './types';
import { getDefaultCourtId } from './courts';

export function createDefaultMatchConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    scoreLimit: 21,
    courtId: getDefaultCourtId(),
    p1CharacterId: 'breezy',
    p2CharacterId: 'ninetynine',
    mode: 'cpu',
    aiDifficulty: 'medium',
    ...overrides,
  };
}
