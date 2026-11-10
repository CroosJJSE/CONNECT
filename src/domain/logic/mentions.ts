import type { UserProfile } from '../models/user';

export interface ActiveMentionQuery {
  query: string;
  startIndex: number;
  endIndex: number;
}

export interface TextMentionSegment {
  type: 'text' | 'mention';
  value: string;
  user?: UserProfile;
}

const PRECEDING_BOUNDARY_REGEX = /[\s([{"']/;
const WORD_CHAR_REGEX = /[a-zA-Z0-9_]/;

/**
 * Detects an active `@query` right before the text cursor without browser dependencies.
 * Designed to work identically in React Web DOM inputs and React Native TextInput.
 */
export function detectActiveMentionQuery(
  text: string,
  cursorIndex: number
): ActiveMentionQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorIndex, text.length));
  const beforeCursor = text.slice(0, safeCursor);

  for (let i = beforeCursor.length - 1; i >= 0; i -= 1) {
    const ch = beforeCursor[i];
    if (ch === '\n' || ch === '\r') {
      return null;
    }
    if (ch === '@') {
      if (i > 0 && !PRECEDING_BOUNDARY_REGEX.test(beforeCursor[i - 1])) {
        return null;
      }
      const query = beforeCursor.slice(i + 1);
      // Avoid trapping normal prose with many spaces after '@'
      if (query.startsWith(' ') || query.length > 36) {
        return null;
      }
      const spaceCount = (query.match(/\s/g) ?? []).length;
      if (spaceCount > 2) {
        return null;
      }
      return {
        query,
        startIndex: i,
        endIndex: safeCursor,
      };
    }
  }

  return null;
}

/**
 * Filters and ranks community members for mention autocomplete.
 * Prioritizes members in the active audience (Orbit circle, selected communities, event attendees).
 */
export function filterMentionCandidates(params: {
  members: readonly UserProfile[];
  currentUserId: string;
  query: string;
  preferredIds?: ReadonlySet<string>;
  maxResults?: number;
}): UserProfile[] {
  const { members, currentUserId, query, preferredIds, maxResults = 6 } = params;
  const q = query.trim().toLowerCase();

  const matches = members.filter((member) => {
    if (member.uid === currentUserId) return false;
    if (!q) return true;
    return (
      member.displayName.toLowerCase().includes(q) ||
      member.unitLabel.toLowerCase().includes(q) ||
      member.clusterName.toLowerCase().includes(q)
    );
  });

  matches.sort((a, b) => {
    const aPref = preferredIds?.has(a.uid) ? 0 : 1;
    const bPref = preferredIds?.has(b.uid) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;

    if (q) {
      const aStarts = a.displayName.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.displayName.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
    }

    return a.displayName.localeCompare(b.displayName);
  });

  return matches.slice(0, maxResults);
}

/**
 * Replaces the active `@query` (or appends at cursor) with `@DisplayName `.
 */
export function insertMentionIntoText(params: {
  text: string;
  mentionQuery: ActiveMentionQuery | null;
  member: UserProfile;
  cursorIndex?: number;
}): { nextText: string; nextCursorIndex: number } {
  const { text, mentionQuery, member, cursorIndex = text.length } = params;
  const token = `@${member.displayName} `;

  if (mentionQuery) {
    const prefix = text.slice(0, mentionQuery.startIndex);
    const suffix = text.slice(mentionQuery.endIndex);
    const cleanSuffix = suffix.startsWith(' ') ? suffix.slice(1) : suffix;
    const nextText = `${prefix}${token}${cleanSuffix}`;
    return {
      nextText,
      nextCursorIndex: prefix.length + token.length,
    };
  }

  const safeCursor = Math.max(0, Math.min(cursorIndex, text.length));
  const before = text.slice(0, safeCursor);
  const after = text.slice(safeCursor);
  const needsLeadingSpace = before.length > 0 && !PRECEDING_BOUNDARY_REGEX.test(before[before.length - 1]);
  const inserted = `${needsLeadingSpace ? ' ' : ''}${token}`;
  const cleanAfter = after.startsWith(' ') ? after.slice(1) : after;
  const nextText = `${before}${inserted}${cleanAfter}`;
  return {
    nextText,
    nextCursorIndex: before.length + inserted.length,
  };
}

/**
 * Splits text into ordered plain-text and matched-user `@mention` segments.
 * Uses longest-first name matching so names with spaces/initials match cleanly.
 */
export function parseTextWithMentions(
  text: string,
  members: readonly UserProfile[]
): TextMentionSegment[] {
  if (!text) return [];
  if (members.length === 0) {
    return [{ type: 'text', value: text }];
  }

  const sortedMembers = [...members].sort(
    (a, b) => b.displayName.length - a.displayName.length
  );

  const segments: TextMentionSegment[] = [];
  let cursor = 0;
  let plainStart = 0;

  while (cursor < text.length) {
    if (text[cursor] === '@') {
      const validLeadingBoundary =
        cursor === 0 || PRECEDING_BOUNDARY_REGEX.test(text[cursor - 1]);

      if (validLeadingBoundary) {
        const matched = sortedMembers.find((member) => {
          const candidate = `@${member.displayName}`;
          if (
            text
              .slice(cursor, cursor + candidate.length)
              .toLowerCase() !== candidate.toLowerCase()
          ) {
            return false;
          }
          const nextChar = text[cursor + candidate.length];
          return nextChar === undefined || !WORD_CHAR_REGEX.test(nextChar);
        });

        if (matched) {
          if (cursor > plainStart) {
            segments.push({ type: 'text', value: text.slice(plainStart, cursor) });
          }
          const matchedToken = text.slice(cursor, cursor + 1 + matched.displayName.length);
          segments.push({
            type: 'mention',
            value: matchedToken,
            user: matched,
          });
          cursor += matchedToken.length;
          plainStart = cursor;
          continue;
        }
      }
    }
    cursor += 1;
  }

  if (plainStart < text.length) {
    segments.push({ type: 'text', value: text.slice(plainStart) });
  }

  return segments;
}

/**
 * Extracts unique user IDs and display names mentioned inside a post or comment.
 */
export function extractMentionedUsers(
  text: string,
  members: readonly UserProfile[]
): { mentionedUserIds: string[]; mentionedUsers: UserProfile[] } {
  const segments = parseTextWithMentions(text, members);
  const seen = new Set<string>();
  const mentionedUsers: UserProfile[] = [];

  for (const seg of segments) {
    if (seg.type === 'mention' && seg.user && !seen.has(seg.user.uid)) {
      seen.add(seg.user.uid);
      mentionedUsers.push(seg.user);
    }
  }

  return {
    mentionedUserIds: mentionedUsers.map((u) => u.uid),
    mentionedUsers,
  };
}
