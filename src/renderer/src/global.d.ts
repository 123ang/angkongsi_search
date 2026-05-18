import type { AncestorInput, AncestorRecord, AppSettings, ExportResult, ImportResult } from './types';

interface AppPaths {
  baseDir: string;
  dataDir: string;
  dbPath: string;
  photosDir: string;
  backupsDir: string;
  logsDir: string;
}

interface BackupResult {
  backupPath: string;
}

interface RestoreResult {
  backupPath: string;
  restoredDb: boolean;
  restoredPhotos: number;
}

declare global {
  interface Window {
    ancestorApi: {
      records: {
        search: (options: { keyword: string }) => Promise<AncestorRecord[]>;
        list: () => Promise<AncestorRecord[]>;
        get: (id: number) => Promise<AncestorRecord | null>;
        create: (input: AncestorInput) => Promise<AncestorRecord>;
        update: (id: number, input: AncestorInput) => Promise<AncestorRecord>;
        delete: (id: number) => Promise<void>;
        nextCode: () => Promise<string>;
      };
      photos: {
        choose: (recordCode: string) => Promise<string | null>;
        url: (photoPath: string | null) => Promise<string>;
        delete: (photoPath: string | null) => Promise<boolean>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        set: (settings: AppSettings) => Promise<AppSettings>;
      };
      paths: {
        get: () => Promise<AppPaths>;
      };
      data: {
        importRecords: () => Promise<ImportResult | null>;
        exportCsv: () => Promise<ExportResult | null>;
        exportExcel: () => Promise<ExportResult | null>;
        downloadTemplate: () => Promise<ExportResult | null>;
      };
      createBackup: () => Promise<BackupResult>;
      restoreBackup: () => Promise<RestoreResult | null>;
    };
  }
}

export {};
