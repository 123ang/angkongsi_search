import {
  createRecord,
  deleteRecordById,
  getRecord,
  listRecords,
  nextRecordCode,
  searchRecords,
  updateRecord
} from './sqlClient';
import { chooseAndCopyPhoto, deletePhotoFile, photoUrl } from './photos';
import { createBackup, restoreBackup } from './backup';
import {
  downloadImportTemplate,
  exportRecordsToCsv,
  exportRecordsToExcel,
  importRecordsFromFile
} from './dataExchange';
import { getSettings, setSettings } from './idbStore';
import type { AncestorInput, AppSettings, SearchOptions } from '../types';

const defaultSettings: AppSettings = {
  language: 'zh',
  associationName: '宗亲会神主牌资料',
  adminPin: '123456',
  autoBackup: false
};

const browserPaths = {
  baseDir: '(browser storage)',
  dataDir: '(IndexedDB: ancestor-tablet-search)',
  dbPath: '(IndexedDB: meta/db)',
  photosDir: '(IndexedDB: photos)',
  backupsDir: '(your Downloads folder)',
  logsDir: '(browser console)'
};

async function readSettingsSafe(): Promise<AppSettings> {
  const stored = await getSettings();
  if (!stored) {
    await setSettings(defaultSettings);
    return defaultSettings;
  }
  return { ...defaultSettings, ...stored };
}

async function writeSettingsSafe(settings: AppSettings): Promise<AppSettings> {
  const merged: AppSettings = { ...defaultSettings, ...settings };
  await setSettings(merged);
  return merged;
}

export function installBrowserApi(): void {
  window.ancestorApi = {
    records: {
      search: ({ keyword }: SearchOptions) => searchRecords(keyword),
      list: () => listRecords(),
      get: (id: number) => getRecord(id),
      create: (input: AncestorInput) => createRecord(input),
      update: (id: number, input: AncestorInput) => updateRecord(id, input),
      delete: async (id: number) => {
        await deleteRecordById(id);
      },
      nextCode: () => nextRecordCode()
    },
    photos: {
      choose: (recordCode: string) => chooseAndCopyPhoto(recordCode),
      url: (photoPath: string | null) => photoUrl(photoPath),
      delete: (photoPath: string | null) => deletePhotoFile(photoPath)
    },
    settings: {
      get: () => readSettingsSafe(),
      set: (settings: AppSettings) => writeSettingsSafe(settings)
    },
    paths: {
      get: async () => browserPaths
    },
    data: {
      importRecords: () => importRecordsFromFile(),
      exportCsv: () => exportRecordsToCsv(),
      exportExcel: () => exportRecordsToExcel(),
      downloadTemplate: () => downloadImportTemplate()
    },
    createBackup: () => createBackup(),
    restoreBackup: () => restoreBackup()
  };
}

installBrowserApi();
