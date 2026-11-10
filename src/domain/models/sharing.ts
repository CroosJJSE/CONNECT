export type SharingMode = 'donate' | 'lend';

export type SharingItemStatus = 'available' | 'lent_out' | 'donated';

export type SharingCategory =
  | 'Electronics & Media'
  | 'Tools & Garden'
  | 'Music & Hobbies'
  | 'Books & Learning'
  | 'Home & Kitchen';

export interface SharingItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerInitials: string;
  communityId: string;
  title: string;
  description: string;
  category: SharingCategory;
  mode: SharingMode;
  status: SharingItemStatus;
  durationDays?: number;
  borrowerId?: string;
  borrowerName?: string;
  dueDateIso?: string;
  dueLabel?: string;
  driveMediaId?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export type SharingRequestStatus = 'open' | 'in_progress' | 'closed';

export interface SharingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterInitials: string;
  communityId: string;
  title: string;
  description: string;
  requiredDuration: string;
  status: SharingRequestStatus;
  helperNames: string[];
  driveMediaId?: string;
  createdAtIso: string;
}

export type SkillCategory =
  | 'Website Development'
  | 'Graphic Design'
  | 'Technical Help'
  | 'Tutoring'
  | 'Volunteering'
  | 'Garden & Home';

export interface SkillOffer {
  id: string;
  providerId: string;
  providerName: string;
  providerInitials: string;
  communityId: string;
  title: string;
  category: SkillCategory;
  description: string;
  availability: string;
  active: boolean;
  createdAtIso: string;
}
