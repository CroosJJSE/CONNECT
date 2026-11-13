import { useEffect, useState, type ReactNode } from 'react';
import {
  Award,
  Bell,
  Calendar,
  FolderOpen,
  Home,
  Orbit,
  Search,
  Settings,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { calculateLevelFromPoints, getLevelFrameStyle } from '../../domain/logic/pointsRules';
import { useAuth } from '../../hooks/useAuth';
import { useConnectData } from '../../hooks/useConnectData';
import { STITCH_ASSETS } from '../../services/mock/seedData';
import { Avatar } from '../common/Avatar';

export type AppRoute = 'home' | 'sharing' | 'orbit' | 'events' | 'finance' | 'profile';

interface AppShellProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: ReactNode;
}

const DESKTOP_NAV_ITEMS: Array<{ id: AppRoute; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home / Feed', icon: Home },
  { id: 'sharing', label: 'Exchange / Share', icon: FolderOpen },
  { id: 'orbit', label: 'My Orbit', icon: Orbit },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'finance', label: 'Finance Tracker', icon: Wallet },
  { id: 'profile', label: 'Profile & Settings', icon: Settings },
];

const MOBILE_TABS: Array<{ id: AppRoute; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'sharing', label: 'Share', icon: FolderOpen },
  { id: 'orbit', label: 'Orbit', icon: Orbit },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'finance', label: 'Finance', icon: Wallet },
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  home: 'Dashboard',
  sharing: 'Community Sharing',
  orbit: 'My Orbit',
  events: 'Community Events',
  finance: 'Finance Tracker',
  profile: 'Profile & Settings',
};

