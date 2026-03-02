import { SCORE_LIMIT } from '../config/Constants';

export class ScoreKeeper {
  scores: [number, number] = [0, 0];

  addScore(playerIndex: number, points: number): void {
    this.scores[playerIndex] += points;
  }

  getScore(playerIndex: number): number {
    return this.scores[playerIndex];
  }

  isGameOver(): boolean {
    return this.scores[0] >= SCORE_LIMIT || this.scores[1] >= SCORE_LIMIT;
  }

  getWinner(): number | null {
    if (this.scores[0] >= SCORE_LIMIT) return 0;
    if (this.scores[1] >= SCORE_LIMIT) return 1;
    return null;
  }

  reset(): void {
    this.scores = [0, 0];
  }
}
