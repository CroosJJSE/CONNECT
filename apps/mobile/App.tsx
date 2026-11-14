import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydratePlatformStorage } from '@connect-core/services/platform/platformStorage';
import { GCFSplash } from './src/components/GCFLoader';
import { colors } from './src/theme';

export default function App() {
  const [ReadyApp, setReadyApp] = useState<ComponentType | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await hydratePlatformStorage();
        const mod = await import('./src/ConnectApp');
        if (!cancelled) setReadyApp(() => mod.default);
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'Unable to start CONNECT.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {bootError ? (
        <View style={styles.boot}>
          <Text style={styles.error}>{bootError}</Text>
        </View>
      ) : ReadyApp ? (
        <ReadyApp />
      ) : (
        <GCFSplash caption="Starting" />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 24 },
  error: { color: colors.onErrorContainer, textAlign: 'center' },
});
