import type { MediaVisibility } from '../../domain/models';

/**
 * Least-privilege Google Drive scope: only files created or opened by CONNECT.
 */
export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'] as const;

export const CONNECT_DRIVE_FOLDER_NAME = 'CONNECT App Media';

export function buildDriveViewerUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`;
}

export async function ensureConnectDriveFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${CONNECT_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!searchRes.ok) {
    throw new Error('Unable to inspect Google Drive folders.');
  }
  const searchJson = (await searchRes.json()) as { files?: Array<{ id: string }> };
  if (searchJson.files && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: CONNECT_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) {
    throw new Error('Unable to create CONNECT App Media folder in Google Drive.');
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function uploadFileToGoogleDrive(params: {
  accessToken: string;
  file: File;
  visibility: MediaVisibility;
}): Promise<{ driveFileId: string; driveViewerLink: string }> {
  const folderId = await ensureConnectDriveFolder(params.accessToken);
  const metadata = {
    name: params.file.name,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', params.file);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.accessToken}` },
      body: formData,
    }
  );
  if (!uploadRes.ok) {
    throw new Error('Google Drive upload failed.');
  }
  const uploaded = (await uploadRes.json()) as { id: string; webViewLink?: string };

  if (params.visibility === 'anyone_with_link') {
    await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(uploaded.id)}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  }

  return {
    driveFileId: uploaded.id,
    driveViewerLink: uploaded.webViewLink || buildDriveViewerUrl(uploaded.id),
  };
}

export async function setDriveFileLinkSharing(params: {
  accessToken: string;
  driveFileId: string;
  visibility: MediaVisibility;
}): Promise<void> {
  const fileId = encodeURIComponent(params.driveFileId);
  if (params.visibility === 'anyone_with_link') {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    if (!res.ok) throw new Error('Unable to share the Google Drive file.');
    return;
  }

  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!listRes.ok) throw new Error('Unable to inspect Google Drive sharing.');
  const listed = (await listRes.json()) as { permissions?: Array<{ id: string; type: string }> };
  const anyone = listed.permissions?.filter((p) => p.type === 'anyone') ?? [];
  await Promise.all(
    anyone.map((p) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${encodeURIComponent(p.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${params.accessToken}` },
      })
    )
  );
}
