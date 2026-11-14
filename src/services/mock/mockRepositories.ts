import { canUserViewPost, filterAuthorizedPosts } from '../../domain/logic/feedAudience';
import { categorizeTransaction } from '../../domain/logic/financeCategorizer';
import { deriveInitials } from '../../domain/logic/formatting';
import { extractMentionedUsers } from '../../domain/logic/mentions';
import {
  calculateLevelFromPoints,
  countDailyActiveAwards,
  createDefaultPointsConfiguration,
  DEFAULT_POINT_RULES,
  getLevelFrameStyle,
  reconcilePointsFromLedger,
} from '../../domain/logic/pointsRules';
import {
  borrowOrClaimItem,
  closeSharingRequest,
  isItemVisibleInAvailableMarketplace,
  markLentItemReturned,
  offerHelpOnRequest,
  verifyHelperOnRequest,
} from '../../domain/logic/sharingRules';
import type {
  Community,
  CommunityAnnouncement,
  CommunityEvent,
  CommunityPoll,
  ConfigurablePointActivityType,
  DriveMediaMetadata,
  EventRsvpLog,
  FinanceTransaction,
  InterestGroup,
  MediaVisibility,
  MemoryComment,
  MemoryPost,
  MemorySaveInput,
  MonthlyBudget,
  NotificationItem,
  OrbitConnection,
  PointActivityType,
  PointRelatedEntityType,
  PointsConfiguration,
  PointTransaction,
  Post,
  RsvpStatus,
  SavingsGoal,
  SharingItem,
  SharingRequest,
  SkillOffer,
  UserProfile,
  JoinRequest,
  AuthSession,
} from '../../domain/models';
import { CONNECT_CLOUDINARY_FOLDER, uploadFileToCloudinary } from '../google/cloudinaryUpload';
import { buildDriveViewerUrl, CONNECT_DRIVE_FOLDER_NAME } from '../google/googleDriveService';
import { generateIcsContent } from '../google/googleCalendarService';
import { workspaceTokenStore } from '../google/workspaceTokenStore';
import type {
  AdminPointAdjustmentInput,
  CalendarSyncResult,
  CreateEventInput,
  CreateEventTaskInput,
  CreatePostInput,
  CreateSharingItemInput,
  CreateSharingRequestInput,
  CreateSkillOfferInput,
  CreateTransactionInput,
  IAuthService,
  ICalendarService,
  ICommunityRepository,
  IEventRepository,
  IFeedRepository,
  IFinanceRepository,
  IMediaStorageService,
  IMemoryRepository,
  IOrbitRepository,
  IPointsRepository,
  ISharingRepository,
  ISmsIngestionBridge,
  UploadDriveMediaInput,
} from '../interfaces';
import { platformStorage } from '../platform/platformStorage';
import {
  SEED_ANNOUNCEMENTS,
  SEED_BUDGETS,
  SEED_COMMUNITIES,
  SEED_DRIVE_MEDIA,
  SEED_EVENT_RSVP_LOGS,
  SEED_EVENTS,
  SEED_GOALS,
  SEED_GROUPS,
  SEED_MEMORIES,
  SEED_MEMORY_COMMENTS,
  SEED_NOTIFICATIONS,
  SEED_ORBIT_CONNECTIONS,
  SEED_POINT_TRANSACTIONS,
  SEED_POLLS,
  SEED_POSTS,
  SEED_SHARING_ITEMS,
  SEED_SHARING_REQUESTS,
  SEED_SKILL_OFFERS,
  SEED_TRANSACTIONS,
  SEED_USERS,
} from './seedData';

const STORAGE_KEY = 'connect_app_state_v1';

interface PersistedMockState {
  currentUserId: string | null;
  users: UserProfile[];
  communities: Community[];
  announcements: CommunityAnnouncement[];
  polls: CommunityPoll[];
  groups: InterestGroup[];
  notifications: NotificationItem[];
  orbitConnections: OrbitConnection[];
  memories: MemoryPost[];
  memoryComments: MemoryComment[];
  posts: Post[];
  sharingItems: SharingItem[];
  sharingRequests: SharingRequest[];
  skillOffers: SkillOffer[];
  events: CommunityEvent[];
  driveMedia: DriveMediaMetadata[];
  transactions: FinanceTransaction[];
  budgets: MonthlyBudget[];
  savingsGoals: SavingsGoal[];
  pointsConfig: PointsConfiguration;
  pointTransactions: PointTransaction[];
  eventRsvpLogs: EventRsvpLog[];
  driveAuthorized: boolean;
  calendarAuthorized: boolean;
  calendarReminderMinutes: number;
  joinRequests: JoinRequest[];
}

function createInitialState(): PersistedMockState {
  return {
    currentUserId: null,
    users: structuredClone(SEED_USERS),
    communities: structuredClone(SEED_COMMUNITIES),
    announcements: structuredClone(SEED_ANNOUNCEMENTS),
    polls: structuredClone(SEED_POLLS),
    groups: structuredClone(SEED_GROUPS),
    notifications: structuredClone(SEED_NOTIFICATIONS),
    orbitConnections: structuredClone(SEED_ORBIT_CONNECTIONS),
    memories: structuredClone(SEED_MEMORIES),
    memoryComments: structuredClone(SEED_MEMORY_COMMENTS),
    posts: structuredClone(SEED_POSTS),
    sharingItems: structuredClone(SEED_SHARING_ITEMS),
    sharingRequests: structuredClone(SEED_SHARING_REQUESTS),
    skillOffers: structuredClone(SEED_SKILL_OFFERS),
    events: structuredClone(SEED_EVENTS),
    driveMedia: structuredClone(SEED_DRIVE_MEDIA),
    transactions: structuredClone(SEED_TRANSACTIONS),
    budgets: structuredClone(SEED_BUDGETS),
    savingsGoals: structuredClone(SEED_GOALS),
    pointsConfig: createDefaultPointsConfiguration('2026-11-10T08:00:00.000Z'),
    pointTransactions: structuredClone(SEED_POINT_TRANSACTIONS),
    eventRsvpLogs: structuredClone(SEED_EVENT_RSVP_LOGS),
    driveAuthorized: false,
    calendarAuthorized: false,
    calendarReminderMinutes: 60,
    joinRequests: [],
  };
}

class InMemoryStateStore {
  private state: PersistedMockState | null = null;

  private load(): PersistedMockState {
    if (this.state) return this.state;
    const raw = platformStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PersistedMockState>;
        const defaults = createInitialState();
        const pointTransactions =
          Array.isArray(parsed.pointTransactions) && parsed.pointTransactions.length > 0
            ? parsed.pointTransactions
            : defaults.pointTransactions;
        const eventRsvpLogs = Array.isArray(parsed.eventRsvpLogs)
          ? parsed.eventRsvpLogs
          : defaults.eventRsvpLogs;

        const mergedRules = { ...structuredClone(DEFAULT_POINT_RULES) };
        if (parsed.pointsConfig?.rules) {
          for (const key of Object.keys(mergedRules) as ConfigurablePointActivityType[]) {
            if (parsed.pointsConfig.rules[key]) {
              mergedRules[key] = { ...mergedRules[key], ...parsed.pointsConfig.rules[key] };
            }
          }
        }
        const pointsConfig: PointsConfiguration = {
          rules: mergedRules,
          updatedAtIso: parsed.pointsConfig?.updatedAtIso ?? defaults.pointsConfig.updatedAtIso,
          updatedByUserId: parsed.pointsConfig?.updatedByUserId,
        };

        const rawUsers = parsed.users ?? defaults.users;
        const migratedUsers: UserProfile[] = rawUsers.map((u) => {
          const legacy = u as UserProfile & {
            currentPoints?: number;
            lifetimePoints?: number;
            level?: number;
          };
          const { currentPoints: _cp, lifetimePoints: _lp, level: _lvl, ...rest } = legacy;
          const reconciledPoints = reconcilePointsFromLedger(u.uid, pointTransactions);
          return {
            ...rest,
            membershipStatus: u.membershipStatus ?? 'active',
            financeEnabled: Boolean(u.financeEnabled),
            points:
              typeof legacy.points === 'number'
                ? legacy.points
                : typeof legacy.currentPoints === 'number'
                  ? legacy.currentPoints
                  : reconciledPoints,
          };
        });

        const migratedRequests = (parsed.sharingRequests ?? defaults.sharingRequests).map((req) => {
          if (req.helperUserIds && req.verifiedHelperIds) return req;
          const resolvedHelperIds =
            req.helperUserIds ??
            req.helperNames
              .map((name) => migratedUsers.find((u) => u.displayName === name)?.uid)
              .filter((id): id is string => Boolean(id));
          const seedMatch = defaults.sharingRequests.find((sr) => sr.id === req.id);
          return {
            ...req,
            helperUserIds: resolvedHelperIds,
            verifiedHelperIds: req.verifiedHelperIds ?? seedMatch?.verifiedHelperIds ?? [],
          };
        });

        this.state = {
          ...defaults,
          ...parsed,
          users: migratedUsers,
          sharingRequests: migratedRequests,
          pointsConfig,
          pointTransactions,
          eventRsvpLogs,
          memories: Array.isArray(parsed.memories) ? parsed.memories : defaults.memories,
          memoryComments: Array.isArray(parsed.memoryComments)
            ? parsed.memoryComments
            : defaults.memoryComments,
          joinRequests: Array.isArray(parsed.joinRequests) ? parsed.joinRequests : defaults.joinRequests,
        };
        return this.state;
      } catch {
        // Fallback to clean seed state if storage corrupted
      }
    }
    this.state = createInitialState();
    return this.state;
  }

  get(): PersistedMockState {
    return this.load();
  }

  save(): void {
    platformStorage.setItem(STORAGE_KEY, JSON.stringify(this.load()));
  }
}