export function AppShell({
  activeRoute,
  onNavigate,
  searchQuery,
  onSearchChange,
  children,
}: AppShellProps) {
  const { user } = useAuth();
  const {
    notifications,
    markNotificationsRead,
    actionBanner,
    dismissBanner,
    lastPointFeedback,
    dismissPointFeedback,
  } = useConnectData();
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!lastPointFeedback) return;
    const timer = window.setTimeout(
      () => dismissPointFeedback(),
      lastPointFeedback.leveledUp ? 6000 : 4200
    );
    return () => window.clearTimeout(timer);
  }, [lastPointFeedback, dismissPointFeedback]);

  if (!user) return null;

  const userLevel = calculateLevelFromPoints(user.points ?? 0);
  const userFrame = getLevelFrameStyle(userLevel);
  const financeEnabled = Boolean(user.financeEnabled);
  const visibleDesktopNavItems = DESKTOP_NAV_ITEMS.filter(
    (item) => item.id !== 'finance' || financeEnabled
  );
  const visibleMobileTabs = MOBILE_TABS.filter(
    (tab) => tab.id !== 'finance' || financeEnabled
  );
  const visibleNotifications = notifications.filter(
    (n) =>
      (financeEnabled || n.route !== 'finance') &&
      (!n.recipientUserId || n.recipientUserId === user.uid)
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Desktop Left Sidebar (matches Stitch web_dashboard Image_4) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 px-2 py-1 text-left rounded-xl hover:bg-surface-container transition-colors"
          >
            {!logoFailed ? (
              <img
                src={STITCH_ASSETS.brandEmblemUrl}
                alt="CONNECT logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-9 h-9 rounded-lg object-cover bg-primary-fixed shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary font-bold text-sm flex items-center justify-center shrink-0">
                GCF
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-primary tracking-tight whitespace-nowrap">
                CONNECT
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                GCF Community Hub
              </span>
            </div>
          </button>

          <nav aria-label="Primary Sidebar Navigation" className="flex flex-col gap-1">
            {visibleDesktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[44px] flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Member Card */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:bg-surface-container transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              userId={user.uid}
              level={userLevel}
              src={user.avatarUrl}
              alt={user.displayName}
              initials={user.initials}
              size="sm"
              showLevelTag={false}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-on-surface truncate">{user.displayName}</span>
              <span className="text-[11px] text-on-surface-variant truncate tabular-nums">
                Lv.{userLevel} · {user.points ?? 0} pts
              </span>
            </div>
          </div>
          <Settings className="w-4 h-4 text-on-surface-variant shrink-0" />
        </button>
      </aside>

      {/* Main Content Wrapper */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        {/* Top Bar (Mobile + Desktop) */}
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-xs z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-safe">
          {/* Mobile Brand & Title */}
          <div className="flex lg:hidden items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-semibold text-sm shadow-xs shrink-0"
            >
              GCF
            </button>
            <h1 className="text-base font-semibold text-on-surface tracking-tight truncate">
              {ROUTE_TITLES[activeRoute]}
            </h1>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <div className="flex items-center gap-2.5 w-full bg-surface-container-low px-4 py-2 rounded-full">
              <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search posts, resources, neighbors..."
                className="w-full bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  if (!notifOpen && unreadCount > 0) {
                    void markNotificationsRead();
                  }
                }}
                className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl p-3 flex flex-col gap-2 z-50 border border-outline-variant/25">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                      Community Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                    {visibleNotifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          onNavigate(n.route);
                          setNotifOpen(false);
                        }}
                        className="text-left p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                      >
                        <p className="text-xs font-semibold text-on-surface">{n.title}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{n.message}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label={`Open Profile & Settings (Level ${userLevel})`}
              title={`Level ${userLevel} · ${userFrame.tierName} · ${user.points ?? 0} pts`}
              className={`min-h-[44px] pl-2.5 pr-1.5 py-1 flex items-center gap-2 rounded-full bg-surface-container-low hover:bg-surface-container transition-all ${
                activeRoute === 'profile' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold leading-none tabular-nums whitespace-nowrap ${userFrame.badgeSurfaceClass} ${userFrame.badgeTextClass}`}
              >
                Lv.{userLevel}
              </span>
              <Avatar
                userId={user.uid}
                level={userLevel}
                src={user.avatarUrl}
                alt={user.displayName}
                initials={user.initials}
                size="sm"
                showLevelTag={false}
              />
            </button>
          </div>
        </header>

        {/* Global Action Feedback Banner */}
        {actionBanner && (
          <div className="fixed top-18 right-4 left-4 lg:left-76 z-40 max-w-md mx-auto">
            <div
              role="status"
              className={`px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-sm font-medium ${
                actionBanner.type === 'error'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-inverse-surface text-inverse-on-surface'
              }`}
            >
              <span>{actionBanner.message}</span>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Dismiss notification"
                className="p-1 rounded-lg opacity-80 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Animated Points & Level-Up Notification */}
        <AnimatePresence>
          {lastPointFeedback && (
            <motion.div
              key={lastPointFeedback.id}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50"
            >
              <div
                role="status"
                className={`rounded-2xl p-3.5 shadow-xl border flex items-start justify-between gap-3 ${
                  lastPointFeedback.leveledUp
                    ? 'bg-surface-container-lowest border-primary/35 ring-2 ring-primary/15'
                    : 'bg-surface-container-lowest border-outline-variant/25'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      lastPointFeedback.leveledUp
                        ? getLevelFrameStyle(lastPointFeedback.newLevel).badgeSurfaceClass
                        : lastPointFeedback.delta > 0
                          ? 'bg-primary-fixed text-primary'
                          : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {lastPointFeedback.leveledUp ? (
                      <Sparkles
                        className={`w-5 h-5 ${getLevelFrameStyle(lastPointFeedback.newLevel).badgeTextClass}`}
                      />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {lastPointFeedback.leveledUp ? (
                        <span className="text-xs font-bold text-primary">
                          Level Up! Level {lastPointFeedback.newLevel} · {lastPointFeedback.tierName}
                        </span>
                      ) : lastPointFeedback.limitReached ? (
                        <span className="text-xs font-semibold text-on-surface">
                          Daily post cap reached
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            lastPointFeedback.delta > 0 ? 'text-primary' : 'text-on-surface-variant'
                          }`}
                        >
                          {lastPointFeedback.delta > 0
                            ? `+${lastPointFeedback.delta} Community Points`
                            : `${lastPointFeedback.delta} Community Points`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                      {lastPointFeedback.leveledUp
                        ? `New circular profile frame unlocked! (${lastPointFeedback.description})`
                        : lastPointFeedback.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('profile');
                        dismissPointFeedback();
                      }}
                      className="text-[11px] font-semibold text-primary mt-1 hover:underline"
                    >
                      View points & level →
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissPointFeedback}
                  aria-label="Dismiss points notification"
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 pt-16 pb-24 lg:pb-10">
          <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (matches Stitch mobile_tab screens) */}
      <nav
        aria-label="Main Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-safe"
      >
        <div
          className={`h-16 px-2 grid items-center ${
            visibleMobileTabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {visibleMobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRoute === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.9} />
                <span className="text-[11px] mt-0.5 whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
