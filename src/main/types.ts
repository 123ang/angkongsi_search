export interface AncestorRecord {
  id: number;
  record_code: string;
  chinese_name: string;
  english_name: string | null;
  spouses: string[];
  tablet_location: string;
  birth_year: string | null;
  death_year: string | null;
  origin_place: string | null;
  photo_path: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type AncestorInput = Omit<AncestorRecord, 'id' | 'created_at' | 'updated_at'> & {
  record_code?: string | null;
};

export interface SearchOptions {
  keyword: string;
}

export interface AppSettings {
  language: 'zh' | 'en';
  associationName: string;
  adminPin: string;
  autoBackup: boolean;
}

export interface AppPaths {
  baseDir: string;
  dataDir: string;
  dbPath: string;
  photosDir: string;
  backupsDir: string;
  logsDir: string;
}

export interface BackupResult {
  backupPath: string;
}

export interface RestoreResult {
  backupPath: string;
  restoredDb: boolean;
  restoredPhotos: number;
}

export interface ImportResult {
  sourcePath: string;
  backupPath: string;
  totalRows: number;
  inserted: number;
  updated: number;
}

export interface ExportResult {
  filePath: string;
  recordCount: number;
}