const store = new InMemoryStateStore();

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getReversedTransactionIdSet(transactions: readonly PointTransaction[]): Set<string> {
  return new Set(
    transactions
      .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
      .map((t) => t.reversedTransactionId!)
  );
}

function syncUserPointsFromLedger(
  s: PersistedMockState,
  memberId: string
): { prevLevel: number; newLevel: number; points: number } {
  const existing = s.users.find((u) => u.uid === memberId);
  const prevLevel = calculateLevelFromPoints(existing?.points ?? 0);
  const nextPoints = reconcilePointsFromLedger(memberId, s.pointTransactions);
  s.users = s.users.map((u) =>
    u.uid === memberId
      ? {
          ...u,
          points: nextPoints,
        }
      : u
  );
  return {
    prevLevel,
    newLevel: calculateLevelFromPoints(nextPoints),
    points: nextPoints,
  };
}

function pushLevelUpNotificationIfNeeded(
  s: PersistedMockState,
  memberId: string,
  prevLevel: number,
  newLevel: number,
  nowIso: string
): void {
  if (newLevel <= prevLevel) return;
  const style = getLevelFrameStyle(newLevel);
  s.notifications = [
    {
      id: nextId('notif'),
      recipientUserId: memberId,
      title: `Level Up! You reached Level ${newLevel}`,
      message: `Your community contributions unlocked the ${style.tierName} profile frame.`,
      createdAtIso: nowIso,
      read: false,
      route: 'profile',
    },
    ...s.notifications,
  ];
}

function awardPointsForActivity(
  s: PersistedMockState,
  params: {
    memberId: string;
    activityType: ConfigurablePointActivityType;
    description: string;
    entityType: PointRelatedEntityType;
    entityId: string;
    entityTitle?: string;
    actorUserId?: string;
    nowIso: string;
  }
): { awarded: boolean; reason?: 'disabled' | 'daily_limit' | 'duplicate'; transaction?: PointTransaction } {
  const rule = s.pointsConfig.rules[params.activityType];
  if (!rule || !rule.enabled || rule.points <= 0) {
    return { awarded: false, reason: 'disabled' };
  }

  if (rule.dailyLimit && rule.dailyLimit > 0) {
    const todayCount = countDailyActiveAwards({
      memberId: params.memberId,
      activityType: params.activityType,
      transactions: s.pointTransactions,
      referenceIso: params.nowIso,
    });
    if (todayCount >= rule.dailyLimit) {
      return { awarded: false, reason: 'daily_limit' };
    }
  }

  const reversedIds = getReversedTransactionIdSet(s.pointTransactions);
  const alreadyAwarded = s.pointTransactions.some(
    (t) =>
      t.memberId === params.memberId &&
      t.activityType === params.activityType &&
      t.transactionType === 'award' &&
      !reversedIds.has(t.id) &&
      (t.relatedPostId === params.entityId || t.relatedEventId === params.entityId)
  );
  if (alreadyAwarded) {
    return { awarded: false, reason: 'duplicate' };
  }

  const pts = Math.round(rule.points);
  const tx: PointTransaction = {
    id: nextId('ptx'),
    memberId: params.memberId,
    activityType: params.activityType,
    description: params.description,
    transactionType: 'award',
    points: pts,
    relatedEntityType: params.entityType,
    relatedPostId: params.entityType !== 'event' ? params.entityId : undefined,
    relatedEventId: params.entityType === 'event' ? params.entityId : undefined,
    relatedEntityTitle: params.entityTitle,
    actorUserId: params.actorUserId,
    createdAtIso: params.nowIso,
  };
  s.pointTransactions = [tx, ...s.pointTransactions];

  const sync = syncUserPointsFromLedger(s, params.memberId);
  pushLevelUpNotificationIfNeeded(s, params.memberId, sync.prevLevel, sync.newLevel, params.nowIso);

  return { awarded: true, transaction: tx };
}

function reverseActivePointsForEntity(
  s: PersistedMockState,
  params: {
    activityType: PointActivityType;
    entityId: string;
    actorUserId: string;
    reason: string;
    nowIso: string;
    memberId?: string;
  }
): PointTransaction | null {
  const reversedIds = getReversedTransactionIdSet(s.pointTransactions);
  const target = s.pointTransactions.find(
    (t) =>
      t.activityType === params.activityType &&
      t.transactionType === 'award' &&
      !reversedIds.has(t.id) &&
      (!params.memberId || t.memberId === params.memberId) &&
      (t.relatedPostId === params.entityId || t.relatedEventId === params.entityId)
  );
  if (!target) return null;

  const reversalTx: PointTransaction = {
    id: nextId('ptx'),
    memberId: target.memberId,
    activityType: target.activityType,
    description: `Reversed: ${target.description}`,
    transactionType: 'reversal',
    points: -Math.abs(target.points),
    relatedEntityType: target.relatedEntityType,
    relatedPostId: target.relatedPostId,
    relatedEventId: target.relatedEventId,
    relatedEntityTitle: target.relatedEntityTitle,
    reversedTransactionId: target.id,
    actorUserId: params.actorUserId,
    reason: params.reason,
    createdAtIso: params.nowIso,
  };
  s.pointTransactions = [reversalTx, ...s.pointTransactions];
  syncUserPointsFromLedger(s, target.memberId);
  return reversalTx;
}

