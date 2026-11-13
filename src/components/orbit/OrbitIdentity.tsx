import type { ReactNode } from 'react';
import type { MemoryPost } from '../../domain/models';
import { districtLabel } from '../../domain/logic/place';
import { Avatar } from '../common/Avatar';

export function OrbitIdentity({
  memories,
  name,
  photoURL,
  initials,
  placeLabel,
  toolbar,
}: {
  memories: MemoryPost[];
  name: string;
  photoURL?: string;
  initials: string;
  placeLabel?: string;
  toolbar?: ReactNode;
}) {
  const names = new Set<string>();
  for (const memory of memories) {
    if (!memory.location) continue;
    names.add(districtLabel(memory.location).toLowerCase());
  }
  const districtCount = names.size;
  const years = memories
    .map((memory) => (memory.eventDateIso ? new Date(memory.eventDateIso).getFullYear() : null))
    .filter((year): year is number => Boolean(year));
  const orbitYear = years.length ? Math.min(...years) : null;
  const subtitle =
    placeLabel || (districtCount ? `${districtCount} ${districtCount === 1 ? 'district' : 'districts'}` : 'No place yet');

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/40 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar src={photoURL} alt={name} initials={initials} size="lg" />
            <span className="absolute -right-0.5 -bottom-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold tracking-tight text-on-surface">{name || 'My Life'}</h2>
            <p className="truncate text-[13px] text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        {orbitYear ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-semibold tracking-wide text-on-primary-fixed">
            <span className="text-primary">∞</span>
            Orbit ’{String(orbitYear).slice(2)}
          </span>
        ) : null}
      </div>
      {toolbar ? <div className="mt-4">{toolbar}</div> : null}
    </div>
  );
}
