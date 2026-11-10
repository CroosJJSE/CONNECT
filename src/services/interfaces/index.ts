import type {
  Community,
  CommunityAnnouncement,
  CommunityEvent,
  CommunityPoll,
  CurrencyCode,
  DriveMediaMetadata,
  EventTask,
  FinanceTransaction,
  InterestGroup,
  MediaVisibility,
  MonthlyBudget,
  NotificationItem,
  OrbitConnection,
  Post,
  PostAudienceType,
  PostCategory,
  RsvpStatus,
  SavingsGoal,
  SharingCategory,
  SharingItem,
  SharingMode,
  SharingRequest,
  SkillCategory,
  SkillOffer,
  TransactionCategory,
  TransactionType,
  UserProfile,
} from '../../domain/models';

export interface IAuthService {
  getCurrentUser(): Promise<UserProfile | null>;
  signInWithGoogle(preferredUid?: string): Promise<UserProfile>;
  signOut(): Promise<void>;
  updateProfile(uid: string, patch: Partial<Pick<UserProfile, 'displayName' | 'clusterName' | 'unitLabel' | 'bio' | 'preferredCurrency' | 'phoneVisibleToHousemates' | 'financeEnabled'>>): Promise<UserProfile>;
  getDemoAccounts(): Promise<UserProfile[]>;
}

export interface ICommunityRepository {
  getCommunities(): Promise<Community[]>;
  getDirectoryMembers(): Promise<UserProfile[]>;
  getAnnouncements(): Promise<CommunityAnnouncement[]>;
  getPolls(): Promise<CommunityPoll[]>;
  votePoll(pollId: string, optionId: string, userId: string): Promise<CommunityPoll>;
  getInterestGroups(): Promise<InterestGroup[]>;
  toggleInterestGroup(groupId: string): Promise<InterestGroup>;
  getNotifications(): Promise<NotificationItem[]>;
  markAllNotificationsRead(): Promise<NotificationItem[]>;
}

export interface CreatePostInput {
  author: UserProfile;
  category: PostCategory;
  content: string;
  audienceType: PostAudienceType;
  communityIds: string[];
  driveMedia?: DriveMediaMetadata;
  locationBadge?: string;
}

export interface IFeedRepository {
  getPostsForUser(viewer: UserProfile, orbitMembersByOwner: Record<string, string[]>): Promise<Post[]>;
  createPost(input: CreatePostInput): Promise<Post>;
  toggleWarmth(postId: string, userId: string): Promise<Post>;
  addComment(postId: string, author: UserProfile, body: string): Promise<Post>;
  deletePost(postId: string, actorUserId: string): Promise<void>;
  togglePinPost(postId: string): Promise<Post>;
}

export interface CreateSharingItemInput {
  owner: UserProfile;
  communityId: string;
  title: string;
  description: string;
  category: SharingCategory;
  mode: SharingMode;
  durationDays?: number;
  driveMediaId?: string;
}

export interface CreateSharingRequestInput {
  requester: UserProfile;
  communityId: string;
  title: string;
  description: string;
  requiredDuration: string;
  driveMediaId?: string;
}

export interface CreateSkillOfferInput {
  provider: UserProfile;
  communityId: string;
  title: string;
  category: SkillCategory;
  description: string;
  availability: string;
}

export interface ISharingRepository {
  getItems(includeDonatedArchive?: boolean): Promise<SharingItem[]>;
  createItem(input: CreateSharingItemInput): Promise<SharingItem>;
  borrowOrClaimItem(itemId: string, actor: UserProfile): Promise<SharingItem>;
  returnLentItem(itemId: string, actor: UserProfile): Promise<SharingItem>;
  getRequests(): Promise<SharingRequest[]>;
  createRequest(input: CreateSharingRequestInput): Promise<SharingRequest>;
  offerHelp(requestId: string, helperName: string): Promise<SharingRequest>;
  closeRequest(requestId: string, actorUserId: string): Promise<SharingRequest>;
  getSkillOffers(): Promise<SkillOffer[]>;
  createSkillOffer(input: CreateSkillOfferInput): Promise<SkillOffer>;
  toggleSkillOfferActive(offerId: string, actorUserId: string): Promise<SkillOffer>;
}

