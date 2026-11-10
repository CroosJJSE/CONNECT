import { useEffect, useState } from 'react';
import { AppShell, type AppRoute } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConnectDataProvider } from './hooks/useConnectData';
import { DashboardFeedPage } from './pages/DashboardFeedPage';
import { EventsPage } from './pages/EventsPage';
import { FinancePage } from './pages/FinancePage';
import { LoginPage } from './pages/LoginPage';
import { OrbitPage } from './pages/OrbitPage';
import { ProfilePage } from './pages/ProfilePage';
import { SharingPage, type SharingTab } from './pages/SharingPage';

function AuthenticatedWorkspace() {
  const { user, loading } = useAuth();
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingTab, setSharingTab] = useState<SharingTab>('i_have');
  const [openCreateSignal, setOpenCreateSignal] = useState(0);

  useEffect(() => {
    if (user && !user.financeEnabled && activeRoute === 'finance') {
      setActiveRoute('home');
    }
  }, [user, activeRoute]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary font-bold flex items-center justify-center animate-pulse">
            GCF
          </div>
          <p className="text-sm text-on-surface-variant font-medium">Loading CONNECT…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const resolvedRoute: AppRoute =
    activeRoute === 'finance' && !user.financeEnabled ? 'home' : activeRoute;

  const handleOpenSharingTab = (tab: SharingTab, openCreate: boolean = false) => {
    setSharingTab(tab);
    if (openCreate) {
      setOpenCreateSignal((prev) => prev + 1);
    }
    setActiveRoute('sharing');
  };

  return (
    <ConnectDataProvider>
      <AppShell
        activeRoute={resolvedRoute}
        onNavigate={setActiveRoute}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {resolvedRoute === 'home' && (
          <DashboardFeedPage
            searchQuery={searchQuery}
            onNavigate={setActiveRoute}
            onOpenSharingTab={handleOpenSharingTab}
          />
        )}
        {resolvedRoute === 'sharing' && (
          <SharingPage
            initialTab={sharingTab}
            openCreateSignal={openCreateSignal}
            searchQuery={searchQuery}
          />
        )}
        {resolvedRoute === 'orbit' && <OrbitPage searchQuery={searchQuery} />}
        {resolvedRoute === 'events' && <EventsPage searchQuery={searchQuery} />}
        {resolvedRoute === 'finance' && user.financeEnabled && (
          <FinancePage searchQuery={searchQuery} />
        )}
        {resolvedRoute === 'profile' && <ProfilePage />}
      </AppShell>
    </ConnectDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedWorkspace />
    </AuthProvider>
  );
}
