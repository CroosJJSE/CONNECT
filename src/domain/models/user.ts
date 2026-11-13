import type { CurrencyCode, MemberRole } from './common';

export interface UserProfile {
  uid: string;
  displayName: string;
  initials: string;
  email: string;
  avatarUrl?: string;
  clusterName: string;
  unitLabel: string;
  bio: string;
  role: MemberRole;
  verified: boolean;
  joinedAtIso: string;
  communityIds: string[];
  preferredCurrency: CurrencyCode;
  phoneVisibleToHousemates: boolean;
  driveConnected: boolean;
  driveAppFolderId?: string;
  calendarConnected: boolean;
  financeEnabled: boolean;
  points: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  location: string;
  memberCount: number;
  category: 'residential' | 'interest' | 'volunteer';
}

export interface CommunityAnnouncement {
  id: string;
  communityId: string;
  title: string;
  summary: string;
  urgency: 'normal' | 'important';
  publishedAtIso: string;
}

export interface CommunityPollOption {
  id: string;
  label: string;
  voteCount: number;
}

export interface CommunityPoll {
  id: string;
  communityId: string;
  question: string;
  closesAtIso: string;
  options: CommunityPollOption[];
  votedUserIds: string[];
}

export interface InterestGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  joined: boolean;
}

export interface NotificationItem {
  id: string;
  recipientUserId?: string;
  title: string;
  message: string;
  createdAtIso: string;
  read: boolean;
  route: 'home' | 'sharing' | 'orbit' | 'events' | 'finance' | 'profile';
}
