import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';

setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });
import {
  evaluateCreationPointAward,
  evaluateEventRsvpPointTransition,
  isLentItemDueSoon,
  resolveAuthorizedPostRecipients,
  type ServerPointActivityType,
  type ServerPointLedgerEntry,
  type ServerPointRule,
  type ServerRsvpStatus,
} from './logic.js';

const DEFAULT_RULES: Record<
  Exclude<ServerPointActivityType, 'admin_adjustment'>,
  ServerPointRule
> = {
  i_have_create: { points: 15, enabled: true },
  i_can_create: { points: 15, enabled: true },
  i_need_create: { points: 10, enabled: true },
  community_post_create: { points: 5, enabled: true, dailyLimit: 5 },
  helpful_contribution: { points: 20, enabled: true },
  event_rsvp_yes: { points: 25, enabled: true },
  event_attendance_verified: { points: 0, enabled: false, futureHook: true },
};

function notifId(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ledgerId(): string {
  return `ptx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function writeNotification(params: {
  recipientUserId: string;
  title: string;
  message: string;
  route: 'feed' | 'sharing' | 'orbit' | 'events' | 'home';
}): Promise<void> {
  const db = getFirestore();
  await db.collection('users').doc(params.recipientUserId).collection('notifications').doc(notifId()).set({
    title: params.title,
    message: params.message,
    createdAtIso: new Date().toISOString(),
    read: false,
    route: params.route,
    recipientUserId: params.recipientUserId,
  });
}

async function loadRule(activity: ServerPointActivityType): Promise<ServerPointRule> {
  const db = getFirestore();
  const snap = await db.doc('systemConfig/pointsConfig').get();
  const fallback = DEFAULT_RULES[activity as Exclude<ServerPointActivityType, 'admin_adjustment'>] ?? {
    points: 0,
    enabled: false,
  };
  if (!snap.exists) return fallback;
  const rules = snap.data()?.rules as Record<string, ServerPointRule> | undefined;
  return rules?.[activity] ?? fallback;
}

async function loadMemberActivityLedger(
  memberId: string,
  activityType: ServerPointActivityType
): Promise<ServerPointLedgerEntry[]> {
  const db = getFirestore();
  const snap = await db
    .collection('pointTransactions')
    .where('memberId', '==', memberId)
    .where('activityType', '==', activityType)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      memberId: String(data.memberId),
      activityType: data.activityType as ServerPointActivityType,
      transactionType: data.transactionType as 'award' | 'reversal',
      points: Number(data.points ?? 0),
      relatedPostId: typeof data.relatedPostId === 'string' ? data.relatedPostId : undefined,
      relatedEventId: typeof data.relatedEventId === 'string' ? data.relatedEventId : undefined,
      reversedTransactionId:
        typeof data.reversedTransactionId === 'string' ? data.reversedTransactionId : undefined,
      reinstatedFromTransactionId:
        typeof data.reinstatedFromTransactionId === 'string'
          ? data.reinstatedFromTransactionId
          : undefined,
      createdAtIso: String(data.createdAtIso ?? ''),
    };
  });
}

async function writePointTransaction(entry: {
  memberId: string;
  activityType: ServerPointActivityType;
  description: string;
  transactionType: 'award' | 'reversal';
  points: number;
  relatedEntityType: string;
  relatedPostId?: string;
  relatedEventId?: string;
  relatedEntityTitle?: string;
  reversedTransactionId?: string;
  reinstatedFromTransactionId?: string;
}): Promise<string> {
  const db = getFirestore();
  const id = ledgerId();
  await db.collection('pointTransactions').doc(id).set({
    id,
    ...entry,
    createdAtIso: new Date().toISOString(),
  });
  await db.doc(`users/${entry.memberId}`).update({
    points: FieldValue.increment(entry.transactionType === 'reversal' ? -Math.abs(entry.points) : entry.points),
  });
  return id;
}

async function communityMemberIds(communityId: string): Promise<string[]> {
  const db = getFirestore();
  const snap = await db.collection('communities').doc(communityId).collection('members').get();
  return snap.docs
    .filter((d) => d.data().status === 'active')
    .map((d) => d.id);
}

async function orbitMemberIds(ownerId: string): Promise<string[]> {
  const db = getFirestore();
  const snap = await db.collection('orbits').doc(ownerId).collection('members').get();
  return snap.docs.map((d) => d.id);
}

export const onPostCreated = onDocumentCreated('posts/{postId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const postId = event.params.postId;
  const authorId = String(data.authorId ?? '');
  const audienceType = data.audienceType as 'private' | 'orbit' | 'communities';
  const title = String(data.content ?? 'New post').slice(0, 80);
  const communityIds = Array.isArray(data.communityIds) ? (data.communityIds as string[]) : [];

  let memberIds: string[] = [];
  if (audienceType === 'orbit') {
    memberIds = await orbitMemberIds(authorId);
  } else if (audienceType === 'communities') {
    const nested = await Promise.all(communityIds.map((id) => communityMemberIds(id)));
    memberIds = nested.flat();
  }
  const recipients = resolveAuthorizedPostRecipients({
    authorId,
    audienceType,
    orbitMemberIds: memberIds,
    communityMemberIds: memberIds,
  });
  await Promise.all(
    recipients.map((recipientUserId) =>
      writeNotification({
        recipientUserId,
        title: 'New community post',
        message: title,
        route: audienceType === 'orbit' ? 'orbit' : 'feed',
      })
    )
  );

  const rule = await loadRule('community_post_create');
  const existing = await loadMemberActivityLedger(authorId, 'community_post_create');
  const decision = evaluateCreationPointAward({
    memberId: authorId,
    activityType: 'community_post_create',
    entityId: postId,
    audienceType,
    rule,
    existingTransactions: existing,
    nowIso: new Date().toISOString(),
  });
  if (decision.eligible) {
    await writePointTransaction({
      memberId: authorId,
      activityType: 'community_post_create',
      description: 'Created a community post',
      transactionType: 'award',
      points: decision.points,
      relatedEntityType: 'post',
      relatedPostId: postId,
      relatedEntityTitle: title,
    });
  }
});

async function awardCreation(params: {
  memberId: string;
  activityType: 'i_have_create' | 'i_need_create' | 'i_can_create';
  entityId: string;
  title: string;
  relatedEntityType: string;
}): Promise<void> {
  const rule = await loadRule(params.activityType);
  const existing = await loadMemberActivityLedger(params.memberId, params.activityType);
  const decision = evaluateCreationPointAward({
    memberId: params.memberId,
    activityType: params.activityType,
    entityId: params.entityId,
    rule,
    existingTransactions: existing,
    nowIso: new Date().toISOString(),
  });
  if (!decision.eligible) return;
  await writePointTransaction({
    memberId: params.memberId,
    activityType: params.activityType,
    description: params.title,
    transactionType: 'award',
    points: decision.points,
    relatedEntityType: params.relatedEntityType,
    relatedPostId: params.entityId,
    relatedEntityTitle: params.title,
  });
}

export const onSharingItemCreated = onDocumentCreated('sharingItems/{itemId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await awardCreation({
    memberId: String(data.ownerId ?? ''),
    activityType: 'i_have_create',
    entityId: event.params.itemId,
    title: `Listed "${String(data.title ?? 'item')}"`,
    relatedEntityType: 'sharing_item',
  });
});

export const onSharingRequestCreated = onDocumentCreated('sharingRequests/{requestId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await awardCreation({
    memberId: String(data.requesterId ?? ''),
    activityType: 'i_need_create',
    entityId: event.params.requestId,
    title: `Requested "${String(data.title ?? 'help')}"`,
    relatedEntityType: 'sharing_request',
  });
});

export const onSkillOfferCreated = onDocumentCreated('skillOffers/{offerId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await awardCreation({
    memberId: String(data.providerId ?? ''),
    activityType: 'i_can_create',
    entityId: event.params.offerId,
    title: `Offered "${String(data.title ?? 'skill')}"`,
    relatedEntityType: 'skill_offer',
  });
});

export const onSharingItemUpdated = onDocumentUpdated('sharingItems/{itemId}', async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.data();
  const after = change.after.data();
  if (!before || !after) return;
  if (before.status !== 'donated' && after.status === 'donated') {
    await change.after.ref.set({ archivedAt: new Date().toISOString() }, { merge: true });
  }
  if (before.status !== 'lent_out' && after.status === 'lent_out') {
    const ownerId = String(after.ownerId ?? '');
    const borrowerId = String(after.borrowerId ?? '');
    const title = String(after.title ?? 'item');
    if (ownerId) {
      await writeNotification({
        recipientUserId: ownerId,
        title: 'Item lent out',
        message: `"${title}" was borrowed.`,
        route: 'sharing',
      });
    }
    if (borrowerId) {
      await writeNotification({
        recipientUserId: borrowerId,
        title: 'Borrow confirmed',
        message: `Return "${title}" by the due date.`,
        route: 'sharing',
      });
    }
  }
});

export const onEventRsvpWritten = onDocumentWritten('events/{eventId}/rsvps/{userId}', async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  const before = event.data?.before.data();
  const memberId = event.params.userId;
  const eventId = event.params.eventId;
  const previousStatus = before?.status as ServerRsvpStatus | undefined;
  const newStatus = after.status as ServerRsvpStatus;
  if (!newStatus || previousStatus === newStatus) return;

  const db = getFirestore();
  const eventSnap = await db.doc(`events/${eventId}`).get();
  const eventTitle = String(eventSnap.data()?.title ?? 'Community event');
  const rule = await loadRule('event_rsvp_yes');
  const existing = await loadMemberActivityLedger(memberId, 'event_rsvp_yes');
  const decision = evaluateEventRsvpPointTransition({
    memberId,
    eventId,
    previousStatus,
    newStatus,
    rule,
    existingTransactions: existing,
  });

  let pointTransactionId = '';
  let pointsDelta = 0;
  if (decision.action === 'award') {
    pointTransactionId = await writePointTransaction({
      memberId,
      activityType: 'event_rsvp_yes',
      description: `RSVP going: ${eventTitle}`,
      transactionType: 'award',
      points: decision.pointsDelta,
      relatedEntityType: 'event',
      relatedEventId: eventId,
      relatedEntityTitle: eventTitle,
    });
    pointsDelta = decision.pointsDelta;
  } else if (decision.action === 'reinstate') {
    pointTransactionId = await writePointTransaction({
      memberId,
      activityType: 'event_rsvp_yes',
      description: `RSVP restored: ${eventTitle}`,
      transactionType: 'award',
      points: decision.pointsDelta,
      relatedEntityType: 'event',
      relatedEventId: eventId,
      relatedEntityTitle: eventTitle,
      reinstatedFromTransactionId: decision.originalAwardId,
    });
    pointsDelta = decision.pointsDelta;
  } else if (decision.action === 'reverse') {
    pointTransactionId = await writePointTransaction({
      memberId,
      activityType: 'event_rsvp_yes',
      description: `RSVP changed: ${eventTitle}`,
      transactionType: 'reversal',
      points: Math.abs(decision.pointsDelta),
      relatedEntityType: 'event',
      relatedEventId: eventId,
      relatedEntityTitle: eventTitle,
      reversedTransactionId: decision.reversedTransactionId,
    });
    pointsDelta = decision.pointsDelta;
  }

  const logId = ledgerId();
  await db.collection('eventRsvpLogs').doc(logId).set({
    id: logId,
    eventId,
    eventTitle,
    memberId,
    previousStatus: previousStatus ?? null,
    newStatus,
    pointTransactionId,
    pointsDelta,
    createdAtIso: new Date().toISOString(),
  });
});

export const onEventTaskCreated = onDocumentCreated('events/{eventId}/tasks/{taskId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const assigneeId = String(data.assigneeId ?? '');
  if (!assigneeId) return;
  await writeNotification({
    recipientUserId: assigneeId,
    title: 'Event task assigned',
    message: String(data.title ?? 'You have a new event task.'),
    route: 'events',
  });
});

export const hourlyCommunityReminders = onSchedule('every 60 minutes', async () => {
  const db = getFirestore();
  const nowMs = Date.now();
  const lent = await db.collection('sharingItems').where('status', '==', 'lent_out').get();
  for (const item of lent.docs) {
    const data = item.data();
    if (data.dueReminderSentAt) continue;
    const dueDate = typeof data.dueDate === 'string' ? data.dueDate : undefined;
    if (!isLentItemDueSoon(dueDate, nowMs)) continue;
    const title = String(data.title ?? 'lent item');
    const ownerId = String(data.ownerId ?? '');
    const borrowerId = String(data.borrowerId ?? '');
    if (ownerId) {
      await writeNotification({
        recipientUserId: ownerId,
        title: 'Return due soon',
        message: `"${title}" is due back within 24 hours.`,
        route: 'sharing',
      });
    }
    if (borrowerId) {
      await writeNotification({
        recipientUserId: borrowerId,
        title: 'Please return this item',
        message: `"${title}" is due back within 24 hours.`,
        route: 'sharing',
      });
    }
    await item.ref.set({ dueReminderSentAt: new Date().toISOString() }, { merge: true });
  }

  const events = await db.collection('events').get();
  for (const evt of events.docs) {
    const tasks = await evt.ref.collection('tasks').get();
    for (const task of tasks.docs) {
      const data = task.data();
      if (!data.reminderEnabled || data.reminderSentAt || data.status === 'completed') continue;
      const deadline = typeof data.deadlineIso === 'string' ? data.deadlineIso : undefined;
      if (!isLentItemDueSoon(deadline, nowMs)) continue;
      const assigneeId = String(data.assigneeId ?? '');
      if (!assigneeId) continue;
      await writeNotification({
        recipientUserId: assigneeId,
        title: 'Event task due soon',
        message: String(data.title ?? 'Your event task is due within 24 hours.'),
        route: 'events',
      });
      await task.ref.set({ reminderSentAt: new Date().toISOString() }, { merge: true });
    }
  }
});
