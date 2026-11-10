import { useMemo, useState } from 'react';
import {
  Check,
  ChevronUp,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  Orbit,
  Plus,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
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

const ORBIT_POST_CATEGORIES: PostCategory[] = [
  'General Update',
  'Community Activity',
  'Question',
  'Achievement',
  'Testimony',
  'Announcement',
];

export function OrbitPage({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const {
    communities,
    directoryMembers,
    orbitConnections,
    posts,
    driveMedia,
    addToOrbit,
    removeFromOrbit,
    createPost,
    toggleWarmth,
    addPostComment,
  } = useConnectData();

  const [mobileTab, setMobileTab] = useState<'feed' | 'circle'>('feed');
  const [composerOpen, setComposerOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [composerText, setComposerText] = useState('');
  const [audience, setAudience] = useState<PostAudienceType>('orbit');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General Update');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(() =>
    user?.communityIds.slice(0, 1) ?? ['lotus-grove']
  );
  const [attachedDriveMedia, setAttachedDriveMedia] = useState<DriveMediaMetadata | null>(null);
  const [streamFilter, setStreamFilter] = useState<'orbit_private' | 'communities' | 'all'>(
    'orbit_private'
  );
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [composerError, setComposerError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ uid: string; name: string } | null>(null);

  const orbitFriendIds = useMemo(
    () => new Set(orbitConnections.map((c) => c.friendUserId)),
    [orbitConnections]
  );

  const composerPreferredIds = useMemo(() => {
    if (audience === 'orbit') return orbitFriendIds;
    if (audience === 'communities') {
      return new Set(
        directoryMembers
          .filter((m) => m.communityIds.some((cid) => selectedCommunityIds.includes(cid)))
          .map((m) => m.uid)
      );
    }
    return undefined;
  }, [audience, orbitFriendIds, directoryMembers, selectedCommunityIds]);

  const orbitFriends = useMemo(
    () => directoryMembers.filter((m) => orbitFriendIds.has(m.uid)),
    [directoryMembers, orbitFriendIds]
  );

  const discoverableMembers = useMemo(() => {
    const q = (memberFilter || searchQuery).trim().toLowerCase();
    return directoryMembers.filter((m) => {
      if (!user || m.uid === user.uid || orbitFriendIds.has(m.uid)) return false;
      const sharesCommunity = m.communityIds.some((cid) => user.communityIds.includes(cid));
      if (!sharesCommunity) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.unitLabel.toLowerCase().includes(q) ||
        m.clusterName.toLowerCase().includes(q)
      );
    });
  }, [directoryMembers, user, orbitFriendIds, memberFilter, searchQuery]);

  const orbitPrivateCount = useMemo(
    () => posts.filter((p) => p.audienceType === 'orbit' || p.audienceType === 'private').length,
    [posts]
  );

  const communityPostsCount = useMemo(
    () => posts.filter((p) => p.audienceType === 'communities').length,
    [posts]
  );

  const visibleStreamPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (
        streamFilter === 'orbit_private' &&
        post.audienceType !== 'orbit' &&
        post.audienceType !== 'private'
      ) {
        return false;
      }
      if (streamFilter === 'communities' && post.audienceType !== 'communities') {
        return false;
      }
      if (!q) return true;
      return (
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q)
      );
    });
  }, [posts, streamFilter, searchQuery]);

  if (!user) return null;

  const userCommunities = communities.filter((c) => user.communityIds.includes(c.id));
  const hasComposerDraft = composerText.trim().length > 0 || attachedDriveMedia !== null;

  const handleToggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) =>
      prev.includes(communityId) ? prev.filter((id) => id !== communityId) : [...prev, communityId]
    );
    if (composerError) setComposerError(null);
  };

  const handleCreateOrbitOrCommunityPost = async () => {
    const effectiveCommunityIds = audience === 'communities' ? selectedCommunityIds : [];
    const v = validatePostInput({
      content: composerText,
      audienceType: audience,
      communityIds: effectiveCommunityIds,
    });
    if (!v.valid) {
      setComposerError(v.errors[0]);
      return;
    }
    setComposerError(null);
    await createPost({
      category: audience === 'communities' ? selectedCategory : 'General Update',
      content: composerText,
      audienceType: audience,
      communityIds: effectiveCommunityIds,
      driveMedia: attachedDriveMedia ?? undefined,
    });
    setComposerText('');
    setAttachedDriveMedia(null);
    setComposerOpen(false);
    if (audience === 'communities' && streamFilter === 'orbit_private') {
      setStreamFilter('all');
    } else if (audience !== 'communities' && streamFilter === 'communities') {
      setStreamFilter('all');
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-[26px] sm:text-[28px] leading-tight font-semibold text-on-surface tracking-tight text-balance">
            My Orbit
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Share with close friends, post to your communities, or save private notes.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-on-surface-variant shrink-0 tabular-nums">
          <Orbit className="w-4 h-4 text-primary shrink-0" />
          <span>{orbitFriends.length} close friends in Orbit</span>
        </div>
      </div>

      {/* Mobile View Switcher: Feed & Composer vs Orbit Friends Circle */}
      <div
        role="tablist"
        aria-label="My Orbit sections"
        className="lg:hidden grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'feed'}
          onClick={() => setMobileTab('feed')}
          className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
            mobileTab === 'feed'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="tabular-nums">Posts ({posts.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'circle'}
          onClick={() => setMobileTab('circle')}
          className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
            mobileTab === 'circle'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Orbit className="w-4 h-4 shrink-0" />
          <span className="tabular-nums">Orbit Circle ({orbitFriends.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column: Collapsible Post Creation + Stream */}
        <section
          className={`${
            mobileTab === 'feed' ? 'flex' : 'hidden'
          } lg:flex lg:col-span-7 flex-col gap-4 sm:gap-5 min-w-0`}
        >
          {/* Collapsible Post Creation (Collapsed by default) */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
            {!composerOpen ? (
              <button
                type="button"
                aria-expanded={false}
                aria-controls="orbit-composer-panel"
                onClick={() => setComposerOpen(true)}
                className="w-full min-h-[64px] p-3.5 sm:px-4 flex items-center justify-between gap-3 text-left hover:bg-surface-container-low/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.displayName}
                    initials={user.initials}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface-variant truncate">
                      {hasComposerDraft
                        ? composerText.trim() || 'Continue draft with attached media...'
                        : 'Write a post to Orbit, Community, or Private...'}
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
              <div id="orbit-composer-panel" className="p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.displayName}
                      initials={user.initials}
                      size="sm"
                    />
                    <span className="text-sm font-semibold text-on-surface truncate">
                      Create Post
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-expanded={true}
                    aria-controls="orbit-composer-panel"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-[44px] px-3 rounded-xl hover:bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 shrink-0" />
                    <span>Collapse</span>
                  </button>
                </div>

                {/* Full-width Mobile-Friendly Audience Segmented Selector */}
                <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAudience('orbit');
                      if (composerError) setComposerError(null);
                    }}
                    className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                      audience === 'orbit'
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
                      setAudience('communities');
                      if (selectedCommunityIds.length === 0 && userCommunities.length > 0) {
                        setSelectedCommunityIds([userCommunities[0].id]);
                      }
                      if (composerError) setComposerError(null);
                    }}
                    className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                      audience === 'communities'
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
                      setAudience('private');
                      if (composerError) setComposerError(null);
                    }}
                    className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap ${
                      audience === 'private'
                        ? 'bg-surface-container-lowest text-tertiary shadow-xs font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Only Me</span>
                  </button>
                </div>

                {/* Community-level options */}
                {audience === 'communities' && (
                  <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">
                        Target Communities
                      </span>
                      <span className="text-xs text-on-surface-variant tabular-nums">
                        {selectedCommunityIds.length} selected
                      </span>
                    </div>
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
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                      {ORBIT_POST_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                            selectedCategory === category
                              ? 'bg-primary text-on-primary font-semibold'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {audience === 'orbit' && (
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Visible only to you and the {orbitFriends.length} close friend(s) in your My
                    Orbit circle.
                  </p>
                )}

                {audience === 'private' && (
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Personal note visible strictly to you. Never shared with communities or Orbit
                    friends.
                  </p>
                )}

                <MentionTextArea
                  rows={3}
                  value={composerText}
                  onChange={(nextValue) => {
                    setComposerText(nextValue);
                    if (composerError) setComposerError(null);
                  }}
                  members={directoryMembers}
                  currentUserId={user.uid}
                  preferredIds={composerPreferredIds}
                  preferredBadgeLabel={audience === 'orbit' ? 'In Orbit' : 'In community'}
                  helperNotice={
                    audience === 'private'
                      ? 'Private note — mentioned neighbors will not be notified'
                      : undefined
                  }
                  placeholder={
                    audience === 'communities'
                      ? 'Share an update with your selected community members (@ to mention)...'
                      : audience === 'orbit'
                        ? 'Share a closer update with your Orbit friends (@ to mention)...'
                        : 'Write a private personal note (only visible to you)...'
                  }
                  className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none resize-none"
                />

                <DriveUploadField
                  selectedMedia={attachedDriveMedia}
                  onSelectMedia={setAttachedDriveMedia}
                  defaultVisibility={audience === 'private' ? 'private' : 'anyone_with_link'}
                />

                {composerError && <p className="text-xs font-medium text-error">{composerError}</p>}

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => void handleCreateOrbitOrCommunityPost()}
                    className="min-h-[44px] w-full sm:w-auto px-5 py-2 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-container inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <span>
                      {audience === 'communities'
                        ? 'Post to Community'
                        : audience === 'orbit'
                          ? 'Share to Orbit'
                          : 'Save Private Note'}
                    </span>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Orbit, Community & Private Stream */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-base font-semibold text-on-surface">
                Orbit &amp; Community Stream
              </h3>
              <div className="flex w-full sm:w-auto bg-surface-container-low p-1 rounded-xl gap-1">
                {(
                  [
                    { id: 'orbit_private', label: `Orbit & Me (${orbitPrivateCount})` },
                    { id: 'communities', label: `Community (${communityPostsCount})` },
                    { id: 'all', label: `All (${posts.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStreamFilter(tab.id)}
                    className={`flex-1 sm:flex-initial min-h-[44px] px-1.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                      streamFilter === tab.id
                        ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleStreamPosts.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-6 text-center shadow-xs text-sm text-on-surface-variant">
                No posts match this audience filter yet.
              </div>
            ) : (
              visibleStreamPosts.map((post) => {
                const liked = post.likedByUserIds.includes(user.uid);
                const isCommentsOpen = Boolean(expandedComments[post.id]);
                const linkedDriveMedia = post.driveMediaId
                  ? driveMedia.find((m) => m.id === post.driveMediaId)
                  : undefined;

                return (
                  <article
                    key={post.id}
                    className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Avatar alt={post.authorName} initials={post.authorInitials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {post.authorName}
                          </p>
                          <span
                            className={`text-xs font-medium inline-flex items-center gap-1 min-w-0 ${
                              post.audienceType === 'private'
                                ? 'text-tertiary'
                                : post.audienceType === 'orbit'
                                  ? 'text-primary'
                                  : 'text-secondary'
                            }`}
                          >
                            {post.audienceType === 'private' ? (
                              <>
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>Private</span>
                              </>
                            ) : post.audienceType === 'orbit' ? (
                              <>
                                <Orbit className="w-3.5 h-3.5 shrink-0" />
                                <span>My Orbit</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {getPostAudienceLabel(post, communities)}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center flex-wrap gap-x-1.5 tabular-nums">
                          <span>{formatRelativeTime(post.createdAtIso)}</span>
                          {post.audienceType === 'communities' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{post.category}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line break-words">
                      <MentionText text={post.content} members={directoryMembers} />
                    </p>

                    {(post.inlineMediaUrl || linkedDriveMedia) && (
                      <DriveMediaCard
                        media={linkedDriveMedia}
                        inlineImageUrl={post.inlineMediaUrl}
                        inlineAlt={post.inlineMediaAlt}
                        mediaType={post.mediaType}
                      />
                    )}

                    {post.audienceType !== 'private' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/15">
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
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: !isCommentsOpen,
                            }))
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
                    )}

                    {post.audienceType !== 'private' && isCommentsOpen && (
                      <div className="bg-surface-container-low rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5">
                        {post.comments.length > 0 && (
                          <div className="flex flex-col divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-xl overflow-hidden">
                            {post.comments.map((cmt) => (
                              <div key={cmt.id} className="p-2.5 sm:p-3 flex items-start gap-2.5">
                                <Avatar
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
                                  <p className="text-xs text-on-surface mt-0.5 whitespace-pre-line break-words leading-relaxed">
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
                            placeholder="Write a comment (@ to mention)..."
                            containerClassName="flex-1 flex items-center bg-surface-container-lowest rounded-xl px-2.5 py-1.5 min-h-[44px] gap-1.5"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Manage Orbit List & Add from Communities */}
        <aside
          className={`${
            mobileTab === 'circle' ? 'flex' : 'hidden'
          } lg:flex lg:col-span-5 flex-col gap-4 sm:gap-5 min-w-0`}
        >
          {/* Current Orbit Members */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-on-surface">Friends in Your Orbit</h3>
              <span className="text-xs font-medium text-on-surface-variant tabular-nums">
                {orbitFriends.length}
              </span>
            </div>
            {orbitFriends.length === 0 ? (
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Add trusted friends from your communities below to share Orbit updates.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {orbitFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        initials={friend.initials}
                        size="md"
                        tone="secondary"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {friend.displayName}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">{friend.unitLabel}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget({ uid: friend.uid, name: friend.displayName })}
                      aria-label={`Remove ${friend.displayName} from Orbit`}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-error hover:bg-error-container/50 inline-flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <UserMinus className="w-4 h-4 shrink-0" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Directory -> Add to Orbit */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-base font-semibold text-on-surface">
                Add Friends from Communities
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low px-3 rounded-xl min-h-[44px]">
              <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
              <input
                type="text"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Search neighbors by name or unit..."
                className="w-full py-2 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              />
              {memberFilter && (
                <button
                  type="button"
                  onClick={() => setMemberFilter('')}
                  aria-label="Clear neighbor search"
                  className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 lg:max-h-96 lg:overflow-y-auto">
              {discoverableMembers.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-2">
                  All matching community neighbors are already in your Orbit.
                </p>
              ) : (
                discoverableMembers.map((member) => {
                  const sharedCommunityNames = member.communityIds
                    .filter((cid) => user.communityIds.includes(cid))
                    .map((cid) => communities.find((c) => c.id === cid)?.name)
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div
                      key={member.uid}
                      className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar alt={member.displayName} initials={member.initials} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate">
                            {member.displayName}
                          </p>
                          <p className="text-xs text-on-surface-variant truncate">
                            {sharedCommunityNames || member.clusterName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addToOrbit(member.uid)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed hover:bg-primary hover:text-on-primary text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from My Orbit?"
        description={
          removeTarget
            ? `${removeTarget.name} will no longer see future posts shared exclusively to My Orbit.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) void removeFromOrbit(removeTarget.uid);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
