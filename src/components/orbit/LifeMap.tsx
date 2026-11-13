import { useMemo, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react';
import type { MemoryPost } from '../../domain/models';
import { districtLabel } from '../../domain/logic/place';
import { OrbitIdentity } from './OrbitIdentity';

function project(lng: number, lat: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return { x, y };
}

export function LifeMap({
  memories,
  name,
  photoURL,
  initials,
  toolbar,
  onOpen,
  emptyLabel = 'Search a place, or add a photo with GPS, and the memory will pin here.',
}: {
  memories: MemoryPost[];
  name: string;
  photoURL?: string;
  initials: string;
  toolbar?: ReactNode;
  onOpen: (id: string) => void;
  emptyLabel?: string;
}) {
  const placed = useMemo(
    () =>
      memories.filter(
        (memory) => memory.location && Number.isFinite(memory.location.lat) && Number.isFinite(memory.location.lng)
      ),
    [memories]
  );
  const [filter, setFilter] = useState('all');
  const [zoom, setZoom] = useState(11);
  const [center, setCenter] = useState(() => {
    const first = placed[0]?.location;
    return first ? { lng: first.lng, lat: first.lat } : { lng: 79.86, lat: 6.89 };
  });
  const drag = useRef<{ x: number; y: number; lng: number; lat: number } | null>(null);

  const places = useMemo(() => {
    const names = new Map<string, { label: string; count: number }>();
    for (const memory of placed) {
      const label = districtLabel(memory.location);
      const key = label.toLowerCase();
      const current = names.get(key);
      names.set(key, { label, count: (current?.count ?? 0) + 1 });
    }
    return [...names.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [placed]);

  const visible = filter === 'all' ? placed : placed.filter((memory) => districtLabel(memory.location).toLowerCase() === filter);

  function fit(next: MemoryPost[]) {
    const located = next.flatMap((memory) =>
      memory.location ? [[memory.location.lng, memory.location.lat] as [number, number]] : []
    );
    if (!located.length) return;
    if (located.length === 1) {
      setCenter({ lng: located[0][0], lat: located[0][1] });
      setZoom(12);
      return;
    }
    const lngs = located.map((point) => point[0]);
    const lats = located.map((point) => point[1]);
    setCenter({
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    });
    setZoom(8);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, lng: center.lng, lat: center.lat };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    const world = 256 * 2 ** zoom;
    setCenter({
      lng: drag.current.lng - (dx / world) * 360,
      lat: Math.max(-85, Math.min(85, drag.current.lat + (dy / world) * 180)),
    });
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((value) => Math.max(2, Math.min(16, value + (event.deltaY > 0 ? -0.4 : 0.4))));
  }

  const z = Math.round(zoom);
  const origin = project(center.lng, center.lat, z);
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const tileX = Math.floor(origin.x) + dx;
      const tileY = Math.floor(origin.y) + dy;
      const max = 2 ** z;
      if (tileY < 0 || tileY >= max) continue;
      tiles.push({
        x: ((tileX % max) + max) % max,
        y: tileY,
        left: (tileX - origin.x) * 256,
        top: (tileY - origin.y) * 256,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <OrbitIdentity
        memories={memories}
        name={name}
        photoURL={photoURL}
        initials={initials}
        placeLabel={filter === 'all' ? undefined : places.find((place) => place.key === filter)?.label || 'District'}
        toolbar={toolbar}
      />

      <div className="relative h-[380px] overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container">
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          onWheel={onWheel}
        >
          <div className="absolute inset-0 overflow-hidden">
            {tiles.map((tile) => (
              <img
                key={`${z}-${tile.x}-${tile.y}`}
                alt=""
                draggable={false}
                className="absolute h-[256px] w-[256px] max-w-none select-none"
                style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }}
                src={`https://basemaps.cartocdn.com/light_all/${z}/${tile.x}/${tile.y}.png`}
              />
            ))}
          </div>
          {visible.map((memory) => {
            if (!memory.location) return null;
            const point = project(memory.location.lng, memory.location.lat, z);
            const left = (point.x - origin.x) * 256;
            const top = (point.y - origin.y) * 256;
            const cover = memory.media.find((file) => file.kind === 'image')?.url;
            return (
              <button
                key={memory.id}
                type="button"
                onClick={() => onOpen(memory.id)}
                className="absolute z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-primary bg-surface-container-lowest text-[12px] font-semibold text-primary shadow-[0_0_16px_rgba(0,92,184,0.35)]"
                style={{ left: `calc(50% + ${left}px)`, top: `calc(50% + ${top}px)` }}
              >
                {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : '✦'}
              </button>
            );
          })}
        </div>
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl bg-surface-container-lowest/90 p-1 shadow-sm">
          <button type="button" aria-label="Zoom in" className="grid h-8 w-8 place-items-center text-lg" onClick={() => setZoom((v) => Math.min(16, v + 1))}>
            +
          </button>
          <span className="mx-auto h-px w-4 bg-outline-variant" />
          <button type="button" aria-label="Zoom out" className="grid h-8 w-8 place-items-center text-lg" onClick={() => setZoom((v) => Math.max(2, v - 1))}>
            −
          </button>
          <span className="mx-auto h-px w-4 bg-outline-variant" />
          <button
            type="button"
            aria-label="Recenter"
            className="grid h-8 w-8 place-items-center text-primary"
            onClick={() => fit(visible)}
          >
            ▲
          </button>
        </div>
        {!placed.length ? (
          <p className="pointer-events-none absolute inset-x-8 bottom-10 text-center text-[13px] leading-relaxed text-on-surface-variant">
            {emptyLabel}
          </p>
        ) : null}
      </div>

      {places.length ? (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              fit(placed);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
              filter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            All districts
          </button>
          {places.map((place) => (
            <button
              key={place.key}
              type="button"
              onClick={() => {
                setFilter(place.key);
                fit(placed.filter((memory) => districtLabel(memory.location).toLowerCase() === place.key));
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                filter === place.key ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {place.label}
              {place.count > 1 ? ` · ${place.count}` : ''}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length ? (
        <ul className="flex flex-col gap-3">
          {[...visible]
            .sort((a, b) => (b.eventDateIso ?? '').localeCompare(a.eventDateIso ?? ''))
            .map((memory) => (
              <li key={memory.id}>
                <button
                  type="button"
                  onClick={() => onOpen(memory.id)}
                  className="flex w-full gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 p-3.5 text-left"
                >
                  <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                    {cover(memory) ? (
                      <img src={cover(memory)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-primary">✦</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate text-[12px] font-medium text-primary">
                        {memory.location?.name || districtLabel(memory.location)}
                      </span>
                      <span className="shrink-0 text-[11px] text-on-surface-variant">{tileDate(memory.eventDateIso)}</span>
                    </span>
                    {memory.weather?.stringRepresentation || memory.mood ? (
                      <span className="mt-0.5 block truncate text-[12px] text-on-surface-variant">
                        {[memory.weather?.stringRepresentation, memory.mood ? `Mood: ${memory.mood}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : null}
                    <span className="mt-1 block line-clamp-2 text-[15px] font-semibold leading-snug text-on-surface">
                      {memory.title || 'Untitled memory'}
                    </span>
                    {memory.description ? (
                      <span className="mt-0.5 block line-clamp-2 text-[13px] leading-relaxed text-on-surface-variant">
                        {memory.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

function cover(memory: MemoryPost) {
  return memory.media.find((file) => file.kind === 'image')?.url ?? '';
}

function tileDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
