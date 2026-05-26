import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
// @ts-expect-error vite handles the ?url query suffix and inlines the wasm
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { getDbBytes, setDbBytes } from './idbStore';
import type { AncestorInput, AncestorRecord, ImportResult } from '../types';

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

type ColumnName = (typeof columns)[number];

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbInstance: Database | null = null;
let loadingPromise: Promise<Database> | null = null;
let persistChain: Promise<void> = Promise.resolve();

function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  return sqlPromise;
}

async function loadDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const SQL = await loadSql();
    const existingBytes = await getDbBytes();
    const database = existingBytes ? new SQL.Database(existingBytes) : new SQL.Database();
    initializeDatabase(database);
    if (!existingBytes) await persistNow(database);
    dbInstance = database;
    return database;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

function initializeDatabase(database: Database): void {
  database.run(`
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

  database.run(`
    CREATE INDEX IF NOT EXISTS idx_chinese_name ON ancestor_records(chinese_name);
    CREATE INDEX IF NOT EXISTS idx_english_name ON ancestor_records(english_name);
    CREATE INDEX IF NOT EXISTS idx_tablet_location ON ancestor_records(tablet_location);
    CREATE INDEX IF NOT EXISTS idx_origin_place ON ancestor_records(origin_place);
  `);

}

function migrateDatabase(database: Database): void {
  const existing = new Set(
    (allRows(database, 'PRAGMA table_info(ancestor_records)') as Array<{ name: string }>).map((column) => column.name)
  );

  const addColumn = (name: string, definition: string) => {
    if (!existing.has(name)) database.run(`ALTER TABLE ancestor_records ADD COLUMN ${name} ${definition}`);
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
    const rows = allRows(
      database,
      "SELECT id, spouses, spouse_1, spouse_2, spouse_3 FROM ancestor_records WHERE spouses IS NULL OR spouses = '' OR spouses = '[]'"
    ) as Array<{ id: number; spouses?: string; spouse_1?: string; spouse_2?: string; spouse_3?: string }>;
    for (const row of rows) {
      const spouses = [row.spouse_1, row.spouse_2, row.spouse_3]
        .map((value) => value?.trim())
        .filter(Boolean) as string[];
      database.run('UPDATE ancestor_records SET spouses = ? WHERE id = ?', [JSON.stringify(spouses), row.id]);
    }
  }
}

function normalizeInput(input: AncestorInput): Record<ColumnName, string> {
  const normalized = {} as Record<ColumnName, string>;
  for (const column of columns) {
    if (column === 'spouses') {
      normalized.spouses = JSON.stringify(normalizeSpouses(input.spouses));
    } else {
      const value = input[column];
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
      return value
        .split(/[、,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function allRows(database: Database, sql: string, params: unknown[] = []): Array<Record<string, unknown>> {
  const stmt = database.prepare(sql);
  try {
    if (params.length) stmt.bind(params as never);
    const rows: Array<Record<string, unknown>> = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
    return rows;
  } finally {
    stmt.free();
  }
}

function firstRow(database: Database, sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const rows = allRows(database, sql, params);
  return rows[0] ?? null;
}

function mapRecord(row: Record<string, unknown>): AncestorRecord {
  return {
    id: Number(row.id),
    record_code: String(row.record_code ?? ''),
    chinese_name: String(row.chinese_name ?? ''),
    english_name: row.english_name == null ? null : String(row.english_name),
    spouses: normalizeSpouses(row.spouses),
    tablet_location: String(row.tablet_location ?? ''),
    birth_year: row.birth_year == null ? null : String(row.birth_year),
    death_year: row.death_year == null ? null : String(row.death_year),
    origin_place: row.origin_place == null ? null : String(row.origin_place),
    photo_path: row.photo_path == null ? null : String(row.photo_path),
    remarks: row.remarks == null ? null : String(row.remarks),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? '')
  };
}

async function persistNow(database: Database): Promise<void> {
  const bytes = database.export();
  await setDbBytes(bytes);
}

function persistAsync(database: Database): Promise<void> {
  persistChain = persistChain.then(() => persistNow(database)).catch((error) => {
    console.error('Failed to persist SQLite to IndexedDB', error);
  });
  return persistChain;
}

function validateRecord(input: AncestorInput): void {
  if (!input.chinese_name?.trim()) throw new Error('请输入中文姓名。');
  if (!input.tablet_location?.trim()) throw new Error('请输入神主牌位置。');
}

export async function searchRecords(keyword: string): Promise<AncestorRecord[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return listRecords();
  const database = await loadDatabase();
  const like = `%${trimmed}%`;
  const stmt = database.prepare(`
    SELECT *
    FROM ancestor_records
    WHERE record_code LIKE $like OR chinese_name LIKE $like OR english_name LIKE $like OR
      spouses LIKE $like OR tablet_location LIKE $like OR origin_place LIKE $like OR remarks LIKE $like
    ORDER BY
      CASE
        WHEN record_code = $keyword THEN 1
        WHEN chinese_name = $keyword THEN 2
        WHEN chinese_name LIKE $like THEN 3
        WHEN english_name LIKE $like THEN 4
        WHEN spouses LIKE $like THEN 5
        WHEN tablet_location LIKE $like THEN 6
        WHEN origin_place LIKE $like THEN 7
        ELSE 8
      END,
      chinese_name ASC
  `);
  try {
    stmt.bind({ $keyword: trimmed, $like: like });
    const rows: AncestorRecord[] = [];
    while (stmt.step()) rows.push(mapRecord(stmt.getAsObject() as Record<string, unknown>));
    return rows;
  } finally {
    stmt.free();
  }
}

export async function listRecords(): Promise<AncestorRecord[]> {
  const database = await loadDatabase();
  return allRows(database, 'SELECT * FROM ancestor_records ORDER BY updated_at DESC, chinese_name ASC').map(mapRecord);
}

export async function getRecord(id: number): Promise<AncestorRecord | null> {
  const database = await loadDatabase();
  const row = firstRow(database, 'SELECT * FROM ancestor_records WHERE id = ?', [id]);
  return row ? mapRecord(row) : null;
}

export async function createRecord(input: AncestorInput): Promise<AncestorRecord> {
  validateRecord(input);
  const database = await loadDatabase();
  const recordCode = input.record_code?.trim() || (await nextRecordCodeInternal(database));
  const normalized = normalizeInput({ ...input, record_code: recordCode });
  const placeholders = columns.map(() => '?').join(', ');
  database.run(
    `INSERT INTO ancestor_records (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map((column) => normalized[column])
  );
  const newId = Number((firstRow(database, 'SELECT last_insert_rowid() AS id') ?? {}).id ?? 0);
  await persistAsync(database);
  const created = firstRow(database, 'SELECT * FROM ancestor_records WHERE id = ?', [newId]);
  if (!created) throw new Error('记录创建失败。');
  return mapRecord(created);
}

export async function updateRecord(id: number, input: AncestorInput): Promise<AncestorRecord> {
  validateRecord(input);
  const database = await loadDatabase();
  const normalized = normalizeInput(input);
  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  database.run(
    `UPDATE ancestor_records SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...columns.map((column) => normalized[column]), id]
  );
  await persistAsync(database);
  const row = firstRow(database, 'SELECT * FROM ancestor_records WHERE id = ?', [id]);
  if (!row) throw new Error('记录更新后找不到。');
  return mapRecord(row);
}

export async function deleteRecordById(id: number): Promise<void> {
  const database = await loadDatabase();
  database.run('DELETE FROM ancestor_records WHERE id = ?', [id]);
  await persistAsync(database);
}

async function nextRecordCodeInternal(database: Database): Promise<string> {
  const row = firstRow(
    database,
    "SELECT record_code FROM ancestor_records WHERE record_code LIKE 'A%' ORDER BY record_code DESC LIMIT 1"
  );
  const code = row ? String(row.record_code ?? '') : '';
  const next = code ? Number(code.replace(/\D/g, '')) + 1 : 1;
  return `A${String(next).padStart(4, '0')}`;
}

export async function nextRecordCode(): Promise<string> {
  const database = await loadDatabase();
  return nextRecordCodeInternal(database);
}

export async function importRecords(inputs: AncestorInput[]): Promise<Omit<ImportResult, 'sourcePath' | 'backupPath'>> {
  const seen = new Set<string>();
  for (const input of inputs) {
    const code = input.record_code?.trim();
    if (!code) continue;
    const normalizedCode = code.toLocaleLowerCase();
    if (seen.has(normalizedCode)) throw new Error(`导入档案内有重复记录编号：${code}`);
    seen.add(normalizedCode);
  }

  const database = await loadDatabase();
  const stats = { inserted: 0, updated: 0 };

  database.run('BEGIN');
  try {
    const placeholders = columns.map(() => '?').join(', ');
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const insertStmt = database.prepare(`INSERT INTO ancestor_records (${columns.join(', ')}) VALUES (${placeholders})`);
    const updateStmt = database.prepare(
      `UPDATE ancestor_records SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    const findStmt = database.prepare('SELECT id FROM ancestor_records WHERE lower(record_code) = lower(?)');

    try {
      for (const input of inputs) {
        validateRecord(input);
        const requestedCode = input.record_code?.trim() || '';
        let existingId: number | null = null;
        if (requestedCode) {
          findStmt.reset();
          findStmt.bind([requestedCode]);
          if (findStmt.step()) {
            const row = findStmt.getAsObject() as { id?: number };
            existingId = row.id ?? null;
          }
        }
        const normalized = normalizeInput({
          ...input,
          record_code: requestedCode || (await nextRecordCodeInternal(database))
        });
        const values = columns.map((column) => normalized[column]);
        if (existingId != null) {
          updateStmt.run([...values, existingId]);
          stats.updated += 1;
        } else {
          insertStmt.run(values);
          stats.inserted += 1;
        }
      }
    } finally {
      insertStmt.free();
      updateStmt.free();
      findStmt.free();
    }

    database.run('COMMIT');
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }

  await persistAsync(database);
  return { totalRows: inputs.length, ...stats };
}

export async function exportDbBytes(): Promise<Uint8Array> {
  const database = await loadDatabase();
  return database.export();
}

export async function replaceDbBytes(bytes: Uint8Array): Promise<void> {
  const SQL = await loadSql();
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  const database = new SQL.Database(bytes);
  initializeDatabase(database);
  dbInstance = database;
  await persistNow(database);
}
