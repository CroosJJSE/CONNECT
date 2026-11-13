import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  ChevronUp,
  Globe,
  HandHeart,
  Heart,
  Lock,
  MessageCircle,
  Orbit,
  Package,
  Pin,
  Plus,
  Send,
  Shield,
  Sun,
  Trash2,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import type { DriveMediaMetadata, PostAudienceType, PostCategory } from '../domain/models';
import { getPostAudienceLabel } from '../domain/logic/feedAudience';
import { formatRelativeTime } from '../domain/logic/formatting';
import { calculateLevelFromPoints } from '../domain/logic/pointsRules';
import { validatePostInput } from '../domain/validation/validators';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { Avatar } from '../components/common/Avatar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DriveMediaCard } from '../components/common/DriveMediaCard';
import { DriveUploadField } from '../components/common/DriveUploadField';
import { MentionInput, MentionTextArea } from '../components/common/MentionComposer';
import { MentionText } from '../components/common/MentionText';
import type { AppRoute } from '../components/layout/AppShell';
import type { SharingTab } from './SharingPage';

interface DashboardFeedPageProps {
  searchQuery: string;
  onNavigate: (route: AppRoute) => void;
  onOpenSharingTab: (tab: SharingTab, openCreate?: boolean) => void;
}

const CATEGORIES: PostCategory[] = [
  'General Update',
  'Achievement',
  'Testimony',
  'Question',
  'Community Activity',
  'Announcement',
];

