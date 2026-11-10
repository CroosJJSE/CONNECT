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
