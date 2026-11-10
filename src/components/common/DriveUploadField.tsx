import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Film,
  Globe,
  HardDrive,
  Image as ImageIcon,
  ImagePlus,
  Lock,
  Upload,
  X,
} from 'lucide-react';
import type { DriveMediaMetadata, MediaVisibility } from '../../domain/models';
import { formatFileSize } from '../../domain/logic/formatting';
import { useConnectData } from '../../hooks/useConnectData';

interface DriveUploadFieldProps {
  selectedMedia: DriveMediaMetadata | null;
  onSelectMedia: (media: DriveMediaMetadata | null) => void;
  defaultVisibility?: MediaVisibility;
}

export function DriveUploadField({
  selectedMedia,
  onSelectMedia,
  defaultVisibility = 'anyone_with_link',
}: DriveUploadFieldProps) {
  const { driveAuthorized, authorizeDrive, uploadDriveMedia } = useConnectData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [visibility, setVisibility] = useState<MediaVisibility>(defaultVisibility);
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setVisibility(defaultVisibility);
  }, [defaultVisibility]);

  useEffect(() => {
    setPreviewError(false);
  }, [selectedMedia?.id]);

  const handleConnect = async () => {
    setConnecting(true);
    setUploadError(null);
    try {
      await authorizeDrive();
    } finally {
      setConnecting(false);
    }
  };

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadError('Please select a photo or video file.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      let previewDataUrl: string | undefined;
      if (file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
        previewDataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === 'string' ? reader.result : undefined);
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

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!uploading) setDragging(true);
  };

  const handleDrop = async (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  };

  if (!driveAuthorized) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-on-surface">Add photo or video</p>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              Connect with Google Drive to store and share your uploaded media.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={connecting}
          onClick={() => void handleConnect()}
          className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-60 whitespace-nowrap"
        >
          <HardDrive className="w-4 h-4 shrink-0" />
          <span>{connecting ? 'Connecting Google Drive…' : 'Connect with Google Drive'}</span>
        </button>
      </div>
    );
  }

  if (selectedMedia) {
    const showThumbnail =
      Boolean(selectedMedia.inlinePreviewUrl) &&
      selectedMedia.mimeType.startsWith('image/') &&
      !previewError;

    return (
      <div className="bg-surface-container-low rounded-2xl p-3 sm:p-3.5 flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-surface-container-lowest overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
          {showThumbnail ? (
            <img
              src={selectedMedia.inlinePreviewUrl}
              alt={selectedMedia.fileName}
              referrerPolicy="no-referrer"
              onError={() => setPreviewError(true)}
              className="w-full h-full object-cover"
            />
          ) : selectedMedia.mimeType.startsWith('video/') ? (
            <Film className="w-6 h-6 text-primary" />
          ) : (
            <ImageIcon className="w-6 h-6 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-on-surface truncate">
            {selectedMedia.fileName}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5 flex items-center flex-wrap gap-x-1.5 tabular-nums">
            <span>{formatFileSize(selectedMedia.fileSize)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {selectedMedia.visibility === 'private' ? 'Private only' : 'Anyone with link'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectMedia(null)}
          aria-label="Remove uploaded media"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => void handleInputChange(e)}
        className="hidden"
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => void handleDrop(e)}
        className={`min-h-[112px] w-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          dragging
            ? 'border-primary bg-primary-fixed/25'
            : 'border-outline-variant/60 bg-surface-container-lowest hover:border-primary/60'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          {uploading ? <Upload className="w-5 h-5" /> : <ImagePlus className="w-5 h-5" />}
        </div>
        <span className="text-xs sm:text-sm font-semibold text-on-surface">
          {uploading ? 'Uploading media…' : 'Upload photo or video'}
        </span>
        <span className="text-xs text-on-surface-variant">
          {uploading
            ? 'Saving directly to your Google Drive'
            : 'Tap to choose media · Saved in your Drive'}
        </span>
      </button>

      {uploadError && <p className="text-xs font-medium text-error">{uploadError}</p>}

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setVisibility('anyone_with_link')}
            className={`min-h-[44px] px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              visibility === 'anyone_with_link'
                ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Anyone with link</span>
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={`min-h-[44px] px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              visibility === 'private'
                ? 'bg-surface-container-lowest text-tertiary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Private only</span>
          </button>
        </div>

        <p className="text-[11px] text-on-surface-variant px-0.5 leading-snug">
          {visibility === 'anyone_with_link'
            ? 'Anyone with the Drive link can view this media.'
            : 'Private in your Google Drive — visible only to you.'}
        </p>
      </div>
    </div>
  );
}
