import { GoogleAuthProvider, signInWithCredential, type Auth, type UserCredential } from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { getGoogleWebClientId } from './env';
import { GOOGLE_CALENDAR_SCOPES } from '../google/googleCalendarService';
import { GOOGLE_DRIVE_SCOPES } from '../google/googleDriveService';
import { captureGoogleWorkspaceAccessToken } from '../google/workspaceAccess';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  GOOGLE_DRIVE_SCOPES[0],
  GOOGLE_CALENDAR_SCOPES[0],
];

async function promptGoogleAuth(): Promise<{ idToken: string; accessToken?: string }> {
  const clientId = getGoogleWebClientId();
  if (!clientId) {
    throw new Error('Missing Google web client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }

  const nonce = Math.random().toString(36).slice(2);
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  const redirectUri = AuthSession.makeRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: 'id_token token' as AuthSession.ResponseType,
    scopes: GOOGLE_SCOPES,
    extraParams: { nonce: hashedNonce, prompt: 'consent', access_type: 'offline' },
    usePKCE: false,
  });

  const result = await request.promptAsync({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  });

  if (result.type !== 'success') {
    throw new Error('Google Sign-In was cancelled.');
  }
  const idToken = result.params.id_token;
  if (!idToken) {
    throw new Error('Google Sign-In was cancelled.');
  }
  return { idToken, accessToken: result.params.access_token };
}

export async function signInWithGoogleNative(auth: Auth): Promise<UserCredential> {
  const { idToken, accessToken } = await promptGoogleAuth();
  captureGoogleWorkspaceAccessToken(accessToken);
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function refreshGoogleWorkspaceAccess(_auth: Auth): Promise<string> {
  const { accessToken } = await promptGoogleAuth();
  if (!accessToken) {
    throw new Error('Google did not return Drive/Calendar access. Try signing in again.');
  }
  captureGoogleWorkspaceAccessToken(accessToken);
  return accessToken;
}
