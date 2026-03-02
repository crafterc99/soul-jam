import { IAuthService } from './IAuthService';
import { IDataService, MatchResult } from './IDataService';

export class FirebaseService implements IAuthService, IDataService {
  async signInAnonymously(): Promise<string> {
    throw new Error('Firebase not implemented - use LocalStorageService for MVP');
  }

  getCurrentUserId(): string | null {
    throw new Error('Firebase not implemented');
  }

  async signOut(): Promise<void> {
    throw new Error('Firebase not implemented');
  }

  async saveMatchResult(_result: MatchResult): Promise<void> {
    throw new Error('Firebase not implemented - use LocalStorageService for MVP');
  }

  async getMatchHistory(): Promise<MatchResult[]> {
    throw new Error('Firebase not implemented - use LocalStorageService for MVP');
  }
}
