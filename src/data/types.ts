// ─── Shared Interfaces ─────────────────────────────────────────────

export interface CharacterRatings {
  speed: number;
  power: number;
  range: number;
  defense: number;
  steal: number;
  clutchEnergy: number;
}

export interface AnimationDef {
  textureKey: string;
  startFrame: number;
  endFrame: number;
  fps: number;
  repeat: number; // -1 = loop, 0 = play once
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  unlocked: boolean;
  unlockCondition?: string;
  rarity?: 'common' | 'rare' | 'legendary';
  color: number;
  ratings: CharacterRatings;
  assets: {
    portrait: string;
    selectBg: string;
    plateCard?: string;
    rosterCard?: string;
  };
  sprites: {
    staticKey: string;
    frameSize: number;
    animations: Record<string, AnimationDef>;
  };
  homeCourtId?: string;
  tags?: string[];
}

export interface CourtDef {
  id: string;
  name: string;
  unlocked: boolean;
  unlockCondition?: string;
  assets: {
    floor: string;
    thumbnail: string;
    centerLogo?: string;
    background?: string;
  };
  style: {
    lineColor: string;
    paintColor: string;
    rimColor: string;
    netColor: string;
    backboardColor: string;
    stanchionColor: string;
  };
}

export interface ThemeDef {
  id: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textDim: string;
  };
  fonts: {
    heading: string;
    body: string;
    score: string;
  };
  assets: {
    menuBg?: string;
    scoreboardSkin?: string;
    cardFrame?: string;
  };
}

export interface MatchConfig {
  scoreLimit: number;
  courtId: string;
  p1CharacterId: string;
  p2CharacterId: string;
  mode: 'cpu' | 'local2p';
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

export interface LeaderboardEntry {
  characterId: string;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
}

export interface UnlockState {
  characters: Record<string, boolean>;
  courts: Record<string, boolean>;
  totalWins: number;
  totalGames: number;
}
