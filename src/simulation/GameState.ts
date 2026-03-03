export enum GamePhase {
  CheckBall = 'checkBall',
  Inbound = 'inbound',
  Live = 'live',
  Shooting = 'shooting',
  Scored = 'scored',
  Missed = 'missed',
  Violation = 'violation',
  GameOver = 'gameOver',
}

export interface GameStateSnapshot {
  phase: GamePhase;
  scores: [number, number];
  possession: number; // 0 or 1
  phaseTimer: number;
  lastScorerIndex: number;
  lastShotPoints: number;
}
