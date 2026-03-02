export interface MatchResult {
  timestamp: number;
  mode: 'cpu' | 'local2p';
  p1Character: string;
  p2Character: string;
  p1Score: number;
  p2Score: number;
  winner: number; // 0 or 1
}

export interface IDataService {
  saveMatchResult(result: MatchResult): Promise<void>;
  getMatchHistory(): Promise<MatchResult[]>;
}
