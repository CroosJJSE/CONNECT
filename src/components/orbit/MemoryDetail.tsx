import { useState } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import type { MemoryComment, MemoryPost } from '../../domain/models';
import { mimeForKind } from '../../domain/logic/memoryText';
import { FormattedMemoryText } from './FormattedMemoryText';
import { MediaCarousel } from './MediaCarousel';

export function MemoryDetail({
  memory,
  comments,
  onBack,
  onEdit,
  onDelete,
  onComment,
}: {
  memory: MemoryPost;
  comments: MemoryComment[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onComment: (body: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const when = memory.eventDateIso
    ? new Date(memory.eventDateIso).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const slides = memory.media.filter((file) => file.kind !== 'audio');

  async function share() {
    const text = `${memory.title}${when ? ` · ${when}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: memory.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore cancelled share */
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full bg-surface-container text-on-surface">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[16px] font-semibold text-on-surface">Memory</h2>
      </div>
      <article className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-xs">
        <p className="text-[12px] text-on-surface-variant">{when}</p>
        {slides.length ? (
          <div className="mt-3">
            <MediaCarousel slides={slides} expandImages />
          </div>
        ) : null}
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-on-surface">{memory.title}</h1>
        {memory.location ? <p className="mt-1 text-[13px] text-primary">{memory.location.name}</p> : null}
        {memory.description ? (
          <FormattedMemoryText text={memory.description} className="mt-3 text-[15px] leading-relaxed text-on-surface-variant" />
        ) : null}
        {memory.audio.map((file) => (
          <div key={file.url} className="mt-3 rounded-xl bg-surface-container p-3">
            <audio src={file.url} controls className="w-full" />
            <span className="sr-only">{mimeForKind(file.kind)}</span>
          </div>
        ))}
        {memory.privateText ? (
          <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-[13px] text-on-surface-variant">
            <span className="text-primary font-medium">Private note. </span>
            {memory.privateText}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void share()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-surface-container px-3 text-[13px]">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button type="button" onClick={onEdit} className="h-10 rounded-xl px-3 text-[13px] text-on-surface">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="h-10 rounded-xl px-3 text-[13px] text-error">
            Delete
          </button>
        </div>
      </article>
      {memory.status === 'published' ? (
        <div id="comments" className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
          <h3 className="text-[14px] font-semibold text-on-surface">Comments</h3>
          <div className="mt-3 flex flex-col gap-2">
            {comments.map((comment) => (
              <p key={comment.id} className="text-[13px] text-on-surface">
                <span className="font-semibold">{comment.authorName}</span>{' '}
                <span className="text-on-surface-variant">{comment.body}</span>
              </p>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
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
    </section>
  );
}
