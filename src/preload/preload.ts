import { contextBridge, ipcRenderer } from 'electron';
import type { AncestorInput, AppPaths, AppSettings, BackupResult, ExportResult, ImportResult, RestoreResult, SearchOptions } from '../main/types';

const api = {
  records: {
    search: (options: SearchOptions) => ipcRenderer.invoke('records:search', options),
    list: () => ipcRenderer.invoke('records:list'),
    get: (id: number) => ipcRenderer.invoke('records:get', id),
    create: (input: AncestorInput) => ipcRenderer.invoke('records:create', input),
    update: (id: number, input: AncestorInput) => ipcRenderer.invoke('records:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('records:delete', id),
    nextCode: () => ipcRenderer.invoke('records:nextCode')
  },
  photos: {
    choose: (recordCode: string) => ipcRenderer.invoke('photos:choose', recordCode),
    url: (photoPath: string | null) => ipcRenderer.invoke('photos:url', photoPath),
    delete: (photoPath: string | null) => ipcRenderer.invoke('photos:delete', photoPath)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: AppSettings) => ipcRenderer.invoke('settings:set', settings)
  },
  paths: {
    get: () => ipcRenderer.invoke('paths:get')
  },
  data: {
    importRecords: () => ipcRenderer.invoke('data:import'),
    exportCsv: () => ipcRenderer.invoke('data:exportCsv'),
    exportExcel: () => ipcRenderer.invoke('data:exportExcel'),
    downloadTemplate: () => ipcRenderer.invoke('data:template')
  },
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore')
};

contextBridge.exposeInMainWorld('ancestorApi', api);

export type AncestorApi = {
  records: {
    search: (options: SearchOptions) => Promise<import('../main/types').AncestorRecord[]>;
    list: () => Promise<import('../main/types').AncestorRecord[]>;
    get: (id: number) => Promise<import('../main/types').AncestorRecord | null>;
    create: (input: AncestorInput) => Promise<import('../main/types').AncestorRecord>;
    update: (id: number, input: AncestorInput) => Promise<import('../main/types').AncestorRecord>;
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
