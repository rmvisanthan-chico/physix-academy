/* PhysiX Academy — CI entry point for Simulation Health Audit
 *
 * This script is invoked by the GitHub Actions workflow:
 *   .github/workflows/simulation-health-audit.yml
 *
 * It runs the audit-sims.mjs against the locally served application.
 * The server must already be running on the expected ports.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_PORT = process.env.AUDIT_PORT_LOCAL || 4311;
const BASE = `http://127.0.0.1:${AUDIT_PORT}`;

function loadPlaywright() {
  try {
    return createRequire(import.meta.url)('playwright');
  } catch {
    return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))(
      'playwright'
    );
  }
}

const { chromium } = loadPlaywright();

const BASE_URL = BASE;
const AUDIT_SCRIPT = path.resolve(ROOT, 'tools', 'audit-sims.mjs');

async function runAudit() {
  // Import and run the audit
  const { runAudit } = await import(AUDIT_SCRIPT);
  await runAudit(BASE_URL, { chromium });
}

runAudit().catch((e) => {
  console.error('CI audit failed:', e);
  process.exit(1);
});
