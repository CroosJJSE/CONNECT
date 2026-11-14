import { workspaceTokenStore } from './workspaceTokenStore';

export function captureGoogleWorkspaceAccessToken(accessToken: string | null | undefined): void {
  if (!accessToken) return;
  workspaceTokenStore.setDriveToken(accessToken);
  workspaceTokenStore.setCalendarToken(accessToken);
}

export function requireGoogleWorkspaceAccessToken(): string {
  const token = workspaceTokenStore.getDriveToken() ?? workspaceTokenStore.getCalendarToken();
  if (!token) {
    throw new Error('Google Drive and Calendar access expired. Sign in again to reconnect.');
  }
  return token;
}

export function hasGoogleWorkspaceAccessToken(): boolean {
  return Boolean(workspaceTokenStore.getDriveToken() || workspaceTokenStore.getCalendarToken());
}
