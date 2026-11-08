/* PhysiX Academy — CI entry point for Simulation Health Audit
 *
 * Invoked by .github/workflows/simulation-health-audit.yml as:
 *     node tools/ci-run-audit.mjs
 *
 * The old version imported a `runAudit` export that audit-sims.mjs never had
 * and assumed a web server was already listening on port 4311 that no step in
 * the workflow started. It failed with "runAudit is not a function" on every
 * push — including before Phase 4A — while looking like a simulation
 * regression.
 *
 * This version owns both halves of the job:
 *   1. serve the repository root over HTTP (the app is plain static ESM, so no
 *      build step is needed),
 *   2. run the SAME command the passing quality workflow runs:
 *      `node tools/audit-sims.mjs <url>`.
 *
 * The audit's own exit code becomes this script's exit code, so a real
 * simulation regression still fails the job. Nothing here inspects the audit's
 * internals, so the two workflows cannot drift apart again.
 */
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.AUDIT_PORT_LOCAL || 4311);
const BASE = `http://127.0.0.1:${PORT}`;
const AUDIT_SCRIPT = path.resolve(ROOT, 'tools', 'audit-sims.mjs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

async function handler(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, BASE).pathname);
    const rel = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.resolve(ROOT, `.${rel}`);
    /* Refuse anything that escapes the repository (path traversal). */
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}

const server = http.createServer(handler);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, '127.0.0.1', resolve);
});
console.log(`[ci-audit] serving ${ROOT} at ${BASE}`);

let exited = false;
function shutdown() {
  if (exited) return;
  exited = true;
  server.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const child = spawn(process.execPath, [AUDIT_SCRIPT, BASE], {
  stdio: 'inherit',
  env: process.env
});

const code = await new Promise((resolve) => {
  child.on('exit', (c, signal) => resolve(c === null ? (signal ? 1 : 0) : c));
  child.on('error', (e) => {
    console.error('[ci-audit] failed to start the audit:', e);
    resolve(1);
  });
});

shutdown();
process.exit(code);
