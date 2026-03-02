export interface IAuthService {
  signInAnonymously(): Promise<string>;
  getCurrentUserId(): string | null;
  signOut(): Promise<void>;
}
