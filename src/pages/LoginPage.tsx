import { useState } from 'react';
import { Shield, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ModalSheet } from '../components/common/ModalSheet';

export function LoginPage() {
  const { signInWithGoogle, loading, error } = useAuth();
  const [emblemFailed, setEmblemFailed] = useState(false);
  const [infoSheet, setInfoSheet] = useState<'help' | 'privacy' | 'terms' | null>(null);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between px-6 py-8">
      {/* Top Portal Badge */}
      <div className="w-full flex justify-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-low text-secondary text-xs font-medium shadow-xs">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>Private Member Portal</span>
        </div>
      </div>

      {/* Central Trust & Auth Core */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center my-auto py-8">
        {/* Brand Emblem with Ambient Glow */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute -inset-3 bg-secondary-fixed/40 rounded-full blur-xl pointer-events-none" />
          <div className="relative w-full max-w-[340px] aspect-[342/393] flex items-center justify-center">
            {!emblemFailed ? (
              <img
                src="/logo.jpeg"
                alt="Graduate Christian Fellowship"
                onError={() => setEmblemFailed(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xl">
                GCF
              </div>
            )}
          </div>
        </div>

        {/* Brand Identity */}
        <div className="text-center mb-6">
          <h1 className="text-[32px] leading-[40px] font-semibold text-on-surface tracking-tight mb-1">
            CONNECT
          </h1>
          <p className="text-base text-on-surface-variant font-medium">
            Share what you have. Support one another.
          </p>
        </div>

        {/* Community Purpose Card */}
        <div className="w-full bg-surface-container-low rounded-xl p-4 mb-6 shadow-xs text-center">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            A private community space for GCF members to share resources, offer help, coordinate gatherings, and stay connected.
          </p>
        </div>

        {error && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-medium">
            {error}
          </div>
        )}

        {/* Primary Action: Google Authentication */}
        <div className="w-full space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInWithGoogle()}
            className="w-full min-h-[52px] bg-surface-container-lowest hover:bg-surface-container-low active:scale-[0.99] text-on-surface text-base font-medium rounded-xl shadow-sm flex items-center justify-center gap-3 px-4 transition-all disabled:opacity-60 border border-outline-variant/30"
          >
            <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                fill="#EA4335"
              />
            </svg>
            <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-outline text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Access is available to verified GCF members.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex flex-col items-center text-center space-y-2 pt-4">
        <p className="text-xs text-on-surface-variant max-w-xs">
          Need help accessing your account?{' '}
          <button
            type="button"
            onClick={() => setInfoSheet('help')}
            className="text-primary hover:underline font-medium"
          >
            Contact your community administrator.
          </button>
        </p>
        <div className="flex items-center gap-3 text-outline text-xs">
          <button type="button" onClick={() => setInfoSheet('privacy')} className="hover:text-on-surface">
            Privacy
          </button>
          <span aria-hidden="true">•</span>
          <button type="button" onClick={() => setInfoSheet('terms')} className="hover:text-on-surface">
            Terms of Sanctuary
          </button>
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-xs text-on-surface-variant font-medium">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Made by WeGrow Cooperative</span>
        </div>
      </footer>

      <ModalSheet
        open={infoSheet !== null}
        title={
          infoSheet === 'help'
            ? 'Community Administrator Support'
            : infoSheet === 'privacy'
              ? 'Privacy & User-Owned Media'
              : 'Terms of Sanctuary'
        }
        onClose={() => setInfoSheet(null)}
      >
        {infoSheet === 'help' && (
          <div className="space-y-3 text-sm text-on-surface-variant">
            <p>
              Membership verification for Lotus Grove and partner GCF clusters is handled by your cluster stewards.
            </p>
            <p>
              Ensure you sign in with the verified Google account registered with your cohousing unit.
            </p>
          </div>
        )}
        {infoSheet === 'privacy' && (
          <div className="space-y-3 text-sm text-on-surface-variant">
            <p>
              CONNECT stores personal finance records privately per owner, protects My Orbit and Private posts with server rules, and saves uploaded media inside your own Google Drive folder rather than third-party storage.
            </p>
          </div>
        )}
        {infoSheet === 'terms' && (
          <div className="space-y-3 text-sm text-on-surface-variant">
            <p>
              All shared tools, skills, and community gatherings are strictly non-commercial and guided by mutual care, timely returns, and respect for member privacy.
            </p>
          </div>
        )}
      </ModalSheet>
    </div>
  );
}
