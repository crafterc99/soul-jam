import { CharacterDef } from './CharacterRatings';

export const CHARACTERS: Record<string, CharacterDef> = {
  flash: {
    id: 'flash',
    name: 'Flash',
    color: 0x00aaff,
    ratings: {
      speed: 92,
      acceleration: 88,
      ballHandle: 90,
      shotRating: 72,
      defense: 65,
      lateralQuickness: 85,
      contestResistance: 60,
    },
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    color: 0xff4444,
    ratings: {
      speed: 65,
      acceleration: 60,
      ballHandle: 55,
      shotRating: 80,
      defense: 90,
      lateralQuickness: 58,
      contestResistance: 88,
    },
  },
};
