import { useState } from 'react';
import { ExternalLink, FileText, Film, Globe, Image as ImageIcon, Lock } from 'lucide-react';
import type { DriveMediaMetadata } from '../../domain/models';
import { formatFileSize } from '../../domain/logic/formatting';

interface DriveMediaCardProps {
  media?: DriveMediaMetadata;
  inlineImageUrl?: string;
  inlineAlt?: string;
  mediaType?: 'image' | 'video';
}

/**
 * Displays media backed by a user's personal Google Drive.
 * Never assumes a Drive viewer link is a direct image/video binary URL:
 * renders inline preview only when an inline preview URL is available and valid,
 * and always provides a clear fallback link to open inside Google Drive Viewer.
 */
export function DriveMediaCard({
  media,
  inlineImageUrl,
  inlineAlt,
  mediaType = 'image',
}: DriveMediaCardProps) {
  const [previewError, setPreviewError] = useState(false);

  const previewUrl = inlineImageUrl ?? media?.inlinePreviewUrl;
  const altText = inlineAlt ?? media?.fileName ?? 'Community media attachment';
  const isImage = (media?.mimeType.startsWith('image/') ?? mediaType === 'image') && Boolean(previewUrl);

  return (
    <div className="rounded-xl overflow-hidden bg-surface-container-low shadow-xs flex flex-col">
      {isImage && previewUrl && !previewError ? (
        <div className="relative aspect-video w-full bg-surface-container overflow-hidden">
          <img
            src={previewUrl}
            alt={altText}
            referrerPolicy="no-referrer"
            onError={() => setPreviewError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="p-5 flex items-center gap-3 bg-surface-container-low">
          <div className="w-11 h-11 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
            {media?.mimeType.startsWith('video/') || mediaType === 'video' ? (
              <Film className="w-5 h-5" />
            ) : media?.mimeType.startsWith('image/') ? (
              <ImageIcon className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-on-surface truncate">
              {media?.fileName ?? altText}
            </p>
            <p className="text-xs text-on-surface-variant">
              {media
                ? `${formatFileSize(media.fileSize)} · Stored in owner's Google Drive (${media.folderName})`
                : 'Google Drive attachment'}
            </p>
          </div>
        </div>
      )}

      {media && (
        <div className="px-3.5 py-2 bg-surface-container flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
            {media.visibility === 'anyone_with_link' ? (
              <>
                <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Shared · Anyone with link can view</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-tertiary shrink-0" />
                <span className="truncate">Private · Owner only</span>
              </>
            )}
          </div>
          <a
            href={media.driveViewerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary font-semibold hover:underline whitespace-nowrap shrink-0"
          >
            <span>Open in Drive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
