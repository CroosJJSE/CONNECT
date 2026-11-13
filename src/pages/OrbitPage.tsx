import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LifeMap } from '../components/orbit/LifeMap';
import { MemoryCard } from '../components/orbit/MemoryCard';
import { MemoryComposer } from '../components/orbit/MemoryComposer';
import { MemoryDetail } from '../components/orbit/MemoryDetail';
import { OrbitIdentity } from '../components/orbit/OrbitIdentity';
import type { MemoryPost } from '../domain/models';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function OrbitPage({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const { memories, memoryComments, deleteMemory, addMemoryComment } = useConnectData();
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [view, setView] = useState<'timeline' | 'map' | 'draft'>('timeline');
  const [editing, setEditing] = useState<MemoryPost | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemoryPost | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const posts = useMemo(
    () =>
      memories.filter((memory) => {
        if (!q) return true;
        return (
          memory.title.toLowerCase().includes(q) ||
          memory.description.toLowerCase().includes(q) ||
          memory.chapter.toLowerCase().includes(q) ||
          (memory.location?.name.toLowerCase().includes(q) ?? false)
        );
      }),
    [memories, q]
  );

  const published = posts.filter((post) => post.status === 'published');
  const years: number[] = [
    ...new Set(
      published
        .map((post) => (post.eventDateIso ? new Date(post.eventDateIso).getFullYear() : null))
        .filter((value): value is number => Boolean(value))
    ),
  ].sort((a, b) => b - a);
  const selectedYear = year && years.includes(year) ? year : years[0] ?? null;
  const months: number[] = [
    ...new Set(
      posts
        .filter(
          (post) =>
            post.status === 'published' &&
            post.eventDateIso &&
            new Date(post.eventDateIso).getFullYear() === selectedYear
        )
        .map((post) => (post.eventDateIso ? new Date(post.eventDateIso).getMonth() : undefined))
        .filter((value): value is number => value !== undefined)
    ),
  ].sort((a, b) => b - a);
  const selectedMonth = month !== null && months.includes(month) ? month : null;
  const visible = published
    .filter((post) => post.eventDateIso && new Date(post.eventDateIso).getFullYear() === selectedYear)
    .filter(
      (post) => selectedMonth === null || (post.eventDateIso && new Date(post.eventDateIso).getMonth() === selectedMonth)
    )
    .sort((a, b) => (b.eventDateIso ?? '').localeCompare(a.eventDateIso ?? ''));
  const drafts = posts.filter((post) => post.status === 'draft');
  const opened = openId ? memories.find((memory) => memory.id === openId) ?? null : null;

  if (!user) return null;

  const toolbar = <ViewSwitch view={view} onChange={setView} />;

  if (opened) {
    return (
      <>
        <MemoryDetail
          memory={opened}
          comments={memoryComments.filter((comment) => comment.memoryId === opened.id)}
          onBack={() => setOpenId(null)}
          onEdit={() => {
            setEditing(opened);
            setOpenId(null);
            setView('draft');
          }}
          onDelete={() => setRemoveTarget(opened)}
          onComment={(body) => void addMemoryComment(opened.id, body)}
        />
        <ConfirmDialog
          open={Boolean(removeTarget)}
          title="Delete this memory?"
          description={
            removeTarget?.title ? `“${removeTarget.title}” leaves your archive.` : 'This memory leaves your archive.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (!removeTarget) return;
            void deleteMemory(removeTarget.id);
            setRemoveTarget(null);
            setOpenId(null);
          }}
          onCancel={() => setRemoveTarget(null)}
        />
      </>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {view === 'map' ? null : (
        <OrbitIdentity
          memories={published}
          name={user.displayName || 'My Life'}
          photoURL={user.avatarUrl}
          initials={user.initials}
          toolbar={toolbar}
        />
      )}

      {view === 'map' ? (
        <LifeMap
          memories={published}
          name={user.displayName || 'My Life'}
          photoURL={user.avatarUrl}
          initials={user.initials}
          toolbar={toolbar}
          onOpen={setOpenId}
        />
      ) : view === 'draft' ? (
        <>
          <MemoryComposer
            key={editing?.id ?? 'new'}
            user={user}
            memory={editing}
            onSaved={() => {
              setEditing(null);
              setView('timeline');
            }}
            onCancel={() => {
              setEditing(null);
              setView('timeline');
            }}
          />
          {drafts.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              comments={[]}
              onOpen={() => setOpenId(memory.id)}
              onEdit={() => {
                setEditing(memory);
                setView('draft');
              }}
              onDelete={() => setRemoveTarget(memory)}
            />
          ))}
        </>
      ) : (
        <>
          {years.length ? (
            <div className="flex justify-end">
              <div className="flex rounded-full bg-surface-container p-1">
                {years.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setYear(item);
                      setMonth(null);
                    }}
                    className={`rounded-full px-3 py-1.5 text-[13px] ${
                      item === selectedYear ? 'bg-surface-container-lowest font-semibold text-primary shadow-xs' : 'text-on-surface-variant'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {months.length > 1 ? (
            <div className="flex gap-1">
              {months.map((item) => (
                <button key={item} type="button" onClick={() => setMonth(selectedMonth === item ? null : item)} className="flex flex-1 flex-col items-center gap-1">
                  <span className={`text-[12px] ${selectedMonth === item ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {monthNames[item]}
                  </span>
                  <span className={`h-3 w-1 rounded-full ${selectedMonth === item ? 'bg-primary' : 'bg-outline-variant'}`} />
                </button>
              ))}
            </div>
          ) : null}
          {visible.length === 0 ? (
            <p className="px-1 text-[13px] text-on-surface-variant">Nothing committed yet. Open Draft to write the first one.</p>
          ) : null}
          <div className="flex flex-col gap-4">
            {visible.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                comments={memoryComments.filter((comment) => comment.memoryId === memory.id)}
                onOpen={() => setOpenId(memory.id)}
                onEdit={() => {
                  setEditing(memory);
                  setView('draft');
                }}
                onDelete={() => setRemoveTarget(memory)}
                onComment={(body) => void addMemoryComment(memory.id, body)}
                share={<ShareButton memory={memory} />}
              />
            ))}
          </div>
          {visible.length ? (
            <p className="py-2 text-center text-[11px] tracking-[0.16em] text-on-surface-variant uppercase">
              End of recorded entries{selectedYear ? ` for ${selectedYear}` : ''}
            </p>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Delete this memory?"
        description={
          removeTarget?.title ? `“${removeTarget.title}” leaves your archive.` : 'This memory leaves your archive.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!removeTarget) return;
          void deleteMemory(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: 'timeline' | 'map' | 'draft';
  onChange: (next: 'timeline' | 'map' | 'draft') => void;
}) {
  return (
    <div className="flex rounded-full bg-surface-container p-1">
      <ViewTab active={view === 'timeline'} onClick={() => onChange('timeline')}>
        Timeline
      </ViewTab>
      <ViewTab active={view === 'map'} onClick={() => onChange('map')}>
        Map view
      </ViewTab>
      <ViewTab active={view === 'draft'} onClick={() => onChange('draft')}>
        Draft
      </ViewTab>
    </div>
  );
}

function ViewTab({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-1.5 text-[13px] ${
        active ? 'bg-surface-container-lowest font-semibold text-primary shadow-xs' : 'text-on-surface-variant'
      }`}
    >
      {children}
    </button>
  );
}

function ShareButton({ memory }: { memory: MemoryPost }) {
  return (
    <button
      type="button"
      onClick={() => {
        const text = memory.title;
        if (navigator.share) void navigator.share({ title: memory.title, text });
        else void navigator.clipboard.writeText(text);
      }}
      className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-primary"
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </button>
  );
}
