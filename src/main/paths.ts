import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppPaths } from './types';

function baseDataDir(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), 'app-data');
  }
  return path.join(app.getAppPath(), 'app-data');
}

export function getAppPaths(): AppPaths {
  const baseDir = baseDataDir();
  const dataDir = path.join(baseDir, 'data');
  const photosDir = path.join(baseDir, 'photos');
  const backupsDir = path.join(baseDir, 'backups');
  const logsDir = path.join(baseDir, 'logs');

  for (const dir of [baseDir, dataDir, photosDir, backupsDir, logsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    baseDir,
    dataDir,
    dbPath: path.join(dataDir, 'ancestors.db'),
    photosDir,
    backupsDir,
    logsDir
  };
}
