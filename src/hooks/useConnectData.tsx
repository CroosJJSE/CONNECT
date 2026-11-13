import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MemberLevelProvider } from './memberLevelContext';
import {
  calculateLevelFromPoints,
  countDailyActiveAwards,
  createDefaultPointsConfiguration,
  getLevelFrameStyle,
} from '../domain/logic/pointsRules';
import type {
  Community,
  CommunityAnnouncement,
  CommunityEvent,
  CommunityPoll,
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
  PointsConfiguration,
  PointTransaction,
  Post,
  RsvpStatus,
  SavingsGoal,
  SharingItem,
  SharingRequest,
  SkillOffer,
  UserProfile,
} from '../domain/models';
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
  UploadDriveMediaInput,
} from '../services/interfaces';
import { services } from '../services/serviceContainer';
import { useAuth } from './useAuth';

export interface PointFeedback {
  id: string;
  delta: number;
  description: string;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  tierName: string;
  limitReached?: boolean;
}

interface ConnectDataContextValue {
  communities: Community[];
  directoryMembers: UserProfile[];
  announcements: CommunityAnnouncement[];
  polls: CommunityPoll[];
  interestGroups: InterestGroup[];
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
  driveAuthorized: boolean;
  calendarAuthorized: boolean;
  calendarReminderMinutes: number;
  transactions: FinanceTransaction[];
  budgets: MonthlyBudget[];
  savingsGoals: SavingsGoal[];
  pointsConfig: PointsConfiguration;
  memberTransactions: PointTransaction[];
  allPointTransactions: PointTransaction[];
  eventRsvpLogs: EventRsvpLog[];
  lastPointFeedback: PointFeedback | null;
  dismissPointFeedback: () => void;
  loading: boolean;
  actionBanner: { type: 'success' | 'error'; message: string } | null;
  dismissBanner: () => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;

