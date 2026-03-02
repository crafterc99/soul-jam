import { IDataService, MatchResult } from './IDataService';

const STORAGE_KEY = 'soul-jam-history';

export class LocalStorageService implements IDataService {
  async saveMatchResult(result: MatchResult): Promise<void> {
    const history = await this.getMatchHistory();
    history.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  async getMatchHistory(): Promise<MatchResult[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MatchResult[];
    } catch {
      return [];
    }
  }
}
