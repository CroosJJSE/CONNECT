import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  Community,
  CommunityAnnouncement,
  CommunityEvent,
  CommunityPoll,
  DriveMediaMetadata,
  FinanceTransaction,
  InterestGroup,
  MediaVisibility,
  MonthlyBudget,
  NotificationItem,
  OrbitConnection,
  Post,
  RsvpStatus,
  SavingsGoal,
  SharingItem,
  SharingRequest,
  SkillOffer,
  UserProfile,
} from '../domain/models';
import type {
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

interface ConnectDataContextValue {
  communities: Community[];
  directoryMembers: UserProfile[];
  announcements: CommunityAnnouncement[];
  polls: CommunityPoll[];
  interestGroups: InterestGroup[];
  notifications: NotificationItem[];
  orbitConnections: OrbitConnection[];
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
  borrowOrClaimItem: (itemId: string, includeArchive?: boolean) => Promise<void>;
  returnLentItem: (itemId: string, includeArchive?: boolean) => Promise<void>;
  createSharingRequest: (input: Omit<CreateSharingRequestInput, 'requester'>) => Promise<void>;
  offerHelpOnRequest: (requestId: string) => Promise<void>;
  closeSharingRequest: (requestId: string) => Promise<void>;
  createSkillOffer: (input: Omit<CreateSkillOfferInput, 'provider'>) => Promise<void>;
  toggleSkillOfferActive: (offerId: string) => Promise<void>;

  addToOrbit: (friendUserId: string, note?: string) => Promise<void>;
  removeFromOrbit: (friendUserId: string) => Promise<void>;

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
  const [loading, setLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dismissBanner = useCallback(() => setActionBanner(null), []);
  const notifySuccess = useCallback((message: string) => {
    setActionBanner({ type: 'success', message });
  }, []);
  const notifyError = useCallback((message: string) => {
    setActionBanner({ type: 'error', message });
  }, []);

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
        ] = await Promise.all([
          services.community.getCommunities(),
          services.community.getDirectoryMembers(),
          services.community.getAnnouncements(),
          services.community.getPolls(),
          services.community.getInterestGroups(),
          services.community.getNotifications(),
          services.orbit.getOrbitConnections(user.uid),
          services.orbit.getOrbitMembersByOwnerMap(),
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
        ]);

        const authorizedPosts = await services.feed.getPostsForUser(user, orbitMap);

        setCommunities(comms);
        setDirectoryMembers(members);
        setAnnouncements(anns);
        setPolls(pollList);
        setInterestGroups(groups);
        setNotifications(notifs);
        setOrbitConnections(orbitList);
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
        const created = await services.feed.createPost({ ...input, author: user });
        await reloadFeed();
        setNotifications(await services.community.getNotifications());
        const baseMessage =
          input.audienceType === 'private'
            ? 'Private note saved.'
            : input.audienceType === 'orbit'
              ? 'Shared with My Orbit.'
              : 'Post published to selected communities.';
        const mentionCount = created.mentionedUserIds?.filter((id) => id !== user.uid).length ?? 0;
        notifySuccess(
          mentionCount > 0 && input.audienceType !== 'private'
            ? `${baseMessage} Mentioned ${mentionCount} neighbor${mentionCount === 1 ? '' : 's'}.`
            : baseMessage
        );
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Failed to publish post.');
      }
    },
    [user, reloadFeed, notifySuccess, notifyError]
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
        await services.feed.deletePost(postId, user.uid);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        notifySuccess('Post removed.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Unable to delete post.');
      }
    },
    [user, notifySuccess, notifyError]
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
        await services.sharing.createItem({ ...input, owner: user });
        setSharingItems(await services.sharing.getItems(includeArchive));
        notifySuccess(`"${input.title}" listed under I Have.`);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not publish item.');
      }
    },
    [user, notifySuccess, notifyError]
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
        await services.sharing.createRequest({ ...input, requester: user });
        setSharingRequests(await services.sharing.getRequests());
        notifySuccess('Your support request is now live.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not create request.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const offerHelpOnRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      try {
        const updated = await services.sharing.offerHelp(requestId, user.displayName);
        setSharingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
        notifySuccess(`Offered to help ${updated.requesterName}.`);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not record offer.');
      }
    },
    [user, notifySuccess, notifyError]
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
        await services.sharing.createSkillOffer({ ...input, provider: user });
        setSkillOffers(await services.sharing.getSkillOffers());
        notifySuccess('Skill offer published under I Can.');
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not add skill offer.');
      }
    },
    [user, notifySuccess, notifyError]
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

  const createEvent = useCallback(
    async (input: Omit<CreateEventInput, 'host'>) => {
      if (!user) return;
      try {
        await services.events.createEvent({ ...input, host: user });
        setEvents(await services.events.getEvents());
        notifySuccess(`Event "${input.title}" created.`);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not create event.');
      }
    },
    [user, notifySuccess, notifyError]
  );

  const setRsvp = useCallback(
    async (eventId: string, status: RsvpStatus) => {
      if (!user) return;
      const updated = await services.events.setRsvp(eventId, user.uid, status);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    },
    [user]
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
        borrowOrClaimItem,
        returnLentItem,
        createSharingRequest,
        offerHelpOnRequest,
        closeSharingRequest,
        createSkillOffer,
        toggleSkillOfferActive,
        addToOrbit,
        removeFromOrbit,
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
      }}
    >
      {children}
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