  // Actions
  refreshAll: (includeDonatedArchive?: boolean) => Promise<void>;
  createPost: (input: Omit<CreatePostInput, 'author'>) => Promise<void>;
  toggleWarmth: (postId: string) => Promise<void>;
  addPostComment: (postId: string, body: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  togglePinPost: (postId: string) => Promise<void>;

  createSharingItem: (input: Omit<CreateSharingItemInput, 'owner'>, includeArchive?: boolean) => Promise<void>;
  deleteSharingItem: (itemId: string, includeArchive?: boolean) => Promise<void>;
  borrowOrClaimItem: (itemId: string, includeArchive?: boolean) => Promise<void>;
  returnLentItem: (itemId: string, includeArchive?: boolean) => Promise<void>;
  createSharingRequest: (input: Omit<CreateSharingRequestInput, 'requester'>) => Promise<void>;
  deleteSharingRequest: (requestId: string) => Promise<void>;
  offerHelpOnRequest: (requestId: string) => Promise<void>;
  verifyHelpfulContribution: (requestId: string, helperUserId: string) => Promise<void>;
  closeSharingRequest: (requestId: string) => Promise<void>;
  createSkillOffer: (input: Omit<CreateSkillOfferInput, 'provider'>) => Promise<void>;
  deleteSkillOffer: (offerId: string) => Promise<void>;
  toggleSkillOfferActive: (offerId: string) => Promise<void>;

  addToOrbit: (friendUserId: string, note?: string) => Promise<void>;
  removeFromOrbit: (friendUserId: string) => Promise<void>;
  saveMemory: (input: MemorySaveInput, existingId?: string) => Promise<MemoryPost | null>;
  deleteMemory: (memoryId: string) => Promise<void>;
  addMemoryComment: (memoryId: string, body: string) => Promise<void>;

  createEvent: (input: Omit<CreateEventInput, 'host'>) => Promise<void>;
  setRsvp: (eventId: string, status: RsvpStatus) => Promise<void>;
  inviteToEvent: (eventId: string, userIds: string[]) => Promise<void>;
  addEventTask: (input: CreateEventTaskInput) => Promise<void>;
  toggleEventTask: (eventId: string, taskId: string) => Promise<void>;
  addEventComment: (eventId: string, body: string) => Promise<void>;
  syncEventToGoogleCalendar: (event: CommunityEvent) => Promise<CalendarSyncResult | null>;

  addTransaction: (input: Omit<CreateTransactionInput, 'ownerId'>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  updateBudgetLimit: (category: MonthlyBudget['category'], limit: number) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number) => Promise<void>;
  createSavingsGoal: (name: string, targetAmount: number, targetDateIso: string) => Promise<void>;

  authorizeDrive: () => Promise<void>;
  revokeDrive: () => Promise<void>;
  uploadDriveMedia: (input: Omit<UploadDriveMediaInput, 'ownerUserId'>) => Promise<DriveMediaMetadata | null>;
  updateDriveMediaVisibility: (mediaId: string, visibility: MediaVisibility) => Promise<void>;
  setCalendarReminderMinutes: (minutes: number) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  toggleGroup: (groupId: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;

  // Points & Admin actions
  updatePointsConfig: (config: PointsConfiguration) => Promise<void>;
  adjustMemberPoints: (input: Omit<AdminPointAdjustmentInput, 'actor'>) => Promise<void>;
  refreshPointsAdminData: () => Promise<void>;
}

const ConnectDataContext = createContext<ConnectDataContextValue | null>(null);

export function ConnectDataProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [directoryMembers, setDirectoryMembers] = useState<UserProfile[]>([]);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [polls, setPolls] = useState<CommunityPoll[]>([]);
  const [interestGroups, setInterestGroups] = useState<InterestGroup[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [orbitConnections, setOrbitConnections] = useState<OrbitConnection[]>([]);
  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [memoryComments, setMemoryComments] = useState<MemoryComment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sharingItems, setSharingItems] = useState<SharingItem[]>([]);
  const [sharingRequests, setSharingRequests] = useState<SharingRequest[]>([]);
  const [skillOffers, setSkillOffers] = useState<SkillOffer[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [driveMedia, setDriveMedia] = useState<DriveMediaMetadata[]>([]);
  const [driveAuthorized, setDriveAuthorized] = useState(false);
  const [calendarAuthorized, setCalendarAuthorized] = useState(false);
  const [calendarReminderMinutes, setCalendarReminderMinutesState] = useState(60);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfiguration>(() =>
    createDefaultPointsConfiguration()
  );
  const [memberTransactions, setMemberTransactions] = useState<PointTransaction[]>([]);
  const [allPointTransactions, setAllPointTransactions] = useState<PointTransaction[]>([]);
  const [eventRsvpLogs, setEventRsvpLogs] = useState<EventRsvpLog[]>([]);
  const [lastPointFeedback, setLastPointFeedback] = useState<PointFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dismissBanner = useCallback(() => setActionBanner(null), []);
  const dismissPointFeedback = useCallback(() => setLastPointFeedback(null), []);
  const notifySuccess = useCallback((message: string) => {
    setActionBanner({ type: 'success', message });
  }, []);
  const notifyError = useCallback((message: string) => {
    setActionBanner({ type: 'error', message });
  }, []);

  const syncPointsSnapshot = useCallback(
    async (
      prevLatestTxId?: string,
      prevUserPoints?: number,
      options?: { checkCommunityDailyLimit?: boolean }
    ) => {
      if (!user) return null;
      const [members, myTxs, rsvpLogs, notifs, cfg] = await Promise.all([
        services.community.getDirectoryMembers(),
        services.points.getMemberTransactions(user.uid),
        services.points.getEventRsvpLogs(user),
        services.community.getNotifications(),
        services.points.getConfiguration(),
      ]);
      setDirectoryMembers(members);
      setMemberTransactions(myTxs);
      setEventRsvpLogs(rsvpLogs);
      setNotifications(notifs);
      setPointsConfig(cfg);

      if (user.role === 'admin') {
        setAllPointTransactions(await services.points.getAllTransactions(user));
      }

      await refreshUser();

      const updatedSelf = members.find((m) => m.uid === user.uid);
      const latestTx = myTxs[0];
      const newLevel = calculateLevelFromPoints(updatedSelf?.points ?? user.points ?? 0);
      const oldLevel = calculateLevelFromPoints(prevUserPoints ?? user.points ?? 0);

      if (latestTx && latestTx.id !== prevLatestTxId) {
        const feedback: PointFeedback = {
          id: latestTx.id,
          delta: latestTx.points,
          description: latestTx.description,
          previousLevel: oldLevel,
          newLevel,
          leveledUp: newLevel > oldLevel,
          tierName: getLevelFrameStyle(newLevel).tierName,
        };
        setLastPointFeedback(feedback);
        return feedback;
      }

      if (options?.checkCommunityDailyLimit) {
        const postRule = cfg.rules.community_post_create;
        if (postRule?.enabled && postRule.dailyLimit) {
          const todayCount = countDailyActiveAwards({
            memberId: user.uid,
            activityType: 'community_post_create',
            transactions: myTxs,
            referenceIso: new Date().toISOString(),
          });
          if (todayCount >= postRule.dailyLimit) {
            const feedback: PointFeedback = {
              id: `cap-${Date.now()}`,
              delta: 0,
              description: `Daily community post point cap (${postRule.dailyLimit}/day) reached`,
              previousLevel: oldLevel,
              newLevel,
              leveledUp: false,
              tierName: getLevelFrameStyle(newLevel).tierName,
              limitReached: true,
            };
            setLastPointFeedback(feedback);
            return feedback;
          }
        }
      }

      return null;
    },
    [user, refreshUser]
  );

  const refreshAll = useCallback(
    async (includeDonatedArchive: boolean = false) => {
      if (!user) return;
      setLoading(true);
      try {
        const [
          comms,
          members,
          anns,
          pollList,
          groups,
          notifs,
          orbitList,
          orbitMap,
          memoryList,
          items,
          reqs,
          skills,
          evtList,
          mediaList,
          isDrive,
          isCal,
          reminderMin,
          txList,
          budgetList,
          goalList,
          pConfig,
          myPointTxs,
          rsvpLogs,
          adminPointTxs,
        ] = await Promise.all([
          services.community.getCommunities(),
          services.community.getDirectoryMembers(),
          services.community.getAnnouncements(),
          services.community.getPolls(),
          services.community.getInterestGroups(),
          services.community.getNotifications(),
          services.orbit.getOrbitConnections(user.uid),
          services.orbit.getOrbitMembersByOwnerMap(),
          services.memories.listMemories(user.uid),
          services.sharing.getItems(includeDonatedArchive),
          services.sharing.getRequests(),
          services.sharing.getSkillOffers(),
          services.events.getEvents(),
          services.media.listUserMedia(user.uid),
          services.media.isDriveAuthorized(),
          services.calendar.isCalendarAuthorized(),
          services.calendar.getCalendarReminderLeadMinutes(),
          services.finance.getTransactions(user.uid),
          services.finance.getBudgets(user.uid),
          services.finance.getSavingsGoals(user.uid),
          services.points.getConfiguration(),
          services.points.getMemberTransactions(user.uid),
          services.points.getEventRsvpLogs(user),
          user.role === 'admin' ? services.points.getAllTransactions(user) : Promise.resolve([]),
        ]);

        const authorizedPosts = await services.feed.getPostsForUser(user, orbitMap);

        setCommunities(comms);
        setDirectoryMembers(members);
        setAnnouncements(anns);
        setPolls(pollList);
        setInterestGroups(groups);
        setNotifications(notifs);
        setOrbitConnections(orbitList);
        setMemories(memoryList);
        const comments = (
          await Promise.all(memoryList.map((memory) => services.memories.listComments(memory.id)))
        ).flat();
        setMemoryComments(comments);
        setPosts(authorizedPosts);
        setSharingItems(items);
        setSharingRequests(reqs);
        setSkillOffers(skills);
        setEvents(evtList);
        setDriveMedia(mediaList);
        setDriveAuthorized(isDrive);
        setCalendarAuthorized(isCal);
        setCalendarReminderMinutesState(reminderMin);
        setTransactions(txList);
        setBudgets(budgetList);
        setSavingsGoals(goalList);
        setPointsConfig(pConfig);
        setMemberTransactions(myPointTxs);
        setEventRsvpLogs(rsvpLogs);
        setAllPointTransactions(adminPointTxs);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to load community data.');
      } finally {
        setLoading(false);
      }
    },
    [user, notifyError]
  );

  useEffect(() => {
    if (user) {
      void refreshAll(false);
    }
  }, [user, refreshAll]);

  const levelsByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of directoryMembers) {
      map[m.uid] = calculateLevelFromPoints(m.points ?? 0);
    }
    if (user) {
      map[user.uid] = calculateLevelFromPoints(user.points ?? 0);
    }
    return map;
  }, [directoryMembers, user]);

  const reloadFeed = useCallback(async () => {
    if (!user) return;
    const orbitMap = await services.orbit.getOrbitMembersByOwnerMap();
    const authorized = await services.feed.getPostsForUser(user, orbitMap);
    setPosts(authorized);
  }, [user]);

  const createPost = useCallback(
    async (input: Omit<CreatePostInput, 'author'>) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        const created = await services.feed.createPost({ ...input, author: user });
        await reloadFeed();
        const fb = await syncPointsSnapshot(prevTxId, prevPoints, {
          checkCommunityDailyLimit: input.audienceType === 'communities',
        });
        const baseMessage =
          input.audienceType === 'private'
            ? 'Private note saved.'
            : input.audienceType === 'orbit'
              ? 'Shared with My Orbit.'
              : 'Post published to selected communities.';
        const mentionCount = created.mentionedUserIds?.filter((id) => id !== user.uid).length ?? 0;
        const pointsSuffix =
          fb && fb.delta > 0
            ? ` (+${fb.delta} pts)`
            : fb?.limitReached
              ? ' · Daily post points cap reached'
              : '';
        notifySuccess(
          mentionCount > 0 && input.audienceType !== 'private'
            ? `${baseMessage}${pointsSuffix} Mentioned ${mentionCount} neighbor${mentionCount === 1 ? '' : 's'}.`
            : `${baseMessage}${pointsSuffix}`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Failed to publish post.');
      }
    },
    [user, memberTransactions, reloadFeed, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const toggleWarmth = useCallback(
    async (postId: string) => {
      if (!user) return;
      const updated = await services.feed.toggleWarmth(postId, user.uid);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    },
    [user]
  );

  const addPostComment = useCallback(
    async (postId: string, body: string) => {
      if (!user) return;
      try {
        const updated = await services.feed.addComment(postId, user, body);
        setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
        const latestComment = updated.comments[updated.comments.length - 1];
        const mentionCount =
          latestComment?.mentionedUserIds?.filter((id) => id !== user.uid).length ?? 0;
        if (mentionCount > 0 && updated.audienceType !== 'private') {
          setNotifications(await services.community.getNotifications());
          notifySuccess(
            `Comment posted · Mentioned ${mentionCount} neighbor${mentionCount === 1 ? '' : 's'}.`
          );
        }
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Failed to post comment.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.feed.deletePost(postId, user.uid);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta < 0
            ? `Post removed (${fb.delta} pts reversed).`
            : 'Post removed.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to delete post.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const togglePinPost = useCallback(
    async (postId: string) => {
      try {
        await services.feed.togglePinPost(postId);
        await reloadFeed();
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to update pin.');
      }
    },
    [reloadFeed, notifyError]
  );

  const createSharingItem = useCallback(
    async (input: Omit<CreateSharingItemInput, 'owner'>, includeArchive = false) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.createItem({ ...input, owner: user });
        setSharingItems(await services.sharing.getItems(includeArchive));
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta > 0
            ? `"${input.title}" listed under I Have (+${fb.delta} pts).`
            : `"${input.title}" listed under I Have.`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not publish item.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const deleteSharingItem = useCallback(
    async (itemId: string, includeArchive = false) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.deleteItem(itemId, user.uid);
        setSharingItems(await services.sharing.getItems(includeArchive));
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta < 0
            ? `Listing removed (${fb.delta} pts reversed).`
            : 'Listing removed.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to remove listing.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const borrowOrClaimItem = useCallback(
    async (itemId: string, includeArchive = false) => {
      if (!user) return;
      try {
        const updated = await services.sharing.borrowOrClaimItem(itemId, user);
        setSharingItems(await services.sharing.getItems(includeArchive));
        notifySuccess(
          updated.status === 'donated'
            ? `Claimed "${updated.title}". It has been archived from active listings.`
            : `Reserved "${updated.title}" (${updated.dueLabel ?? 'Lent'}).`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not reserve item.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const returnLentItem = useCallback(
    async (itemId: string, includeArchive = false) => {
      if (!user) return;
      try {
        const updated = await services.sharing.returnLentItem(itemId, user);
        setSharingItems(await services.sharing.getItems(includeArchive));
        notifySuccess(`"${updated.title}" marked returned and is available again.`);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not mark item returned.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const createSharingRequest = useCallback(
    async (input: Omit<CreateSharingRequestInput, 'requester'>) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.createRequest({ ...input, requester: user });
        setSharingRequests(await services.sharing.getRequests());
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta > 0
            ? `Your support request is now live (+${fb.delta} pts).`
            : 'Your support request is now live.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not create request.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const deleteSharingRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.deleteRequest(requestId, user.uid);
        setSharingRequests(await services.sharing.getRequests());
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta < 0
            ? `Request deleted (${fb.delta} pts reversed).`
            : 'Request deleted.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not delete request.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const offerHelpOnRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      try {
        const updated = await services.sharing.offerHelp(requestId, user.displayName, user.uid);
        setSharingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
        notifySuccess(`Offered to help ${updated.requesterName}.`);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not record offer.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const verifyHelpfulContribution = useCallback(
    async (requestId: string, helperUserId: string) => {
      if (!user) return;
      try {
        const updated = await services.sharing.verifyHelpfulContribution(
          requestId,
          helperUserId,
          user
        );
        setSharingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
        await syncPointsSnapshot(memberTransactions[0]?.id, user.points ?? 0);
        const helper = directoryMembers.find((m) => m.uid === helperUserId);
        const rulePts = pointsConfig.rules.helpful_contribution?.points ?? 20;
        notifySuccess(
          `Verified ${helper?.displayName ?? 'neighbor'}'s helpful contribution (+${rulePts} pts awarded).`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not verify contribution.');
      }
    },
    [
      user,
      memberTransactions,
      directoryMembers,
      pointsConfig.rules.helpful_contribution,
      syncPointsSnapshot,
      notifySuccess,
      notifyError,
    ]
  );

  const closeSharingRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      try {
        const updated = await services.sharing.closeRequest(requestId, user.uid);
        setSharingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
        notifySuccess('Request marked closed.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not close request.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const createSkillOffer = useCallback(
    async (input: Omit<CreateSkillOfferInput, 'provider'>) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.createSkillOffer({ ...input, provider: user });
        setSkillOffers(await services.sharing.getSkillOffers());
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta > 0
            ? `Skill offer published under I Can (+${fb.delta} pts).`
            : 'Skill offer published under I Can.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not add skill offer.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const deleteSkillOffer = useCallback(
    async (offerId: string) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.sharing.deleteSkillOffer(offerId, user.uid);
        setSkillOffers(await services.sharing.getSkillOffers());
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta < 0
            ? `Skill offer removed (${fb.delta} pts reversed).`
            : 'Skill offer removed.'
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not remove skill offer.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const toggleSkillOfferActive = useCallback(
    async (offerId: string) => {
      if (!user) return;
      try {
        const updated = await services.sharing.toggleSkillOfferActive(offerId, user.uid);
        setSkillOffers((prev) => prev.map((o) => (o.id === offerId ? updated : o)));
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not update skill status.');
      }
    },
    [user, notifyError]
  );

  const addToOrbit = useCallback(
    async (friendUserId: string, note?: string) => {
      if (!user) return;
      try {
        const updated = await services.orbit.addToOrbit(user.uid, friendUserId, note);
        setOrbitConnections(updated);
        await reloadFeed();
        notifySuccess('Added neighbor to My Orbit.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not add to My Orbit.');
      }
    },
    [user, reloadFeed, notifySuccess, notifyError]
  );

  const removeFromOrbit = useCallback(
    async (friendUserId: string) => {
      if (!user) return;
      try {
        const updated = await services.orbit.removeFromOrbit(user.uid, friendUserId);
        setOrbitConnections(updated);
        await reloadFeed();
        notifySuccess('Removed from My Orbit.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not update My Orbit.');
      }
    },
    [user, reloadFeed, notifySuccess, notifyError]
  );

  const saveMemory = useCallback(
    async (input: MemorySaveInput, existingId?: string) => {
      if (!user) return null;
      try {
        const saved = await services.memories.saveMemory(user.uid, input, existingId);
        const list = await services.memories.listMemories(user.uid);
        setMemories(list);
        notifySuccess(input.status === 'draft' ? 'Draft saved.' : 'Memory committed.');
        return saved;
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not save this memory.');
        return null;
      }
    },
    [user, notifySuccess, notifyError]
  );

  const deleteMemory = useCallback(
    async (memoryId: string) => {
      if (!user) return;
      try {
        await services.memories.deleteMemory(user.uid, memoryId);
        setMemories((prev) => prev.filter((memory) => memory.id !== memoryId));
        setMemoryComments((prev) => prev.filter((comment) => comment.memoryId !== memoryId));
        notifySuccess('Memory removed from your archive.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not delete this memory.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const addMemoryComment = useCallback(
    async (memoryId: string, body: string) => {
      if (!user) return;
      try {
        const comment = await services.memories.addComment(memoryId, user, body);
        setMemoryComments((prev) => [...prev, comment]);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not add comment.');
      }
    },
    [user, notifyError]
  );

  const createEvent = useCallback(
    async (input: Omit<CreateEventInput, 'host'>) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        await services.events.createEvent({ ...input, host: user });
        setEvents(await services.events.getEvents());
        const fb = await syncPointsSnapshot(prevTxId, prevPoints);
        notifySuccess(
          fb && fb.delta > 0
            ? `Event "${input.title}" created (+${fb.delta} RSVP pts).`
            : `Event "${input.title}" created.`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not create event.');
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess, notifyError]
  );

  const setRsvp = useCallback(
    async (eventId: string, status: RsvpStatus) => {
      if (!user) return;
      const prevTxId = memberTransactions[0]?.id;
      const prevPoints = user.points ?? 0;
      const updated = await services.events.setRsvp(eventId, user.uid, status);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      const fb = await syncPointsSnapshot(prevTxId, prevPoints);
      if (fb) {
        if (fb.delta > 0) {
          notifySuccess(`RSVP Going confirmed · +${fb.delta} community points earned.`);
        } else if (fb.delta < 0) {
          notifySuccess(`RSVP updated · ${fb.delta} pts reversed.`);
        }
      }
    },
    [user, memberTransactions, syncPointsSnapshot, notifySuccess]
  );

  const inviteToEvent = useCallback(
    async (eventId: string, userIds: string[]) => {
      const updated = await services.events.inviteMembers(eventId, userIds);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      notifySuccess(`Invited ${userIds.length} member(s) to ${updated.title}.`);
    },
    [notifySuccess]
  );

  const addEventTask = useCallback(
    async (input: CreateEventTaskInput) => {
      const updated = await services.events.addTask(input);
      setEvents((prev) => prev.map((e) => (e.id === input.eventId ? updated : e)));
      notifySuccess('Task assigned with reminder settings.');
    },
    [notifySuccess]
  );

  const toggleEventTask = useCallback(async (eventId: string, taskId: string) => {
    const updated = await services.events.toggleTaskStatus(eventId, taskId);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
  }, []);

  const addEventComment = useCallback(
    async (eventId: string, body: string) => {
      if (!user) return;
      try {
        const updated = await services.events.addComment(eventId, user, body);
        setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        const latestComment = updated.comments[updated.comments.length - 1];
        const mentionCount =
          latestComment?.mentionedUserIds?.filter((id) => id !== user.uid).length ?? 0;
        if (mentionCount > 0) {
          setNotifications(await services.community.getNotifications());
          notifySuccess(
            `Message sent · Mentioned ${mentionCount} neighbor${mentionCount === 1 ? '' : 's'}.`
          );
        }
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not send message.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const syncEventToGoogleCalendar = useCallback(
    async (event: CommunityEvent): Promise<CalendarSyncResult | null> => {
      try {
        const res = await services.calendar.addEventToGoogleCalendar(event);
        const updated = await services.events.markCalendarSynced(event.id);
        setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
        setCalendarAuthorized(true);
        await refreshUser();
        notifySuccess(res.message);
        return res;
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Calendar sync failed.');
        return null;
      }
    },
    [refreshUser, notifySuccess, notifyError]
  );

  const addTransaction = useCallback(
    async (input: Omit<CreateTransactionInput, 'ownerId'>) => {
      if (!user) return;
      try {
        await services.finance.addTransaction({ ...input, ownerId: user.uid });
        setTransactions(await services.finance.getTransactions(user.uid));
        notifySuccess('Transaction recorded.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Failed to save transaction.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      if (!user) return;
      await services.finance.deleteTransaction(user.uid, transactionId);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      notifySuccess('Transaction deleted.');
    },
    [user, notifySuccess]
  );

  const updateBudgetLimit = useCallback(
    async (category: MonthlyBudget['category'], limit: number) => {
      if (!user) return;
      const updated = await services.finance.updateBudgetLimit(user.uid, category, limit);
      setBudgets(updated);
      notifySuccess(`Updated ${category} monthly budget.`);
    },
    [user, notifySuccess]
  );

  const contributeToGoal = useCallback(
    async (goalId: string, amount: number) => {
      if (!user) return;
      const updated = await services.finance.contributeToGoal(user.uid, goalId, amount);
      setSavingsGoals(updated);
      notifySuccess('Contribution added to savings goal.');
    },
    [user, notifySuccess]
  );

  const createSavingsGoal = useCallback(
    async (name: string, targetAmount: number, targetDateIso: string) => {
      if (!user) return;
      const updated = await services.finance.createSavingsGoal(user.uid, name, targetAmount, targetDateIso);
      setSavingsGoals(updated);
      notifySuccess(`Created savings goal "${name}".`);
    },
    [user, notifySuccess]
  );

  const authorizeDrive = useCallback(async () => {
    await services.media.authorizeDriveAccess();
    setDriveAuthorized(true);
    await refreshUser();
    notifySuccess('Google Drive dedicated "CONNECT App Media" folder connected.');
  }, [refreshUser, notifySuccess]);

  const revokeDrive = useCallback(async () => {
    await services.media.revokeDriveAccess();
    setDriveAuthorized(false);
    await refreshUser();
    notifySuccess('Disconnected Google Drive media access.');
  }, [refreshUser, notifySuccess]);

  const uploadDriveMedia = useCallback(
    async (input: Omit<UploadDriveMediaInput, 'ownerUserId'>): Promise<DriveMediaMetadata | null> => {
      if (!user) return null;
      try {
        const record = await services.media.uploadMediaToAppFolder({
          ...input,
          ownerUserId: user.uid,
        });
        setDriveMedia(await services.media.listUserMedia(user.uid));
        setDriveAuthorized(true);
        await refreshUser();
        notifySuccess(`Saved "${record.fileName}" to your Google Drive folder.`);
        return record;
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Google Drive upload failed.');
        return null;
      }
    },
    [user, refreshUser, notifySuccess, notifyError]
  );

  const updateDriveMediaVisibility = useCallback(
    async (mediaId: string, visibility: MediaVisibility) => {
      if (!user) return;
      const updated = await services.media.updateMediaVisibility(mediaId, user.uid, visibility);
      setDriveMedia((prev) => prev.map((m) => (m.id === mediaId ? updated : m)));
      notifySuccess(
        visibility === 'anyone_with_link'
          ? 'Sharing set to "Anyone with the link can view".'
          : 'Media restricted to Private (owner only).'
      );
    },
    [user, notifySuccess]
  );

  const setCalendarReminderMinutes = useCallback(
    async (minutes: number) => {
      await services.calendar.setCalendarReminderLeadMinutes(minutes);
      setCalendarReminderMinutesState(minutes);
      notifySuccess(`Default event reminder set to ${minutes} minutes before.`);
    },
    [notifySuccess]
  );

  const votePoll = useCallback(
    async (pollId: string, optionId: string) => {
      if (!user) return;
      const updated = await services.community.votePoll(pollId, optionId, user.uid);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updated : p)));
      notifySuccess('Vote recorded.');
    },
    [user, notifySuccess]
  );

  const toggleGroup = useCallback(
    async (groupId: string) => {
      const updated = await services.community.toggleInterestGroup(groupId);
      setInterestGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
    },
    []
  );

  const markNotificationsRead = useCallback(async () => {
    const updated = await services.community.markAllNotificationsRead();
    setNotifications(updated);
  }, []);

  const updatePointsConfig = useCallback(
    async (config: PointsConfiguration) => {
      if (!user) return;
      try {
        const updated = await services.points.updateConfiguration(user, config);
        setPointsConfig(updated);
        notifySuccess('Points rules updated for all new activities.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to save points configuration.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const refreshPointsAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    const [members, allTxs, rsvpLogs, cfg] = await Promise.all([
      services.community.getDirectoryMembers(),
      services.points.getAllTransactions(user),
      services.points.getEventRsvpLogs(user),
      services.points.getConfiguration(),
    ]);
    setDirectoryMembers(members);
    setAllPointTransactions(allTxs);
    setEventRsvpLogs(rsvpLogs);
    setPointsConfig(cfg);
  }, [user]);

  const adjustMemberPoints = useCallback(
    async (input: Omit<AdminPointAdjustmentInput, 'actor'>) => {
      if (!user) return;
      try {
        const prevTxId = memberTransactions[0]?.id;
        const prevPoints = user.points ?? 0;
        const tx = await services.points.adjustMemberPoints({ ...input, actor: user });
        await syncPointsSnapshot(
          input.targetUserId === user.uid ? prevTxId : memberTransactions[0]?.id,
          prevPoints
        );
        const target = directoryMembers.find((m) => m.uid === input.targetUserId);
        notifySuccess(
          `${tx.points >= 0 ? 'Awarded' : 'Reversed'} ${Math.abs(tx.points)} pts for ${target?.displayName ?? 'member'}.`
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to adjust member points.');
      }
    },
    [user, memberTransactions, directoryMembers, syncPointsSnapshot, notifySuccess, notifyError]
  );

  return (
    <ConnectDataContext.Provider
      value={{
        communities,
        directoryMembers,
        announcements,
        polls,
        interestGroups,
        notifications,
        orbitConnections,
        memories,
        memoryComments,
        posts,
        sharingItems,
        sharingRequests,
        skillOffers,
        events,
        driveMedia,
        driveAuthorized,
        calendarAuthorized,
        calendarReminderMinutes,
        transactions,
        budgets,
        savingsGoals,
        pointsConfig,
        memberTransactions,
        allPointTransactions,
        eventRsvpLogs,
        lastPointFeedback,
        dismissPointFeedback,
        loading,
        actionBanner,
        dismissBanner,
        notifySuccess,
        notifyError,
        refreshAll,
        createPost,
        toggleWarmth,
        addPostComment,
        deletePost,
        togglePinPost,
        createSharingItem,
        deleteSharingItem,
        borrowOrClaimItem,
        returnLentItem,
        createSharingRequest,
        deleteSharingRequest,
        offerHelpOnRequest,
        verifyHelpfulContribution,
        closeSharingRequest,
        createSkillOffer,
        deleteSkillOffer,
        toggleSkillOfferActive,
        addToOrbit,
        removeFromOrbit,
        saveMemory,
        deleteMemory,
        addMemoryComment,
        createEvent,
        setRsvp,
        inviteToEvent,
        addEventTask,
        toggleEventTask,
        addEventComment,
        syncEventToGoogleCalendar,
        addTransaction,
        deleteTransaction,
        updateBudgetLimit,
        contributeToGoal,
        createSavingsGoal,
        authorizeDrive,
        revokeDrive,
        uploadDriveMedia,
        updateDriveMediaVisibility,
        setCalendarReminderMinutes,
        votePoll,
        toggleGroup,
        markNotificationsRead,
        updatePointsConfig,
        adjustMemberPoints,
        refreshPointsAdminData,
      }}
    >
      <MemberLevelProvider levelsByUserId={levelsByUserId}>{children}</MemberLevelProvider>
    </ConnectDataContext.Provider>
  );
}

export function useConnectData(): ConnectDataContextValue {
  const ctx = useContext(ConnectDataContext);
  if (!ctx) {
    throw new Error('useConnectData must be used inside ConnectDataProvider');
  }
  return ctx;
}
