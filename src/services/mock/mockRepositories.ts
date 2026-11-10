import { canUserViewPost, filterAuthorizedPosts } from '../../domain/logic/feedAudience';
import { categorizeTransaction } from '../../domain/logic/financeCategorizer';
import { deriveInitials } from '../../domain/logic/formatting';
import { extractMentionedUsers } from '../../domain/logic/mentions';
import {
  borrowOrClaimItem,
  closeSharingRequest,
  isItemVisibleInAvailableMarketplace,
  markLentItemReturned,
  offerHelpOnRequest,
} from '../../domain/logic/sharingRules';
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
} from '../../domain/models';
import { buildDriveViewerUrl, CONNECT_DRIVE_FOLDER_NAME } from '../google/googleDriveService';
import { generateIcsContent } from '../google/googleCalendarService';
import { workspaceTokenStore } from '../google/workspaceTokenStore';
import type {
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
  IOrbitRepository,
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
  SEED_EVENTS,
  SEED_GOALS,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_ORBIT_CONNECTIONS,
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
  posts: Post[];
  sharingItems: SharingItem[];
  sharingRequests: SharingRequest[];
  skillOffers: SkillOffer[];
  events: CommunityEvent[];
  driveMedia: DriveMediaMetadata[];
  transactions: FinanceTransaction[];
  budgets: MonthlyBudget[];
  savingsGoals: SavingsGoal[];
  driveAuthorized: boolean;
  calendarAuthorized: boolean;
  calendarReminderMinutes: number;
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
    posts: structuredClone(SEED_POSTS),
    sharingItems: structuredClone(SEED_SHARING_ITEMS),
    sharingRequests: structuredClone(SEED_SHARING_REQUESTS),
    skillOffers: structuredClone(SEED_SKILL_OFFERS),
    events: structuredClone(SEED_EVENTS),
    driveMedia: structuredClone(SEED_DRIVE_MEDIA),
    transactions: structuredClone(SEED_TRANSACTIONS),
    budgets: structuredClone(SEED_BUDGETS),
    savingsGoals: structuredClone(SEED_GOALS),
    driveAuthorized: false,
    calendarAuthorized: false,
    calendarReminderMinutes: 60,
  };
}

class InMemoryStateStore {
  private state: PersistedMockState;

  constructor() {
    const raw = platformStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedMockState;
        this.state = {
          ...parsed,
          users: (parsed.users ?? []).map((u) => ({
            ...u,
            financeEnabled: Boolean(u.financeEnabled),
          })),
        };
        return;
      } catch {
        // Fallback to clean seed state if storage corrupted
      }
    }
    this.state = createInitialState();
  }

  get(): PersistedMockState {
    return this.state;
  }

  save(): void {
    platformStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

const store = new InMemoryStateStore();

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export class MockAuthService implements IAuthService {
  async getDemoAccounts(): Promise<UserProfile[]> {
    return store.get().users.slice(0, 3);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const s = store.get();
    if (!s.currentUserId) return null;
    return s.users.find((u) => u.uid === s.currentUserId) ?? null;
  }

  async signInWithGoogle(preferredUid: string = 'user-elena'): Promise<UserProfile> {
    const s = store.get();
    const found = s.users.find((u) => u.uid === preferredUid) ?? s.users[0];
    s.currentUserId = found.uid;
    store.save();
    return found;
  }

  async signOut(): Promise<void> {
    const s = store.get();
    s.currentUserId = null;
    workspaceTokenStore.clearAll();
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
    store.save();
    return newItem;
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
      driveMediaId: input.driveMediaId,
      createdAtIso: new Date().toISOString(),
    };
    const s = store.get();
    s.sharingRequests = [newReq, ...s.sharingRequests];
    store.save();
    return newReq;
  }

  async offerHelp(requestId: string, helperName: string): Promise<SharingRequest> {
    const s = store.get();
    const existing = s.sharingRequests.find((r) => r.id === requestId);
    if (!existing) throw new Error('Request not found.');
    const updated = offerHelpOnRequest({ request: existing, helperName });
    s.sharingRequests = s.sharingRequests.map((r) => (r.id === requestId ? updated : r));
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
      createdAtIso: new Date().toISOString(),
    };
    const s = store.get();
    s.skillOffers = [offer, ...s.skillOffers];
    store.save();
    return offer;
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
    store.save();
    return evt;
  }

  async setRsvp(eventId: string, userId: string, status: RsvpStatus): Promise<CommunityEvent> {
    const s = store.get();
    const evt = s.events.find((e) => e.id === eventId);
    if (!evt) throw new Error('Event not found.');
    const updated: CommunityEvent = {
      ...evt,
      rsvps: { ...evt.rsvps, [userId]: status },
    };
    s.events = s.events.map((e) => (e.id === eventId ? updated : e));
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
    };
    const s = store.get();
    s.driveMedia = [record, ...s.driveMedia];
    s.driveAuthorized = true;
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
