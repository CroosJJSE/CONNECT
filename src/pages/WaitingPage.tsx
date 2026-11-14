import { Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPlayStoreUrl } from '../services/firebase/env';

export function WaitingPage() {
  const { identity, accessState, signOut } = useAuth();
  const rejected = accessState === 'rejected';

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-on-secondary-container" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          {rejected ? 'Application not approved' : 'Waiting for approval'}
        </h1>
        <p className="text-sm text-on-surface-variant mb-6">
          {rejected
            ? 'A community administrator declined this Google account. Contact an admin if this is a mistake.'
            : `Thanks ${identity?.displayName ?? ''}. An admin will review your details. We’ll email you when you can join.`}
        </p>
        {!rejected && (
          <a
            href={getPlayStoreUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center px-4 rounded-xl bg-primary text-on-primary text-sm font-medium"
          >
            Get the Android app
          </a>
        )}
        <p className="text-xs text-on-surface-variant mt-6">Signed in as {identity?.email}</p>
        <button type="button" onClick={() => void signOut()} className="mt-3 text-xs text-primary hover:underline">
          Sign out
        </button>
      </div>
    </div>
  );
}
