import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@connect-core/hooks/useAuth';
import { ConnectDataProvider } from '@connect-core/hooks/useConnectData';
import { AppShell, type AppRoute } from './components/AppShell';
import { EventsScreen } from './screens/EventsScreen';
import { FeedScreen } from './screens/FeedScreen';
import { FinanceScreen } from './screens/FinanceScreen';
import { LoginScreen } from './screens/LoginScreen';
import { OrbitScreen } from './screens/OrbitScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SharingScreen } from './screens/SharingScreen';
import { colors } from './theme';

function AuthenticatedWorkspace() {
  const { user, loading } = useAuth();
  const [activeRoute, setActiveRoute] = useState<AppRoute>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const sharingTab = 'i_can' as const;

  useEffect(() => {
    if (user && !user.financeEnabled && activeRoute === 'finance') {
      setActiveRoute('home');
    }
  }, [user, activeRoute]);

  if (loading && !user) {
    return (
      <View style={styles.boot}>
        <Image source={require('../assets/emblem.png')} style={styles.mark} resizeMode="contain" />
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.bootText}>Loading GCF Connect…</Text>
      </View>
    );
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
    <AuthProvider>
      <AuthenticatedWorkspace />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, gap: 12 },
  mark: { width: 120, height: 120 },
  bootText: { color: colors.onSurfaceVariant, fontWeight: '600' },
});
