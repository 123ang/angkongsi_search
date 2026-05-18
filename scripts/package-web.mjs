import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const source = resolve(projectRoot, 'dist/web/index.html');
const outDir = resolve(projectRoot, 'release/web');
const destination = resolve(outDir, '神主牌搜寻系统.html');

if (!existsSync(source)) {
  console.error(`Browser build output not found at ${source}. Run \`npm run build:web\` first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, destination);

const bytes = statSync(destination).size;
const megabytes = (bytes / (1024 * 1024)).toFixed(2);
console.log(`Wrote browser bundle: ${destination} (${megabytes} MB)`);
console.log('Copy this single file to any Windows PC and double-click it. It will open in Chrome or Edge and run entirely offline.');
