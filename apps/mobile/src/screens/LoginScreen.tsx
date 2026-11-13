import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@connect-core/hooks/useAuth';
import { BrandGlyph, GoogleGlyph, Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { colors, spacing, type } from '../theme';

const logo = require('../../assets/logo.jpeg');

export function LoginScreen() {
  const { signInWithGoogle, demoAccounts, loading, error } = useAuth();
  const [selectedUid, setSelectedUid] = useState('user-elena');
  const selected = demoAccounts.find((a) => a.uid === selectedUid);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.top}>
          <View style={styles.badge}>
            <Icon name="shield" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>Private Member Portal</Text>
          </View>
        </View>

        <View style={styles.core}>
          <View style={styles.emblemWrap}>
            <Image source={logo} style={styles.emblem} resizeMode="contain" />
          </View>

          <Text style={styles.title}>GCF Connect</Text>
          <Text style={styles.subtitle}>Share what you have. Support one another.</Text>

          <View style={styles.purpose}>
            <Text style={styles.purposeText}>
              A private community space for GCF members to share resources, offer help, find
              support, and stay connected.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={loading}
            onPress={() => void signInWithGoogle(selectedUid)}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
              loading && { opacity: 0.6 },
            ]}
          >
            <GoogleGlyph size={20} />
            <Text style={styles.googleLabel}>{loading ? 'Signing in…' : 'Continue with Google'}</Text>
          </Pressable>

          <View style={styles.verifyRow}>
            <Icon name="verified-user" size={16} color={colors.outline} />
            <Text style={styles.verifyText}>Access is available to verified GCF members.</Text>
          </View>

          {demoAccounts.length > 0 ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>
                Preview as {selected?.displayName ?? 'member'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                {demoAccounts.map((acc) => {
                  const on = acc.uid === selectedUid;
                  return (
                    <Pressable
                      key={acc.uid}
                      onPress={() => setSelectedUid(acc.uid)}
                      style={[styles.previewChip, on && styles.previewChipOn]}
                    >
                      {acc.avatarUrl ? (
                        <Image source={{ uri: acc.avatarUrl }} style={styles.previewAvatar} />
                      ) : null}
                      <Text style={[styles.previewChipText, on && styles.previewChipTextOn]}>
                        {acc.displayName.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.help}>
            Need help accessing your account?{' '}
            <Text
              style={styles.helpLink}
              onPress={() =>
                Alert.alert(
                  'Community administrator',
                  'Ask your GCF community administrator to verify your membership.'
                )
              }
            >
              Contact your community administrator.
            </Text>
          </Text>
          <View style={styles.legalRow}>
            <Pressable onPress={() => Alert.alert('Privacy', 'Member data stays inside this private GCF space.')}>
              <Text style={styles.legal}>Privacy</Text>
            </Pressable>
            <Text style={styles.dot}>•</Text>
            <Pressable onPress={() => Alert.alert('Terms of Sanctuary', 'This is a private, verified-members community.')}>
              <Text style={styles.legal}>Terms of Sanctuary</Text>
            </Pressable>
          </View>
          <View style={styles.madeBy}>
            <Text style={styles.madeByLabel}>Made by</Text>
            <View style={styles.wegrowMark}>
              <BrandGlyph size={14} />
            </View>
            <Text style={styles.wegrow}>WeGrow</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', paddingTop: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.containerLow,
  },
  badgeText: { ...type.labelSm, color: colors.secondary },
  core: { alignItems: 'center', width: '100%', maxWidth: 400, alignSelf: 'center' },
  emblemWrap: {
    width: '100%',
    aspectRatio: 342 / 393,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emblem: { width: '100%', height: '100%' },
  title: { ...type.headlineLg, letterSpacing: -0.4, marginBottom: spacing.xs },
  subtitle: { ...type.bodyMd, color: colors.onSurfaceVariant, fontWeight: '500', textAlign: 'center', marginBottom: spacing.lg },
  purpose: {
    width: '100%',
    backgroundColor: colors.containerLow,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  purposeText: { ...type.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  error: {
    width: '100%',
    color: colors.onErrorContainer,
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  googleBtn: {
    width: '100%',
    minHeight: 52,
    backgroundColor: colors.containerLowest,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  googleLabel: { fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.onSurface },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  verifyText: { ...type.labelSm, color: colors.outline },
  preview: { width: '100%', marginTop: spacing.lg, alignItems: 'center' },
  previewLabel: { ...type.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
  previewRow: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.container,
  },
  previewChipOn: { backgroundColor: colors.secondaryContainer },
  previewAvatar: { width: 20, height: 20, borderRadius: 10 },
  previewChipText: { ...type.labelSm, color: colors.onSurfaceVariant },
  previewChipTextOn: { color: colors.onSecondaryContainer, fontWeight: '600' },
  footer: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  help: { ...type.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', maxWidth: 320 },
  helpLink: { color: colors.primary, fontWeight: '500' },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xs },
  legal: { ...type.labelSm, color: colors.outline },
  dot: { color: colors.outline },
  madeBy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.md },
  madeByLabel: { ...type.labelSm, color: colors.onSurfaceVariant, fontWeight: '500' },
  wegrowMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(174, 199, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wegrow: { ...type.labelSm, color: colors.onSurface, fontWeight: '500' },
});