function processEventRsvpLedgerChange(
  s: PersistedMockState,
  params: {
    memberId: string;
    event: CommunityEvent;
    previousStatus?: RsvpStatus;
    newStatus: RsvpStatus;
    nowIso: string;
  }
): void {
  const { memberId, event, previousStatus, newStatus, nowIso } = params;
  if (previousStatus === newStatus) return;

  const reversedIds = getReversedTransactionIdSet(s.pointTransactions);
  let pointTransactionId: string | undefined;
  let pointsDelta = 0;

  if (previousStatus !== 'going' && newStatus === 'going') {
    const priorAwards = s.pointTransactions.filter(
      (t) =>
        t.memberId === memberId &&
        t.activityType === 'event_rsvp_yes' &&
        t.transactionType === 'award' &&
        t.relatedEventId === event.id
    );
    const hasActiveAward = priorAwards.some((t) => !reversedIds.has(t.id));

    if (!hasActiveAward) {
      const originalAward = priorAwards[priorAwards.length - 1];
      if (originalAward) {
        // Re-selecting Going after a reversal restores the original event points without duplicates
        const reinstateTx: PointTransaction = {
          id: nextId('ptx'),
          memberId,
          activityType: 'event_rsvp_yes',
          description: `RSVP Going (reinstated): ${event.title}`,
          transactionType: 'award',
          points: originalAward.points,
          relatedEntityType: 'event',
          relatedEventId: event.id,
          relatedEntityTitle: event.title,
          reinstatedFromTransactionId: originalAward.id,
          createdAtIso: nowIso,
        };
        s.pointTransactions = [reinstateTx, ...s.pointTransactions];
        const sync = syncUserPointsFromLedger(s, memberId);
        pushLevelUpNotificationIfNeeded(s, memberId, sync.prevLevel, sync.newLevel, nowIso);
        pointTransactionId = reinstateTx.id;
        pointsDelta = reinstateTx.points;
      } else {
        const res = awardPointsForActivity(s, {
          memberId,
          activityType: 'event_rsvp_yes',
          description: `RSVP Going: ${event.title}`,
          entityType: 'event',
          entityId: event.id,
          entityTitle: event.title,
          nowIso,
        });
        if (res.transaction) {
          pointTransactionId = res.transaction.id;
          pointsDelta = res.transaction.points;
        }
      }
    }
  } else if (previousStatus === 'going' && newStatus !== 'going') {
    const statusLabel = newStatus === 'maybe' ? 'Maybe' : "Can't go";
    const reversal = reverseActivePointsForEntity(s, {
      activityType: 'event_rsvp_yes',
      entityId: event.id,
      memberId,
      actorUserId: memberId,
      reason: `RSVP changed from Going to ${statusLabel}`,
      nowIso,
    });
    if (reversal) {
      pointTransactionId = reversal.id;
      pointsDelta = reversal.points;
    }
  }

  const rsvpLog: EventRsvpLog = {
    id: nextId('rsvplog'),
    eventId: event.id,
    eventTitle: event.title,
    memberId,
    previousStatus,
    newStatus,
    pointTransactionId,
    pointsDelta,
    createdAtIso: nowIso,
  };
  s.eventRsvpLogs = [rsvpLog, ...s.eventRsvpLogs];
}

function toMockSession(user: UserProfile | undefined | null): AuthSession | null {
  if (!user) return null;
  const membershipStatus = user.membershipStatus ?? 'active';
  const isAdmin = user.role === 'admin';
  return {
    identity: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    profile: { ...user, membershipStatus },
    accessState: isAdmin ? 'active' : membershipStatus,
    isAdmin,
  };
}

export class MockAuthService implements IAuthService {
  usesLiveFirebase(): boolean {
    return false;
  }

  subscribeSession(listener: (session: AuthSession | null) => void): () => void {
    void this.getSession().then(listener);
    return () => undefined;
  }

  async getSession(): Promise<AuthSession | null> {
    const s = store.get();
    if (!s.currentUserId) return null;
    return toMockSession(s.users.find((u) => u.uid === s.currentUserId));
  }

  async getDemoAccounts(): Promise<UserProfile[]> {
    return store.get().users.slice(0, 3);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const session = await this.getSession();
    if (!session || session.accessState !== 'active') return null;
    return session.profile;
  }

  async signInWithGoogle(preferredUid: string = 'user-elena'): Promise<AuthSession> {
    const s = store.get();
    const found = s.users.find((u) => u.uid === preferredUid) ?? s.users[0];
    s.currentUserId = found.uid;
    store.save();
    const session = toMockSession(found);
    if (!session) throw new Error('Unable to sign in.');
    return session;
  }

  async signOut(): Promise<void> {
    const s = store.get();
    s.currentUserId = null;
    workspaceTokenStore.clearAll();
    store.save();
  }

  async submitJoinRequest(input: { displayName: string; locality: string }): Promise<AuthSession> {
    const s = store.get();
    if (!s.currentUserId) throw new Error('Sign in first.');
    const idx = s.users.findIndex((u) => u.uid === s.currentUserId);
    if (idx === -1) throw new Error('User profile not found.');
    const existing = s.users[idx];
    const updated: UserProfile = {
      ...existing,
      displayName: input.displayName.trim() || existing.displayName,
      initials: deriveInitials(input.displayName.trim() || existing.displayName),
      clusterName: input.locality.trim(),
      membershipStatus: 'pending',
      verified: false,
      role: 'member',
    };
    s.users[idx] = updated;
    s.joinRequests = [
      {
        uid: updated.uid,
        displayName: updated.displayName,
        email: updated.email,
        locality: updated.clusterName,
        status: 'pending',
        createdAtIso: new Date().toISOString(),
      },
      ...(s.joinRequests ?? []).filter((r) => r.uid !== updated.uid),
    ];
    store.save();
    const session = toMockSession(updated);
    if (!session) throw new Error('Unable to submit application.');
    return session;
  }

  async listJoinRequests(): Promise<JoinRequest[]> {
    return [...(store.get().joinRequests ?? [])].filter((r) => r.status === 'pending');
  }

  async approveJoinRequest(uid: string): Promise<void> {
    const s = store.get();
    const idx = s.users.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      s.users[idx] = { ...s.users[idx], membershipStatus: 'active', verified: true };
    }
    s.joinRequests = (s.joinRequests ?? []).map((r) =>
      r.uid === uid ? { ...r, status: 'active' as const, reviewedAtIso: new Date().toISOString() } : r
    );
    store.save();
  }

  async rejectJoinRequest(uid: string): Promise<void> {
    const s = store.get();
    const idx = s.users.findIndex((u) => u.uid === uid);
    if (idx !== -1) {
      s.users[idx] = { ...s.users[idx], membershipStatus: 'rejected', verified: false };
    }
    s.joinRequests = (s.joinRequests ?? []).map((r) =>
      r.uid === uid ? { ...r, status: 'rejected' as const, reviewedAtIso: new Date().toISOString() } : r
    );
    store.save();
  }

  async updateProfile(
    uid: string,
    patch: Partial<Pick<UserProfile, 'displayName' | 'clusterName' | 'unitLabel' | 'bio' | 'preferredCurrency' | 'phoneVisibleToHousemates' | 'financeEnabled'>>
  ): Promise<UserProfile> {
    const s = store.get();
    const idx = s.users.findIndex((u) => u.uid === uid);
    if (idx === -1) throw new Error('User profile not found.');
    const existing = s.users[idx];
    const updatedName = patch.displayName?.trim() || existing.displayName;
    const updated: UserProfile = {
      ...existing,
      ...patch,
      displayName: updatedName,
      initials: deriveInitials(updatedName),
    };
    s.users[idx] = updated;
    store.save();
    return updated;
  }
}

export class MockCommunityRepository implements ICommunityRepository {
  async getCommunities(): Promise<Community[]> {
    return [...store.get().communities];
  }

  async getDirectoryMembers(): Promise<UserProfile[]> {
    return [...store.get().users];
  }

  async getAnnouncements(): Promise<CommunityAnnouncement[]> {
    return [...store.get().announcements];
  }

  async getPolls(): Promise<CommunityPoll[]> {
    return [...store.get().polls];
  }

  async votePoll(pollId: string, optionId: string, userId: string): Promise<CommunityPoll> {
    const s = store.get();
    const poll = s.polls.find((p) => p.id === pollId);
    if (!poll) throw new Error('Poll not found.');
    if (poll.votedUserIds.includes(userId)) {
      return poll;
    }
    const updated: CommunityPoll = {
      ...poll,
      votedUserIds: [...poll.votedUserIds, userId],
      options: poll.options.map((o) =>
        o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o
      ),
    };
    s.polls = s.polls.map((p) => (p.id === pollId ? updated : p));
    store.save();
    return updated;
  }

  async getInterestGroups(): Promise<InterestGroup[]> {
    return [...store.get().groups];
  }

  async toggleInterestGroup(groupId: string): Promise<InterestGroup> {
    const s = store.get();
    const grp = s.groups.find((g) => g.id === groupId);
    if (!grp) throw new Error('Group not found.');
    const updated: InterestGroup = {
      ...grp,
      joined: !grp.joined,
      memberCount: grp.joined ? Math.max(0, grp.memberCount - 1) : grp.memberCount + 1,
    };
    s.groups = s.groups.map((g) => (g.id === groupId ? updated : g));
    store.save();
    return updated;
  }

