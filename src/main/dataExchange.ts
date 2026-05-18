import AdmZip from 'adm-zip';
import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { importRecords, listRecords } from './database';
import { createBackup } from './fileService';
import { log } from './logger';
import type { AncestorInput, AncestorRecord, ExportResult, ImportResult } from './types';

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

export async function importRecordsFromFile(window: BrowserWindow): Promise<ImportResult | null> {
  const result = await dialog.showOpenDialog(window, {
    title: '导入 Excel / CSV',
    properties: ['openFile'],
    filters: [
      { name: 'Excel or CSV', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'Excel Workbook', extensions: ['xlsx', 'xls'] },
      { name: 'CSV', extensions: ['csv'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const rows = readRowsFromFile(sourcePath);
  const records = rowsToRecords(rows);
  const backup = createBackup();
  const importResult = importRecords(records, backup.backupPath, sourcePath);
  log(`Import completed ${sourcePath}`);
  return importResult;
}

export async function exportRecordsToCsv(window: BrowserWindow): Promise<ExportResult | null> {
  const records = listRecords();
  const result = await dialog.showSaveDialog(window, {
    title: '导出 CSV',
    defaultPath: `ancestor_records_${timestamp()}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return null;

  const filePath = ensureExtension(result.filePath, '.csv');
  writeCsv(filePath, recordsToRows(records));
  log(`CSV export completed ${filePath}`);
  return { filePath, recordCount: records.length };
}

export async function exportRecordsToExcel(window: BrowserWindow): Promise<ExportResult | null> {
  const records = listRecords();
  const result = await dialog.showSaveDialog(window, {
    title: '导出 Excel',
    defaultPath: `ancestor_records_${timestamp()}.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return null;

  const filePath = ensureExtension(result.filePath, '.xlsx');
  writeXlsx(filePath, recordsToRows(records), 'Records');
  log(`Excel export completed ${filePath}`);
  return { filePath, recordCount: records.length };
}

export async function downloadImportTemplate(window: BrowserWindow): Promise<ExportResult | null> {
  const result = await dialog.showSaveDialog(window, {
    title: '下载导入模板',
    defaultPath: 'ancestor_import_template.xlsx',
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return null;

  const filePath = ensureExtension(result.filePath, '.xlsx');
  writeXlsx(filePath, [templateHeaders], 'Import Template');
  log(`Import template downloaded ${filePath}`);
  return { filePath, recordCount: 0 };
}

function readRowsFromFile(filePath: string): string[][] {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.xlsx') return readXlsxRows(buffer);
  if (extension === '.xls') return readXlsRows(buffer);
  if (extension === '.csv') return parseDelimitedText(decodeText(buffer));

  throw new Error('请选择 .xlsx、.xls 或 .csv 文件。');
}

function rowsToRecords(rows: string[][]): AncestorInput[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cleanCell(cell)));
  if (headerIndex === -1) throw new Error('导入文件是空的。');

  const headerRow = rows[headerIndex];
  const headerMap = buildHeaderMap(headerRow);
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
      else record[key] = value;
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

function buildHeaderMap(headers: string[]): Map<ImportColumnKey, number> {
  const aliases = new Map<string, ImportColumnKey>();
  for (const column of exchangeColumns) {
    for (const alias of [column.key, column.label, ...column.aliases]) aliases.set(normalizeHeader(alias), column.key);
  }

  const map = new Map<ImportColumnKey, number>();
  headers.forEach((header, index) => {
    const key = aliases.get(normalizeHeader(header));
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
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

function writeCsv(filePath: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  fs.writeFileSync(filePath, `\uFEFF${csv}\r\n`, 'utf8');
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseDelimitedText(text: string): string[][] {
  const delimiters = [',', '\t', ';'];
  let bestRows: string[][] = [];
  let bestScore = -1;

  for (const delimiter of delimiters) {
    const rows = parseDelimitedRows(text, delimiter);
    const score = rows.slice(0, 12).reduce((sum, row) => sum + row.length, 0);
    if (score > bestScore) {
      bestScore = score;
      bestRows = rows;
    }
  }

  return bestRows;
}

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\r' || char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && next === '\n') index += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function readXlsxRows(buffer: Buffer): string[][] {
  const zip = new AdmZip(buffer);
  const workbookXml = readZipText(zip, 'xl/workbook.xml');
  const relsXml = readZipText(zip, 'xl/_rels/workbook.xml.rels');
  const sheetPath = firstWorksheetPath(workbookXml, relsXml);
  const sharedStrings = parseSharedStrings(readOptionalZipText(zip, 'xl/sharedStrings.xml') || '');
  const worksheetXml = readZipText(zip, sheetPath);
  return parseWorksheetXml(worksheetXml, sharedStrings);
}

function firstWorksheetPath(workbookXml: string, relsXml: string): string {
  const sheetMatch = workbookXml.match(/<sheet\b[^>]*>/i);
  if (!sheetMatch) throw new Error('Excel 文件没有工作表。');

  const relationshipId = getXmlAttribute(sheetMatch[0], 'r:id');
  if (!relationshipId) throw new Error('Excel 工作表关系资料不完整。');

  const relationships = [...relsXml.matchAll(/<Relationship\b[^>]*>/gi)];
  const relationship = relationships.find((match) => getXmlAttribute(match[0], 'Id') === relationshipId);
  const target = relationship ? getXmlAttribute(relationship[0], 'Target') : '';
  if (!target) throw new Error('Excel 工作表路径资料不完整。');

  if (target.startsWith('/')) return target.slice(1);
  return path.posix.normalize(`xl/${target}`);
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) => extractXmlText(match[1]));
}

function parseWorksheetXml(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi)) {
    const rowNumber = Number(getXmlAttribute(`<row ${rowMatch[1]}>`, 'r')) || rows.length + 1;
    const values: string[] = [];
    let nextColumn = 0;

    for (const cellMatch of rowMatch[2].matchAll(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/gi)) {
      const cellXml = cellMatch[0];
      const openTag = cellXml.match(/^<c\b[^>]*\/?>/i)?.[0] || '';
      const ref = getXmlAttribute(openTag, 'r');
      const columnIndex = ref ? columnIndexFromRef(ref) : nextColumn;
      values[columnIndex] = readXlsxCellValue(cellXml, openTag, sharedStrings);
      nextColumn = columnIndex + 1;
    }

    rows[rowNumber - 1] = values;
  }

  return rows;
}

function readXlsxCellValue(cellXml: string, openTag: string, sharedStrings: string[]): string {
  const type = getXmlAttribute(openTag, 't');
  if (type === 'inlineStr') return extractXmlText(cellXml);

  const valueMatch = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
  const rawValue = valueMatch ? decodeXml(valueMatch[1]) : '';
  if (type === 's') return sharedStrings[Number(rawValue)] || '';
  if (type === 'b') return rawValue === '1' ? 'TRUE' : rawValue === '0' ? 'FALSE' : rawValue;
  return rawValue;
}

function readXlsRows(buffer: Buffer): string[][] {
  if (isOleCompoundFile(buffer)) return readBinaryXlsRows(buffer);

  const text = decodeText(buffer);
  if (/<Workbook[\s>]/i.test(text) && /<Worksheet[\s>]/i.test(text)) return parseExcelXmlRows(text);
  if (/<table[\s>]/i.test(text)) return parseHtmlTableRows(text);
  return parseDelimitedText(text);
}

function parseExcelXmlRows(xml: string): string[][] {
  const tableMatch = xml.match(/<Table\b[^>]*>([\s\S]*?)<\/Table>/i);
  if (!tableMatch) throw new Error('XLS XML 文件没有工作表资料。');

  const rows: string[][] = [];
  for (const rowMatch of tableMatch[1].matchAll(/<Row\b[^>]*>([\s\S]*?)<\/Row>/gi)) {
    const row: string[] = [];
    let columnIndex = 0;
    for (const cellMatch of rowMatch[1].matchAll(/<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi)) {
      const explicitIndex = Number(getXmlAttribute(`<Cell ${cellMatch[1]}>`, 'ss:Index') || getXmlAttribute(`<Cell ${cellMatch[1]}>`, 'Index'));
      if (explicitIndex > 0) columnIndex = explicitIndex - 1;
      row[columnIndex] = extractSpreadsheetXmlCellText(cellMatch[2]);
      columnIndex += 1;
    }
    rows.push(row);
  }
  return rows;
}

function parseHtmlTableRows(html: string): string[][] {
  const tableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) throw new Error('HTML XLS 文件没有表格资料。');

  const rows: string[][] = [];
  for (const rowMatch of tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlToText(cell[1]));
    if (row.length) rows.push(row);
  }
  return rows;
}

function writeXlsx(filePath: string, rows: string[][], sheetName: string): void {
  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml(), 'utf8'));
  zip.addFile('_rels/.rels', Buffer.from(rootRelsXml(), 'utf8'));
  zip.addFile('docProps/app.xml', Buffer.from(appPropsXml(), 'utf8'));
  zip.addFile('docProps/core.xml', Buffer.from(corePropsXml(), 'utf8'));
  zip.addFile('xl/workbook.xml', Buffer.from(workbookXml(sheetName), 'utf8'));
  zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(workbookRelsXml(), 'utf8'));
  zip.addFile('xl/styles.xml', Buffer.from(stylesXml(), 'utf8'));
  zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(worksheetXml(rows), 'utf8'));
  zip.writeZip(filePath);
}

function worksheetXml(rows: string[][]): string {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const dimension = rows.length && maxColumns ? `A1:${columnName(maxColumns - 1)}${rows.length}` : 'A1';
  const columnDefs = Array.from({ length: maxColumns }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="24" customWidth="1"/>`).join('');
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return xmlDeclaration(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <cols>${columnDefs}</cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`);
}

function contentTypesXml(): string {
  return xmlDeclaration(`\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
}

function rootRelsXml(): string {
  return xmlDeclaration(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function workbookXml(sheetName: string): string {
  return xmlDeclaration(`\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);
}

function workbookRelsXml(): string {
  return xmlDeclaration(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function stylesXml(): string {
  return xmlDeclaration(`\
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`);
}

function appPropsXml(): string {
  return xmlDeclaration(`\
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Ancestor Tablet Search</Application>
</Properties>`);
}

function corePropsXml(): string {
  const now = new Date().toISOString();
  return xmlDeclaration(`\
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Ancestor Tablet Search</dc:creator>
  <cp:lastModifiedBy>Ancestor Tablet Search</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`);
}

function xmlDeclaration(xml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`;
}

function readBinaryXlsRows(buffer: Buffer): string[][] {
  const workbook = readCompoundWorkbookStream(buffer);
  return parseBiffWorkbook(workbook);
}

function readCompoundWorkbookStream(buffer: Buffer): Buffer {
  const sectorSize = 1 << buffer.readUInt16LE(30);
  const miniSectorSize = 1 << buffer.readUInt16LE(32);
  const fatSectorCount = buffer.readInt32LE(44);
  const directoryStart = buffer.readInt32LE(48);
  const miniStreamCutoff = buffer.readUInt32LE(56);
  const miniFatStart = buffer.readInt32LE(60);
  const miniFatSectorCount = buffer.readInt32LE(64);
  const difatStart = buffer.readInt32LE(68);
  const difatSectorCount = buffer.readInt32LE(72);

  const sector = (sectorId: number) => {
    const offset = 512 + sectorId * sectorSize;
    if (sectorId < 0 || offset < 512 || offset + sectorSize > buffer.length) throw new Error('XLS 文件结构不完整。');
    return buffer.subarray(offset, offset + sectorSize);
  };

  const difat: number[] = [];
  for (let index = 0; index < 109; index += 1) {
    const sectorId = buffer.readInt32LE(76 + index * 4);
    if (sectorId >= 0) difat.push(sectorId);
  }

  let nextDifat = difatStart;
  for (let count = 0; count < difatSectorCount && nextDifat >= 0; count += 1) {
    const data = sector(nextDifat);
    const entries = sectorSize / 4 - 1;
    for (let index = 0; index < entries; index += 1) {
      const sectorId = data.readInt32LE(index * 4);
      if (sectorId >= 0) difat.push(sectorId);
    }
    nextDifat = data.readInt32LE(entries * 4);
  }

  const fat: number[] = [];
  for (const sectorId of difat.slice(0, fatSectorCount)) {
    const data = sector(sectorId);
    for (let offset = 0; offset < data.length; offset += 4) fat.push(data.readInt32LE(offset));
  }

  const readRegularStream = (startSector: number, size?: number) => {
    const chunks: Buffer[] = [];
    const seen = new Set<number>();
    let current = startSector;
    while (current >= 0 && current < fat.length && !seen.has(current)) {
      seen.add(current);
      chunks.push(sector(current));
      const next = fat[current];
      if (next === -2) break;
      current = next;
    }
    const data = Buffer.concat(chunks);
    return typeof size === 'number' ? data.subarray(0, size) : data;
  };

  const directory = readRegularStream(directoryStart);
  const entries = readDirectoryEntries(directory);
  const workbookEntry = entries.find((entry) => entry.type === 2 && /^(Workbook|Book)$/i.test(entry.name));
  if (!workbookEntry) throw new Error('XLS 文件没有 Workbook 资料。');

  if (workbookEntry.size >= miniStreamCutoff) return readRegularStream(workbookEntry.startSector, workbookEntry.size);

  const root = entries.find((entry) => entry.type === 5);
  if (!root) throw new Error('XLS 文件根目录资料不完整。');

  const miniFatStream = readRegularStream(miniFatStart, miniFatSectorCount * sectorSize);
  const miniFat: number[] = [];
  for (let offset = 0; offset < miniFatStream.length; offset += 4) miniFat.push(miniFatStream.readInt32LE(offset));

  const miniStream = readRegularStream(root.startSector, root.size);
  const chunks: Buffer[] = [];
  const seen = new Set<number>();
  let current = workbookEntry.startSector;
  while (current >= 0 && current < miniFat.length && !seen.has(current)) {
    seen.add(current);
    const offset = current * miniSectorSize;
    chunks.push(miniStream.subarray(offset, offset + miniSectorSize));
    const next = miniFat[current];
    if (next === -2) break;
    current = next;
  }

  return Buffer.concat(chunks).subarray(0, workbookEntry.size);
}

function readDirectoryEntries(directory: Buffer): Array<{ name: string; type: number; startSector: number; size: number }> {
  const entries: Array<{ name: string; type: number; startSector: number; size: number }> = [];
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const nameLength = directory.readUInt16LE(offset + 64);
    if (nameLength < 2) continue;
    const name = directory.subarray(offset, offset + nameLength - 2).toString('utf16le');
    const type = directory.readUInt8(offset + 66);
    const startSector = directory.readInt32LE(offset + 116);
    const size = directory.readUInt32LE(offset + 120);
    entries.push({ name, type, startSector, size });
  }
  return entries;
}

function parseBiffWorkbook(workbook: Buffer): string[][] {
  const sharedStrings: string[] = [];
  const sheets: Array<{ offset: number; name: string }> = [];
  let offset = 0;

  while (offset + 4 <= workbook.length) {
    const opcode = workbook.readUInt16LE(offset);
    const length = workbook.readUInt16LE(offset + 2);
    const payloadStart = offset + 4;
    const payloadEnd = payloadStart + length;
    if (payloadEnd > workbook.length) break;
    const payload = workbook.subarray(payloadStart, payloadEnd);

    if (opcode === 0x0085 && payload.length >= 8) {
      const sheetOffset = payload.readUInt32LE(0);
      const nameLength = payload.readUInt8(6);
      const flags = payload.readUInt8(7);
      const nameBytes = flags & 0x01 ? nameLength * 2 : nameLength;
      const name = payload.subarray(8, 8 + nameBytes).toString(flags & 0x01 ? 'utf16le' : 'latin1');
      sheets.push({ offset: sheetOffset, name });
    }

    if (opcode === 0x00fc) {
      const chunks = [payload];
      let nextOffset = payloadEnd;
      while (nextOffset + 4 <= workbook.length && workbook.readUInt16LE(nextOffset) === 0x003c) {
        const continueLength = workbook.readUInt16LE(nextOffset + 2);
        chunks.push(workbook.subarray(nextOffset + 4, nextOffset + 4 + continueLength));
        nextOffset += 4 + continueLength;
      }
      sharedStrings.push(...parseBiffSharedStrings(Buffer.concat(chunks)));
      offset = nextOffset;
      continue;
    }

    if (opcode === 0x000a && sheets.length) break;
    offset = payloadEnd;
  }

  const firstSheetOffset = sheets[0]?.offset ?? findFirstWorksheetOffset(workbook);
  if (firstSheetOffset < 0 || firstSheetOffset >= workbook.length) throw new Error('XLS 文件没有可读取的工作表。');
  return parseBiffSheet(workbook.subarray(firstSheetOffset), sharedStrings);
}

function findFirstWorksheetOffset(workbook: Buffer): number {
  let offset = 0;
  let seenGlobal = false;
  while (offset + 4 <= workbook.length) {
    const opcode = workbook.readUInt16LE(offset);
    const length = workbook.readUInt16LE(offset + 2);
    if (opcode === 0x0809) {
      if (seenGlobal) return offset;
      seenGlobal = true;
    }
    offset += 4 + length;
  }
  return -1;
}

function parseBiffSharedStrings(payload: Buffer): string[] {
  if (payload.length < 8) return [];
  const strings: string[] = [];
  const uniqueCount = payload.readUInt32LE(4);
  let offset = 8;
  for (let index = 0; index < uniqueCount && offset < payload.length; index += 1) {
    const parsed = readBiffString(payload, offset);
    if (!parsed) break;
    strings.push(parsed.value);
    offset = parsed.nextOffset;
  }
  return strings;
}

function parseBiffSheet(sheet: Buffer, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  let offset = 0;

  while (offset + 4 <= sheet.length) {
    const opcode = sheet.readUInt16LE(offset);
    const length = sheet.readUInt16LE(offset + 2);
    const payloadStart = offset + 4;
    const payloadEnd = payloadStart + length;
    if (payloadEnd > sheet.length) break;
    const payload = sheet.subarray(payloadStart, payloadEnd);

    if (opcode === 0x000a) break;
    if (opcode === 0x00fd && payload.length >= 10) {
      setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), sharedStrings[payload.readUInt32LE(6)] || '');
    } else if (opcode === 0x0203 && payload.length >= 14) {
      setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), formatNumber(payload.readDoubleLE(6)));
    } else if (opcode === 0x027e && payload.length >= 10) {
      setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), formatNumber(decodeRk(payload.readUInt32LE(6))));
    } else if (opcode === 0x00bd && payload.length >= 8) {
      const row = payload.readUInt16LE(0);
      const firstColumn = payload.readUInt16LE(2);
      const lastColumn = payload.readUInt16LE(payload.length - 2);
      for (let column = firstColumn, position = 4; column <= lastColumn && position + 6 <= payload.length - 2; column += 1, position += 6) {
        setSheetCell(rows, row, column, formatNumber(decodeRk(payload.readUInt32LE(position + 2))));
      }
    } else if ((opcode === 0x0204 || opcode === 0x00d6) && payload.length >= 8) {
      const parsed = readBiffString(payload, 6) || readLegacyBiffLabel(payload, 6);
      setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), parsed?.value || '');
    } else if (opcode === 0x0205 && payload.length >= 8) {
      const value = payload.readUInt8(7) ? '' : payload.readUInt8(6) ? 'TRUE' : 'FALSE';
      setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), value);
    } else if (opcode === 0x0006 && payload.length >= 14) {
      const value = readFormulaValue(payload.subarray(6, 14));
      if (value) setSheetCell(rows, payload.readUInt16LE(0), payload.readUInt16LE(2), value);
    }

    offset = payloadEnd;
  }

  return rows;
}

function readBiffString(buffer: Buffer, offset: number): { value: string; nextOffset: number } | null {
  if (offset + 3 > buffer.length) return null;
  const charCount = buffer.readUInt16LE(offset);
  const flags = buffer.readUInt8(offset + 2);
  let cursor = offset + 3;
  let richTextRuns = 0;
  let extendedSize = 0;

  if (flags & 0x08) {
    if (cursor + 2 > buffer.length) return null;
    richTextRuns = buffer.readUInt16LE(cursor);
    cursor += 2;
  }
  if (flags & 0x04) {
    if (cursor + 4 > buffer.length) return null;
    extendedSize = buffer.readUInt32LE(cursor);
    cursor += 4;
  }

  const isWide = Boolean(flags & 0x01);
  const byteLength = charCount * (isWide ? 2 : 1);
  if (cursor + byteLength > buffer.length) return null;
  const value = buffer.subarray(cursor, cursor + byteLength).toString(isWide ? 'utf16le' : 'latin1');
  cursor += byteLength + richTextRuns * 4 + extendedSize;
  return { value, nextOffset: cursor };
}

function readLegacyBiffLabel(buffer: Buffer, offset: number): { value: string; nextOffset: number } | null {
  if (offset + 2 > buffer.length) return null;
  const charCount = buffer.readUInt16LE(offset);
  const start = offset + 2;
  const end = start + charCount;
  if (end > buffer.length) return null;
  return { value: buffer.subarray(start, end).toString('latin1'), nextOffset: end };
}

function readFormulaValue(bytes: Buffer): string {
  if (bytes[6] === 0xff && bytes[7] === 0xff) {
    if (bytes[0] === 1) return bytes[2] ? 'TRUE' : 'FALSE';
    return '';
  }
  return formatNumber(bytes.readDoubleLE(0));
}

function decodeRk(raw: number): number {
  let value: number;
  if (raw & 0x02) value = raw >> 2;
  else {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(0, 0);
    buffer.writeUInt32LE((raw & 0xfffffffc) >>> 0, 4);
    value = buffer.readDoubleLE(0);
  }
  return raw & 0x01 ? value / 100 : value;
}

function setSheetCell(rows: string[][], rowIndex: number, columnIndex: number, value: string): void {
  if (!rows[rowIndex]) rows[rowIndex] = [];
  rows[rowIndex][columnIndex] = value;
}

function readZipText(zip: AdmZip, entryPath: string): string {
  const text = readOptionalZipText(zip, entryPath);
  if (text == null) throw new Error(`Excel 文件缺少 ${entryPath}。`);
  return text;
}

function readOptionalZipText(zip: AdmZip, entryPath: string): string | null {
  const entry = zip.getEntry(entryPath);
  if (!entry) return null;
  return zip.readAsText(entry, 'utf8');
}

function getXmlAttribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\s${escaped}="([^"]*)"`, 'i'));
  return match ? decodeXml(match[1]) : null;
}

function extractXmlText(xml: string): string {
  return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((match) => decodeXml(match[1])).join('');
}

function extractSpreadsheetXmlCellText(xml: string): string {
  const dataMatch = xml.match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
  const value = dataMatch ? dataMatch[1] : xml;
  return decodeXml(value.replace(/<[^>]+>/g, '').trim());
}

function htmlToText(html: string): string {
  return decodeXml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_entity, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_entity, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnIndexFromRef(ref: string): number {
  const letters = ref.match(/[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function columnName(index: number): string {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function decodeText(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString('utf16le');
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return swapUtf16Bytes(buffer.subarray(2)).toString('utf16le');

  const sample = buffer.subarray(0, Math.min(buffer.length, 1000));
  let oddNulls = 0;
  let evenNulls = 0;
  for (let index = 0; index < sample.length; index += 1) {
    if (sample[index] === 0) {
      if (index % 2) oddNulls += 1;
      else evenNulls += 1;
    }
  }
  if (oddNulls > evenNulls * 2 && oddNulls > 10) return buffer.toString('utf16le');

  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function swapUtf16Bytes(buffer: Buffer): Buffer {
  const swapped = Buffer.from(buffer);
  for (let index = 0; index + 1 < swapped.length; index += 2) {
    const first = swapped[index];
    swapped[index] = swapped[index + 1];
    swapped[index + 1] = first;
  }
  return swapped;
}

function isOleCompoundFile(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
}

function normalizeHeader(value: string): string {
  return cleanCell(value)
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
  return path.basename(trimmed);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value - Math.round(value)) < 0.000000001) return String(Math.round(value));
  return String(value);
}

function ensureExtension(filePath: string, extension: string): string {
  return path.extname(filePath) ? filePath : `${filePath}${extension}`;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
