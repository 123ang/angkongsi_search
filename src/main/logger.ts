import fs from 'node:fs';
import path from 'node:path';
import { getAppPaths } from './paths';

export function log(message: string, error?: unknown): void {
  const { logsDir } = getAppPaths();
  const detail = error instanceof Error ? ` ${error.stack ?? error.message}` : error ? ` ${String(error)}` : '';
  const line = `[${new Date().toISOString()}] ${message}${detail}\n`;
  fs.appendFileSync(path.join(logsDir, 'app.log'), line, 'utf8');
}
