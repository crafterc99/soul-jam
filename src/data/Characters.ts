import { CharacterDef } from './CharacterRatings';

export const CHARACTERS: Record<string, CharacterDef> = {
  ninetynine: {
    id: 'ninetynine',
    name: '99',
    title: 'Soul Guard',
    color: 0x00ccff,
    spriteKey: 'char-99',
    ratings: {
      speed: 92,
      power: 68,
      range: 72,
      defense: 65,
      steal: 90,
      clutchEnergy: 60,
    },
  },
  breezy: {
    id: 'breezy',
    name: 'Breezy',
    title: 'Tribe Elite',
    color: 0xff44aa,
    spriteKey: 'char-breezy',
    dribbleAnimKey: 'breezy-dribble-anim',
    idleDribbleAnimKey: 'breezy-idle-dribble-anim',
    ratings: {
      speed: 75,
      power: 82,
      range: 85,
      defense: 88,
      steal: 58,
      clutchEnergy: 90,
    },
  },
};
