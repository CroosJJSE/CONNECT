import { useState, type ReactNode } from 'react';
import type { MemoryComment, MemoryPost } from '../../domain/models';
import { mimeForKind } from '../../domain/logic/memoryText';
import { FormattedMemoryText } from './FormattedMemoryText';
import { MediaCarousel } from './MediaCarousel';

export function MemoryCard({
  memory,
  comments,
  onEdit,
  onDelete,
  onOpen,
  onComment,
  share,
}: {
  memory: MemoryPost;
  comments: MemoryComment[];
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onComment?: (body: string) => void;
  share?: ReactNode;
}) {
  const [openComments, setOpenComments] = useState(false);
  const [draft, setDraft] = useState('');
  const when = memory.eventDateIso
    ? new Date(memory.eventDateIso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const slides = memory.media.filter((file) => file.kind !== 'audio');

  return (
    <article className="relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[12px] text-on-primary-fixed">
          ✦ {[memory.status === 'draft' ? 'Draft' : '', memory.mood].filter(Boolean).join(' / ') || 'Memory'}
        </span>
        <span className="text-[12px] text-on-surface-variant">{when}</span>
      </div>
      {memory.location || memory.chapter || memory.weather ? (
        <p className="mt-3 flex flex-wrap gap-2">
          {memory.location ? (
            <span className="rounded-lg bg-primary-fixed/60 px-2.5 py-1 text-[12px] text-primary">{memory.location.name}</span>
          ) : null}
          {memory.chapter ? (
            <span className="rounded-lg bg-surface-container px-2.5 py-1 text-[12px] text-on-surface-variant">
              {memory.chapter}
            </span>
          ) : null}
          {memory.weather ? (
            <span className="rounded-lg bg-surface-container px-2.5 py-1 text-[12px] text-on-surface-variant">
              {memory.weather.stringRepresentation}
            </span>
          ) : null}
        </p>
      ) : null}
      {slides.length ? (
        <div className="mt-3">
          <MediaCarousel slides={slides} expandImages />
        </div>
      ) : null}
      <h2 className="mt-3 text-[17px] font-medium tracking-tight text-on-surface">{memory.title}</h2>
      {memory.description ? (
        <FormattedMemoryText
          text={memory.description}
          className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-on-surface-variant"
        />
      ) : null}
      {memory.audio.map((file) => (
        <div key={file.url} className="mt-3 flex flex-col gap-2">
          <div className="rounded-xl bg-surface-container p-3">
            <audio src={file.url} controls className="w-full" />
            <span className="sr-only">{mimeForKind(file.kind)}</span>
          </div>
          {file.transcript ? (
            <p className="rounded-lg bg-surface-container-low px-3 py-2 text-[13px] leading-relaxed text-on-surface italic">
              “{file.transcript}”
            </p>
          ) : null}
        </div>
      ))}
      {memory.privateText ? (
        <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-[13px] leading-relaxed text-on-surface-variant">
          <span className="text-primary font-medium">Private note. </span>
          {memory.privateText}
        </p>
      ) : null}
      {share}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" onClick={onOpen} className="px-2 py-1 text-[13px] font-medium text-primary">
          View detail
        </button>
        {memory.status === 'published' && onComment ? (
          <button type="button" onClick={() => setOpenComments((open) => !open)} className="px-2 py-1 text-[13px] text-on-surface-variant">
            Comments{comments.length ? ` (${comments.length})` : ''}
          </button>
        ) : null}
        <button type="button" onClick={onEdit} className="ml-auto px-2 py-1 text-[13px] text-on-surface">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="px-2 py-1 text-[13px] text-error">
          Delete
        </button>
      </div>
      {openComments && onComment ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
          {comments.map((comment) => (
            <p key={comment.id} className="text-[13px] text-on-surface">
              <span className="font-semibold">{comment.authorName}</span>{' '}
              <span className="text-on-surface-variant">{comment.body}</span>
            </p>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onComment(draft.trim());
              setDraft('');
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment"
              className="h-10 flex-1 rounded-xl bg-surface-container px-3 text-[13px] outline-none"
            />
            <button type="submit" className="h-10 rounded-xl bg-primary px-3 text-[13px] text-on-primary">
              Send
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