  async getNotifications(): Promise<NotificationItem[]> {
    return [...store.get().notifications];
  }

  async markAllNotificationsRead(): Promise<NotificationItem[]> {
    const s = store.get();
    s.notifications = s.notifications.map((n) => ({ ...n, read: true }));
    store.save();
    return [...s.notifications];
  }
}

export class MockOrbitRepository implements IOrbitRepository {
  async getOrbitConnections(ownerId: string): Promise<OrbitConnection[]> {
    return store.get().orbitConnections.filter((c) => c.ownerId === ownerId);
  }

  async getOrbitMembersByOwnerMap(): Promise<Record<string, string[]>> {
    const map: Record<string, string[]> = {};
    for (const conn of store.get().orbitConnections) {
      if (!map[conn.ownerId]) map[conn.ownerId] = [];
      map[conn.ownerId].push(conn.friendUserId);
    }
    return map;
  }

  async addToOrbit(ownerId: string, friendUserId: string, note?: string): Promise<OrbitConnection[]> {
    const s = store.get();
    if (ownerId === friendUserId) {
      throw new Error('You cannot add yourself to My Orbit.');
    }
    const exists = s.orbitConnections.some(
      (c) => c.ownerId === ownerId && c.friendUserId === friendUserId
    );
    if (!exists) {
      s.orbitConnections.push({
        ownerId,
        friendUserId,
        addedAtIso: new Date().toISOString(),
        note,
      });
      store.save();
    }
    return this.getOrbitConnections(ownerId);
  }

  async removeFromOrbit(ownerId: string, friendUserId: string): Promise<OrbitConnection[]> {
    const s = store.get();
    s.orbitConnections = s.orbitConnections.filter(
      (c) => !(c.ownerId === ownerId && c.friendUserId === friendUserId)
    );
    store.save();
    return this.getOrbitConnections(ownerId);
  }
}

export class MockMemoryRepository implements IMemoryRepository {
  async listMemories(authorId: string): Promise<MemoryPost[]> {
    return store
      .get()
      .memories.filter((memory) => memory.authorId === authorId)
      .sort((a, b) => (b.eventDateIso ?? b.createdAtIso).localeCompare(a.eventDateIso ?? a.createdAtIso));
  }

  async getMemory(id: string): Promise<MemoryPost | null> {
    return store.get().memories.find((memory) => memory.id === id) ?? null;
  }

  async saveMemory(authorId: string, input: MemorySaveInput, existingId?: string): Promise<MemoryPost> {
    const s = store.get();
    const now = new Date().toISOString();
    if (existingId) {
      const index = s.memories.findIndex((memory) => memory.id === existingId && memory.authorId === authorId);
      if (index < 0) throw new Error('Memory not found.');
      const next: MemoryPost = { ...s.memories[index], ...input, id: existingId, authorId };
      s.memories[index] = next;
      store.save();
      return next;
    }
    const created: MemoryPost = {
      id: nextId('mem'),
      authorId,
      createdAtIso: now,
      ...input,
    };
    s.memories = [created, ...s.memories];
    store.save();
    return created;
  }

  async deleteMemory(authorId: string, memoryId: string): Promise<void> {
    const s = store.get();
    const found = s.memories.find((memory) => memory.id === memoryId);
    if (!found || found.authorId !== authorId) throw new Error('Memory not found.');
    s.memories = s.memories.filter((memory) => memory.id !== memoryId);
    s.memoryComments = s.memoryComments.filter((comment) => comment.memoryId !== memoryId);
    store.save();
  }

  async listComments(memoryId: string): Promise<MemoryComment[]> {
    return store
      .get()
      .memoryComments.filter((comment) => comment.memoryId === memoryId)
      .sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso));
  }

  async addComment(memoryId: string, author: UserProfile, body: string): Promise<MemoryComment> {
    const text = body.trim();
    if (!text) throw new Error('Write a comment first.');
    const comment: MemoryComment = {
      id: nextId('mcom'),
      memoryId,
      authorId: author.uid,
      authorName: author.displayName,
      authorInitials: author.initials,
      authorAvatarUrl: author.avatarUrl,
      body: text,
      createdAtIso: new Date().toISOString(),
    };
    const s = store.get();
    s.memoryComments = [...s.memoryComments, comment];
    store.save();
    return comment;
  }
}

export class MockFeedRepository implements IFeedRepository {
  async getPostsForUser(
    viewer: UserProfile,
    orbitMembersByOwner: Record<string, string[]>
  ): Promise<Post[]> {
    return filterAuthorizedPosts({
      posts: store.get().posts,
      viewerId: viewer.uid,
      viewerCommunityIds: viewer.communityIds,
      orbitMembersByOwner,
    });
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    const s = store.get();
    const nowIso = new Date().toISOString();
    const isVideo = input.driveMedia?.mimeType.startsWith('video/');
    const { mentionedUserIds } = extractMentionedUsers(input.content, s.users);

    const newPost: Post = {
      id: nextId('post'),
      authorId: input.author.uid,
      authorName: input.author.displayName,
      authorInitials: input.author.initials,
      authorRoleLabel: input.author.role === 'admin' ? 'Community Admin' : undefined,
      authorLocationLabel: input.author.clusterName,
      category: input.category,
      content: input.content.trim(),
      audienceType: input.audienceType,
      communityIds: input.audienceType === 'communities' ? input.communityIds : [],
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      driveMediaId: input.driveMedia?.id,
      inlineMediaUrl: input.driveMedia?.inlinePreviewUrl,
      inlineMediaAlt: input.driveMedia?.fileName,
      mediaType: input.driveMedia ? (isVideo ? 'video' : 'image') : undefined,
      locationBadge: input.locationBadge,
      pinned: false,
      likedByUserIds: [],
      comments: [],
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    s.posts = [newPost, ...s.posts];

    if (input.audienceType !== 'private' && mentionedUserIds.length > 0) {
      const orbitMap: Record<string, string[]> = {};
      for (const conn of s.orbitConnections) {
        if (!orbitMap[conn.ownerId]) orbitMap[conn.ownerId] = [];
        orbitMap[conn.ownerId].push(conn.friendUserId);
      }
      const snippet = newPost.content.slice(0, 90);
      const newNotifications: NotificationItem[] = [];
      for (const recipientId of mentionedUserIds) {
        if (recipientId === input.author.uid) continue;
        const recipient = s.users.find((u) => u.uid === recipientId);
        if (!recipient) continue;
        const allowed = canUserViewPost({
          post: newPost,
          viewerId: recipient.uid,
          viewerCommunityIds: recipient.communityIds,
          orbitMembersByOwner: orbitMap,
        });
        if (allowed) {
          newNotifications.push({
            id: nextId('notif'),
            recipientUserId: recipient.uid,
            title: `${input.author.displayName} mentioned you`,
            message: snippet,
            createdAtIso: nowIso,
            read: false,
            route: input.audienceType === 'orbit' ? 'orbit' : 'home',
          });
        }
      }
      if (newNotifications.length > 0) {
        s.notifications = [...newNotifications, ...s.notifications];
      }
    }

    if (input.audienceType === 'communities' && newPost.content.length > 0) {
      const snippet = newPost.content.slice(0, 48);
      awardPointsForActivity(s, {
        memberId: input.author.uid,
        activityType: 'community_post_create',
        description: `Created community post: "${snippet}${newPost.content.length > 48 ? '…' : ''}"`,
        entityType: 'post',
        entityId: newPost.id,
        entityTitle: `${input.category} post`,
        nowIso,
      });
    }

    store.save();
    return newPost;
  }

  async toggleWarmth(postId: string, userId: string): Promise<Post> {
    const s = store.get();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');
    const alreadyLiked = post.likedByUserIds.includes(userId);
    const updated: Post = {
      ...post,
      likedByUserIds: alreadyLiked
        ? post.likedByUserIds.filter((id) => id !== userId)
        : [...post.likedByUserIds, userId],
    };
    s.posts = s.posts.map((p) => (p.id === postId ? updated : p));
    store.save();
    return updated;
  }

  async addComment(postId: string, author: UserProfile, body: string): Promise<Post> {
    const s = store.get();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');
    const trimmed = body.trim();
    if (!trimmed) throw new Error('Comment cannot be empty.');
    const nowIso = new Date().toISOString();
    const { mentionedUserIds } = extractMentionedUsers(trimmed, s.users);

    const updated: Post = {
      ...post,
      comments: [
        ...post.comments,
        {
          id: nextId('cmt'),
          postId,
          authorId: author.uid,
          authorName: author.displayName,
          authorInitials: author.initials,
          body: trimmed,
          mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
          createdAtIso: nowIso,
        },
      ],
    };
    s.posts = s.posts.map((p) => (p.id === postId ? updated : p));

    if (post.audienceType !== 'private' && mentionedUserIds.length > 0) {
      const orbitMap: Record<string, string[]> = {};
      for (const conn of s.orbitConnections) {
        if (!orbitMap[conn.ownerId]) orbitMap[conn.ownerId] = [];
        orbitMap[conn.ownerId].push(conn.friendUserId);
      }
      const snippet = trimmed.slice(0, 90);
      const newNotifications: NotificationItem[] = [];
      for (const recipientId of mentionedUserIds) {
        if (recipientId === author.uid) continue;
        const recipient = s.users.find((u) => u.uid === recipientId);
        if (!recipient) continue;
        const allowed = canUserViewPost({
          post,
          viewerId: recipient.uid,
          viewerCommunityIds: recipient.communityIds,
          orbitMembersByOwner: orbitMap,
        });
        if (allowed) {
          newNotifications.push({
            id: nextId('notif'),
            recipientUserId: recipient.uid,
            title: `${author.displayName} mentioned you in a comment`,
            message: snippet,
            createdAtIso: nowIso,
            read: false,
            route: post.audienceType === 'orbit' ? 'orbit' : 'home',
          });
        }
      }
      if (newNotifications.length > 0) {
        s.notifications = [...newNotifications, ...s.notifications];
      }
    }

    store.save();
    return updated;
  }

  async deletePost(postId: string, actorUserId: string): Promise<void> {
    const s = store.get();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) return;
    const actor = s.users.find((u) => u.uid === actorUserId);
    if (post.authorId !== actorUserId && actor?.role !== 'admin') {
      throw new Error('Only the author or a community admin can delete this post.');
    }
    s.posts = s.posts.filter((p) => p.id !== postId);
    reverseActivePointsForEntity(s, {
      activityType: 'community_post_create',
      entityId: postId,
      memberId: post.authorId,
      actorUserId,
      reason: 'Community post deleted',
      nowIso: new Date().toISOString(),
    });
    store.save();
  }

