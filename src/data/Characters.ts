import { CharacterDef } from './types';

export const CHARACTERS: Record<string, CharacterDef> = {
  ninetynine: {
    id: 'ninetynine',
    name: '99',
    title: 'Soul Guard',
    unlocked: true,
    rarity: 'rare',
    color: 0x00ccff,
    ratings: {
      speed: 92,
      power: 68,
      range: 72,
      defense: 65,
      steal: 90,
      clutchEnergy: 60,
    },
    assets: {
      portrait: '99full',
      selectBg: 'select-99',
    },
    sprites: {
      staticKey: 'char-99',
      frameSize: 180,
      animations: {
        idleDribble: { textureKey: '99-static-dribble', startFrame: 0, endFrame: 5, fps: 8, repeat: -1 },
        runDribble:  { textureKey: '99-dribble', startFrame: 0, endFrame: 7, fps: 10, repeat: -1 },
        jumpshot:    { textureKey: '99-jumpshot', startFrame: 0, endFrame: 6, fps: 8, repeat: 0 },
        stepback:    { textureKey: '99-stepback', startFrame: 0, endFrame: 3, fps: 8, repeat: 0 },
        crossover:   { textureKey: '99-crossover', startFrame: 0, endFrame: 3, fps: 13, repeat: 0 },
        backpedal:   { textureKey: '99-defense-backpedal', startFrame: 0, endFrame: 3, fps: 8, repeat: -1 },
        shuffle:     { textureKey: '99-defense-shuffle', startFrame: 0, endFrame: 1, fps: 6, repeat: -1 },
        steal:       { textureKey: '99-steal', startFrame: 0, endFrame: 2, fps: 8, repeat: 0 },
      },
    },
    homeCourtId: 'soul-jam-arena',
    tags: ['speed', 'thief'],
  },
  breezy: {
    id: 'breezy',
    name: 'Breezy',
    title: 'Tribe Elite',
    unlocked: true,
    rarity: 'rare',
    color: 0xff44aa,
    ratings: {
      speed: 75,
      power: 82,
      range: 85,
      defense: 88,
      steal: 58,
      clutchEnergy: 90,
    },
    assets: {
      portrait: 'breezyfull',
      selectBg: 'select-breezy',
    },
    sprites: {
      staticKey: 'char-breezy',
      frameSize: 180,
      animations: {
        idleDribble: { textureKey: 'breezy-static-dribble', startFrame: 0, endFrame: 5, fps: 8, repeat: -1 },
        runDribble:  { textureKey: 'breezy-dribble', startFrame: 0, endFrame: 7, fps: 10, repeat: -1 },
        jumpshot:    { textureKey: 'breezy-jumpshot', startFrame: 0, endFrame: 6, fps: 8, repeat: 0 },
        stepback:    { textureKey: 'breezy-stepback', startFrame: 0, endFrame: 3, fps: 8, repeat: 0 },
        crossover:   { textureKey: 'breezy-crossover', startFrame: 0, endFrame: 3, fps: 13, repeat: 0 },
        backpedal:   { textureKey: 'breezy-defense-backpedal', startFrame: 0, endFrame: 3, fps: 8, repeat: -1 },
        shuffle:     { textureKey: 'breezy-defense-shuffle', startFrame: 0, endFrame: 1, fps: 6, repeat: -1 },
        steal:       { textureKey: 'breezy-steal', startFrame: 0, endFrame: 2, fps: 8, repeat: 0 },
      },
    },
    homeCourtId: 'soul-jam-arena',
    tags: ['clutch', 'defense'],
  },
};

export function getCharacterIds(): string[] {
  return Object.keys(CHARACTERS);
}

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}

export function getUnlockedCharacterIds(): string[] {
  return Object.keys(CHARACTERS).filter(id => CHARACTERS[id].unlocked);
}