export interface IOrbitRepository {
  getOrbitConnections(ownerId: string): Promise<OrbitConnection[]>;
  getOrbitMembersByOwnerMap(): Promise<Record<string, string[]>>;
  addToOrbit(ownerId: string, friendUserId: string, note?: string): Promise<OrbitConnection[]>;
  removeFromOrbit(ownerId: string, friendUserId: string): Promise<OrbitConnection[]>;
}

export interface CreateEventInput {
  host: UserProfile;
  communityId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  driveMediaId?: string;
}

export interface CreateEventTaskInput {
  eventId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  deadlineIso: string;
  reminderEnabled: boolean;
}

export interface IEventRepository {
  getEvents(): Promise<CommunityEvent[]>;
  createEvent(input: CreateEventInput): Promise<CommunityEvent>;
  setRsvp(eventId: string, userId: string, status: RsvpStatus): Promise<CommunityEvent>;
  inviteMembers(eventId: string, userIds: string[]): Promise<CommunityEvent>;
  addTask(input: CreateEventTaskInput): Promise<CommunityEvent>;
  toggleTaskStatus(eventId: string, taskId: string): Promise<CommunityEvent>;
  addComment(eventId: string, author: UserProfile, body: string): Promise<CommunityEvent>;
  markCalendarSynced(eventId: string): Promise<CommunityEvent>;
}

export interface CreateTransactionInput {
  ownerId: string;
  title: string;
  merchant?: string;
  amount: number;
  type: TransactionType;
  category?: TransactionCategory;
  notes?: string;
  occurredAtIso?: string;
}

export interface IFinanceRepository {
  getTransactions(ownerId: string): Promise<FinanceTransaction[]>;
  addTransaction(input: CreateTransactionInput): Promise<FinanceTransaction>;
  deleteTransaction(ownerId: string, transactionId: string): Promise<void>;
  getBudgets(ownerId: string): Promise<MonthlyBudget[]>;
  updateBudgetLimit(ownerId: string, category: MonthlyBudget['category'], limit: number): Promise<MonthlyBudget[]>;
  getSavingsGoals(ownerId: string): Promise<SavingsGoal[]>;
  contributeToGoal(ownerId: string, goalId: string, amount: number): Promise<SavingsGoal[]>;
  createSavingsGoal(ownerId: string, name: string, targetAmount: number, targetDateIso: string): Promise<SavingsGoal[]>;
}

export interface UploadDriveMediaInput {
  ownerUserId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  visibility: MediaVisibility;
  previewDataUrl?: string;
}

export interface IMediaStorageService {
  isDriveAuthorized(): Promise<boolean>;
  authorizeDriveAccess(): Promise<boolean>;
  revokeDriveAccess(): Promise<void>;
  listUserMedia(ownerUserId: string): Promise<DriveMediaMetadata[]>;
  uploadMediaToAppFolder(input: UploadDriveMediaInput): Promise<DriveMediaMetadata>;
  updateMediaVisibility(mediaId: string, ownerUserId: string, visibility: MediaVisibility): Promise<DriveMediaMetadata>;
  getMediaById(mediaId: string): Promise<DriveMediaMetadata | undefined>;
}

export interface CalendarSyncResult {
  synced: boolean;
  provider: 'google_calendar_api' | 'ics_fallback';
  calendarEventLink?: string;
  message: string;
}

export interface ICalendarService {
  isCalendarAuthorized(): Promise<boolean>;
  authorizeCalendarAccess(): Promise<boolean>;
  addEventToGoogleCalendar(event: CommunityEvent): Promise<CalendarSyncResult>;
  getCalendarReminderLeadMinutes(): Promise<number>;
  setCalendarReminderLeadMinutes(minutes: number): Promise<void>;
}

export interface ISmsIngestionBridge {
  isSupported(): boolean;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  getArchitectureNotice(): string;
}

export interface AppPlatformPreferences {
  currency: CurrencyCode;
  useLiveFirebase: boolean;
}
