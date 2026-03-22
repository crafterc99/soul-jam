import { CourtDef } from './types';

export const COURTS: Record<string, CourtDef> = {
  'soul-jam-arena': {
    id: 'soul-jam-arena',
    name: 'Soul Jam Arena',
    unlocked: true,
    assets: {
      floor: 'court',
      thumbnail: 'court',
    },
    style: {
      lineColor: '#ffffff',
      paintColor: '#cc3333',
      rimColor: '#ff4400',
      netColor: '#ffffff',
      backboardColor: '#333333',
      stanchionColor: '#666666',
    },
  },
  'street': {
    id: 'street',
    name: 'The Street',
    unlocked: false,
    unlockCondition: 'win_5_matches',
    assets: {
      floor: 'court',
      thumbnail: 'court',
    },
    style: {
      lineColor: '#cccccc',
      paintColor: '#555555',
      rimColor: '#ff6600',
      netColor: '#999999',
      backboardColor: '#222222',
      stanchionColor: '#444444',
    },
  },
};

export function getCourtIds(): string[] {
  return Object.keys(COURTS);
}

export function getCourtDef(id: string): CourtDef | undefined {
  return COURTS[id];
}

export function getDefaultCourtId(): string {
  return 'soul-jam-arena';
}
