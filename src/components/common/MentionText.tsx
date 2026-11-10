import { Fragment } from 'react';
import type { UserProfile } from '../../domain/models';
import { parseTextWithMentions } from '../../domain/logic/mentions';

interface MentionTextProps {
  text: string;
  members: readonly UserProfile[];
  className?: string;
}

export function MentionText({ text, members, className }: MentionTextProps) {
  const segments = parseTextWithMentions(text, members);

  return (
    <span className={className}>
      {segments.map((seg, index) => {
        if (seg.type === 'mention') {
          return (
            <span
              key={`${seg.user?.uid ?? 'mention'}-${index}`}
              title={seg.user ? `${seg.user.displayName} · ${seg.user.unitLabel}` : undefined}
              className="font-semibold text-primary bg-primary-fixed/45 px-1 rounded"
            >
              {seg.value}
            </span>
          );
        }
        return <Fragment key={`text-${index}`}>{seg.value}</Fragment>;
      })}
    </span>
  );
}