  async togglePinPost(postId: string): Promise<Post> {
    const s = store.get();
    const post = s.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');
    const updated: Post = { ...post, pinned: !post.pinned };
    s.posts = s.posts.map((p) => (p.id === postId ? updated : p));
    store.save();
    return updated;
  }
}

export class MockSharingRepository implements ISharingRepository {
  async getItems(includeDonatedArchive: boolean = false): Promise<SharingItem[]> {
    const items = store.get().sharingItems;
    return includeDonatedArchive ? [...items] : items.filter(isItemVisibleInAvailableMarketplace);
  }

  async createItem(input: CreateSharingItemInput): Promise<SharingItem> {
    const nowIso = new Date().toISOString();
    const newItem: SharingItem = {
      id: nextId('share'),
      ownerId: input.owner.uid,
      ownerName: input.owner.displayName,
      ownerInitials: input.owner.initials,
      communityId: input.communityId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      mode: input.mode,
      status: 'available',
      durationDays: input.mode === 'lend' ? input.durationDays : undefined,
      driveMediaId: input.driveMediaId,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    const s = store.get();
    s.sharingItems = [newItem, ...s.sharingItems];
    awardPointsForActivity(s, {
      memberId: input.owner.uid,
      activityType: 'i_have_create',
      description: `Created "I Have" listing: ${newItem.title}`,
      entityType: 'sharing_item',
      entityId: newItem.id,
      entityTitle: newItem.title,
      nowIso,
    });
    store.save();
    return newItem;
  }

  async deleteItem(itemId: string, actorUserId: string): Promise<void> {
    const s = store.get();
    const existing = s.sharingItems.find((i) => i.id === itemId);
    if (!existing) return;
    const actor = s.users.find((u) => u.uid === actorUserId);
    if (existing.ownerId !== actorUserId && actor?.role !== 'admin') {
      throw new Error('Only the owner or a community admin can delete this listing.');
    }
    s.sharingItems = s.sharingItems.filter((i) => i.id !== itemId);
    reverseActivePointsForEntity(s, {
      activityType: 'i_have_create',
      entityId: itemId,
      memberId: existing.ownerId,
      actorUserId,
      reason: '"I Have" listing deleted',
      nowIso: new Date().toISOString(),
    });
    store.save();
  }

  async borrowOrClaimItem(itemId: string, actor: UserProfile): Promise<SharingItem> {
    const s = store.get();
    const existing = s.sharingItems.find((i) => i.id === itemId);
    if (!existing) throw new Error('Item not found.');
    const updated = borrowOrClaimItem({
      item: existing,
      actorUserId: actor.uid,
      actorName: actor.displayName,
      nowIso: new Date().toISOString(),
    });
    s.sharingItems = s.sharingItems.map((i) => (i.id === itemId ? updated : i));
    store.save();
    return updated;
  }

  async returnLentItem(itemId: string, actor: UserProfile): Promise<SharingItem> {
    const s = store.get();
    const existing = s.sharingItems.find((i) => i.id === itemId);
    if (!existing) throw new Error('Item not found.');
    const updated = markLentItemReturned({
      item: existing,
      actorUserId: actor.uid,
      nowIso: new Date().toISOString(),
    });
    s.sharingItems = s.sharingItems.map((i) => (i.id === itemId ? updated : i));
    store.save();
    return updated;
  }

  async getRequests(): Promise<SharingRequest[]> {
    return [...store.get().sharingRequests];
  }

  async createRequest(input: CreateSharingRequestInput): Promise<SharingRequest> {
    const nowIso = new Date().toISOString();
    const newReq: SharingRequest = {
      id: nextId('req'),
      requesterId: input.requester.uid,
      requesterName: input.requester.displayName,
      requesterInitials: input.requester.initials,
      communityId: input.communityId,
      title: input.title.trim(),
      description: input.description.trim(),
      requiredDuration: input.requiredDuration.trim(),
      status: 'open',
      helperNames: [],
      helperUserIds: [],
      verifiedHelperIds: [],
      driveMediaId: input.driveMediaId,
      createdAtIso: nowIso,
    };
    const s = store.get();
    s.sharingRequests = [newReq, ...s.sharingRequests];
    awardPointsForActivity(s, {
      memberId: input.requester.uid,
      activityType: 'i_need_create',
      description: `Created "I Need" request: ${newReq.title}`,
      entityType: 'sharing_request',
      entityId: newReq.id,
      entityTitle: newReq.title,
      nowIso,
    });
    store.save();
    return newReq;
  }

  async deleteRequest(requestId: string, actorUserId: string): Promise<void> {
    const s = store.get();
    const existing = s.sharingRequests.find((r) => r.id === requestId);
    if (!existing) return;
    const actor = s.users.find((u) => u.uid === actorUserId);
    if (existing.requesterId !== actorUserId && actor?.role !== 'admin') {
      throw new Error('Only the requester or a community admin can delete this request.');
    }
    s.sharingRequests = s.sharingRequests.filter((r) => r.id !== requestId);
    reverseActivePointsForEntity(s, {
      activityType: 'i_need_create',
      entityId: requestId,
      memberId: existing.requesterId,
      actorUserId,
      reason: '"I Need" request deleted',
      nowIso: new Date().toISOString(),
    });
    store.save();
  }

  async offerHelp(requestId: string, helperName: string, helperUserId?: string): Promise<SharingRequest> {
    const s = store.get();
    const existing = s.sharingRequests.find((r) => r.id === requestId);
    if (!existing) throw new Error('Request not found.');
    const resolvedHelperId =
      helperUserId ?? s.users.find((u) => u.displayName === helperName)?.uid;
    const updated = offerHelpOnRequest({
      request: existing,
      helperName,
      helperUserId: resolvedHelperId,
    });
    s.sharingRequests = s.sharingRequests.map((r) => (r.id === requestId ? updated : r));
    store.save();
    return updated;
  }

  async verifyHelpfulContribution(
    requestId: string,
    helperUserId: string,
    actor: UserProfile
  ): Promise<SharingRequest> {
    const s = store.get();
    const existing = s.sharingRequests.find((r) => r.id === requestId);
    if (!existing) throw new Error('Request not found.');
    const helperUser = s.users.find((u) => u.uid === helperUserId);
    if (!helperUser) throw new Error('Helper profile not found.');

    const updated = verifyHelperOnRequest({
      request: existing,
      helperUserId,
      actorUserId: actor.uid,
      actorIsAdmin: actor.role === 'admin',
    });
    s.sharingRequests = s.sharingRequests.map((r) => (r.id === requestId ? updated : r));

    const nowIso = new Date().toISOString();
    const entityKey = `${requestId}:${helperUserId}`;
    const res = awardPointsForActivity(s, {
      memberId: helperUserId,
      activityType: 'helpful_contribution',
      description: `Verified helpful contribution: ${existing.title}`,
      entityType: 'sharing_request',
      entityId: entityKey,
      entityTitle: existing.title,
      actorUserId: actor.uid,
      nowIso,
    });

    if (res.transaction) {
      s.notifications = [
        {
          id: nextId('notif'),
          recipientUserId: helperUserId,
          title: `Helpful contribution verified (+${res.transaction.points} pts)`,
          message: `${actor.displayName} verified your help on "${existing.title}".`,
          createdAtIso: nowIso,
          read: false,
          route: 'profile',
        },
        ...s.notifications,
      ];
    }

    store.save();
    return updated;
  }

  async closeRequest(requestId: string, actorUserId: string): Promise<SharingRequest> {
    const s = store.get();
    const existing = s.sharingRequests.find((r) => r.id === requestId);
    if (!existing) throw new Error('Request not found.');
    const updated = closeSharingRequest({ request: existing, actorUserId });
    s.sharingRequests = s.sharingRequests.map((r) => (r.id === requestId ? updated : r));
    store.save();
    return updated;
  }

  async getSkillOffers(): Promise<SkillOffer[]> {
    return [...store.get().skillOffers];
  }

  async createSkillOffer(input: CreateSkillOfferInput): Promise<SkillOffer> {
    const nowIso = new Date().toISOString();
    const offer: SkillOffer = {
      id: nextId('skill'),
      providerId: input.provider.uid,
      providerName: input.provider.displayName,
      providerInitials: input.provider.initials,
      communityId: input.communityId,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      availability: input.availability.trim(),
      active: true,
      createdAtIso: nowIso,
    };
    const s = store.get();
    s.skillOffers = [offer, ...s.skillOffers];
    awardPointsForActivity(s, {
      memberId: input.provider.uid,
      activityType: 'i_can_create',
      description: `Created "I Can" offer: ${offer.title}`,
      entityType: 'skill_offer',
      entityId: offer.id,
      entityTitle: offer.title,
      nowIso,
    });
    store.save();
    return offer;
  }

  async deleteSkillOffer(offerId: string, actorUserId: string): Promise<void> {
    const s = store.get();
    const existing = s.skillOffers.find((o) => o.id === offerId);
    if (!existing) return;
    const actor = s.users.find((u) => u.uid === actorUserId);
    if (existing.providerId !== actorUserId && actor?.role !== 'admin') {
      throw new Error('Only the provider or a community admin can delete this skill offer.');
    }
    s.skillOffers = s.skillOffers.filter((o) => o.id !== offerId);
    reverseActivePointsForEntity(s, {
      activityType: 'i_can_create',
      entityId: offerId,
      memberId: existing.providerId,
      actorUserId,
      reason: '"I Can" offer deleted',
      nowIso: new Date().toISOString(),
    });
    store.save();
  }

  async toggleSkillOfferActive(offerId: string, actorUserId: string): Promise<SkillOffer> {
    const s = store.get();
    const existing = s.skillOffers.find((o) => o.id === offerId);
    if (!existing) throw new Error('Skill offer not found.');
    if (existing.providerId !== actorUserId) {
      throw new Error('Only the offer creator can toggle availability.');
    }
    const updated: SkillOffer = { ...existing, active: !existing.active };
    s.skillOffers = s.skillOffers.map((o) => (o.id === offerId ? updated : o));
    store.save();
    return updated;
  }
}

export class MockEventRepository implements IEventRepository {
  async getEvents(): Promise<CommunityEvent[]> {
    return [...store.get().events];
  }

