import AdmZip from 'adm-zip';
import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './database';
import { log } from './logger';
import { getAppPaths } from './paths';
import type { BackupResult, RestoreResult } from './types';

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export async function chooseAndCopyPhoto(window: BrowserWindow, recordCode: string): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    title: '选择神主牌照片',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const source = result.filePaths[0];
  const extension = path.extname(source).toLowerCase();
  if (!imageExtensions.has(extension)) throw new Error('请选择 JPG、PNG 或 WEBP 照片。');

  const stats = fs.statSync(source);
  if (stats.size > 10 * 1024 * 1024) throw new Error('照片不能超过 10MB。');

  const safeCode = recordCode || 'record';
  const filename = `${safeCode}_${timestamp()}${extension}`;
  const destination = path.join(getAppPaths().photosDir, filename);
  fs.copyFileSync(source, destination);
  log(`Photo uploaded ${filename}`);
  return filename;
}

export function photoUrl(photoPath: string | null): string {
  if (!photoPath) return '';
  const fullPath = path.isAbsolute(photoPath) ? photoPath : path.join(getAppPaths().photosDir, photoPath);
  if (!fs.existsSync(fullPath)) return '';

  const extension = path.extname(fullPath).toLowerCase();
  const mime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
}

export function deletePhoto(photoPath: string | null): boolean {
  if (!photoPath) return false;
  const fullPath = path.isAbsolute(photoPath) ? photoPath : path.join(getAppPaths().photosDir, photoPath);
  if (!fullPath.startsWith(getAppPaths().photosDir) || !fs.existsSync(fullPath)) return false;
  fs.rmSync(fullPath, { force: true });
  log(`Photo deleted ${photoPath}`);
  return true;
}

export function createBackup(): BackupResult {
  const paths = getAppPaths();
  fs.mkdirSync(paths.backupsDir, { recursive: true });

  const backupPath = path.join(paths.backupsDir, `backup_${timestamp()}.zip`);
  const zip = new AdmZip();

  if (fs.existsSync(paths.dbPath)) {
    zip.addLocalFile(paths.dbPath, '', 'ancestors.db');
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${paths.dbPath}${suffix}`;
      if (fs.existsSync(sidecar)) zip.addLocalFile(sidecar, '', `ancestors.db${suffix}`);
    }
  }
  if (fs.existsSync(paths.photosDir)) zip.addLocalFolder(paths.photosDir, 'photos');
  zip.writeZip(backupPath);

  log(`Zip backup completed ${backupPath}`);
  return { backupPath };
}

export async function restoreBackup(window: BrowserWindow): Promise<RestoreResult | null> {
  const result = await dialog.showOpenDialog(window, {
    title: '选择备份 ZIP / Select backup ZIP',
    defaultPath: getAppPaths().backupsDir,
    properties: ['openFile'],
    filters: [{ name: 'Backup ZIP', extensions: ['zip'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const backupPath = result.filePaths[0];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ancestor-backup-'));

  try {
    const zip = new AdmZip(backupPath);
    zip.extractAllTo(tempDir, true);

    const backupDb = path.join(tempDir, 'ancestors.db');
    if (!fs.existsSync(backupDb)) throw new Error('这个 ZIP 没有 ancestors.db。');

    const paths = getAppPaths();
    const safety = createBackup();
    log(`Safety zip backup before restore ${safety.backupPath}`);

    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const target = `${paths.dbPath}${suffix}`;
      if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    }
    fs.copyFileSync(backupDb, paths.dbPath);
    for (const suffix of ['-wal', '-shm']) {
      const sourceSidecar = path.join(tempDir, `ancestors.db${suffix}`);
      if (fs.existsSync(sourceSidecar)) fs.copyFileSync(sourceSidecar, `${paths.dbPath}${suffix}`);
    }

    const backupPhotos = path.join(tempDir, 'photos');
    let restoredPhotos = 0;
    if (fs.existsSync(backupPhotos)) {
      fs.rmSync(paths.photosDir, { recursive: true, force: true });
      fs.mkdirSync(paths.photosDir, { recursive: true });
      restoredPhotos = copyDir(backupPhotos, paths.photosDir);
    }

    log(`Zip restore completed ${backupPath}`);
    return { backupPath, restoredDb: true, restoredPhotos };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function copyDir(sourceDir: string, destinationDir: string): number {
  if (!fs.existsSync(sourceDir)) return 0;
  fs.mkdirSync(destinationDir, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const destination = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) count += copyDir(source, destination);
    else {
      fs.copyFileSync(source, destination);
      count += 1;
    }
  }
  return count;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
