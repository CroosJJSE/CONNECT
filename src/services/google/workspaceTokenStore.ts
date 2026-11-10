/**
 * Strictly in-memory cache for Google Workspace OAuth access tokens.
 * Access and refresh tokens are NEVER persisted in Firestore, localStorage, or sessionStorage.
 */

let inMemoryDriveAccessToken: string | null = null;
let inMemoryCalendarAccessToken: string | null = null;

export const workspaceTokenStore = {
  getDriveToken(): string | null {
    return inMemoryDriveAccessToken;
  },
  setDriveToken(token: string | null): void {
    inMemoryDriveAccessToken = token;
  },
  getCalendarToken(): string | null {
    return inMemoryCalendarAccessToken;
  },
  setCalendarToken(token: string | null): void {
    inMemoryCalendarAccessToken = token;
  },
  clearAll(): void {
    inMemoryDriveAccessToken = null;
    inMemoryCalendarAccessToken = null;
  },
};
