import fs from 'node:fs';
import path from 'node:path';
import { getAppPaths } from './paths';
import type { AppSettings } from './types';

const defaultSettings: AppSettings = {
  language: 'zh',
  associationName: '宗亲会神主牌资料',
  adminPin: '123456',
  autoBackup: false
};

function settingsPath(): string {
  return path.join(getAppPaths().dataDir, 'settings.json');
}

export function readSettings(): AppSettings {
  const filePath = settingsPath();
  if (!fs.existsSync(filePath)) {
    writeSettings(defaultSettings);
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AppSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    writeSettings(defaultSettings);
    return defaultSettings;
  }
}

export function writeSettings(settings: AppSettings): AppSettings {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export function verifyPin(pin: string): boolean {
  return pin === readSettings().adminPin;
}
