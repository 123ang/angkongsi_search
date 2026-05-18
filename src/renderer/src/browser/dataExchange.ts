import * as XLSX from 'xlsx';
import { importRecords, listRecords } from './sqlClient';
import { createBackup } from './backup';
import { downloadBlob, pickFile } from './filePicker';
import type { AncestorInput, AncestorRecord, ExportResult, ImportResult } from '../types';

type ImportColumnKey = keyof AncestorInput;

interface ExchangeColumn {
  key: ImportColumnKey;
  label: string;
  aliases: string[];
}

const exchangeColumns: ExchangeColumn[] = [
  {
    key: 'record_code',
    label: '记录编号 / Record Code',
    aliases: ['record code', 'record_code', 'code', 'id', '编号', '记录编号', '祖先编号']
  },
  {
    key: 'chinese_name',
    label: '中文姓名 / Chinese Name',
    aliases: ['chinese name', 'chinese_name', 'name chinese', '中文姓名', '中文名', '姓名']
  },
  {
    key: 'english_name',
    label: '英文名 / English Name',
    aliases: ['english name', 'english_name', 'name english', '英文名', '英文姓名']
  },
  {
    key: 'spouses',
    label: '配偶 / Spouses',
    aliases: ['spouse', 'spouses', 'spouse name', 'spouse names', '配偶', '配偶姓名']
  },
  {
    key: 'tablet_location',
    label: '神主牌位置 / Tablet Location',
    aliases: ['tablet location', 'tablet_location', 'location', '位置', '神主牌位置', '牌位位置']
  },
  {
    key: 'birth_year',
    label: '生年 / Birth Year',
    aliases: ['birth year', 'birth_year', 'born', '生年', '出生年份']
  },
  {
    key: 'death_year',
    label: '卒年 / Death Year',
    aliases: ['death year', 'death_year', 'died', '卒年', '逝世年份', '去世年份']
  },
  {
    key: 'origin_place',
    label: '籍贯 / Origin Place',
    aliases: ['origin', 'origin place', 'origin_place', '籍贯', '祖籍']
  },
  {
    key: 'photo_path',
    label: '照片文件 / Photo File',
    aliases: ['photo', 'photo file', 'photo path', 'photo_path', '照片', '照片文件', '照片档名']
  },
  {
    key: 'remarks',
    label: '备注 / Remarks',
    aliases: ['remarks', 'remark', 'notes', 'note', '备注', '说明']
  }
];

const templateHeaders = exchangeColumns.map((column) => column.label);

const emptyImportRecord: AncestorInput = {
  record_code: '',
  chinese_name: '',
  english_name: '',
  spouses: [],
  tablet_location: '',
  birth_year: '',
  death_year: '',
  origin_place: '',
  photo_path: '',
  remarks: ''
};

function normalizeHeader(value: string): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[()\[\]{}（）【】_\-/:：,，.\s]/g, '');
}

function cleanCell(value: unknown): string {
  return String(value ?? '').replace(/\u0000/g, '').trim();
}

