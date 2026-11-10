import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { AtSign, Send } from 'lucide-react';
import type { UserProfile } from '../../domain/models';
import {
  detectActiveMentionQuery,
  extractMentionedUsers,
  filterMentionCandidates,
  insertMentionIntoText,
  type ActiveMentionQuery,
} from '../../domain/logic/mentions';
import { Avatar } from './Avatar';

interface MentionSuggestionsListProps {
  candidates: UserProfile[];
  activeIndex: number;
  preferredIds?: ReadonlySet<string>;
  preferredBadgeLabel?: string;
  onSelect: (member: UserProfile) => void;
}

function MentionSuggestionsList({
  candidates,
  activeIndex,
  preferredIds,
  preferredBadgeLabel = 'In circle',
  onSelect,
}: MentionSuggestionsListProps) {
  if (candidates.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention neighbor suggestions"
      className="bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant/25 overflow-hidden divide-y divide-outline-variant/15"
    >
      <div className="px-3 py-1.5 bg-surface-container-low flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
        <span>Mention a neighbor</span>
        <span>Tap or press Enter</span>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {candidates.map((member, index) => {
          const isHighlighted = index === activeIndex;
          const isPreferred = preferredIds?.has(member.uid);
          return (
            <button
              key={member.uid}
              type="button"
              role="option"
              aria-selected={isHighlighted}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(member)}
              className={`w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2.5 text-left transition-colors ${
                isHighlighted
                  ? 'bg-primary-fixed/50 text-on-surface'
                  : 'hover:bg-surface-container-low text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={member.avatarUrl}
                  alt={member.displayName}
                  initials={member.initials}
                  size="xs"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface truncate">
                    {member.displayName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">{member.unitLabel}</p>
                </div>
              </div>
              {isPreferred && (
                <span className="text-[11px] font-medium text-primary whitespace-nowrap shrink-0">
                  {preferredBadgeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MentionTextAreaProps {
  value: string;
  onChange: (nextValue: string) => void;
  members: readonly UserProfile[];
  currentUserId: string;
  preferredIds?: ReadonlySet<string>;
  preferredBadgeLabel?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
  helperNotice?: string;
}

export function MentionTextArea({
  value,
  onChange,
  members,
  currentUserId,
  preferredIds,
  preferredBadgeLabel,
  rows = 2,
  placeholder,
  className = '',
  helperNotice,
}: MentionTextAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorIndex, setCursorIndex] = useState(value.length);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeQuery: ActiveMentionQuery | null = useMemo(
    () => (dismissed ? null : detectActiveMentionQuery(value, cursorIndex)),
    [value, cursorIndex, dismissed]
  );

  const candidates = useMemo(() => {
    if (!activeQuery) return [];
    return filterMentionCandidates({
      members,
      currentUserId,
      query: activeQuery.query,
      preferredIds,
      maxResults: 6,
    });
  }, [activeQuery, members, currentUserId, preferredIds]);

  const { mentionedUsers } = useMemo(
    () => extractMentionedUsers(value, members),
    [value, members]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [activeQuery?.query, activeQuery?.startIndex]);

  const applySelection = (member: UserProfile) => {
    const { nextText, nextCursorIndex } = insertMentionIntoText({
      text: value,
      mentionQuery: activeQuery,
      member,
      cursorIndex,
    });
    setDismissed(false);
    onChange(nextText);
    setCursorIndex(nextCursorIndex);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCursorIndex, nextCursorIndex);
      }
    });
  };

  const triggerMentionAtCursor = () => {
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? value.length;
    if (activeQuery && !dismissed) {
      setDismissed(true);
      el?.focus();
      return;
    }
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needsSpace = before.length > 0 && !/[\s([{"']$/.test(before);
    const prefix = `${before}${needsSpace ? ' ' : ''}@`;
    const nextText = `${prefix}${after}`;
    const nextPos = prefix.length;
    setDismissed(false);
    onChange(nextText);
    setCursorIndex(nextPos);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (target) {
        target.focus();
        target.setSelectionRange(nextPos, nextPos);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeQuery || candidates.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % candidates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const target = candidates[activeIndex] ?? candidates[0];
      if (target) applySelection(target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDismissed(true);
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      setDismissed(true);
    }
  };

  return (
    <div ref={containerRef} onBlur={handleBlur} className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(e) => {
          setDismissed(false);
          setCursorIndex(e.target.selectionStart ?? e.target.value.length);
          onChange(e.target.value);
        }}
        onClick={(e) => {
          setDismissed(false);
          setCursorIndex(e.currentTarget.selectionStart ?? value.length);
        }}
        onKeyUp={(e) => {
          setCursorIndex(e.currentTarget.selectionStart ?? value.length);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={triggerMentionAtCursor}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface-variant hover:text-primary inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <AtSign className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Mention neighbor</span>
          </button>

          {mentionedUsers.length > 0 && (
            <span className="text-xs text-primary font-medium truncate">
              Mentioning: {mentionedUsers.map((u) => u.displayName).join(', ')}
            </span>
          )}
        </div>

        {helperNotice && mentionedUsers.length > 0 && (
          <span className="text-[11px] text-on-surface-variant">{helperNotice}</span>
        )}
      </div>

      {activeQuery && candidates.length > 0 && (
        <MentionSuggestionsList
          candidates={candidates}
          activeIndex={activeIndex}
          preferredIds={preferredIds}
          preferredBadgeLabel={preferredBadgeLabel}
          onSelect={applySelection}
        />
      )}
    </div>
  );
}

interface MentionInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
  members: readonly UserProfile[];
  currentUserId: string;
  preferredIds?: ReadonlySet<string>;
  preferredBadgeLabel?: string;
  placeholder?: string;
  sendAriaLabel?: string;
  containerClassName?: string;
  inputClassName?: string;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  currentUserId,
  preferredIds,
  preferredBadgeLabel,
  placeholder = 'Write a reply (@ to mention)...',
  sendAriaLabel = 'Send comment',
  containerClassName = 'flex-1 flex items-center bg-surface-container-lowest rounded-xl px-2.5 py-1.5 shadow-xs gap-1.5',
  inputClassName = 'w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none',
}: MentionInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorIndex, setCursorIndex] = useState(value.length);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeQuery: ActiveMentionQuery | null = useMemo(
    () => (dismissed ? null : detectActiveMentionQuery(value, cursorIndex)),
    [value, cursorIndex, dismissed]
  );

  const candidates = useMemo(() => {
    if (!activeQuery) return [];
    return filterMentionCandidates({
      members,
      currentUserId,
      query: activeQuery.query,
      preferredIds,
      maxResults: 5,
    });
  }, [activeQuery, members, currentUserId, preferredIds]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeQuery?.query, activeQuery?.startIndex]);

  const applySelection = (member: UserProfile) => {
    const { nextText, nextCursorIndex } = insertMentionIntoText({
      text: value,
      mentionQuery: activeQuery,
      member,
      cursorIndex,
    });
    setDismissed(false);
    onChange(nextText);
    setCursorIndex(nextCursorIndex);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCursorIndex, nextCursorIndex);
      }
    });
  };

  const triggerMentionAtCursor = () => {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? value.length;
    if (activeQuery && !dismissed) {
      setDismissed(true);
      el?.focus();
      return;
    }
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needsSpace = before.length > 0 && !/[\s([{"']$/.test(before);
    const prefix = `${before}${needsSpace ? ' ' : ''}@`;
    const nextText = `${prefix}${after}`;
    const nextPos = prefix.length;
    setDismissed(false);
    onChange(nextText);
    setCursorIndex(nextPos);
    requestAnimationFrame(() => {
      const target = inputRef.current;
      if (target) {
        target.focus();
        target.setSelectionRange(nextPos, nextPos);
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (activeQuery && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = candidates[activeIndex] ?? candidates[0];
        if (target) applySelection(target);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissed(true);
        return;
      }
    }

    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      setDismissed(true);
    }
  };

  return (
    <div ref={containerRef} onBlur={handleBlur} className="flex-1 flex flex-col gap-1.5 min-w-0">
      {activeQuery && candidates.length > 0 && (
        <MentionSuggestionsList
          candidates={candidates}
          activeIndex={activeIndex}
          preferredIds={preferredIds}
          preferredBadgeLabel={preferredBadgeLabel}
          onSelect={applySelection}
        />
      )}

      <div className={containerClassName}>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={triggerMentionAtCursor}
          aria-label="Mention a neighbor"
          title="Mention a neighbor (@)"
          className="min-w-[44px] min-h-[44px] -my-1 -ml-1 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary-fixed/40 transition-colors shrink-0"
        >
          <AtSign className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setDismissed(false);
            setCursorIndex(e.target.selectionStart ?? e.target.value.length);
            onChange(e.target.value);
          }}
          onClick={(e) => {
            setDismissed(false);
            setCursorIndex(e.currentTarget.selectionStart ?? value.length);
          }}
          onKeyUp={(e) => {
            setCursorIndex(e.currentTarget.selectionStart ?? value.length);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
        />

        <button
          type="button"
          aria-label={sendAriaLabel}
          onClick={() => {
            if (!value.trim()) return;
            setDismissed(true);
            onSubmit();
          }}
          className="min-w-[44px] min-h-[44px] -my-1 -mr-1 flex items-center justify-center text-primary hover:bg-primary-fixed/40 rounded-xl transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
