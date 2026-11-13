import type {
  ConfigurablePointActivityType,
  EventRsvpLog,
  MemberPointsSummary,
  PointActivityRule,
  PointActivityType,
  PointTransaction,
  PointsConfiguration,
  SuspiciousActivityFlag,
  UserProfile,
} from '../models';

export const POINTS_PER_LEVEL = 100;

export const DEFAULT_POINT_RULES: Record<ConfigurablePointActivityType, PointActivityRule> = {
  i_have_create: {
    activityType: 'i_have_create',
    label: 'Create an "I Have" listing',
    description: 'Share or donate an item with neighbors.',
    points: 15,
    enabled: true,
  },
  i_can_create: {
    activityType: 'i_can_create',
    label: 'Create an "I Can" offer',
    description: 'Offer skills, time, or volunteering to the community.',
    points: 15,
    enabled: true,
  },
  i_need_create: {
    activityType: 'i_need_create',
    label: 'Create an "I Need" request',
    description: 'Ask the community for tools, rides, or neighbor help.',
    points: 10,
    enabled: true,
  },
  community_post_create: {
    activityType: 'community_post_create',
    label: 'Create a community post',
    description: 'Share updates, achievements, or questions in a community feed.',
    points: 5,
    enabled: true,
    dailyLimit: 5,
  },
  helpful_contribution: {
    activityType: 'helpful_contribution',
    label: 'Verified helpful contribution',
    description: 'Verified by a neighbor after helping fulfill a request.',
    points: 20,
    enabled: true,
  },
  event_rsvp_yes: {
    activityType: 'event_rsvp_yes',
    label: 'RSVP Yes to a community event',
    description: 'Commit to attending a community gathering.',
    points: 25,
    enabled: true,
  },
  event_attendance_verified: {
    activityType: 'event_attendance_verified',
    label: 'Event attendance verified (Future hook)',
    description: 'Reserved for future organizer attendance check-in bonuses.',
    points: 0,
    enabled: false,
    futureHook: true,
  },
};

export function createDefaultPointsConfiguration(nowIso: string = new Date().toISOString()): PointsConfiguration {
  return {
    rules: structuredClone(DEFAULT_POINT_RULES),
    updatedAtIso: nowIso,
  };
}

/**
 * Formula: Level = floor(Points / 100) + 1
 * Level is calculated dynamically in the UI from points and is never stored.
 */
export function calculateLevelFromPoints(points: number): number {
  const safePoints = Math.max(0, Math.floor(points));
  return Math.floor(safePoints / POINTS_PER_LEVEL) + 1;
}

export function computeMemberPointsSummary(
  memberId: string,
  points: number
): MemberPointsSummary {
  const safePoints = Math.max(0, Math.round(points));
  const level = calculateLevelFromPoints(safePoints);
  const pointsIntoCurrentLevel = safePoints % POINTS_PER_LEVEL;
  const pointsToNextLevel = POINTS_PER_LEVEL - pointsIntoCurrentLevel;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((pointsIntoCurrentLevel / POINTS_PER_LEVEL) * 100))
  );

  return {
    memberId,
    points: safePoints,
    level,
    pointsIntoCurrentLevel,
    pointsToNextLevel,
    progressPercent,
  };
}

export interface LevelFrameStyle {
  tierName: string;
  outerRingClass: string;
  haloClass: string;
  badgeTextClass: string;
  badgeSurfaceClass: string;
}

/**
 * Clean two-tier circular ring recognition:
 * - Levels 1–5: Normal ring color (Standard tier)
 * - Level 6 and above: Premium gradient ring & luminous halo (Premium tier)
 */
export function getLevelFrameStyle(level: number): LevelFrameStyle {
  const safeLevel = Math.max(1, Math.floor(level));

  if (safeLevel <= 5) {
    return {
      tierName: 'Standard',
      outerRingClass: 'bg-outline-variant/85 p-[2px]',
      haloClass: '',
      badgeTextClass: 'text-on-surface',
      badgeSurfaceClass: 'bg-surface-container-high',
    };
  }

  return {
    tierName: 'Premium',
    outerRingClass: 'bg-gradient-to-tr from-[#9a6704] via-[#fae088] to-[#005cb8] p-[2.5px]',
    haloClass: 'ring-2 ring-[#eab308]/35',
    badgeTextClass: 'text-[#734a00]',
    badgeSurfaceClass: 'bg-[#fef3c7]',
  };
}

export function getActivityLabel(activityType: PointActivityType): string {
  if (activityType === 'admin_adjustment') {
    return 'Admin Adjustment';
  }
  return DEFAULT_POINT_RULES[activityType]?.label ?? activityType;
}

/**
 * Reconciles a member's authoritative point balance directly from their ledger transactions.
 */
export function reconcilePointsFromLedger(
  memberId: string,
  transactions: readonly PointTransaction[]
): number {
  let points = 0;

  for (const tx of transactions) {
    if (tx.memberId !== memberId) continue;
    points += tx.points;
  }

  return Math.max(0, points);
}

