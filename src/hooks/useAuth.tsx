import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AccessState, AuthIdentity, AuthSession, JoinRequest, UserProfile } from '../domain/models';
import { services } from '../services/serviceContainer';

interface AuthContextValue {
  user: UserProfile | null;
  profile: UserProfile | null;
  identity: AuthIdentity | null;
  accessState: AccessState | null;
  isAdmin: boolean;
  usesLiveFirebase: boolean;
  demoAccounts: UserProfile[];
  loading: boolean;
  error: string | null;
  signInWithGoogle: (preferredUid?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<
        UserProfile,
        'displayName' | 'clusterName' | 'unitLabel' | 'bio' | 'preferredCurrency' | 'phoneVisibleToHousemates' | 'financeEnabled'
      >
    >
  ) => Promise<void>;
  submitJoinRequest: (input: { displayName: string; locality: string }) => Promise<void>;
  listJoinRequests: () => Promise<JoinRequest[]>;
  approveJoinRequest: (uid: string) => Promise<void>;
  rejectJoinRequest: (uid: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(
  session: AuthSession | null,
  setIdentity: (v: AuthIdentity | null) => void,
  setProfile: (v: UserProfile | null) => void,
  setAccessState: (v: AccessState | null) => void,
  setIsAdmin: (v: boolean) => void,
  setUser: (v: UserProfile | null) => void
) {
  if (!session) {
    setIdentity(null);
    setProfile(null);
    setAccessState(null);
    setIsAdmin(false);
    setUser(null);
    return;
  }
  setIdentity(session.identity);
  setProfile(session.profile);
  setAccessState(session.accessState);
  setIsAdmin(session.isAdmin);
  setUser(session.accessState === 'active' && session.profile ? session.profile : null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usesLiveFirebase = services.auth.usesLiveFirebase();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    setLoading(true);
    try {
      unsub = services.auth.subscribeSession((session) => {
        applySession(session, setIdentity, setProfile, setAccessState, setIsAdmin, setUser);
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to restore session.');
      setLoading(false);
    }
    void services.auth.getDemoAccounts().then(setDemoAccounts).catch(() => setDemoAccounts([]));
    return () => {
      unsub?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async (preferredUid?: string) => {
    try {
      setError(null);
      setLoading(true);
      const session = await services.auth.signInWithGoogle(preferredUid);
      applySession(session, setIdentity, setProfile, setAccessState, setIsAdmin, setUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await services.auth.signOut();
      applySession(null, setIdentity, setProfile, setAccessState, setIsAdmin, setUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (
      patch: Partial<
        Pick<
          UserProfile,
          'displayName' | 'clusterName' | 'unitLabel' | 'bio' | 'preferredCurrency' | 'phoneVisibleToHousemates' | 'financeEnabled'
        >
      >
    ) => {
      const uid = user?.uid ?? identity?.uid;
      if (!uid) return;
      try {
        setError(null);
        const updated = await services.auth.updateProfile(uid, patch);
        setProfile(updated);
        if (accessState === 'active') setUser(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update profile.');
        throw err;
      }
    },
    [user, identity, accessState]
  );

  const submitJoinRequest = useCallback(async (input: { displayName: string; locality: string }) => {
    try {
      setError(null);
      setLoading(true);
      const session = await services.auth.submitJoinRequest(input);
      applySession(session, setIdentity, setProfile, setAccessState, setIsAdmin, setUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listJoinRequests = useCallback(() => services.auth.listJoinRequests(), []);
  const approveJoinRequest = useCallback((uid: string) => services.auth.approveJoinRequest(uid), []);
  const rejectJoinRequest = useCallback((uid: string) => services.auth.rejectJoinRequest(uid), []);

  const refreshUser = useCallback(async () => {
    const session = await services.auth.getSession();
    applySession(session, setIdentity, setProfile, setAccessState, setIsAdmin, setUser);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        identity,
        accessState,
        isAdmin,
        usesLiveFirebase,
        demoAccounts,
        loading,
        error,
        signInWithGoogle,
        signOut,
        updateProfile,
        submitJoinRequest,
        listJoinRequests,
        approveJoinRequest,
        rejectJoinRequest,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
