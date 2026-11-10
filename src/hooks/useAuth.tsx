import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '../domain/models';
import { services } from '../services/serviceContainer';

interface AuthContextValue {
  user: UserProfile | null;
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
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const [current, accounts] = await Promise.all([
        services.auth.getCurrentUser(),
        services.auth.getDemoAccounts(),
      ]);
      setUser(current);
      setDemoAccounts(accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to restore session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const signInWithGoogle = useCallback(async (preferredUid?: string) => {
    try {
      setError(null);
      setLoading(true);
      const profile = await services.auth.signInWithGoogle(preferredUid);
      setUser(profile);
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
      setUser(null);
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
      if (!user) return;
      try {
        setError(null);
        const updated = await services.auth.updateProfile(user.uid, patch);
        setUser(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update profile.');
        throw err;
      }
    },
    [user]
  );

  const refreshUser = useCallback(async () => {
    const current = await services.auth.getCurrentUser();
    setUser(current);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        demoAccounts,
        loading,
        error,
        signInWithGoogle,
        signOut,
        updateProfile,
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
