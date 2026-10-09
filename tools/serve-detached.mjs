/* Detached static server launcher: starts tools/_serve.mjs as an independent
   process that survives the calling shell. Windows-friendly.
   Run: node tools/serve-detached.mjs <port> [rootDir] */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.argv[2] || '4237';
const dir = process.argv[3] || ROOT;

const child = spawn(process.execPath, [path.join(ROOT, 'tools/_serve.mjs'), port], {
  cwd: path.resolve(dir),
  detached: true,
  stdio: 'ignore'
});
child.unref();
console.log(`  serving ${dir} on http://localhost:${port} (pid ${child.pid})`);