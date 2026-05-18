import { deletePhotoBlob, getPhoto, putPhoto } from './idbStore';
import { pickFile } from './filePicker';

const imageMimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const objectUrlCache = new Map<string, string>();

function extensionOf(filename: string): string {
  const match = filename.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : '';
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export async function chooseAndCopyPhoto(recordCode: string): Promise<string | null> {
  const file = await pickFile('image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp');
  if (!file) return null;

  const extension = extensionOf(file.name);
  if (!imageMimeByExtension[extension]) throw new Error('请选择 JPG、PNG 或 WEBP 照片。');
  if (file.size > 10 * 1024 * 1024) throw new Error('照片不能超过 10MB。');

  const safeCode = (recordCode || 'record').replace(/[^A-Za-z0-9_\-]/g, '_') || 'record';
  const filename = `${safeCode}_${timestamp()}${extension}`;
  await putPhoto(filename, file);
  return filename;
}

export async function photoUrl(photoPath: string | null): Promise<string> {
  if (!photoPath) return '';
  const cached = objectUrlCache.get(photoPath);
  if (cached) return cached;
  const blob = await getPhoto(photoPath);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(photoPath, url);
  return url;
}

export async function deletePhotoFile(photoPath: string | null): Promise<boolean> {
  if (!photoPath) return false;
  const cached = objectUrlCache.get(photoPath);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(photoPath);
  }
  return deletePhotoBlob(photoPath);
}

export function clearPhotoUrlCache(): void {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
}
