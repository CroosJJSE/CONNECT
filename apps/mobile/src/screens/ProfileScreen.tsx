import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { calculateLevelFromPoints, getLevelFrameStyle } from '@connect-core/domain/logic/pointsRules';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Card, Field, OutlineButton, PrimaryButton } from '../components/ui';
import { colors } from '../theme';

export function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const { memberTransactions, interestGroups, toggleGroup, notifySuccess } = useConnectData();
  const [name, setName] = useState(user?.displayName ?? '');
  const [cluster, setCluster] = useState(user?.clusterName ?? '');
  const [unit, setUnit] = useState(user?.unitLabel ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [togglingFinance, setTogglingFinance] = useState(false);

  if (!user) return null;

  const level = calculateLevelFromPoints(user.points ?? 0);
  const frame = getLevelFrameStyle(level);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Card>
        <View style={styles.header}>
          <Avatar userId={user.uid} src={user.avatarUrl} initials={user.initials} size="lg" level={level} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.name}>{user.displayName}</Text>
              {user.verified ? (
                <View style={styles.verified}>
                  <Icon name="verified" size={12} color={colors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {user.clusterName} • {user.unitLabel}
            </Text>
            <Text style={styles.meta}>
              Level {level} · {frame.tierName} · {user.points ?? 0} pts
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Finance tracker</Text>
        <Text style={styles.body}>
          Personal money tools stay off until you opt in. SMS inbox access is never requested here.
        </Text>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>Enable Finance</Text>
          <Switch
            value={Boolean(user.financeEnabled)}
            disabled={togglingFinance}
            onValueChange={(next) => {
              setTogglingFinance(true);
              void updateProfile({ financeEnabled: next }).finally(() => setTogglingFinance(false));
            }}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Edit profile</Text>
        <Field value={name} onChangeText={setName} placeholder="Display name" />
        <Field value={cluster} onChangeText={setCluster} placeholder="Cluster" />
        <Field value={unit} onChangeText={setUnit} placeholder="Unit" />
        <Field value={bio} onChangeText={setBio} placeholder="Bio" multiline />
        <PrimaryButton
          label="Save"
          onPress={() =>
            void updateProfile({
              displayName: name,
              clusterName: cluster,
              unitLabel: unit,
              bio,
            }).then(() => notifySuccess('Profile updated.'))
          }
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Recent points</Text>
        {memberTransactions.slice(0, 8).map((tx) => (
          <Text key={tx.id} style={styles.meta}>
            {tx.points >= 0 ? `+${tx.points}` : tx.points} · {tx.description}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Interest groups</Text>
        {interestGroups.map((g) => (
          <OutlineButton
            key={g.id}
            label={`${g.joined ? 'Leave' : 'Join'} ${g.name}`}
            onPress={() => void toggleGroup(g.id)}
          />
        ))}
      </Card>

      <Pressable style={styles.logout} onPress={() => void signOut()}>
        <Icon name="logout" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Log Out of GCF Connect</Text>
      </Pressable>
      <Text style={styles.footer}>Crafted with care by WeGrow Community Cooperative</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  meta: { fontSize: 12, color: colors.onSurfaceVariant },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  body: { fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  logout: {
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: colors.error, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 11, color: colors.outline },
});