/**
 * Counts how many active (non-reversed) daily awards a member has earned for a specific activity today.
 */
export function countDailyActiveAwards(params: {
  memberId: string;
  activityType: PointActivityType;
  transactions: readonly PointTransaction[];
  referenceIso: string;
}): number {
  const dayPrefix = params.referenceIso.slice(0, 10);
  const reversedIds = new Set(
    params.transactions
      .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
      .map((t) => t.reversedTransactionId!)
  );

  return params.transactions.filter(
    (t) =>
      t.memberId === params.memberId &&
      t.activityType === params.activityType &&
      t.transactionType === 'award' &&
      t.createdAtIso.slice(0, 10) === dayPrefix &&
      !reversedIds.has(t.id)
  ).length;
}

/**
 * Detects suspicious patterns, duplicate awards, RSVP flip-flopping, or ledger drift for admin review.
 */
export function detectSuspiciousPointTransactions(params: {
  transactions: readonly PointTransaction[];
  rsvpLogs: readonly EventRsvpLog[];
  users: readonly UserProfile[];
}): SuspiciousActivityFlag[] {
  const flags: SuspiciousActivityFlag[] = [];

  // 1. Check repeated RSVP toggles (>= 3 changes on same event by same member)
  const rsvpBuckets = new Map<string, EventRsvpLog[]>();
  for (const log of params.rsvpLogs) {
    const key = `${log.memberId}:${log.eventId}`;
    const list = rsvpBuckets.get(key) ?? [];
    list.push(log);
    rsvpBuckets.set(key, list);
  }
  for (const [key, logs] of rsvpBuckets.entries()) {
    if (logs.length >= 3) {
      const [memberId, eventId] = key.split(':');
      flags.push({
        id: `flag-rsvp-${memberId}-${eventId}`,
        memberId,
        severity: 'warning',
        reason: `${logs.length} RSVP changes recorded on "${logs[0].eventTitle}". Duplicate lifetime earnings blocked.`,
        relatedEventId: eventId,
        transactionIds: logs
          .map((l) => l.pointTransactionId)
          .filter((id): id is string => Boolean(id)),
        detectedAtIso: logs[0].createdAtIso,
      });
    }
  }

  // 2. Check duplicate un-reversed awards for identical (memberId, activityType, entityId)
  const reversedIds = new Set(
    params.transactions
      .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
      .map((t) => t.reversedTransactionId!)
  );
  const activeEntityAwards = new Map<string, PointTransaction[]>();
  for (const tx of params.transactions) {
    if (tx.transactionType !== 'award' || reversedIds.has(tx.id)) continue;
    const entityId = tx.relatedEventId ?? tx.relatedPostId;
    if (!entityId || tx.activityType === 'helpful_contribution' || tx.activityType === 'admin_adjustment') {
      continue;
    }
    const key = `${tx.memberId}:${tx.activityType}:${entityId}`;
    const arr = activeEntityAwards.get(key) ?? [];
    arr.push(tx);
    activeEntityAwards.set(key, arr);
  }
  for (const [key, list] of activeEntityAwards.entries()) {
    if (list.length > 1) {
      const [memberId] = key.split(':');
      flags.push({
        id: `flag-dup-${key}`,
        memberId,
        severity: 'warning',
        reason: `Multiple active awards (${list.length}) detected for the same item or event.`,
        transactionIds: list.map((t) => t.id),
        detectedAtIso: list[0].createdAtIso,
      });
    }
  }

  // 3. Check balance vs ledger consistency
  for (const member of params.users) {
    const expectedPoints = reconcilePointsFromLedger(member.uid, params.transactions);
    if (expectedPoints !== member.points) {
      flags.push({
        id: `flag-drift-${member.uid}`,
        memberId: member.uid,
        severity: 'warning',
        reason: `Balance drift detected for ${member.displayName} (Profile: ${member.points} vs Ledger: ${expectedPoints}).`,
        transactionIds: [],
        detectedAtIso: new Date().toISOString(),
      });
    }
  }

  // 4. Check rapid community post bursts (>= 4 posts on the same UTC date)
  const postDayBuckets = new Map<string, PointTransaction[]>();
  for (const tx of params.transactions) {
    if (tx.activityType !== 'community_post_create' || tx.transactionType !== 'award') continue;
    const key = `${tx.memberId}:${tx.createdAtIso.slice(0, 10)}`;
    const arr = postDayBuckets.get(key) ?? [];
    arr.push(tx);
    postDayBuckets.set(key, arr);
  }
  for (const [key, list] of postDayBuckets.entries()) {
    if (list.length >= 4) {
      const [memberId, day] = key.split(':');
      flags.push({
        id: `flag-burst-${memberId}-${day}`,
        memberId,
        severity: 'info',
        reason: `${list.length} community post point awards recorded on ${day}.`,
        transactionIds: list.map((t) => t.id),
        detectedAtIso: list[0].createdAtIso,
      });
    }
  }

  return flags;
}
