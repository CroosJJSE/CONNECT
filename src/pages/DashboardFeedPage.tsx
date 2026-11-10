import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Globe,
  HandHeart,
  Heart,
  ImagePlus,
  Lock,
  MessageCircle,
  Orbit,
  Package,
  Pin,
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

  const [postContent, setPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General Update');
  const [audienceType, setAudienceType] = useState<PostAudienceType>('communities');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(() =>
    user?.communityIds.slice(0, 1) ?? ['lotus-grove']
  );
  const [showMediaUpload, setShowMediaUpload] = useState(false);
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

  const firstName = user.displayName.split(' ')[0];
  const activeRequestsCount = sharingRequests.filter((r) => r.status !== 'closed').length;
  const recentNewMembers = directoryMembers.filter((m) => m.uid !== user.uid).slice(-2);

  const handleToggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) =>
      prev.includes(communityId) ? prev.filter((id) => id !== communityId) : [...prev, communityId]
    );
  };

  const handleSubmitPost = async () => {
    const validation = validatePostInput({
      content: postContent,
      audienceType,
      communityIds: selectedCommunityIds,
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
    setShowMediaUpload(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting & Quick Launch Dashboard Hero (Stitch Image_7 / Image_8) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-secondary mb-0.5">
              <Sun className="w-4 h-4 text-tertiary" />
              <span className="text-xs font-medium tracking-wide uppercase">Good morning</span>
            </div>
            <h2 className="text-[28px] sm:text-[32px] leading-tight font-semibold text-on-surface tracking-tight">
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
            <Avatar
              src={user.avatarUrl}
              alt={user.displayName}
              initials={user.initials}
              size="lg"
              onlineDot
            />
          </div>
        </div>

        {/* Primary Intent Tiles: I Have / I Need / I Can Help */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onOpenSharingTab('i_have', true)}
            className="text-left bg-surface-container-low hover:bg-surface-container p-4 rounded-xl shadow-xs transition-all active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-on-surface">I Have</span>
                <span className="text-[11px] bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant px-2 py-0.5 rounded-full font-medium">
                  Share
                </span>
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
            className="text-left bg-surface-container-low hover:bg-surface-container p-4 rounded-xl shadow-xs transition-all active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
              <HandHeart className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-on-surface">I Need</span>
                <span className="text-[11px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-medium">
                  Request
                </span>
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
            className="text-left bg-surface-container-low hover:bg-surface-container p-4 rounded-xl shadow-xs transition-all active:scale-[0.99] flex items-center gap-3.5"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-on-surface">I Can Help</span>
                <span className="text-[11px] bg-primary-fixed-dim/60 text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-medium">
                  Offer
                </span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Feed Column */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          {/* Feed Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Shield className="w-3.5 h-3.5" />
                  Verified Members Only
                </span>
                <span aria-hidden="true">·</span>
                <span>{directoryMembers.length} Active Neighbors</span>
              </div>
              <h3 className="text-2xl font-semibold text-on-surface tracking-tight">Community Feed</h3>
            </div>
            <span className="text-xs text-on-surface-variant">
              Chronological feed · Access verified per community &amp; Orbit
            </span>
          </div>

          {/* Post Composer Card (Stitch Image_4 / Image_16) */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Avatar src={user.avatarUrl} alt={user.displayName} initials={user.initials} size="md" />
              <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                <MentionTextArea
                  rows={2}
                  value={postContent}
                  onChange={(nextValue) => {
                    setPostContent(nextValue);
                    if (composerError) setComposerError(null);
                  }}
                  members={directoryMembers}
                  currentUserId={user.uid}
                  preferredIds={composerPreferredIds}
                  preferredBadgeLabel={
                    audienceType === 'orbit' ? 'In Orbit' : 'In community'
                  }
                  helperNotice={
                    audienceType === 'private'
                      ? 'Private note — mentioned neighbors will not be notified'
                      : undefined
                  }
                  placeholder={`What's happening in your life, ${firstName}? Type @ to mention someone`}
                  className="w-full bg-surface-container-low rounded-xl p-3 text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container transition-colors resize-none"
                />

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audience Selector: Communities (1 or multi) / My Orbit / Private */}
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Audience</span>
                <div className="inline-flex bg-surface-container p-1 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => setAudienceType('communities')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                      audienceType === 'communities'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Communities
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType('orbit')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                      audienceType === 'orbit'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Orbit className="w-3.5 h-3.5" />
                    My Orbit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType('private')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                      audienceType === 'private'
                        ? 'bg-surface-container-lowest text-tertiary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Private
                  </button>
                </div>
              </div>

              {audienceType === 'communities' && (
                <div className="flex flex-wrap gap-1.5">
                  {communities
                    .filter((c) => user.communityIds.includes(c.id))
                    .map((comm) => {
                      const active = selectedCommunityIds.includes(comm.id);
                      return (
                        <button
                          key={comm.id}
                          type="button"
                          onClick={() => handleToggleCommunity(comm.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-secondary-container text-on-secondary-container font-semibold'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {active ? `✓ ${comm.name}` : comm.name}
                        </button>
                      );
                    })}
                </div>
              )}

              {audienceType === 'orbit' && (
                <p className="text-xs text-on-surface-variant">
                  Visible only to you and the {orbitConnections.length} close friend(s) in your My Orbit circle.
                </p>
              )}

              {audienceType === 'private' && (
                <p className="text-xs text-on-surface-variant">
                  Personal note visible strictly to you. Never shared with communities or Orbit friends.
                </p>
              )}
            </div>

            {showMediaUpload && (
              <DriveUploadField
                selectedMedia={attachedDriveMedia}
                onSelectMedia={setAttachedDriveMedia}
                defaultVisibility={audienceType === 'private' ? 'private' : 'anyone_with_link'}
              />
            )}

            {composerError && (
              <p className="text-xs font-medium text-error">{composerError}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMediaUpload((prev) => !prev)}
                className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-medium whitespace-nowrap"
              >
                <ImagePlus className="w-4 h-4 text-primary" />
                <span>{showMediaUpload ? 'Hide Drive Upload' : 'Add Photo / Video'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSubmitPost()}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary transition-colors shadow-xs whitespace-nowrap"
              >
                <span>
                  {audienceType === 'private'
                    ? 'Save Private Note'
                    : audienceType === 'orbit'
                      ? 'Post to My Orbit'
                      : 'Post to Community'}
                </span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feed Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                    feedFilter === tab.id
                      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-on-surface-variant">Newest first</span>
          </div>

          {/* Post Cards */}
          {filteredPosts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-xs">
              <p className="text-sm font-semibold text-on-surface">No authorized posts match this view</p>
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
                    className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col"
                  >
                    {post.pinned && (
                      <div className="bg-primary/10 px-5 py-2 flex items-center gap-2 text-primary text-xs font-semibold">
                        <Pin className="w-3.5 h-3.5" />
                        <span>Pinned by Community Stewards</span>
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            alt={post.authorName}
                            initials={post.authorInitials}
                            size="md"
                            tone={post.pinned ? 'secondary' : 'primary'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-on-surface">
                                {post.authorName}
                              </span>
                              {post.authorRoleLabel && (
                                <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase tracking-wider">
                                  {post.authorRoleLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant truncate">
                              {formatRelativeTime(post.createdAtIso)} · {getPostAudienceLabel(post, communities)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-2.5 py-1 rounded-full bg-surface-container text-xs text-on-surface-variant font-medium whitespace-nowrap">
                            {post.category}
                          </span>
                          {user.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => void togglePinPost(post.id)}
                              title={post.pinned ? 'Unpin post' : 'Pin announcement'}
                              aria-label={post.pinned ? 'Unpin post' : 'Pin post'}
                              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
                            >
                              <Pin className={`w-4 h-4 ${post.pinned ? 'text-primary' : ''}`} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setPostToDelete(post.id)}
                              aria-label="Delete post"
                              className="p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-line">
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
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => void toggleWarmth(post.id)}
                            className={`min-h-[40px] flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              liked ? 'text-tertiary font-semibold' : 'text-on-surface-variant hover:text-tertiary'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${liked ? 'fill-tertiary text-tertiary' : ''}`} />
                            <span className="tabular-nums">{post.likedByUserIds.length}</span>
                            <span>Warmth</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedComments((prev) => ({ ...prev, [post.id]: !isCommentsOpen }))
                            }
                            className="min-h-[40px] flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="tabular-nums">{post.comments.length}</span>
                            <span>Comments</span>
                          </button>
                        </div>

                        {post.locationBadge && (
                          <span className="text-xs text-on-surface-variant truncate max-w-[180px]">
                            {post.locationBadge}
                          </span>
                        )}
                      </div>

                      {/* Comments Drawer */}
                      {isCommentsOpen && (
                        <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-3">
                          {post.comments.map((cmt) => (
                            <div key={cmt.id} className="flex items-start gap-2.5">
                              <Avatar alt={cmt.authorName} initials={cmt.authorInitials} size="sm" tone="neutral" />
                              <div className="flex-1 bg-surface-container-lowest rounded-lg p-2.5 shadow-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-on-surface">
                                    {cmt.authorName}
                                  </span>
                                  <span className="text-[11px] text-on-surface-variant">
                                    {formatRelativeTime(cmt.createdAtIso)}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-on-surface mt-0.5 whitespace-pre-line">
                                  <MentionText text={cmt.body} members={directoryMembers} />
                                </p>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-end gap-2 pt-0.5">
                            <Avatar src={user.avatarUrl} alt={user.displayName} initials={user.initials} size="sm" />
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
        <aside className="lg:col-span-4 flex flex-col gap-5">
          {/* Available in the Community Preview */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-on-surface">Available in Community</h3>
                <p className="text-xs text-on-surface-variant">Borrow or keep from neighbors</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenSharingTab('i_have')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 whitespace-nowrap"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {sharingItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenSharingTab('i_have')}
                  className="text-left bg-surface-container-low hover:bg-surface-container p-3 rounded-xl flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {item.mode === 'lend' ? 'Borrow' : 'Give / Keep'} · {item.ownerName}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${
                      item.status === 'available'
                        ? 'bg-primary-fixed/50 text-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
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
              className="mt-1 p-3 rounded-xl bg-tertiary-fixed/40 hover:bg-tertiary-fixed/60 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-tertiary-fixed">Community Support</span>
                <span className="text-[11px] font-semibold text-tertiary">{activeRequestsCount} Active</span>
              </div>
              <p className="text-xs text-on-tertiary-fixed-variant mt-0.5">
                Neighbors need a hand with garden beds, rides &amp; moving.
              </p>
            </button>
          </div>

          {/* Upcoming Gatherings */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Upcoming Gatherings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('events')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All
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
                        <h4 className="text-sm font-semibold text-on-surface truncate">{evt.title}</h4>
                        <p className="text-xs text-on-surface-variant truncate">{evt.timeRangeLabel}</p>
                        <p className="text-xs text-on-surface-variant truncate">{evt.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-on-surface-variant tabular-nums">
                        {goingCount} attending
                      </span>
                      <button
                        type="button"
                        onClick={() => void setRsvp(evt.id, isGoing ? 'maybe' : 'going')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isGoing
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {isGoing ? '✓ Going' : 'RSVP Going'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Community Poll & Notices */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2.5">
                Important Notices
              </h3>
              <div className="flex flex-col gap-2">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 rounded-xl bg-surface-container-low">
                    <p className="text-xs font-semibold text-on-surface">{ann.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{ann.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {polls.map((poll) => {
              const hasVoted = poll.votedUserIds.includes(user.uid);
              const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
              return (
                <div key={poll.id} className="pt-2 border-t border-outline-variant/25 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface uppercase tracking-wider">
                    <Vote className="w-4 h-4 text-primary" />
                    <span>Community Poll</span>
                  </div>
                  <p className="text-xs font-medium text-on-surface">{poll.question}</p>
                  <div className="flex flex-col gap-1.5">
                    {poll.options.map((opt) => {
                      const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={hasVoted}
                          onClick={() => void votePoll(poll.id, opt.id)}
                          className="w-full text-left p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs flex items-center justify-between gap-2 disabled:cursor-default"
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
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Welcome New Members
            </h3>
            <div className="flex flex-col gap-2">
              {recentNewMembers.map((member) => {
                const inOrbit = orbitFriendIds.has(member.uid);
                return (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar alt={member.displayName} initials={member.initials} size="sm" tone="secondary" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">{member.displayName}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{member.unitLabel}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={inOrbit}
                      onClick={() => void addToOrbit(member.uid, 'New neighbor')}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-primary hover:text-on-primary transition-colors whitespace-nowrap disabled:opacity-60"
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
