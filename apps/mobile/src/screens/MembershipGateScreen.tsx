import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@connect-core/hooks/useAuth';
import { Pressable } from '../components/Pressable';
import { colors, spacing, type } from '../theme';
import { getPlayStoreUrl, getPublicWebUrl } from '@connect-core/services/firebase/env';

export function MembershipGateScreen() {
  const { identity, accessState, signOut } = useAuth();
  const webLogin = `${getPublicWebUrl()}/login`;
  const unknown = accessState === 'unknown';
  const rejected = accessState === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {unknown
            ? 'Register on the website'
            : rejected
              ? 'Application not approved'
              : 'Waiting for approval'}
        </Text>
        <Text style={styles.body}>
          {unknown
            ? 'This Google account is not a CONNECT member yet. Apply on the website, then come back after an admin approves you.'
            : rejected
              ? 'A community administrator declined this account. Contact an admin if this is a mistake.'
              : 'Your application is being reviewed. You will get an email when you can join.'}
        </Text>
        {identity?.email ? <Text style={styles.email}>{identity.email}</Text> : null}
        {unknown ? (
          <Pressable style={styles.btn} onPress={() => void Linking.openURL(webLogin)}>
            <Text style={styles.btnText}>Open website registration</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={() => void Linking.openURL(getPlayStoreUrl())}>
            <Text style={styles.btnText}>Play Store listing</Text>
          </Pressable>
        )}
        <Pressable onPress={() => void signOut()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center', padding: spacing.lg },
  card: { gap: spacing.md },
  title: { ...type.headlineLg, marginBottom: spacing.xs },
  body: { ...type.bodyMd, color: colors.onSurfaceVariant },
  email: { ...type.labelSm, color: colors.outline },
  btn: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.onPrimary, fontWeight: '600' },
  signOut: { ...type.labelSm, color: colors.primary, textAlign: 'center', marginTop: spacing.md },
});