  async createEvent(input: CreateEventInput): Promise<CommunityEvent> {
    const parsedDate = new Date(`${input.dateStr}T${input.startTime}:00`);
    const monthLabel = parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayLabel = String(parsedDate.getDate());
    const startIso = new Date(`${input.dateStr}T${input.startTime}:00`).toISOString();
    const endIso = new Date(`${input.dateStr}T${input.endTime}:00`).toISOString();
    const nowIso = new Date().toISOString();

    const evt: CommunityEvent = {
      id: nextId('evt'),
      hostId: input.host.uid,
      hostName: input.host.displayName,
      communityId: input.communityId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      location: input.location.trim(),
      monthLabel,
      dayLabel,
      timeRangeLabel: `${input.startTime} – ${input.endTime}`,
      startIso,
      endIso,
      admissionLabel: 'Free Admission',
      driveMediaId: input.driveMediaId,
      invitedUserIds: [input.host.uid],
      rsvps: { [input.host.uid]: 'going' },
      tasks: [],
      comments: [],
      googleCalendarSynced: false,
    };
    const s = store.get();
    s.events = [evt, ...s.events];
    processEventRsvpLedgerChange(s, {
      memberId: input.host.uid,
      event: evt,
      previousStatus: undefined,
      newStatus: 'going',
      nowIso,
    });
    store.save();
    return evt;
  }

  async setRsvp(eventId: string, userId: string, status: RsvpStatus): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const previousStatus = evt.rsvps[userId];
    if (previousStatus === status) return evt;

    const updated: CommunityEvent = {
      ...evt,
      rsvps: { ...evt.rsvps, [userId]: status },
    };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));
    processEventRsvpLedgerChange(s, {
      memberId: userId,
      event: updated,
      previousStatus,
      newStatus: status,
      nowIso: new Date().toISOString(),
    });
    store.save();
    return updated;
  }

  async inviteMembers(eventId: string, userIds: string[]): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const merged = Array.from(new Set([...evt.invitedUserIds, ...userIds]));
    const updated: CommunityEvent = { ...evt, invitedUserIds: merged };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));
    store.save();
    return updated;
  }

  async addTask(input: CreateEventTaskInput): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === input.eventId);
    if (!evt) throw new Error('Event not found.');
    const updated: CommunityEvent = {
      ...evt,
      tasks: [
        ...evt.tasks,
        {
          id: nextId('task'),
          eventId: input.eventId,
          title: input.title.trim(),
          assigneeId: input.assigneeId,
          assigneeName: input.assigneeName,
          deadlineIso: input.deadlineIso,
          reminderEnabled: input.reminderEnabled,
          status: 'pending',
        },
      ],
    };
    s.events = s.events.map((e) => (e.id === input.eventId ? updated : e));
    store.save();
    return updated;
  }

  async toggleTaskStatus(eventId: string, taskId: string): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const updated: CommunityEvent = {
      ...evt,
      tasks: evt.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' }
          : t
      ),
    };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));
    store.save();
    return updated;
  }

  async addComment(eventId: string, author: UserProfile, body: string): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const trimmed = body.trim();
    if (!trimmed) throw new Error('Discussion message cannot be empty.');
    const nowIso = new Date().toISOString();
    const { mentionedUserIds } = extractMentionedUsers(trimmed, s.users);

    const updated: CommunityEvent = {
      ...evt,
      comments: [
        ...evt.comments,
        {
          id: nextId('ecmt'),
          eventId,
          authorId: author.uid,
          authorName: author.displayName,
          authorInitials: author.initials,
          body: trimmed,
          mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
          createdAtIso: nowIso,
        },
      ],
    };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));

    if (mentionedUserIds.length > 0) {
      const snippet = trimmed.slice(0, 90);
      const newNotifications: NotificationItem[] = mentionedUserIds
        .filter((uid) => uid !== author.uid)
        .map((recipientId) => ({
          id: nextId('notif'),
          recipientUserId: recipientId,
          title: `${author.displayName} mentioned you in ${evt.title}`,
          message: snippet,
          createdAtIso: nowIso,
          read: false,
          route: 'events' as const,
        }));
      if (newNotifications.length > 0) {
        s.notifications = [...newNotifications, ...s.notifications];
      }
    }

    store.save();
    return updated;
  }

  async markCalendarSynced(eventId: string): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const updated: CommunityEvent = { ...evt, googleCalendarSynced: true };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));
    store.save();
    return updated;
  }
}

