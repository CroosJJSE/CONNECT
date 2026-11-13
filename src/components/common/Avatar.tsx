import { useState } from 'react';
import { getLevelFrameStyle } from '../../domain/logic/pointsRules';
import { useMemberLevels, MemberLevelProvider } from '../../hooks/memberLevelContext';

export { MemberLevelProvider };

interface AvatarProps {
  src?: string;
  alt: string;
  initials: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  onlineDot?: boolean;
  verifiedBadge?: boolean;
  userId?: string;
  level?: number;
  showLevelTag?: boolean;
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

const LEVEL_TAG_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'px-1 py-[1px] text-[8px]',
  sm: 'px-1 py-[1px] text-[9px]',
  md: 'px-1.5 py-[1px] text-[9px]',
  lg: 'px-1.5 py-0.5 text-[10px]',
  xl: 'px-1.5 py-0.5 text-[10px]',
};

export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  tone = 'primary',
  onlineDot = false,
  verifiedBadge = false,
  userId,
  level,
  showLevelTag,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const levelsMap = useMemberLevels();
  const resolvedLevel = Math.max(
    1,
    Math.floor(level ?? (userId ? levelsMap[userId] ?? 1 : 1))
  );
  const frame = getLevelFrameStyle(resolvedLevel);
  const shouldShowLevelTag = showLevelTag ?? Boolean(userId !== undefined || level !== undefined);
  const hasBottomRightAccessory = onlineDot || verifiedBadge;
  const levelTagPosition =
    hasBottomRightAccessory || size === 'lg' || size === 'xl'
      ? '-top-1 -left-1'
      : '-bottom-1 -right-1.5';

  return (
    <div
      className="relative inline-flex shrink-0"
      title={`Level ${resolvedLevel} · ${frame.tierName} ring`}
    >
      <div
        className={`rounded-full inline-flex items-center justify-center transition-all duration-300 ${frame.outerRingClass} ${frame.haloClass}`}
      >
        <div className="rounded-full bg-surface-container-lowest p-[1px] inline-flex items-center justify-center">
          {src && !imgFailed ? (
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={`${SIZE_MAP[size]} rounded-full object-cover bg-surface-container-high`}
            />
          ) : (
            <div
              aria-label={alt}
              className={`${SIZE_MAP[size]} ${TONE_MAP[tone]} rounded-full flex items-center justify-center font-semibold select-none`}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
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
      {shouldShowLevelTag && (
        <span
          className={`absolute ${levelTagPosition} ${LEVEL_TAG_CLASSES[size]} rounded-full font-bold leading-none tabular-nums shadow-xs ring-2 ring-surface-container-lowest ${frame.badgeSurfaceClass} ${frame.badgeTextClass}`}
        >
          Lv.{resolvedLevel}
        </span>
      )}
    </div>
  );
}
