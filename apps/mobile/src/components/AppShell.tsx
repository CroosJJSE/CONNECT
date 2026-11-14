import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import type { NotificationItem } from '@connect-core/domain/models';
import { colors, spacing, type } from '../theme';
import { Avatar } from './Avatar';
import { GCFLoader } from './GCFLoader';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Banner } from './ui';

export type AppRoute = 'home' | 'sharing' | 'orbit' | 'events' | 'finance' | 'profile';

const TABS: Array<{ id: AppRoute; label: string; icon: IconName; iconActive: IconName }> = [
  { id: 'home', label: 'Home', icon: 'dashboard', iconActive: 'dashboard' },
  { id: 'sharing', label: 'Share', icon: 'folder-open', iconActive: 'folder' },
  { id: 'events', label: 'Events', icon: 'event', iconActive: 'event' },
  { id: 'orbit', label: 'Orbit', icon: 'bubble-chart', iconActive: 'bubble-chart' },
  { id: 'finance', label: 'Finance', icon: 'account-balance-wallet', iconActive: 'account-balance-wallet' },
];

function TabItem({
  tab,
  active,
  onPress,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onPress: () => void;
}) {
  const lift = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(lift, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [active, lift]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      style={[styles.tab, active && styles.tabActiveSlot]}
    >
      <View style={styles.tabIconAnchor}>
        <Animated.View
          style={[
            styles.tabIconWrap,
            active && styles.tabIconWrapActive,
            {
              transform: [
                {
                  translateY: lift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -22],
                  }),
                },
                {
                  scale: lift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon
            name={active ? tab.iconActive : tab.icon}
            size={active ? 28 : 22}
            color={active ? colors.primary : 'rgba(255,255,255,0.92)'}
          />
        </Animated.View>
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TITLES: Record<AppRoute, string> = {
  home: 'Dashboard',
  sharing: 'Sharing',
  orbit: 'My Orbit',
  events: 'Community Events',
  finance: 'Finance',
  profile: 'Profile',
};

export function AppShell({
  activeRoute,
  onNavigate,
  searchQuery,
  onSearchChange,
  children,
}: {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { notifications, markNotificationsRead, actionBanner, dismissBanner, lastPointFeedback, dismissPointFeedback } =
    useConnectData();
  const [showSearch, setShowSearch] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const insets = useSafeAreaInsets();

  if (!user) return null;

  const financeEnabled = Boolean(user.financeEnabled);
  const tabs = TABS.filter((t) => t.id !== 'finance' || financeEnabled);
  const visibleNotifications = notifications.filter(
    (n) => (financeEnabled || n.route !== 'finance') && (!n.recipientUserId || n.recipientUserId === user.uid)
  );
  const unread = visibleNotifications.filter((n) => !n.read).length;

  function openNotifications() {
    setNotifOpen(true);
    if (unread > 0) void markNotificationsRead();
  }

  function openNotification(item: NotificationItem) {
    setNotifOpen(false);
    onNavigate(item.route);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => onNavigate('home')} style={styles.brand} accessibilityLabel="Home">
            <GCFLoader size={40} />
          </Pressable>
          <Text style={styles.title}>{TITLES[activeRoute]}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearch((v) => !v)} style={styles.iconBtn} accessibilityLabel="Search">
            <Icon name="search" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={openNotifications}
            style={styles.iconBtn}
          >
            <Icon name="notifications-none" size={22} color={colors.onSurfaceVariant} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
          <Pressable
            accessibilityLabel="Profile"
            onPress={() => onNavigate('profile')}
            style={styles.iconBtn}
          >
            <Avatar userId={user.uid} src={user.avatarUrl} initials={user.initials} size="xs" />
          </Pressable>
        </View>
      </View>

      {showSearch ? (
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search posts, resources, neighbors..."
          placeholderTextColor={colors.outline}
          style={styles.search}
        />
      ) : null}

      {actionBanner ? (
        <Banner message={actionBanner.message} type={actionBanner.type} onDismiss={dismissBanner} />
      ) : null}
      {lastPointFeedback ? (
        <Banner
          message={
            lastPointFeedback.leveledUp
              ? `Level up! Level ${lastPointFeedback.newLevel} · ${lastPointFeedback.tierName}`
              : lastPointFeedback.limitReached
                ? lastPointFeedback.description
                : `${lastPointFeedback.delta > 0 ? '+' : ''}${lastPointFeedback.delta} pts · ${lastPointFeedback.description}`
          }
          type="success"
          onDismiss={dismissPointFeedback}
        />
      ) : null}

      <View style={styles.body}>{children}</View>

      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.notifRoot}>
          <Pressable
            accessibilityLabel="Dismiss notifications"
            onPress={() => setNotifOpen(false)}
            style={styles.notifBackdrop}
          />
          <View style={[styles.notifPanel, { marginTop: insets.top + 56 }]}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Community Alerts</Text>
              <Pressable onPress={() => setNotifOpen(false)} accessibilityLabel="Close notifications">
                <Text style={styles.notifClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.notifList} contentContainerStyle={styles.notifListContent}>
              {visibleNotifications.length === 0 ? (
                <Text style={styles.notifEmpty}>No community alerts yet.</Text>
              ) : (
                visibleNotifications.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => openNotification(n)}
                    style={[styles.notifItem, !n.read && styles.notifItemUnread]}
                  >
                    <Text style={styles.notifItemTitle}>{n.title}</Text>
                    <Text style={styles.notifItemMessage}>{n.message}</Text>
                    {n.createdAtIso ? (
                      <Text style={styles.notifItemTime}>{formatNotifTime(n.createdAtIso)}</Text>
                    ) : null}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={activeRoute === tab.id}
            onPress={() => onNavigate(tab.id)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, overflow: 'visible' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    backgroundColor: 'rgba(249,249,255,0.92)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  brand: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.onSurface, letterSpacing: -0.2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  search: {
    marginHorizontal: spacing.margin,
    marginBottom: spacing.sm,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.containerLow,
    paddingHorizontal: 16,
    color: colors.onSurface,
  },
  body: { flex: 1, zIndex: 0 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.primary,
    overflow: 'visible',
    shadowColor: '#001b3e',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
    zIndex: 20,
  },
  tab: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    overflow: 'visible',
  },
  tabActiveSlot: { zIndex: 2 },
  tabIconAnchor: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    position: 'absolute',
    top: -14,
    left: -14,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.containerLowest,
    shadowColor: '#001b3e',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  tabLabel: { ...type.labelSm, color: 'rgba(255,255,255,0.86)', marginTop: 2 },
  tabLabelActive: { color: colors.onPrimary, fontWeight: '700' },
  notifRoot: { flex: 1 },
  notifBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,28,34,0.28)',
  },
  notifPanel: {
    alignSelf: 'flex-end',
    marginHorizontal: 16,
    width: 320,
    maxWidth: '92%',
    maxHeight: 420,
    backgroundColor: colors.containerLowest,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    shadowColor: '#001b3e',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  notifTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  notifClose: { fontSize: 12, fontWeight: '600', color: colors.primary },
  notifList: { maxHeight: 340 },
  notifListContent: { gap: 6, paddingBottom: 4 },
  notifEmpty: { fontSize: 13, color: colors.onSurfaceVariant, padding: 12 },
  notifItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.containerLow,
    gap: 4,
  },
  notifItemUnread: { backgroundColor: colors.primaryFixed },
  notifItemTitle: { fontSize: 13, fontWeight: '700', color: colors.onSurface },
  notifItemMessage: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 16 },
  notifItemTime: { fontSize: 11, color: colors.outline, marginTop: 2 },
});