export class MockFinanceRepository implements IFinanceRepository {
  async getTransactions(ownerId: string): Promise<FinanceTransaction[]> {
    return store
      .get()
      .transactions.filter((t) => t.ownerId === ownerId)
      .sort((a, b) => Date.parse(b.occurredAtIso) - Date.parse(a.occurredAtIso));
  }

  async addTransaction(input: CreateTransactionInput): Promise<FinanceTransaction> {
    const auto = categorizeTransaction(`${input.title} ${input.merchant ?? ''}`, input.type);
    const tx: FinanceTransaction = {
      id: nextId('tx'),
      ownerId: input.ownerId,
      title: input.title.trim(),
      merchant: input.merchant?.trim(),
      amount: input.amount,
      type: input.type,
      category: input.category ?? auto.category,
      autoCategorized: !input.category && auto.autoCategorized,
      source: 'manual',
      occurredAtIso: input.occurredAtIso ?? new Date().toISOString(),
      notes: input.notes?.trim(),
    };
    const s = store.get();
    s.transactions = [tx, ...s.transactions];
    store.save();
    return tx;
  }

  async deleteTransaction(ownerId: string, transactionId: string): Promise<void> {
    const s = store.get();
    s.transactions = s.transactions.filter(
      (t) => !(t.id === transactionId && t.ownerId === ownerId)
    );
    store.save();
  }

  async getBudgets(ownerId: string): Promise<MonthlyBudget[]> {
    return store.get().budgets.filter((b) => b.ownerId === ownerId);
  }

  async updateBudgetLimit(
    ownerId: string,
    category: MonthlyBudget['category'],
    limit: number
  ): Promise<MonthlyBudget[]> {
    const s = store.get();
    const existing = s.budgets.find((b) => b.ownerId === ownerId && b.category === category);
    if (existing) {
      existing.monthlyLimit = limit;
    } else {
      s.budgets.push({ id: nextId('b'), ownerId, category, monthlyLimit: limit });
    }
    store.save();
    return this.getBudgets(ownerId);
  }

  async getSavingsGoals(ownerId: string): Promise<SavingsGoal[]> {
    return store.get().savingsGoals.filter((g) => g.ownerId === ownerId);
  }

  async contributeToGoal(ownerId: string, goalId: string, amount: number): Promise<SavingsGoal[]> {
    const s = store.get();
    s.savingsGoals = s.savingsGoals.map((g) =>
      g.id === goalId && g.ownerId === ownerId
        ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
        : g
    );
    store.save();
    return this.getSavingsGoals(ownerId);
  }

  async createSavingsGoal(
    ownerId: string,
    name: string,
    targetAmount: number,
    targetDateIso: string
  ): Promise<SavingsGoal[]> {
    const s = store.get();
    s.savingsGoals.push({
      id: nextId('goal'),
      ownerId,
      name: name.trim(),
      targetAmount,
      currentAmount: 0,
      targetDateIso,
    });
    store.save();
    return this.getSavingsGoals(ownerId);
  }
}

export class MockDriveMediaService implements IMediaStorageService {
  async isDriveAuthorized(): Promise<boolean> {
    return store.get().driveAuthorized;
  }

  async authorizeDriveAccess(): Promise<boolean> {
    const s = store.get();
    s.driveAuthorized = true;
    if (s.currentUserId) {
      s.users = s.users.map((u) =>
        u.uid === s.currentUserId
          ? { ...u, driveConnected: true, driveAppFolderId: `folder-${u.uid}-connect` }
          : u
      );
    }
    store.save();
    return true;
  }

  async revokeDriveAccess(): Promise<void> {
    const s = store.get();
    s.driveAuthorized = false;
    workspaceTokenStore.setDriveToken(null);
    if (s.currentUserId) {
      s.users = s.users.map((u) =>
        u.uid === s.currentUserId ? { ...u, driveConnected: false } : u
      );
    }
    store.save();
  }

  async listUserMedia(ownerUserId: string): Promise<DriveMediaMetadata[]> {
    return store.get().driveMedia.filter((m) => m.ownerUserId === ownerUserId);
  }

  async uploadMediaToAppFolder(input: UploadDriveMediaInput): Promise<DriveMediaMetadata> {
    const driveFileId = `1Drv_${Math.random().toString(36).slice(2, 12)}`;
    const record: DriveMediaMetadata = {
      id: nextId('media'),
      driveFileId,
      ownerUserId: input.ownerUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      visibility: input.visibility,
      driveViewerLink: buildDriveViewerUrl(driveFileId),
      inlinePreviewUrl: input.previewDataUrl,
      folderName: CONNECT_DRIVE_FOLDER_NAME,
      createdAtIso: new Date().toISOString(),
      storageProvider: 'google_drive',
    };
    const s = store.get();
    s.driveMedia = [record, ...s.driveMedia];
    s.driveAuthorized = true;
    store.save();
    return record;
  }

  async uploadHostedMedia(input: UploadDriveMediaInput): Promise<DriveMediaMetadata> {
    if (input.file) {
      try {
        const uploaded = await uploadFileToCloudinary(input.file);
        const record: DriveMediaMetadata = {
          id: nextId('media'),
          driveFileId: uploaded.publicId,
          ownerUserId: input.ownerUserId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          visibility: 'anyone_with_link',
          driveViewerLink: uploaded.secureUrl,
          inlinePreviewUrl: uploaded.secureUrl,
          folderName: CONNECT_CLOUDINARY_FOLDER,
          createdAtIso: new Date().toISOString(),
          storageProvider: 'cloudinary',
        };
        const s = store.get();
        s.driveMedia = [record, ...s.driveMedia];
        store.save();
        return record;
      } catch {
        // Fall through to local preview when host Cloudinary env is unset.
      }
    }
    const record: DriveMediaMetadata = {
      id: nextId('media'),
      driveFileId: `cld_${Math.random().toString(36).slice(2, 12)}`,
      ownerUserId: input.ownerUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      visibility: 'anyone_with_link',
      driveViewerLink: input.previewDataUrl ?? '',
      inlinePreviewUrl: input.previewDataUrl,
      folderName: 'connect/community',
      createdAtIso: new Date().toISOString(),
      storageProvider: 'cloudinary',
    };
    const s = store.get();
    s.driveMedia = [record, ...s.driveMedia];
    store.save();
    return record;
  }

  async updateMediaVisibility(
    mediaId: string,
    ownerUserId: string,
    visibility: MediaVisibility
  ): Promise<DriveMediaMetadata> {
    const s = store.get();
    const target = s.driveMedia.find((m) => m.id === mediaId && m.ownerUserId === ownerUserId);
    if (!target) throw new Error('Media record not found.');
    const updated: DriveMediaMetadata = { ...target, visibility };
    s.driveMedia = s.driveMedia.map((m) => (m.id === mediaId ? updated : m));
    store.save();
    return updated;
  }

  async getMediaById(mediaId: string): Promise<DriveMediaMetadata | undefined> {
    return store.get().driveMedia.find((m) => m.id === mediaId);
  }
}

export class MockCalendarService implements ICalendarService {
  async isCalendarAuthorized(): Promise<boolean> {
    return store.get().calendarAuthorized;
  }

