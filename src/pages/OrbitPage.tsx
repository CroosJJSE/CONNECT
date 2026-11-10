import { useMemo, useState } from 'react';
import {
  Globe,
  Heart,
  ImagePlus,
  Lock,
  MessageCircle,
  Orbit,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
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

  const [memberFilter, setMemberFilter] = useState('');
  const [composerText, setComposerText] = useState('');
  const [audience, setAudience] = useState<PostAudienceType>('orbit');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('General Update');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(() =>
    user?.communityIds.slice(0, 1) ?? ['lotus-grove']
  );
  const [showMediaUpload, setShowMediaUpload] = useState(false);
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
    setShowMediaUpload(false);
    if (audience === 'communities' && streamFilter === 'orbit_private') {
      setStreamFilter('all');
    } else if (audience !== 'communities' && streamFilter === 'communities') {
      setStreamFilter('all');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-on-surface tracking-tight">
            My Orbit
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Share with your personal close-friends circle, post at the community level, or save private notes visible only to you.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-xs font-medium text-secondary self-start sm:self-auto">
          <Orbit className="w-4 h-4 text-primary" />
          <span className="tabular-nums">{orbitFriends.length} close friends in Orbit</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Orbit, Community & Private Composer + Stream */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* Audience-Selectable Composer */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-on-surface">
                Choose Who Sees This Post
              </span>
              <div className="inline-flex flex-wrap bg-surface-container p-1 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAudience('orbit');
                    if (composerError) setComposerError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    audience === 'orbit'
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5" />
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    audience === 'communities'
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Community</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudience('private');
                    if (composerError) setComposerError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    audience === 'private'
                      ? 'bg-surface-container-lowest text-tertiary shadow-xs font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Only Me</span>
                </button>
              </div>
            </div>

            {/* Community-level options */}
            {audience === 'communities' && (
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Target Communities
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {selectedCommunityIds.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {userCommunities.map((comm) => {
                    const active = selectedCommunityIds.includes(comm.id);
                    return (
                      <button
                        key={comm.id}
                        type="button"
                        onClick={() => handleToggleCommunity(comm.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {ORBIT_POST_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-on-primary'
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
              <p className="text-xs text-on-surface-variant">
                Visible only to you and the {orbitFriends.length} close friend(s) in your My Orbit circle.
              </p>
            )}

            {audience === 'private' && (
              <p className="text-xs text-on-surface-variant">
                Personal note visible strictly to you. Never shared with communities or Orbit friends.
              </p>
            )}

            <MentionTextArea
              rows={2}
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

            {showMediaUpload && (
              <DriveUploadField
                selectedMedia={attachedDriveMedia}
                onSelectMedia={setAttachedDriveMedia}
                defaultVisibility={audience === 'private' ? 'private' : 'anyone_with_link'}
              />
            )}

            {composerError && <p className="text-xs font-medium text-error">{composerError}</p>}

            <div className="flex items-center justify-between gap-2">
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
                onClick={() => void handleCreateOrbitOrCommunityPost()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span>
                  {audience === 'communities'
                    ? 'Post to Community'
                    : audience === 'orbit'
                      ? 'Share to Orbit'
                      : 'Save Private Note'}
                </span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Orbit, Community & Private Stream */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-on-surface">
                Orbit &amp; Community Stream
              </h3>
              <div className="inline-flex bg-surface-container-low p-1 rounded-xl gap-1">
                {(
                  [
                    { id: 'orbit_private', label: `Orbit & Private (${orbitPrivateCount})` },
                    { id: 'communities', label: `Community (${communityPostsCount})` },
                    { id: 'all', label: `All (${posts.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStreamFilter(tab.id)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
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
              <div className="bg-surface-container-lowest rounded-xl p-6 text-center shadow-xs text-sm text-on-surface-variant">
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
                    className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar alt={post.authorName} initials={post.authorInitials} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {post.authorName}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {formatRelativeTime(post.createdAtIso)}
                            {post.audienceType === 'communities' ? ` · ${post.category}` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 max-w-full truncate ${
                          post.audienceType === 'private'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                            : post.audienceType === 'orbit'
                              ? 'bg-primary-fixed text-on-primary-fixed'
                              : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        {post.audienceType === 'private' ? (
                          <>
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>Private</span>
                          </>
                        ) : post.audienceType === 'orbit' ? (
                          <>
                            <Orbit className="w-3 h-3 shrink-0" />
                            <span>My Orbit</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {getPostAudienceLabel(post, communities)}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line">
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
                      <div className="flex items-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={() => void toggleWarmth(post.id)}
                          className={`min-h-[36px] flex items-center gap-1.5 text-xs font-medium ${
                            liked
                              ? 'text-tertiary font-semibold'
                              : 'text-on-surface-variant hover:text-tertiary'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${liked ? 'fill-tertiary text-tertiary' : ''}`} />
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
                          className="min-h-[36px] flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="tabular-nums">{post.comments.length}</span>
                          <span>Comments</span>
                        </button>
                      </div>
                    )}

                    {post.audienceType !== 'private' && isCommentsOpen && (
                      <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2.5">
                        {post.comments.map((cmt) => (
                          <div key={cmt.id} className="flex items-start gap-2.5">
                            <Avatar alt={cmt.authorName} initials={cmt.authorInitials} size="xs" tone="neutral" />
                            <div className="flex-1 bg-surface-container-lowest rounded-lg p-2.5 shadow-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-on-surface">
                                  {cmt.authorName}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {formatRelativeTime(cmt.createdAtIso)}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface mt-0.5 whitespace-pre-line">
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
                            placeholder="Write a comment (@ to mention)..."
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
        <aside className="lg:col-span-5 flex flex-col gap-5">
          {/* Current Orbit Members */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-base font-semibold text-on-surface">Friends in Your Orbit</h3>
            {orbitFriends.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                Add trusted friends from your communities below to share Orbit updates.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
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
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error-container/50 inline-flex items-center gap-1 transition-colors shrink-0"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Directory -> Add to Orbit */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold text-on-surface">
                Add Friends from Your Communities
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl">
              <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
              <input
                type="text"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Search neighbors by name or unit..."
                className="w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
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
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {sharedCommunityNames || member.clusterName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addToOrbit(member.uid)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed hover:bg-primary hover:text-on-primary text-xs font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
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
