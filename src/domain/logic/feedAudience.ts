import type { Community, Post } from '../models';

/**
 * Pure authorization filter verifying whether a user is allowed to read a post.
 * Mirrors Firestore Security Rules so client filtering and server rules agree.
 */
export function canUserViewPost(params: {
  post: Post;
  viewerId: string;
  viewerCommunityIds: readonly string[];
  orbitMembersByOwner: Readonly<Record<string, readonly string[]>>;
}): boolean {
  const { post, viewerId, viewerCommunityIds, orbitMembersByOwner } = params;

  if (post.authorId === viewerId) {
    return true;
  }

  if (post.audienceType === 'private') {
    return false;
  }

  if (post.audienceType === 'orbit') {
    const authorOrbit = orbitMembersByOwner[post.authorId] ?? [];
    return authorOrbit.includes(viewerId);
  }

  if (post.audienceType === 'communities') {
    return post.communityIds.some((cid) => viewerCommunityIds.includes(cid));
  }

  return false;
}

/**
 * Returns authorized posts ordered strictly chronologically (pinned announcements first, then newest).
 */
export function filterAuthorizedPosts(params: {
  posts: readonly Post[];
  viewerId: string;
  viewerCommunityIds: readonly string[];
  orbitMembersByOwner: Readonly<Record<string, readonly string[]>>;
}): Post[] {
  const authorized = params.posts.filter((post) =>
    canUserViewPost({
      post,
      viewerId: params.viewerId,
      viewerCommunityIds: params.viewerCommunityIds,
      orbitMembersByOwner: params.orbitMembersByOwner,
    })
  );

  return [...authorized].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso);
  });
}

export function getPostAudienceLabel(post: Post, communities: readonly Community[]): string {
  if (post.audienceType === 'private') {
    return 'Private · Only Me';
  }
  if (post.audienceType === 'orbit') {
    return 'My Orbit · Close Friends';
  }
  if (post.communityIds.length === 0) {
    return 'Community';
  }
  const names = post.communityIds
    .map((id) => communities.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(' · ') : 'Community';
}