  async authorizeCalendarAccess(): Promise<boolean> {
    const s = store.get();
    s.calendarAuthorized = true;
    if (s.currentUserId) {
      s.users = s.users.map((u) =>
        u.uid === s.currentUserId ? { ...u, calendarConnected: true } : u
      );
    }
    store.save();
    return true;
  }

  async getCalendarReminderLeadMinutes(): Promise<number> {
    return store.get().calendarReminderMinutes;
  }

  async setCalendarReminderLeadMinutes(minutes: number): Promise<void> {
    store.get().calendarReminderMinutes = minutes;
    store.save();
  }

  async addEventToGoogleCalendar(event: CommunityEvent): Promise<CalendarSyncResult> {
    const s = store.get();
    const token = workspaceTokenStore.getCalendarToken();
    if (token) {
      // Live API path executes when OAuth token is present in memory
      return {
        synced: true,
        provider: 'google_calendar_api',
        calendarEventLink: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}`,
        message: `"${event.title}" synced to your Google Calendar.`,
      };
    }

    // Generate clean ICS content and mark synced in preview state without popups
    const _ics = generateIcsContent(event);
    s.calendarAuthorized = true;
    store.save();
    return {
      synced: true,
      provider: 'ics_fallback',
      message: `Calendar invite prepared for "${event.title}" (Reminder: ${s.calendarReminderMinutes} min before). Download .ics or connect Google Calendar OAuth to auto-sync.`,
      calendarEventLink: `data:text/calendar;charset=utf-8,${encodeURIComponent(_ics)}`,
    };
  }
}

export class WebNoopSmsIngestionBridge implements ISmsIngestionBridge {
  isSupported(): boolean {
    return false;
  }

  async hasPermission(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    return false;
  }

  getArchitectureNotice(): string {
    return 'SMS transaction reading is disabled on the web app. It is reserved for the future Android (React Native + Expo) client after Google Play permission review.';
  }
}

export class MockPointsRepository implements IPointsRepository {
  async getConfiguration(): Promise<PointsConfiguration> {
    return structuredClone(store.get().pointsConfig);
  }

  async updateConfiguration(
    actor: UserProfile,
    config: PointsConfiguration
  ): Promise<PointsConfiguration> {
    if (actor.role !== 'admin') {
      throw new Error('Only community admins can modify points configuration.');
    }
    const sanitizedRules = structuredClone(DEFAULT_POINT_RULES);
    for (const key of Object.keys(sanitizedRules) as ConfigurablePointActivityType[]) {
      const incoming = config.rules[key];
      if (!incoming) continue;
      const safePoints = Math.max(0, Math.min(1000, Math.round(Number(incoming.points) || 0)));
      const safeLimit =
        incoming.dailyLimit !== undefined
          ? Math.max(1, Math.min(50, Math.round(Number(incoming.dailyLimit) || 1)))
          : sanitizedRules[key].dailyLimit;
      sanitizedRules[key] = {
        ...sanitizedRules[key],
        points: safePoints,
        enabled: Boolean(incoming.enabled),
        dailyLimit: safeLimit,
      };
    }

    const updated: PointsConfiguration = {
      rules: sanitizedRules,
      updatedAtIso: new Date().toISOString(),
      updatedByUserId: actor.uid,
    };
    const s = store.get();
    s.pointsConfig = updated;
    store.save();
    return structuredClone(updated);
  }

  async getMemberTransactions(memberId: string): Promise<PointTransaction[]> {
    return store
      .get()
      .pointTransactions.filter((t) => t.memberId === memberId)
      .sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
  }

  async getAllTransactions(actor: UserProfile): Promise<PointTransaction[]> {
    if (actor.role !== 'admin') {
      throw new Error('Admin privileges are required to view all member transactions.');
    }
    return [...store.get().pointTransactions].sort(
      (a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso)
    );
  }

  async getEventRsvpLogs(actor?: UserProfile): Promise<EventRsvpLog[]> {
    const logs = [...store.get().eventRsvpLogs].sort(
      (a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso)
    );
    if (!actor) return [];
    if (actor.role === 'admin') return logs;
    return logs.filter((l) => l.memberId === actor.uid);
  }

  async adjustMemberPoints(input: AdminPointAdjustmentInput): Promise<PointTransaction> {
    if (input.actor.role !== 'admin') {
      throw new Error('Only community admins can manually adjust member points.');
    }
    const reason = input.reason.trim();
    if (reason.length < 3) {
      throw new Error('A clear audit reason (minimum 3 characters) is required for manual point adjustments.');
    }
    const s = store.get();
    const targetUser = s.users.find((u) => u.uid === input.targetUserId);
    if (!targetUser) {
      throw new Error('Target member not found.');
    }

    const nowIso = new Date().toISOString();
    const reversedIds = getReversedTransactionIdSet(s.pointTransactions);

    if (input.mode === 'award') {
      const pts = Math.round(input.points);
      if (!Number.isFinite(pts) || pts <= 0) {
        throw new Error('Award amount must be a positive whole number.');
      }
      const tx: PointTransaction = {
        id: nextId('ptx'),
        memberId: input.targetUserId,
        activityType: 'admin_adjustment',
        description: `Admin bonus: ${reason}`,
        transactionType: 'award',
        points: pts,
        relatedEntityType: 'admin',
        actorUserId: input.actor.uid,
        reason,
        createdAtIso: nowIso,
      };
      s.pointTransactions = [tx, ...s.pointTransactions];
      const sync = syncUserPointsFromLedger(s, input.targetUserId);
      pushLevelUpNotificationIfNeeded(s, input.targetUserId, sync.prevLevel, sync.newLevel, nowIso);
      s.notifications = [
        {
          id: nextId('notif'),
          recipientUserId: input.targetUserId,
          title: `Community points awarded (+${pts} pts)`,
          message: `${input.actor.displayName}: ${reason}`,
          createdAtIso: nowIso,
          read: false,
          route: 'profile',
        },
        ...s.notifications,
      ];
      store.save();
      return tx;
    }

    // Reversal mode
    let reversalTx: PointTransaction;
    if (input.relatedTransactionId) {
      const orig = s.pointTransactions.find(
        (t) =>
          t.id === input.relatedTransactionId &&
          t.memberId === input.targetUserId &&
          t.transactionType === 'award'
      );
      if (!orig) {
        throw new Error('Original award transaction not found for reversal.');
      }
      if (reversedIds.has(orig.id)) {
        throw new Error('This transaction has already been reversed.');
      }
      reversalTx = {
        id: nextId('ptx'),
        memberId: input.targetUserId,
        activityType: orig.activityType,
        description: `Admin reversal: ${orig.description}`,
        transactionType: 'reversal',
        points: -Math.abs(orig.points),
        relatedEntityType: orig.relatedEntityType ?? 'admin',
        relatedPostId: orig.relatedPostId,
        relatedEventId: orig.relatedEventId,
        relatedEntityTitle: orig.relatedEntityTitle,
        reversedTransactionId: orig.id,
        actorUserId: input.actor.uid,
        reason,
        createdAtIso: nowIso,
      };
    } else {
      const pts = Math.round(input.points);
      if (!Number.isFinite(pts) || pts <= 0) {
        throw new Error('Reversal amount must be a positive whole number.');
      }
      reversalTx = {
        id: nextId('ptx'),
        memberId: input.targetUserId,
        activityType: 'admin_adjustment',
        description: `Admin deduction: ${reason}`,
        transactionType: 'reversal',
        points: -pts,
        relatedEntityType: 'admin',
        actorUserId: input.actor.uid,
        reason,
        createdAtIso: nowIso,
      };
    }

    s.pointTransactions = [reversalTx, ...s.pointTransactions];
    syncUserPointsFromLedger(s, input.targetUserId);
    s.notifications = [
      {
        id: nextId('notif'),
        recipientUserId: input.targetUserId,
        title: `Points adjusted (${reversalTx.points} pts)`,
        message: `${input.actor.displayName}: ${reason}`,
        createdAtIso: nowIso,
        read: false,
        route: 'profile',
      },
      ...s.notifications,
    ];
    store.save();
    return reversalTx;
  }
}
