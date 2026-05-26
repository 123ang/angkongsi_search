import Database from 'better-sqlite3';
import { getAppPaths } from './paths';
import { log } from './logger';
import type { AncestorInput, AncestorRecord, ImportResult, SearchOptions } from './types';

let db: Database.Database | null = null;

const columns = [
  'record_code',
  'chinese_name',
  'english_name',
  'spouses',
  'tablet_location',
  'birth_year',
  'death_year',
  'origin_place',
  'photo_path',
  'remarks'
] as const;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getAppPaths().dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase(db);
    log('Database opened');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    log('Database closed');
  }
}

function initializeDatabase(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ancestor_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_code TEXT UNIQUE,
      chinese_name TEXT NOT NULL,
      english_name TEXT,
      spouses TEXT DEFAULT '[]',
      tablet_location TEXT NOT NULL,
      birth_year TEXT,
      death_year TEXT,
      origin_place TEXT,
      photo_path TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateDatabase(database);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_chinese_name ON ancestor_records(chinese_name);
    CREATE INDEX IF NOT EXISTS idx_english_name ON ancestor_records(english_name);
    CREATE INDEX IF NOT EXISTS idx_tablet_location ON ancestor_records(tablet_location);
    CREATE INDEX IF NOT EXISTS idx_origin_place ON ancestor_records(origin_place);
  `);

}

function migrateDatabase(database: Database.Database): void {
  const existing = new Set((database.prepare('PRAGMA table_info(ancestor_records)').all() as Array<{ name: string }>).map((column) => column.name));
  const addColumn = (name: string, definition: string) => {
    if (!existing.has(name)) database.exec(`ALTER TABLE ancestor_records ADD COLUMN ${name} ${definition}`);
  };

  addColumn('english_name', 'TEXT');
  addColumn('spouses', "TEXT DEFAULT '[]'");
  addColumn('tablet_location', "TEXT DEFAULT ''");
  addColumn('birth_year', 'TEXT');
  addColumn('death_year', 'TEXT');
  addColumn('origin_place', 'TEXT');
  addColumn('photo_path', 'TEXT');
  addColumn('remarks', 'TEXT');
  addColumn('updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

  if (existing.has('spouse_1') || existing.has('spouse_2') || existing.has('spouse_3')) {
    const rows = database
      .prepare("SELECT id, spouses, spouse_1, spouse_2, spouse_3 FROM ancestor_records WHERE spouses IS NULL OR spouses = '' OR spouses = '[]'")
      .all() as Array<{ id: number; spouses?: string; spouse_1?: string; spouse_2?: string; spouse_3?: string }>;
    const update = database.prepare('UPDATE ancestor_records SET spouses = @spouses WHERE id = @id');
    for (const row of rows) {
      const spouses = [row.spouse_1, row.spouse_2, row.spouse_3].map((value) => value?.trim()).filter(Boolean);
      update.run({ id: row.id, spouses: JSON.stringify(spouses) });
    }
  }
}

function normalizeInput(input: AncestorInput): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const column of columns) {
    const value = input[column];
    if (column === 'spouses') {
      normalized.spouses = JSON.stringify(normalizeSpouses(value));
    } else {
      normalized[column] = value == null ? '' : String(value);
    }
  }
  return normalized;
}

function normalizeSpouses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeSpouses(parsed);
    } catch {
      return value.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapRecord(record: AncestorRecord): AncestorRecord {
  return { ...record, spouses: normalizeSpouses(record.spouses) };
}

export function searchRecords({ keyword }: SearchOptions): AncestorRecord[] {
  const trimmed = keyword.trim();
  if (!trimmed) return listRecords();

  const like = `%${trimmed}%`;
  return (getDb()
    .prepare(`
      SELECT *
      FROM ancestor_records
      WHERE record_code LIKE @like OR chinese_name LIKE @like OR english_name LIKE @like OR
        spouses LIKE @like OR tablet_location LIKE @like OR origin_place LIKE @like OR remarks LIKE @like
      ORDER BY
        CASE
          WHEN record_code = @keyword THEN 1
          WHEN chinese_name = @keyword THEN 2
          WHEN chinese_name LIKE @like THEN 3
          WHEN english_name LIKE @like THEN 4
          WHEN spouses LIKE @like THEN 5
          WHEN tablet_location LIKE @like THEN 6
          WHEN origin_place LIKE @like THEN 7
          ELSE 8
        END,
        chinese_name ASC
    `)
    .all({ keyword: trimmed, like }) as AncestorRecord[]).map(mapRecord);
}

export function listRecords(): AncestorRecord[] {
  return (getDb()
    .prepare('SELECT * FROM ancestor_records ORDER BY updated_at DESC, chinese_name ASC')
    .all() as AncestorRecord[]).map(mapRecord);
}

export function getRecord(id: number): AncestorRecord | null {
  const record = getDb().prepare('SELECT * FROM ancestor_records WHERE id = ?').get(id) as AncestorRecord | undefined;
  return record ? mapRecord(record) : null;
}

export function createRecord(input: AncestorInput): AncestorRecord {
  validateRecord(input);
  const record = normalizeInput({ ...input, record_code: input.record_code || nextRecordCode() });
  const result = getDb()
    .prepare(`
      INSERT INTO ancestor_records (${columns.join(', ')})
      VALUES (${columns.map((column) => `@${column}`).join(', ')})
    `)
    .run(record);
  log(`Record added ${record.record_code}`);
  return getRecord(Number(result.lastInsertRowid)) as AncestorRecord;
}

export function updateRecord(id: number, input: AncestorInput): AncestorRecord {
  validateRecord(input);
  const record = normalizeInput(input);
  getDb()
    .prepare(`
      UPDATE ancestor_records SET
        ${columns.map((column) => `${column} = @${column}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    .run({ ...record, id });
  log(`Record edited ${record.record_code || id}`);
  return getRecord(id) as AncestorRecord;
}

export function deleteRecord(id: number): void {
  getDb().prepare('DELETE FROM ancestor_records WHERE id = ?').run(id);
  log(`Record deleted ${id}`);
}

export function importRecords(inputs: AncestorInput[], backupPath: string, sourcePath: string): ImportResult {
  const seenCodes = new Set<string>();
  for (const input of inputs) {
    const code = input.record_code?.trim();
    if (!code) continue;
    const normalizedCode = code.toLocaleLowerCase();
    if (seenCodes.has(normalizedCode)) throw new Error(`导入档案内有重复记录编号：${code}`);
    seenCodes.add(normalizedCode);
  }

  const stats = { inserted: 0, updated: 0 };
  const database = getDb();
  const findByCode = database.prepare('SELECT id FROM ancestor_records WHERE lower(record_code) = lower(?)');
  const insert = database.prepare(`
    INSERT INTO ancestor_records (${columns.join(', ')})
    VALUES (${columns.map((column) => `@${column}`).join(', ')})
  `);
  const updateByCode = database.prepare(`
    UPDATE ancestor_records SET
      ${columns.map((column) => `${column} = @${column}`).join(', ')},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  const importMany = database.transaction((records: AncestorInput[]) => {
    for (const input of records) {
      validateRecord(input);
      const requestedCode = input.record_code?.trim() || '';
      const existing = requestedCode ? (findByCode.get(requestedCode) as { id: number } | undefined) : undefined;
      const record = normalizeInput({
        ...input,
        record_code: requestedCode || nextRecordCode()
      });

      if (existing) {
        updateByCode.run({ ...record, id: existing.id });
        stats.updated += 1;
      } else {
        insert.run(record);
        stats.inserted += 1;
      }
    }
  });

  importMany(inputs);
  log(`Records imported from ${sourcePath}: ${stats.inserted} inserted, ${stats.updated} updated`);

  return {
    sourcePath,
    backupPath,
    totalRows: inputs.length,
    ...stats
  };
}

export function nextRecordCode(): string {
  const row = getDb()
    .prepare("SELECT record_code FROM ancestor_records WHERE record_code LIKE 'A%' ORDER BY record_code DESC LIMIT 1")
    .get() as { record_code: string } | undefined;
  const next = row ? Number(row.record_code.replace(/\D/g, '')) + 1 : 1;
  return `A${String(next).padStart(4, '0')}`;
}

function validateRecord(input: AncestorInput): void {
  if (!input.chinese_name?.trim()) throw new Error('请输入中文姓名。');
  if (!input.tablet_location?.trim()) throw new Error('请输入神主牌位置。');
}
