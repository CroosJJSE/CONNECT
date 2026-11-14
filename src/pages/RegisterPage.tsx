import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPlayStoreUrl } from '../services/firebase/env';

export function RegisterPage() {
  const { identity, submitJoinRequest, signOut, loading, error } = useAuth();
  const [displayName, setDisplayName] = useState(identity?.displayName ?? '');
  const [locality, setLocality] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    try {
      await submitJoinRequest({ displayName, locality });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to submit.');
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium text-secondary mb-2">Join GCF CONNECT</p>
        <h1 className="text-2xl font-semibold mb-2">Tell us who you are</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Admins will review your application. After approval you can use the website and the Android app.
        </p>
        {(error || localError) && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
            {localError || error}
          </div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-on-surface-variant">Name</span>
            <input
              className="mt-1 w-full rounded-xl bg-surface-container-low px-3 py-3 text-sm outline-none"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-on-surface-variant">Email</span>
            <input
              className="mt-1 w-full rounded-xl bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant"
              value={identity?.email ?? ''}
              readOnly
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-on-surface-variant">Place of living</span>
            <div className="mt-1 relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-outline" />
              <input
                className="w-full rounded-xl bg-surface-container-low pl-9 pr-3 py-3 text-sm outline-none"
                placeholder="e.g. Dehiwala, Borella, Mannar"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary font-medium disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
        <p className="text-xs text-on-surface-variant mt-4">
          You can already note the Play Store listing:{' '}
          <a className="text-primary underline" href={getPlayStoreUrl()} target="_blank" rel="noreferrer">
            Download the app
          </a>
        </p>
        <button type="button" onClick={() => void signOut()} className="mt-6 text-xs text-outline hover:underline">
          Use a different Google account
        </button>
      </div>
    </div>
  );
}
