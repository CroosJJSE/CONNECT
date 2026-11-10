import { useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, Globe, HardDrive, Lock, Upload, X } from 'lucide-react';
import type { DriveMediaMetadata, MediaVisibility } from '../../domain/models';
import { formatFileSize } from '../../domain/logic/formatting';
import { useConnectData } from '../../hooks/useConnectData';

interface DriveUploadFieldProps {
  selectedMedia: DriveMediaMetadata | null;
  onSelectMedia: (media: DriveMediaMetadata | null) => void;
  defaultVisibility?: MediaVisibility;
  label?: string;
}

export function DriveUploadField({
  selectedMedia,
  onSelectMedia,
  defaultVisibility = 'anyone_with_link',
  label = 'Attach media (saved to your Google Drive)',
}: DriveUploadFieldProps) {
  const { driveAuthorized, authorizeDrive, uploadDriveMedia } = useConnectData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [visibility, setVisibility] = useState<MediaVisibility>(defaultVisibility);
  const [linkShareConfirmed, setLinkShareConfirmed] = useState(defaultVisibility === 'anyone_with_link');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let previewDataUrl: string | undefined;
      if (file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
        previewDataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }
      const record = await uploadDriveMedia({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        visibility,
        previewDataUrl,
      });
      if (record) {
        onSelectMedia(record);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
          <HardDrive className="w-4 h-4 text-primary shrink-0" />
          <span>{label}</span>
        </div>
        {!driveAuthorized ? (
          <button
            type="button"
            onClick={() => void authorizeDrive()}
            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
          >
            Connect Drive Folder
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
            CONNECT App Media
          </span>
        )}
      </div>

      {/* Explicit Visibility Selector */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5 bg-surface-container p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setVisibility('anyone_with_link')}
            className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              visibility === 'anyone_with_link'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Anyone with link
          </button>
          <button
            type="button"
            onClick={() => {
              setVisibility('private');
              setLinkShareConfirmed(false);
            }}
            className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              visibility === 'private'
                ? 'bg-surface-container-lowest text-tertiary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Private only
          </button>
        </div>

        {visibility === 'anyone_with_link' && (
          <label className="flex items-start gap-2 text-[11px] text-on-surface-variant leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={linkShareConfirmed}
              onChange={(e) => setLinkShareConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-outline accent-primary"
            />
            <span>
              I understand this file will be stored in my Google Drive folder with{' '}
              <strong>&ldquo;Anyone with the link can view&rdquo;</strong> access so authorized community members can open it.
            </span>
          </label>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />

      {selectedMedia ? (
        <div className="bg-surface-container-lowest rounded-lg px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-on-surface truncate">{selectedMedia.fileName}</p>
            <p className="text-[11px] text-on-surface-variant">
              {formatFileSize(selectedMedia.fileSize)} · Drive ID: {selectedMedia.driveFileId.slice(0, 12)}…
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectMedia(null)}
            aria-label="Remove attached Drive media"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || (visibility === 'anyone_with_link' && !linkShareConfirmed)}
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] w-full rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Uploading to Google Drive…' : 'Upload Photo or Video to My Drive'}</span>
        </button>
      )}
    </div>
  );
}
