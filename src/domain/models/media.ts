export type MediaVisibility = 'private' | 'anyone_with_link';

export type MediaStorageProvider = 'google_drive' | 'cloudinary';

export interface DriveMediaMetadata {
  id: string;
  driveFileId: string;
  ownerUserId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  visibility: MediaVisibility;
  driveViewerLink: string;
  inlinePreviewUrl?: string;
  folderName: string;
  createdAtIso: string;
  storageProvider?: MediaStorageProvider;
}
