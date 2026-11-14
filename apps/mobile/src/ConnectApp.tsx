import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@connect-core/hooks/useAuth';
import { ConnectDataProvider } from '@connect-core/hooks/useConnectData';
import { AppShell, type AppRoute } from './components/AppShell';
import { GCFLoadingProvider, GCFSplash } from './components/GCFLoader';
import { EventsScreen } from './screens/EventsScreen';
import { FeedScreen } from './screens/FeedScreen';
import { FinanceScreen } from './screens/FinanceScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MembershipGateScreen } from './screens/MembershipGateScreen';
import { OrbitScreen } from './screens/OrbitScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SharingScreen } from './screens/SharingScreen';

function AuthenticatedWorkspace() {
  const { user, identity, accessState, loading } = useAuth();
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const sharingTab = 'i_can' as const;

  useEffect(() => {
    if (user && !user.financeEnabled && activeRoute === 'finance') {
      setActiveRoute('home');
    }
  }, [user, activeRoute]);

  if (loading && !identity) {
    return <GCFSplash caption="Loading" />;
  }

  if (!identity) {
    return <LoginScreen />;
  }

  if (accessState === 'unknown' || accessState === 'pending' || accessState === 'rejected') {
    return <MembershipGateScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const resolvedRoute: AppRoute =
    activeRoute === 'finance' && !user.financeEnabled ? 'home' : activeRoute;

  return (
    <ConnectDataProvider>
      <AppShell
        activeRoute={resolvedRoute}
        onNavigate={setActiveRoute}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {resolvedRoute === 'home' && <FeedScreen searchQuery={searchQuery} />}
        {resolvedRoute === 'sharing' && (
          <SharingScreen initialTab={sharingTab} searchQuery={searchQuery} />
        )}
        {resolvedRoute === 'orbit' && <OrbitScreen searchQuery={searchQuery} />}
        {resolvedRoute === 'events' && <EventsScreen searchQuery={searchQuery} />}
        {resolvedRoute === 'finance' && user.financeEnabled && (
          <FinanceScreen searchQuery={searchQuery} />
        )}
        {resolvedRoute === 'profile' && <ProfileScreen />}
      </AppShell>
    </ConnectDataProvider>
  );
}

export default function ConnectApp() {
  return (
    <GCFLoadingProvider>
      <AuthProvider>
        <AuthenticatedWorkspace />
      </AuthProvider>
    </GCFLoadingProvider>
  );
}
