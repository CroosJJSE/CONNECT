import type { RsvpStatus } from './event';

export type PointActivityType =
  | 'i_have_create'
  | 'i_can_create'
  | 'i_need_create'
  | 'community_post_create'
  | 'helpful_contribution'
  | 'event_rsvp_yes'
  | 'event_attendance_verified'
  | 'admin_adjustment';

export type ConfigurablePointActivityType = Exclude<PointActivityType, 'admin_adjustment'>;

export type PointTransactionType = 'award' | 'reversal';

export type PointRelatedEntityType =
  | 'post'
  | 'sharing_item'
  | 'sharing_request'
  | 'skill_offer'
  | 'event'
  | 'admin';

export interface PointActivityRule {
  activityType: ConfigurablePointActivityType;
  label: string;
  description: string;
  points: number;
  enabled: boolean;
  dailyLimit?: number;
  futureHook?: boolean;
}

export interface PointsConfiguration {
  rules: Record<ConfigurablePointActivityType, PointActivityRule>;
  updatedAtIso: string;
  updatedByUserId?: string;
}

export interface PointTransaction {
  id: string;
  memberId: string;
  activityType: PointActivityType;
  description: string;
  transactionType: PointTransactionType;
  /** Signed delta applied to member points (+ for award/reinstatement, - for reversal) */
  points: number;
  relatedEntityType?: PointRelatedEntityType;
  relatedPostId?: string;
  relatedEventId?: string;
  relatedEntityTitle?: string;
  /** References the original award transaction ID when reversing points */
  reversedTransactionId?: string;
  /** References the original event RSVP award when reinstating points on No -> Yes */
  reinstatedFromTransactionId?: string;
  actorUserId?: string;
  reason?: string;
  createdAtIso: string;
}

export interface EventRsvpLog {
  id: string;
  eventId: string;
  eventTitle: string;
  memberId: string;
  previousStatus?: RsvpStatus;
  newStatus: RsvpStatus;
  pointTransactionId?: string;
  pointsDelta: number;
  createdAtIso: string;
}

export interface MemberPointsSummary {
  memberId: string;
  points: number;
  level: number;
  pointsIntoCurrentLevel: number;
  pointsToNextLevel: number;
  progressPercent: number;
}

export interface SuspiciousActivityFlag {
  id: string;
  memberId: string;
  severity: 'info' | 'warning';
  reason: string;
  relatedEventId?: string;
  transactionIds: string[];
  detectedAtIso: string;
}

export interface PointMutationEvent {
  transaction: PointTransaction;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newPoints: number;
}