export function DashboardFeedPage({
  searchQuery,
  onNavigate,
  onOpenSharingTab,
}: DashboardFeedPageProps) {
  const { user } = useAuth();
  const {
    communities,
    directoryMembers,
    orbitConnections,
    posts,
    sharingItems,
    sharingRequests,
    events,
    announcements,
    polls,
    driveMedia,
    createPost,
    toggleWarmth,
    addPostComment,
    deletePost,
    togglePinPost,
    setRsvp,
    votePoll,
    addToOrbit,
  } = useConnectData();

  const [composerOpen, setComposerOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General Update');
  const [audienceType, setAudienceType] = useState<PostAudienceType>('communities');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(() =>
    user?.communityIds.slice(0, 1) ?? ['lotus-grove']
  );
  const [attachedDriveMedia, setAttachedDriveMedia] = useState<DriveMediaMetadata | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [feedFilter, setFeedFilter] = useState<'all' | 'orbit' | 'private' | 'announcements'>('all');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    'post-rooftop-harvest': true,
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const orbitFriendIds = useMemo(
    () => new Set(orbitConnections.map((c) => c.friendUserId)),
    [orbitConnections]
  );

  const composerPreferredIds = useMemo(() => {
    if (audienceType === 'orbit') return orbitFriendIds;
    if (audienceType === 'communities') {
      return new Set(
        directoryMembers
          .filter((m) => m.communityIds.some((cid) => selectedCommunityIds.includes(cid)))
          .map((m) => m.uid)
      );
    }
    return undefined;
  }, [audienceType, orbitFriendIds, directoryMembers, selectedCommunityIds]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (feedFilter === 'orbit' && post.audienceType !== 'orbit') return false;
      if (feedFilter === 'private' && post.audienceType !== 'private') return false;
      if (feedFilter === 'announcements' && post.category !== 'Announcement') return false;
      if (!q) return true;
      return (
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q)
      );
    });
  }, [posts, feedFilter, searchQuery]);

  if (!user) return null;

  const userLevel = calculateLevelFromPoints(user.points ?? 0);
  const firstName = user.displayName.split(' ')[0];
  const activeRequestsCount = sharingRequests.filter((r) => r.status !== 'closed').length;
  const recentNewMembers = directoryMembers.filter((m) => m.uid !== user.uid).slice(-2);
  const userCommunities = communities.filter((c) => user.communityIds.includes(c.id));
  const hasComposerDraft = postContent.trim().length > 0 || attachedDriveMedia !== null;

  const handleToggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) =>
      prev.includes(communityId) ? prev.filter((id) => id !== communityId) : [...prev, communityId]
    );
    if (composerError) setComposerError(null);
  };

  const handleSubmitPost = async () => {
    const validation = validatePostInput({
      content: postContent,
      audienceType,
      communityIds: audienceType === 'communities' ? selectedCommunityIds : [],
    });
    if (!validation.valid) {
      setComposerError(validation.errors[0]);
      return;
    }
    setComposerError(null);
    await createPost({
      category: selectedCategory,
      content: postContent,
      audienceType,
      communityIds: audienceType === 'communities' ? selectedCommunityIds : [],
      driveMedia: attachedDriveMedia ?? undefined,
    });
    setPostContent('');
    setAttachedDriveMedia(null);
    setComposerOpen(false);
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Greeting & Quick Launch Dashboard Hero (Stitch Image_7 / Image_8) */}
      <section className="flex flex-col gap-3.5 sm:gap-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-secondary mb-0.5">
              <Sun className="w-4 h-4 text-tertiary shrink-0" />
              <span className="text-xs font-medium">Good morning</span>
            </div>
            <h2 className="text-[26px] sm:text-[32px] leading-tight font-semibold text-on-surface tracking-tight text-balance">
              {firstName}
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant mt-0.5">
              How can the community help today?
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {user.financeEnabled && (
              <button
                type="button"
                onClick={() => onNavigate('finance')}
                aria-label="Open Finance Tracker"
                title="Open Finance Tracker"
                className="min-w-[56px] min-h-[48px] px-3 py-2 rounded-xl bg-primary-fixed hover:bg-primary text-primary hover:text-on-primary flex flex-col items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <Wallet className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                  Finance
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label={`View profile and Level ${userLevel} points`}
              className="rounded-full focus:outline-none"
            >
              <Avatar
                userId={user.uid}
                level={userLevel}
                src={user.avatarUrl}
                alt={user.displayName}
                initials={user.initials}
                size="lg"
                onlineDot
                showLevelTag
              />
            </button>
          </div>
        </div>

        {/* Primary Intent Tiles: I Have / I Need / I Can Help */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onOpenSharingTab('i_have', true)}
            className="min-h-[64px] text-left bg-surface-container-low hover:bg-surface-container p-3.5 sm:p-4 rounded-2xl shadow-xs transition-transform active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-on-surface">I Have</span>
                <span aria-hidden="true" className="text-on-surface-variant text-xs">
                  ·
                </span>
                <span className="text-xs font-medium text-tertiary">Share</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                Donate or lend items to neighbors
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onOpenSharingTab('i_need', true)}
            className="min-h-[64px] text-left bg-surface-container-low hover:bg-surface-container p-3.5 sm:p-4 rounded-2xl shadow-xs transition-transform active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
              <HandHeart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-on-surface">I Need</span>
                <span aria-hidden="true" className="text-on-surface-variant text-xs">
                  ·
                </span>
                <span className="text-xs font-medium text-secondary">Request</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                Let the community know what you need
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onOpenSharingTab('i_can', true)}
            className="min-h-[64px] text-left bg-surface-container-low hover:bg-surface-container p-3.5 sm:p-4 rounded-2xl shadow-xs transition-transform active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-on-surface">I Can Help</span>
                <span aria-hidden="true" className="text-on-surface-variant text-xs">
                  ·
                </span>
                <span className="text-xs font-medium text-primary">Offer</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                Offer your skills, time or experience
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary shrink-0" />
          </button>
        </div>
      </section>

      {/* Main 2-Column Layout: Community Feed (8 cols) + Community Hub Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Feed Column */}
        <section className="lg:col-span-8 flex flex-col gap-4 sm:gap-5 min-w-0">
          {/* Feed Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5">
            <div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant mb-1 tabular-nums">
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Verified Members Only</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{directoryMembers.length} Active Neighbors</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
                Community Feed
              </h3>
            </div>
            <span className="text-xs text-on-surface-variant">
              Chronological feed · Access verified per community &amp; Orbit
            </span>
          </div>

          {/* Mobile-Friendly Collapsible Post Composer */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            {!composerOpen ? (
              <button
                type="button"
                aria-expanded={false}
                aria-controls="community-feed-composer"
                onClick={() => setComposerOpen(true)}
                className="w-full min-h-[64px] p-3.5 sm:px-4 flex items-center justify-between gap-3 text-left hover:bg-surface-container-low/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    userId={user.uid}
                    src={user.avatarUrl}
                    alt={user.displayName}
                    initials={user.initials}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface-variant truncate">
                      {hasComposerDraft
                        ? postContent.trim() || 'Continue draft with attached media...'
                        : `What's happening in your life, ${firstName}?`}
                    </p>
                    {hasComposerDraft && (
                      <p className="text-xs text-primary font-medium mt-0.5">
                        Draft saved · Tap to resume
                      </p>
                    )}
                  </div>
                </div>
                <span className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>{hasComposerDraft ? 'Resume' : 'New Post'}</span>
                </span>
              </button>
            ) : (
              <div id="community-feed-composer" className="p-4 sm:p-5 flex flex-col gap-3.5">
                {/* Composer Header with User & Collapse Action */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      userId={user.uid}
                      src={user.avatarUrl}
                      alt={user.displayName}
                      initials={user.initials}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">Create Post</p>
                      <p className="text-xs text-on-surface-variant truncate">{user.displayName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-expanded={true}
                    aria-controls="community-feed-composer"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-[44px] px-3 rounded-xl hover:bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 shrink-0" />
                    <span>Collapse</span>
                  </button>
                </div>

                {/* Full-Width Mention Composer */}
                <MentionTextArea
                  rows={3}
                  value={postContent}
                  onChange={(nextValue) => {
                    setPostContent(nextValue);
                    if (composerError) setComposerError(null);
                  }}
                  members={directoryMembers}
                  currentUserId={user.uid}
                  preferredIds={composerPreferredIds}
                  preferredBadgeLabel={audienceType === 'orbit' ? 'In Orbit' : 'In community'}
                  helperNotice={
                    audienceType === 'private'
                      ? 'Private note — mentioned neighbors will not be notified'
                      : undefined
                  }
                  placeholder={`What's happening in your life, ${firstName}? Type @ to mention someone`}
                  className="w-full bg-surface-container-low rounded-xl p-3 text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container transition-colors resize-none"
                />

                {/* Touch-Friendly Category Strip */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-on-surface-variant">Topic</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary text-on-primary font-semibold'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full-Width Audience Selector: Communities / My Orbit / Only Me */}
                <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Who can see this post?
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setAudienceType('communities');
                        if (selectedCommunityIds.length === 0 && userCommunities.length > 0) {
                          setSelectedCommunityIds([userCommunities[0].id]);
                        }
                        if (composerError) setComposerError(null);
                      }}
                      className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                        audienceType === 'communities'
                          ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>Community</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAudienceType('orbit');
                        if (composerError) setComposerError(null);
                      }}
                      className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                        audienceType === 'orbit'
                          ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Orbit className="w-3.5 h-3.5 shrink-0" />
                      <span>My Orbit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAudienceType('private');
                        if (composerError) setComposerError(null);
                      }}
                      className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                        audienceType === 'private'
                          ? 'bg-surface-container-lowest text-tertiary shadow-xs font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Only Me</span>
                    </button>
                  </div>

                  {audienceType === 'communities' && (
                    <div className="flex flex-wrap gap-2">
                      {userCommunities.map((comm) => {
                        const active = selectedCommunityIds.includes(comm.id);
                        return (
                          <button
                            key={comm.id}
                            type="button"
                            onClick={() => handleToggleCommunity(comm.id)}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-secondary-container text-on-secondary-container font-semibold'
                                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                            <span>{comm.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {audienceType === 'orbit' && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Visible only to you and the {orbitConnections.length} close friend(s) in your
                      My Orbit circle.
                    </p>
                  )}

                  {audienceType === 'private' && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Personal note visible strictly to you. Never shared with communities or Orbit
                      friends.
                    </p>
                  )}
                </div>

                <DriveUploadField
                  selectedMedia={attachedDriveMedia}
                  onSelectMedia={setAttachedDriveMedia}
                  defaultVisibility={audienceType === 'private' ? 'private' : 'anyone_with_link'}
                />

                {composerError && <p className="text-xs font-medium text-error">{composerError}</p>}

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => void handleSubmitPost()}
                    className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary transition-colors shadow-xs whitespace-nowrap"
                  >
                    <span>
                      {audienceType === 'private'
                        ? 'Save Private Note'
                        : audienceType === 'orbit'
                          ? 'Post to My Orbit'
                          : 'Post to Community'}
                    </span>
                    <Send className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Touch-Friendly Feed Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container-low p-1.5 sm:px-3 sm:py-2 rounded-xl">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {(
                [
                  { id: 'all', label: 'All Posts' },
                  { id: 'orbit', label: 'My Orbit' },
                  { id: 'private', label: 'Private' },
                  { id: 'announcements', label: 'Announcements' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFeedFilter(tab.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    feedFilter === tab.id
                      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline text-xs text-on-surface-variant whitespace-nowrap shrink-0">
              Newest first
            </span>
          </div>

          {/* Post Cards */}
          {filteredPosts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-xs">
              <p className="text-sm font-semibold text-on-surface">
                No authorized posts match this view
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Try switching filters or share an update with your community or My Orbit circle.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPosts.map((post) => {
                const liked = post.likedByUserIds.includes(user.uid);
                const linkedDriveMedia = post.driveMediaId
                  ? driveMedia.find((m) => m.id === post.driveMediaId)
                  : undefined;
                const isCommentsOpen = Boolean(expandedComments[post.id]);
                const canDelete = post.authorId === user.uid || user.role === 'admin';

                return (
                  <article
                    key={post.id}
                    className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col"
                  >
                    {post.pinned && (
                      <div className="bg-primary/10 px-4 sm:px-5 py-2 flex items-center gap-2 text-primary text-xs font-semibold">
                        <Pin className="w-3.5 h-3.5 shrink-0" />
                        <span>Pinned by Community Stewards</span>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col gap-3">
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <Avatar
                            userId={post.authorId}
                            alt={post.authorName}
                            initials={post.authorInitials}
                            size="md"
                            tone={post.pinned ? 'secondary' : 'primary'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-on-surface">
                                {post.authorName}
                              </span>
                              {post.authorRoleLabel && (
                                <>
                                  <span aria-hidden="true" className="text-on-surface-variant text-xs">
                                    ·
                                  </span>
                                  <span className="text-xs font-medium text-primary">
                                    {post.authorRoleLabel}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-0.5 flex items-center flex-wrap gap-x-1.5 tabular-nums">
                              <span>{formatRelativeTime(post.createdAtIso)}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{getPostAudienceLabel(post, communities)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{post.category}</span>
                            </p>
                          </div>
                        </div>

                        {(user.role === 'admin' || canDelete) && (
                          <div className="flex items-center shrink-0 -mr-1.5 -mt-1">
                            {user.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => void togglePinPost(post.id)}
                                title={post.pinned ? 'Unpin post' : 'Pin announcement'}
                                aria-label={post.pinned ? 'Unpin post' : 'Pin post'}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
                              >
                                <Pin className={`w-4 h-4 ${post.pinned ? 'text-primary' : ''}`} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setPostToDelete(post.id)}
                                aria-label="Delete post"
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-line break-words">
                        <MentionText text={post.content} members={directoryMembers} />
                      </p>

                      {/* Drive Media Attachment */}
                      {(post.inlineMediaUrl || linkedDriveMedia) && (
                        <DriveMediaCard
                          media={linkedDriveMedia}
                          inlineImageUrl={post.inlineMediaUrl}
                          inlineAlt={post.inlineMediaAlt}
                          mediaType={post.mediaType}
                        />
                      )}

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/15">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleWarmth(post.id)}
                            className={`min-h-[44px] px-2.5 -ml-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              liked
                                ? 'text-tertiary font-semibold'
                                : 'text-on-surface-variant hover:text-tertiary hover:bg-surface-container-low'
                            }`}
                          >
                            <Heart className={`w-4 h-4 shrink-0 ${liked ? 'fill-tertiary text-tertiary' : ''}`} />
                            <span className="tabular-nums">{post.likedByUserIds.length}</span>
                            <span>Warmth</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedComments((prev) => ({ ...prev, [post.id]: !isCommentsOpen }))
                            }
                            className={`min-h-[44px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              isCommentsOpen
                                ? 'text-primary font-semibold bg-surface-container-low'
                                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                            }`}
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span className="tabular-nums">{post.comments.length}</span>
                            <span>Comments</span>
                          </button>
                        </div>

                        {post.locationBadge && (
                          <span className="text-xs text-on-surface-variant truncate max-w-[140px] sm:max-w-[180px]">
                            {post.locationBadge}
                          </span>
                        )}
                      </div>

                      {/* Comments Drawer */}
                      {isCommentsOpen && (
                        <div className="bg-surface-container-low rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5">
                          {post.comments.length > 0 && (
                            <div className="flex flex-col divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-xl overflow-hidden">
                              {post.comments.map((cmt) => (
                                <div key={cmt.id} className="p-2.5 sm:p-3 flex items-start gap-2.5">
                                  <Avatar
                                    userId={cmt.authorId}
                                    alt={cmt.authorName}
                                    initials={cmt.authorInitials}
                                    size="xs"
                                    tone="neutral"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-on-surface truncate">
                                        {cmt.authorName}
                                      </span>
                                      <span className="text-[11px] text-on-surface-variant shrink-0 tabular-nums">
                                        {formatRelativeTime(cmt.createdAtIso)}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-on-surface mt-0.5 whitespace-pre-line break-words leading-relaxed">
                                      <MentionText text={cmt.body} members={directoryMembers} />
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-end gap-2 pt-0.5">
                            <div className="hidden sm:block shrink-0">
                              <Avatar
                                userId={user.uid}
                                src={user.avatarUrl}
                                alt={user.displayName}
                                initials={user.initials}
                                size="sm"
                              />
                            </div>
                            <MentionInput
                              value={commentDrafts[post.id] ?? ''}
                              onChange={(nextValue) =>
                                setCommentDrafts((prev) => ({ ...prev, [post.id]: nextValue }))
                              }
                              onSubmit={() => {
                                const text = commentDrafts[post.id] ?? '';
                                if (!text.trim()) return;
                                void addPostComment(post.id, text);
                                setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                              }}
                              members={directoryMembers}
                              currentUserId={user.uid}
                              preferredIds={
                                post.audienceType === 'orbit'
                                  ? new Set([...orbitFriendIds, post.authorId])
                                  : new Set(
                                      directoryMembers
                                        .filter((m) =>
                                          m.communityIds.some((cid) => post.communityIds.includes(cid))
                                        )
                                        .map((m) => m.uid)
                                    )
                              }
                              preferredBadgeLabel={
                                post.audienceType === 'orbit' ? 'In Orbit' : 'In community'
                              }
                              placeholder="Write a warm reply (@ to mention)..."
                              containerClassName="flex-1 flex items-center bg-surface-container-lowest rounded-xl px-2.5 py-1.5 min-h-[44px] gap-1.5"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Sidebar (Stitch Image_4 + Mobile Dashboard Previews from Image_7/8) */}
        <aside className="lg:col-span-4 flex flex-col gap-4 sm:gap-5 min-w-0">
          {/* Available in the Community Preview */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-on-surface">Available in Community</h3>
                <p className="text-xs text-on-surface-variant">Borrow or keep from neighbors</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenSharingTab('i_have')}
                className="min-h-[44px] px-2 -mr-2 text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 whitespace-nowrap shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {sharingItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenSharingTab('i_have')}
                  className="min-h-[56px] text-left bg-surface-container-low hover:bg-surface-container p-3 rounded-xl flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {item.mode === 'lend' ? 'Borrow' : 'Give / Keep'} · {item.ownerName}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                      item.status === 'available' ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {item.status === 'available' ? 'Available' : item.dueLabel ?? 'Lent out'}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onOpenSharingTab('i_need')}
              className="min-h-[56px] mt-1 p-3 rounded-xl bg-tertiary-fixed/40 hover:bg-tertiary-fixed/60 text-left transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-on-tertiary-fixed">
                  Community Support
                </span>
                <span className="text-xs font-semibold text-tertiary tabular-nums">
                  {activeRequestsCount} Active
                </span>
              </div>
              <p className="text-xs text-on-tertiary-fixed-variant mt-0.5">
                Neighbors need a hand with garden beds, rides &amp; moving.
              </p>
            </button>
          </div>

          {/* Upcoming Gatherings */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold text-on-surface">Upcoming Gatherings</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('events')}
                className="min-h-[44px] px-2 -mr-2 text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
              >
                View all
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {events.slice(0, 2).map((evt) => {
                const isGoing = evt.rsvps[user.uid] === 'going';
                const goingCount = Object.values(evt.rsvps).filter((v) => v === 'going').length;
                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold uppercase leading-none">
                          {evt.monthLabel}
                        </span>
                        <span className="text-base font-bold leading-tight tabular-nums">
                          {evt.dayLabel}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-on-surface truncate">
                          {evt.title}
                        </h4>
                        <p className="text-xs text-on-surface-variant truncate">
                          {evt.timeRangeLabel}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">{evt.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-on-surface-variant tabular-nums">
                        {goingCount} attending
                      </span>
                      <button
                        type="button"
                        onClick={() => void setRsvp(evt.id, isGoing ? 'maybe' : 'going')}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          isGoing
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {isGoing && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{isGoing ? 'Going' : 'RSVP Going'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Community Poll & Notices */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-2.5">Important Notices</h3>
              <div className="flex flex-col gap-2">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 rounded-xl bg-surface-container-low">
                    <p className="text-xs font-semibold text-on-surface">{ann.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {ann.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {polls.map((poll) => {
              const hasVoted = poll.votedUserIds.includes(user.uid);
              const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
              return (
                <div
                  key={poll.id}
                  className="pt-3 border-t border-outline-variant/25 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                    <Vote className="w-4 h-4 text-primary shrink-0" />
                    <span>Community Poll</span>
                  </div>
                  <p className="text-xs font-medium text-on-surface">{poll.question}</p>
                  <div className="flex flex-col gap-1.5">
                    {poll.options.map((opt) => {
                      const pct =
                        totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={hasVoted}
                          onClick={() => void votePoll(poll.id, opt.id)}
                          className="min-h-[44px] w-full text-left px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs flex items-center justify-between gap-2 disabled:cursor-default transition-colors"
                        >
                          <span className="truncate text-on-surface">{opt.label}</span>
                          <span className="font-semibold text-primary tabular-nums shrink-0">
                            {hasVoted ? `${pct}%` : `${opt.voteCount}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Welcome New Members */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-on-surface">Welcome New Members</h3>
            <div className="flex flex-col gap-2">
              {recentNewMembers.map((member) => {
                const inOrbit = orbitFriendIds.has(member.uid);
                return (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        userId={member.uid}
                        src={member.avatarUrl}
                        alt={member.displayName}
                        initials={member.initials}
                        size="sm"
                        tone="secondary"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">
                          {member.displayName}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {member.unitLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={inOrbit}
                      onClick={() => void addToOrbit(member.uid, 'New neighbor')}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-primary hover:text-on-primary transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                    >
                      {inOrbit ? 'In Orbit' : 'Add to Orbit'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={postToDelete !== null}
        title="Delete post?"
        description="This post and its replies will be permanently removed from the feed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (postToDelete) void deletePost(postToDelete);
          setPostToDelete(null);
        }}
        onCancel={() => setPostToDelete(null)}
      />
    </div>
  );
}
