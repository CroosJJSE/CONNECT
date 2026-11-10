import type { SharingItem, SharingRequest } from '../models/sharing';

/**
 * Donated items disappear from active available listings once claimed.
 * Lent items stay visible as lent_out (or due) and become available again when returned.
 */
export function isItemVisibleInAvailableMarketplace(item: SharingItem): boolean {
  return item.status !== 'donated';
}

export function borrowOrClaimItem(params: {
  item: SharingItem;
  actorUserId: string;
  actorName: string;
  nowIso: string;
}): SharingItem {
  const { item, actorUserId, actorName, nowIso } = params;

  if (item.status !== 'available') {
    throw new Error('This item is no longer available.');
  }
  if (item.ownerId === actorUserId) {
    throw new Error('You cannot borrow or claim your own listing.');
  }

  if (item.mode === 'donate') {
    return {
      ...item,
      status: 'donated',
      borrowerId: actorUserId,
      borrowerName: actorName,
      updatedAtIso: nowIso,
    };
  }

  const days = item.durationDays ?? 7;
  const dueMs = Date.parse(nowIso) + days * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueMs);
  const dueLabel = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    ...item,
    status: 'lent_out',
    borrowerId: actorUserId,
    borrowerName: actorName,
    dueDateIso: dueDate.toISOString(),
    dueLabel,
    updatedAtIso: nowIso,
  };
}

export function markLentItemReturned(params: {
  item: SharingItem;
  actorUserId: string;
  nowIso: string;
}): SharingItem {
  const { item, actorUserId, nowIso } = params;
  if (item.mode !== 'lend' || item.status !== 'lent_out') {
    throw new Error('Only currently lent items can be marked as returned.');
  }
  if (item.ownerId !== actorUserId && item.borrowerId !== actorUserId) {
    throw new Error('Only the owner or current borrower can mark this item returned.');
  }

  return {
    ...item,
    status: 'available',
    borrowerId: undefined,
    borrowerName: undefined,
    dueDateIso: undefined,
    dueLabel: undefined,
    updatedAtIso: nowIso,
  };
}

export function offerHelpOnRequest(params: {
  request: SharingRequest;
  helperName: string;
}): SharingRequest {
  const { request, helperName } = params;
  if (request.status === 'closed') {
    throw new Error('This request has already been closed.');
  }
  const helperNames = request.helperNames.includes(helperName)
    ? request.helperNames
    : [...request.helperNames, helperName];

  return {
    ...request,
    status: 'in_progress',
    helperNames,
  };
}

export function closeSharingRequest(params: {
  request: SharingRequest;
  actorUserId: string;
}): SharingRequest {
  if (params.request.requesterId !== params.actorUserId) {
    throw new Error('Only the requester can close this request.');
  }
  return {
    ...params.request,
    status: 'closed',
  };
}
