import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MemoryFile } from '../../domain/models';
import { mimeForKind } from '../../domain/logic/memoryText';

export function MediaCarousel({
  slides,
  expandImages = false,
  onRemove,
}: {
  slides: MemoryFile[];
  expandImages?: boolean;
  onRemove?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  if (!slides.length) return null;
  const current = slides[Math.min(index, slides.length - 1)];
  const mime = mimeForKind(current.kind);

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-high">
      {current.kind === 'video' ? (
        <video src={current.url} controls className="w-full max-h-[420px] bg-inverse-surface" />
      ) : (
        <img
          src={current.url}
          alt=""
          className={`w-full object-cover ${expandImages ? 'max-h-[420px]' : 'h-56'}`}
        />
      )}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove media"
          onClick={() => onRemove(index)}
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface-container-lowest/90 text-on-surface shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((value) => (value === 0 ? slides.length - 1 : value - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-surface-container-lowest/90 text-on-surface"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((value) => (value + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-surface-container-lowest/90 text-on-surface"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
            {slides.map((slide, i) => (
              <span
                key={slide.fileId || `${slide.url}-${i}`}
                className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-primary' : 'w-1.5 bg-on-surface/30'}`}
              />
            ))}
          </div>
        </>
      ) : null}
      <span className="sr-only">{mime}</span>
    </div>
  );
}
