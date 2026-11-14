import { getCloudinaryConfig } from '../firebase/env';

export const CONNECT_CLOUDINARY_FOLDER = 'connect/community';

export async function uploadFileToCloudinary(file: File): Promise<{
  publicId: string;
  secureUrl: string;
}> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured on this host.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);
  body.append('folder', CONNECT_CLOUDINARY_FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    throw new Error('Cloudinary upload failed.');
  }
  const json = (await res.json()) as { public_id?: string; secure_url?: string };
  if (!json.public_id || !json.secure_url) {
    throw new Error('Cloudinary upload failed.');
  }
  return { publicId: json.public_id, secureUrl: json.secure_url };
}
