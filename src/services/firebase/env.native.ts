function readEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  const expoKey = `EXPO_PUBLIC_${name.replace(/^VITE_/, '')}`;
  return process.env[name] ?? process.env[expoKey];
}

export function getPlayStoreUrl(): string {
  return readEnv('VITE_PLAY_STORE_URL') ?? 'https://play.google.com/store/apps';
}

export function getPublicWebUrl(): string {
  return (readEnv('VITE_APP_PUBLIC_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function getGoogleWebClientId(): string | undefined {
  return readEnv('VITE_GOOGLE_WEB_CLIENT_ID');
}

export function getCloudinaryConfig(): { cloudName?: string; uploadPreset?: string } {
  return {
    cloudName: readEnv('VITE_CLOUDINARY_CLOUD_NAME'),
    uploadPreset: readEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
  };
}

export function readFirebaseEnv(): {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
} {
  return {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
    firestoreDatabaseId: readEnv('VITE_FIREBASE_DATABASE_ID'),
  };
}
