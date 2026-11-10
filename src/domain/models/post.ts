export type PostCategory =
  | 'General Update'
  | 'Achievement'
  | 'Testimony'
  | 'Question'
  | 'Community Activity'
  | 'Announcement';

export type PostAudienceType = 'communities' | 'orbit' | 'private';

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  mentionedUserIds?: string[];
  createdAtIso: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorRoleLabel?: string;
  authorLocationLabel?: string;
  category: PostCategory;
  content: string;
  audienceType: PostAudienceType;
  communityIds: string[];
  mentionedUserIds?: string[];
  driveMediaId?: string;
  inlineMediaUrl?: string;
  inlineMediaAlt?: string;
  mediaType?: 'image' | 'video';
  locationBadge?: string;
  pinned: boolean;
  likedByUserIds: string[];
  comments: PostComment[];
  createdAtIso: string;
  updatedAtIso: string;
}
