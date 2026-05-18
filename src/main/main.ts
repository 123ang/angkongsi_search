import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  nextRecordCode,
  searchRecords,
  updateRecord
} from './database';
import {
  downloadImportTemplate,
  exportRecordsToCsv,
  exportRecordsToExcel,
  importRecordsFromFile
} from './dataExchange';
import {
  chooseAndCopyPhoto,
  createBackup,
  photoUrl,
  deletePhoto,
  restoreBackup
} from './fileService';
import { log } from './logger';
import { getAppPaths } from './paths';
import { readSettings, writeSettings } from './settings';
import type { AncestorInput, AppSettings, SearchOptions } from './types';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 700,
    title: '神主牌搜寻系统',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerIpc(): void {
  ipcMain.handle('records:search', (_event, options: SearchOptions) => searchRecords(options));
  ipcMain.handle('records:list', () => listRecords());
  ipcMain.handle('records:get', (_event, id: number) => getRecord(id));
  ipcMain.handle('records:create', (_event, input: AncestorInput) => createRecord(input));
  ipcMain.handle('records:update', (_event, id: number, input: AncestorInput) => updateRecord(id, input));
  ipcMain.handle('records:delete', (_event, id: number) => deleteRecord(id));
  ipcMain.handle('records:nextCode', () => nextRecordCode());
  ipcMain.handle('photos:choose', (event, recordCode: string) => chooseAndCopyPhoto(BrowserWindow.fromWebContents(event.sender)!, recordCode));
  ipcMain.handle('photos:url', (_event, photoPath: string | null) => photoUrl(photoPath));
  ipcMain.handle('photos:delete', (_event, photoPath: string | null) => deletePhoto(photoPath));
  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (_event, settings: AppSettings) => writeSettings(settings));
  ipcMain.handle('paths:get', () => getAppPaths());
  ipcMain.handle('backup:create', () => createBackup());
  ipcMain.handle('backup:restore', (event) => restoreBackup(BrowserWindow.fromWebContents(event.sender)!));
  ipcMain.handle('data:import', (event) => importRecordsFromFile(BrowserWindow.fromWebContents(event.sender)!));
  ipcMain.handle('data:exportCsv', (event) => exportRecordsToCsv(BrowserWindow.fromWebContents(event.sender)!));
  ipcMain.handle('data:exportExcel', (event) => exportRecordsToExcel(BrowserWindow.fromWebContents(event.sender)!));
  ipcMain.handle('data:template', (event) => downloadImportTemplate(BrowserWindow.fromWebContents(event.sender)!));
}

app.whenReady().then(async () => {
  registerIpc();
  log('App started');
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => log('Uncaught exception', error));
