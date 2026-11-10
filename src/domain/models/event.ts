export type RsvpStatus = 'going' | 'maybe' | 'cant_go';

export type EventTaskStatus = 'pending' | 'completed';

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  deadlineIso: string;
  reminderEnabled: boolean;
  status: EventTaskStatus;
}

export interface EventComment {
  id: string;
  eventId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  mentionedUserIds?: string[];
  createdAtIso: string;
}

export interface CommunityEvent {
  id: string;
  hostId: string;
  hostName: string;
  communityId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  monthLabel: string;
  dayLabel: string;
  timeRangeLabel: string;
  startIso: string;
  endIso: string;
  admissionLabel: string;
  coverImageUrl?: string;
  driveMediaId?: string;
  invitedUserIds: string[];
  rsvps: Record<string, RsvpStatus>;
  tasks: EventTask[];
  comments: EventComment[];
  googleCalendarSynced?: boolean;
  galleryDriveLink?: string;
}
