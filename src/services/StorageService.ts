import { LeaderboardEntry, UnlockState } from '../data/types';
import { CHARACTERS } from '../data/Characters';
import { COURTS } from '../data/courts';

const LEADERBOARD_KEY = 'soul-jam-leaderboard';
const UNLOCK_KEY = 'soul-jam-unlocks';

export class StorageService {
  // ─── Leaderboard ──────────────────────────────────────────────

  getLeaderboard(): Record<string, LeaderboardEntry> {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  getCharacterEntry(characterId: string): LeaderboardEntry {
    const lb = this.getLeaderboard();
    return lb[characterId] ?? {
      characterId,
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
    };
  }

  recordWin(characterId: string): void {
    const lb = this.getLeaderboard();
    const entry = lb[characterId] ?? { characterId, wins: 0, losses: 0, streak: 0, bestStreak: 0 };
    entry.wins++;
    entry.streak++;
    entry.bestStreak = Math.max(entry.bestStreak, entry.streak);
    lb[characterId] = entry;
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
  }

  recordLoss(characterId: string): void {
    const lb = this.getLeaderboard();
    const entry = lb[characterId] ?? { characterId, wins: 0, losses: 0, streak: 0, bestStreak: 0 };
    entry.losses++;
    entry.streak = 0;
    lb[characterId] = entry;
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
  }

  // ─── Unlock State ─────────────────────────────────────────────

  getUnlockState(): UnlockState {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch { /* fall through */ }
    }
    // Build default from character/court definitions
    const characters: Record<string, boolean> = {};
    for (const id of Object.keys(CHARACTERS)) {
      characters[id] = CHARACTERS[id].unlocked;
    }
    const courts: Record<string, boolean> = {};
    for (const id of Object.keys(COURTS)) {
      courts[id] = COURTS[id].unlocked;
    }
    return { characters, courts, totalWins: 0, totalGames: 0 };
  }

  saveUnlockState(state: UnlockState): void {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(state));
  }

  isCharacterUnlocked(id: string): boolean {
    const state = this.getUnlockState();
    return state.characters[id] ?? false;
  }

  isCourtUnlocked(id: string): boolean {
    const state = this.getUnlockState();
    return state.courts[id] ?? false;
  }

  unlockCharacter(id: string): void {
    const state = this.getUnlockState();
    state.characters[id] = true;
    this.saveUnlockState(state);
  }

  unlockCourt(id: string): void {
    const state = this.getUnlockState();
    state.courts[id] = true;
    this.saveUnlockState(state);
  }

  // Called after a match to update totals and check unlocks
  recordMatch(winnerCharId: string, loserCharId: string): string[] {
    this.recordWin(winnerCharId);
    this.recordLoss(loserCharId);

    const state = this.getUnlockState();
    state.totalWins++;
    state.totalGames++;

    const newUnlocks: string[] = [];

    // Check unlock conditions
    // "win_5_matches" — unlock "The Street" court
    if (state.totalWins >= 5 && !state.courts['street']) {
      state.courts['street'] = true;
      newUnlocks.push('court:street');
    }

    this.saveUnlockState(state);
    return newUnlocks;
  }

  incrementTotalGames(): void {
    const state = this.getUnlockState();
    state.totalGames++;
    this.saveUnlockState(state);
  }
}

// Singleton
let _instance: StorageService | null = null;
export function getStorageService(): StorageService {
  if (!_instance) _instance = new StorageService();
  return _instance;
}
