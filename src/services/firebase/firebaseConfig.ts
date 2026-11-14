/**
 * Environment-driven Firebase initialization configuration.
 * Populate VITE_FIREBASE_* (web) or EXPO_PUBLIC_FIREBASE_* (mobile).
 */

import { readFirebaseEnv } from './env';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const env = readFirebaseEnv();
  if (!env.apiKey || !env.authDomain || !env.projectId || !env.appId) {
    return null;
  }
  return {
    apiKey: env.apiKey,
    authDomain: env.authDomain,
    projectId: env.projectId,
    appId: env.appId,
    firestoreDatabaseId: env.firestoreDatabaseId,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseClientConfig() !== null;
}
