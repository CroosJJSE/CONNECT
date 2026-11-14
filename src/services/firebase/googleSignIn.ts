import { GoogleAuthProvider, signInWithPopup, type Auth, type UserCredential } from 'firebase/auth';
import { GOOGLE_CALENDAR_SCOPES } from '../google/googleCalendarService';
import { GOOGLE_DRIVE_SCOPES } from '../google/googleDriveService';
import { captureGoogleWorkspaceAccessToken } from '../google/workspaceAccess';

function googleWorkspaceProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_DRIVE_SCOPES[0]);
  provider.addScope(GOOGLE_CALENDAR_SCOPES[0]);
  provider.setCustomParameters({ prompt: 'consent', access_type: 'offline' });
  return provider;
}

function captureFromCredential(cred: UserCredential): void {
  const oauth = GoogleAuthProvider.credentialFromResult(cred);
  captureGoogleWorkspaceAccessToken(oauth?.accessToken);
}

export async function signInWithGoogleNative(auth: Auth): Promise<UserCredential> {
  const cred = await signInWithPopup(auth, googleWorkspaceProvider());
  captureFromCredential(cred);
  return cred;
}

export async function refreshGoogleWorkspaceAccess(auth: Auth): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in with Google first.');
  const cred = await signInWithPopup(auth, googleWorkspaceProvider());
  captureFromCredential(cred);
  const oauth = GoogleAuthProvider.credentialFromResult(cred);
  if (!oauth?.accessToken) {
    throw new Error('Google did not return Drive/Calendar access. Try signing in again.');
  }
  return oauth.accessToken;
}
