/**
 * CONNECT — Firebase Cloud Functions (Trusted Backend Operations Scaffolding)
 *
 * Ready for Firebase Functions v2 deployment once a Firebase Blaze project is linked.
 * Handles trusted server-side workflows that should never rely solely on client execution:
 * 1. Validating multi-community post authorization & fan-out notifications.
 * 2. Enforcing lending return due-date reminder schedules.
 * 3. Cleaning up or archiving donated items and event task reminders.
 */

export interface TrustedNotificationPayload {
  recipientUserId: string;
  title: string;
  body: string;
  targetRoute: 'feed' | 'sharing' | 'orbit' | 'events';
  targetId: string;
  createdAtIso: string;
}

/**
 * Computes recipients for a newly created post while strictly honoring
 * private, My Orbit, and community membership boundaries.
 */
export function resolveAuthorizedPostRecipients(params: {
  authorId: string;
  audienceType: 'private' | 'orbit' | 'communities';
  orbitMemberIds: string[];
  communityMemberIds: string[];
}): string[] {
  if (params.audienceType === 'private') {
    return [];
  }
  const unique = new Set<string>(
    params.audienceType === 'orbit' ? params.orbitMemberIds : params.communityMemberIds
  );
  unique.delete(params.authorId);
  return Array.from(unique);
}

/**
 * Evaluates lent sharing items whose return due date falls within the next 24 hours.
 */
export function isLentItemDueSoon(dueDateIso: string | undefined, nowMs: number): boolean {
  if (!dueDateIso) return false;
  const dueMs = Date.parse(dueDateIso);
  if (Number.isNaN(dueMs)) return false;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return dueMs >= nowMs && dueMs - nowMs <= twentyFourHoursMs;
}

// ============================================================================
// 4. Trusted Community Contribution Points & Levels Engine
// ============================================================================

export type ServerPointActivityType =
  | 'i_have_create'
  | 'i_can_create'
  | 'i_need_create'
  | 'community_post_create'
  | 'helpful_contribution'
  | 'event_rsvp_yes'
  | 'event_attendance_verified'
  | 'admin_adjustment';

export type ServerRsvpStatus = 'going' | 'maybe' | 'not_going';

export interface ServerPointRule {
  points: number;
  enabled: boolean;
  dailyLimit?: number;
  futureHook?: boolean;
}

export interface ServerPointLedgerEntry {
  id: string;
  memberId: string;
  activityType: ServerPointActivityType;
  transactionType: 'award' | 'reversal';
  points: number;
  relatedPostId?: string;
  relatedEventId?: string;
  reversedTransactionId?: string;
  reinstatedFromTransactionId?: string;
  reason?: string;
  createdAtIso: string;
}

/**
 * Evaluates whether a newly created post/item/request/offer qualifies for points,
 * enforcing daily caps, Orbit/Private exclusions, and duplicate prevention.
 */
export function evaluateCreationPointAward(params: {
  memberId: string;
  activityType: Exclude<
    ServerPointActivityType,
    'helpful_contribution' | 'event_rsvp_yes' | 'event_attendance_verified' | 'admin_adjustment'
  >;
  entityId: string;
  audienceType?: 'communities' | 'orbit' | 'private';
  rule: ServerPointRule;
  existingTransactions: readonly ServerPointLedgerEntry[];
  nowIso: string;
}): { eligible: boolean; points: number; reason?: string } {
  if (!params.rule.enabled || params.rule.points <= 0) {
    return { eligible: false, points: 0, reason: 'Rule disabled or zero points' };
  }
  if (params.activityType === 'community_post_create' && params.audienceType !== 'communities') {
    return { eligible: false, points: 0, reason: 'Orbit/private posts excluded' };
  }

  const reversedIds = new Set(
    params.existingTransactions
      .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
      .map((t) => t.reversedTransactionId!)
  );

  const duplicateExists = params.existingTransactions.some(
    (t) =>
      t.memberId === params.memberId &&
      t.activityType === params.activityType &&
      t.relatedPostId === params.entityId &&
      t.transactionType === 'award' &&
      !reversedIds.has(t.id)
  );
  if (duplicateExists) {
    return { eligible: false, points: 0, reason: 'Duplicate award prevented' };
  }

  if (params.rule.dailyLimit && params.rule.dailyLimit > 0) {
    const dayPrefix = params.nowIso.slice(0, 10);
    const todayCount = params.existingTransactions.filter(
      (t) =>
        t.memberId === params.memberId &&
        t.activityType === params.activityType &&
        t.transactionType === 'award' &&
        t.createdAtIso.slice(0, 10) === dayPrefix &&
        !reversedIds.has(t.id)
    ).length;
    if (todayCount >= params.rule.dailyLimit) {
      return { eligible: false, points: 0, reason: 'Daily limit reached' };
    }
  }

  return { eligible: true, points: params.rule.points };
}

/**
 * Evaluates event RSVP transitions against a single stored points balance:
 * - Initial -> Going: +points
 * - Going -> Maybe/Not Going: -points (reversal)
 * - Maybe/Not Going -> Going (re-select after reversal): +points (reinstatement)
 */
export function evaluateEventRsvpPointTransition(params: {
  memberId: string;
  eventId: string;
  previousStatus?: ServerRsvpStatus;
  newStatus: ServerRsvpStatus;
  rule: ServerPointRule;
  existingTransactions: readonly ServerPointLedgerEntry[];
}):
  | { action: 'none'; pointsDelta: 0 }
  | { action: 'award'; pointsDelta: number }
  | { action: 'reinstate'; pointsDelta: number; originalAwardId: string }
  | { action: 'reverse'; pointsDelta: number; reversedTransactionId: string } {
  const eventAwards = params.existingTransactions.filter(
    (t) =>
      t.memberId === params.memberId &&
      t.activityType === 'event_rsvp_yes' &&
      t.relatedEventId === params.eventId &&
      t.transactionType === 'award'
  );
  const reversedIds = new Set(
    params.existingTransactions
      .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
      .map((t) => t.reversedTransactionId!)
  );
  const activeAward = eventAwards.find((a) => !reversedIds.has(a.id));

  if (params.newStatus === 'going') {
    if (activeAward) {
      return { action: 'none', pointsDelta: 0 };
    }
    const originalAward = eventAwards[eventAwards.length - 1];
    if (originalAward) {
      return {
        action: 'reinstate',
        pointsDelta: originalAward.points,
        originalAwardId: originalAward.id,
      };
    }
    if (!params.rule.enabled || params.rule.points <= 0) {
      return { action: 'none', pointsDelta: 0 };
    }
    return {
      action: 'award',
      pointsDelta: params.rule.points,
    };
  }

  if (params.previousStatus === 'going' && activeAward) {
    return {
      action: 'reverse',
      pointsDelta: -activeAward.points,
      reversedTransactionId: activeAward.id,
    };
  }

  return { action: 'none', pointsDelta: 0 };
}