function normalizeSpouses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => cleanCell(item)).filter(Boolean);
  return cleanCell(value)
    .split(/[、,，;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizePhotoFile(value: string): string {
  const trimmed = cleanCell(value);
  if (!trimmed) return '';
  const segments = trimmed.split(/[/\\]/);
  return segments[segments.length - 1] || '';
}

function buildHeaderMap(headers: string[]): Map<ImportColumnKey, number> {
  const aliases = new Map<string, ImportColumnKey>();
  for (const column of exchangeColumns) {
    for (const alias of [column.key, column.label, ...column.aliases]) {
      aliases.set(normalizeHeader(alias), column.key);
    }
  }

  const map = new Map<ImportColumnKey, number>();
  headers.forEach((header, index) => {
    const key = aliases.get(normalizeHeader(header));
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function rowsToRecords(rows: string[][]): AncestorInput[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cleanCell(cell)));
  if (headerIndex === -1) throw new Error('导入文件是空的。');

  const headerMap = buildHeaderMap(rows[headerIndex]);
  if (!headerMap.has('chinese_name') || !headerMap.has('tablet_location')) {
    throw new Error('第一行必须包含表头：中文姓名 / Chinese Name，以及神主牌位置 / Tablet Location。');
  }

  const records: AncestorInput[] = [];
  const errors: string[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || !row.some((cell) => cleanCell(cell))) continue;

    const record: AncestorInput = { ...emptyImportRecord, spouses: [] };
    for (const [key, columnIndex] of headerMap) {
      const value = cleanCell(row[columnIndex]);
      if (key === 'spouses') record.spouses = normalizeSpouses(value);
      else if (key === 'photo_path') record.photo_path = sanitizePhotoFile(value);
      else (record as Record<string, unknown>)[key] = value;
    }

    const missing: string[] = [];
    if (!record.chinese_name?.trim()) missing.push('中文姓名 / Chinese Name');
    if (!record.tablet_location?.trim()) missing.push('神主牌位置 / Tablet Location');
    if (missing.length) {
      errors.push(`第 ${rowIndex + 1} 行缺少：${missing.join('、')}`);
      continue;
    }
    records.push(record);
  }

  if (errors.length) {
    const visibleErrors = errors.slice(0, 8).join('\n');
    const remaining = errors.length > 8 ? `\n另有 ${errors.length - 8} 个错误。` : '';
    throw new Error(`${visibleErrors}${remaining}`);
  }
  if (records.length === 0) throw new Error('没有可导入的数据行。');

  return records;
}

function recordsToRows(records: AncestorRecord[]): string[][] {
  return [
    templateHeaders,
    ...records.map((record) => [
      record.record_code || '',
      record.chinese_name || '',
      record.english_name || '',
      normalizeSpouses(record.spouses).join('、'),
      record.tablet_location || '',
      record.birth_year || '',
      record.death_year || '',
      record.origin_place || '',
      record.photo_path || '',
      record.remarks || ''
    ])
  ];
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function readRowsFromFile(file: File): Promise<string[][]> {
  const extension = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(extension)) {
    throw new Error('请选择 .xlsx、.xls 或 .csv 文件。');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellText: false, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel 文件没有工作表。');
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false }) as string[][];
}

export async function importRecordsFromFile(): Promise<ImportResult | null> {
  const file = await pickFile('.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv');
  if (!file) return null;

  const rows = await readRowsFromFile(file);
  const records = rowsToRecords(rows);

  let backupPath = '';
  try {
    const backup = await createBackup();
    backupPath = backup.backupPath;
  } catch (error) {
    console.warn('Pre-import backup failed; continuing.', error);
  }

  const stats = await importRecords(records);
  return {
    sourcePath: file.name,
    backupPath,
    totalRows: stats.totalRows,
    inserted: stats.inserted,
    updated: stats.updated
  };
}

export async function exportRecordsToCsv(): Promise<ExportResult | null> {
  const records = await listRecords();
  const rows = recordsToRows(records);
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const filename = `ancestor_records_${timestamp()}.csv`;
  const blob = new Blob([`\uFEFF${csv}\r\n`], { type: 'text/csv;charset=utf-8' });
  downloadBlob(filename, blob);
  return { filePath: filename, recordCount: records.length };
}

export async function exportRecordsToExcel(): Promise<ExportResult | null> {
  const records = await listRecords();
  const rows = recordsToRows(records);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Records');
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const filename = `ancestor_records_${timestamp()}.xlsx`;
  downloadBlob(filename, new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  return { filePath: filename, recordCount: records.length };
}

export async function downloadImportTemplate(): Promise<ExportResult | null> {
  const sheet = XLSX.utils.aoa_to_sheet([templateHeaders]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Import Template');
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const filename = 'ancestor_import_template.xlsx';
  downloadBlob(filename, new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  return { filePath: filename, recordCount: 0 };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
