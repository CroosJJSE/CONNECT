import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CONNECT_CLOUDINARY_FOLDER, uploadFileToCloudinary } from '../google/cloudinaryUpload';
import { CONNECT_DRIVE_FOLDER_NAME, ensureConnectDriveFolder, setDriveFileLinkSharing, uploadFileToGoogleDrive } from '../google/googleDriveService';
import {
  hasGoogleWorkspaceAccessToken,
  requireGoogleWorkspaceAccessToken,
} from '../google/workspaceAccess';
import { workspaceTokenStore } from '../google/workspaceTokenStore';
import type { DriveMediaMetadata, MediaVisibility } from '../../domain/models';
import type { IMediaStorageService, UploadDriveMediaInput } from '../interfaces';
import { getFirebaseAuth, getFirebaseDb } from './firebaseApp';
import { FIRESTORE_PATHS } from './firestorePaths';
import { refreshGoogleWorkspaceAccess } from './googleSignIn';

function requireFirebase() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) throw new Error('Firebase is not configured.');
  return { auth, db };
}

function mapMedia(id: string, data: Record<string, unknown>): DriveMediaMetadata {
  return {
    id,
    driveFileId: String(data.driveFileId ?? ''),
    ownerUserId: String(data.ownerUserId ?? ''),
    fileName: String(data.fileName ?? ''),
    mimeType: String(data.mimeType ?? 'application/octet-stream'),
    fileSize: typeof data.fileSize === 'number' ? data.fileSize : 0,
    visibility: data.visibility === 'private' ? 'private' : 'anyone_with_link',
    driveViewerLink: String(data.driveViewerLink ?? ''),
    inlinePreviewUrl:
      data.storageProvider === 'cloudinary' ? String(data.driveViewerLink ?? '') : undefined,
    folderName:
      data.storageProvider === 'cloudinary' ? CONNECT_CLOUDINARY_FOLDER : CONNECT_DRIVE_FOLDER_NAME,
    createdAtIso: String(data.createdAt ?? new Date().toISOString()),
    storageProvider: data.storageProvider === 'cloudinary' ? 'cloudinary' : 'google_drive',
  };
}

function newMediaId(): string {
  return `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureAccessToken(): Promise<string> {
  if (hasGoogleWorkspaceAccessToken()) return requireGoogleWorkspaceAccessToken();
  const { auth } = requireFirebase();
  return refreshGoogleWorkspaceAccess(auth);
}

async function markDriveConnected(folderId?: string): Promise<void> {
  const { auth, db } = requireFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(
    doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)),
    {
      uid,
      preferredCurrency: 'LKR',
      driveConnected: true,
      ...(folderId ? { driveAppFolderId: folderId } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export class FirebaseDriveMediaService implements IMediaStorageService {
  async isDriveAuthorized(): Promise<boolean> {
    if (hasGoogleWorkspaceAccessToken()) return true;
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const snap = await getDoc(doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)));
    return Boolean(snap.data()?.driveConnected);
  }

  async authorizeDriveAccess(): Promise<boolean> {
    const token = await ensureAccessToken();
    const folderId = await ensureConnectDriveFolder(token);
    await markDriveConnected(folderId);
    return true;
  }

  async revokeDriveAccess(): Promise<void> {
    workspaceTokenStore.setDriveToken(null);
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(
      doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)),
      { uid, preferredCurrency: 'LKR', driveConnected: false, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  async listUserMedia(ownerUserId: string): Promise<DriveMediaMetadata[]> {
    const { db } = requireFirebase();
    const snap = await getDocs(
      query(collection(db, FIRESTORE_PATHS.driveMedia()), where('ownerUserId', '==', ownerUserId))
    );
    return snap.docs
      .map((d) => mapMedia(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
  }

  async uploadMediaToAppFolder(input: UploadDriveMediaInput): Promise<DriveMediaMetadata> {
    const { db } = requireFirebase();
    const token = await ensureAccessToken();
    const file = input.file;
    if (!file) {
      throw new Error('Choose a photo or video to save in your Google Drive.');
    }
    const uploaded = await uploadFileToGoogleDrive({
      accessToken: token,
      file,
      visibility: input.visibility,
    });
    const folderId = await ensureConnectDriveFolder(token);
    await markDriveConnected(folderId);
    const id = newMediaId();
    const createdAt = new Date().toISOString();
    const record = {
      id,
      driveFileId: uploaded.driveFileId,
      ownerUserId: input.ownerUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      visibility: input.visibility,
      driveViewerLink: uploaded.driveViewerLink,
      storageProvider: 'google_drive',
      createdAt,
    };
    await setDoc(doc(db, FIRESTORE_PATHS.driveMedia(), id), record);
    return mapMedia(id, record);
  }

  async uploadHostedMedia(input: UploadDriveMediaInput): Promise<DriveMediaMetadata> {
    const { db } = requireFirebase();
    if (!input.file) {
      throw new Error('Choose a photo or video to upload.');
    }
    const uploaded = await uploadFileToCloudinary(input.file);
    const id = newMediaId();
    const createdAt = new Date().toISOString();
    const record = {
      id,
      driveFileId: uploaded.publicId.slice(0, 256),
      ownerUserId: input.ownerUserId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      visibility: 'anyone_with_link' as const,
      driveViewerLink: uploaded.secureUrl.slice(0, 1000),
      storageProvider: 'cloudinary',
      createdAt,
    };
    await setDoc(doc(db, FIRESTORE_PATHS.driveMedia(), id), record);
    return mapMedia(id, record);
  }

  async updateMediaVisibility(
    mediaId: string,
    ownerUserId: string,
    visibility: MediaVisibility
  ): Promise<DriveMediaMetadata> {
    const { db } = requireFirebase();
    const ref = doc(db, FIRESTORE_PATHS.driveMedia(), mediaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Media record not found.');
    const current = mapMedia(snap.id, snap.data() as Record<string, unknown>);
    if (current.ownerUserId !== ownerUserId) throw new Error('Media record not found.');
    if (current.storageProvider !== 'cloudinary') {
      const token = await ensureAccessToken();
      await setDriveFileLinkSharing({
        accessToken: token,
        driveFileId: current.driveFileId,
        visibility,
      });
    }
    await updateDoc(ref, { visibility });
    return { ...current, visibility };
  }

  async getMediaById(mediaId: string): Promise<DriveMediaMetadata | undefined> {
    const { db } = requireFirebase();
    const snap = await getDoc(doc(db, FIRESTORE_PATHS.driveMedia(), mediaId));
    if (!snap.exists()) return undefined;
    return mapMedia(snap.id, snap.data() as Record<string, unknown>);
  }
}
