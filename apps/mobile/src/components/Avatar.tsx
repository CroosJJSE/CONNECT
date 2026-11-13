import { Image, StyleSheet, Text, View } from 'react-native';
import { calculateLevelFromPoints } from '@connect-core/domain/logic/pointsRules';
import { useMemberLevels } from '@connect-core/hooks/memberLevelContext';
import { colors } from '../theme';

const SIZE = { xs: 24, sm: 32, md: 40, lg: 56, xl: 64 };

export function Avatar({
  src,
  initials,
  size = 'md',
  userId,
  level,
}: {
  src?: string;
  initials: string;
  size?: keyof typeof SIZE;
  userId?: string;
  level?: number;
}) {
  const levels = useMemberLevels();
  const resolved = Math.max(1, Math.floor(level ?? (userId ? levels[userId] ?? 1 : 1)));
  const dim = SIZE[size];
  const premium = resolved >= 6;

  return (
    <View style={[styles.wrap, { width: dim + 4, height: dim + 4 }, premium && styles.premiumRing]}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
      ) : (
        <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2 }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

export function levelLabel(points: number): string {
  return `Lv.${calculateLevelFromPoints(points)}`;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.outlineVariant,
  },
  premiumRing: {
    backgroundColor: '#fae088',
  },
  fallback: {
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
