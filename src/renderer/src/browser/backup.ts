import JSZip from 'jszip';
import { clearPhotos, listPhotoEntries, putPhoto } from './idbStore';
import { exportDbBytes, replaceDbBytes } from './sqlClient';
import { clearPhotoUrlCache } from './photos';
import { downloadBlob, pickFile } from './filePicker';

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export async function createBackup(): Promise<{ backupPath: string }> {
  const dbBytes = await exportDbBytes();
  const photos = await listPhotoEntries();

  const zip = new JSZip();
  zip.file('ancestors.db', dbBytes);
  const photosFolder = zip.folder('photos');
  if (photosFolder) {
    for (const { filename, blob } of photos) {
      photosFolder.file(filename, blob);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = `backup_${timestamp()}.zip`;
  downloadBlob(filename, blob);
  return { backupPath: filename };
}

export async function restoreBackup(): Promise<{ backupPath: string; restoredDb: boolean; restoredPhotos: number } | null> {
  const file = await pickFile('.zip,application/zip');
  if (!file) return null;

  const safety = await createBackup();
  console.info(`Pre-restore safety backup created: ${safety.backupPath}`);

  const zip = await JSZip.loadAsync(file);
  const dbEntry = zip.file('ancestors.db');
  if (!dbEntry) throw new Error('这个 ZIP 没有 ancestors.db。');

  const dbBytes = new Uint8Array(await dbEntry.async('arraybuffer'));
  await replaceDbBytes(dbBytes);

  await clearPhotos();
  clearPhotoUrlCache();

  let restoredPhotos = 0;
  const photoEntries: Array<{ name: string; entry: JSZip.JSZipObject }> = [];
  zip.folder('photos')?.forEach((relativePath, entry) => {
    if (!entry.dir) photoEntries.push({ name: relativePath, entry });
  });

  for (const { name, entry } of photoEntries) {
    const buffer = await entry.async('blob');
    await putPhoto(name, buffer);
    restoredPhotos += 1;
  }

  return { backupPath: file.name, restoredDb: true, restoredPhotos };
}
