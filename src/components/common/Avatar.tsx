import { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  initials: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  onlineDot?: boolean;
  verifiedBadge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-16 h-16 text-lg',
};

const TONE_MAP = {
  primary: 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
  neutral: 'bg-surface-container-high text-on-surface',
};

export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  tone = 'primary',
  onlineDot = false,
  verifiedBadge = false,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative inline-flex shrink-0">
      {src && !imgFailed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${SIZE_MAP[size]} rounded-full object-cover bg-surface-container-high shadow-xs`}
        />
      ) : (
        <div
          aria-label={alt}
          className={`${SIZE_MAP[size]} ${TONE_MAP[tone]} rounded-full flex items-center justify-center font-semibold select-none`}
        >
          {initials}
        </div>
      )}
      {onlineDot && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-surface"
        />
      )}
      {verifiedBadge && (
        <span
          aria-label="Verified member"
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm ring-2 ring-surface-container-lowest"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}
