/* PhysiX Academy — CI runner for the simulation health audit.
 *
 *   node tools/ci-run-audit.mjs [--skip-build] [--targets=local,bundled,selftest]
 *
 * WHY A RUNNER SCRIPT RATHER THAN SHELL IN THE WORKFLOW
 * Server cleanup has to happen on success, on failure, AND on cancellation. A
 * `trap` in bash does that, but this project is developed on Windows and the
 * workflow would then contain two different orchestration implementations that
 * drift apart. One script means the CI path and the local path are the same code
 * path, so "works locally" and "works in CI" cannot quietly diverge.
 *
 * It also keeps the audit sequential instead of parallel: the audit drives a
 * browser and mutates global page state, and overlapping copies buy nothing but
 * flakiness and a slower wall clock.
 *
 * Exit code is non-zero if ANY target fails, and the failing target's own output
 * (which names the simulation and the check) is streamed to stdout as it runs.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVE = path.join(ROOT, 'tools', '_serve.mjs');
const DIST = path.join(ROOT, 'dist');

const argv = process.argv.slice(2);
const SKIP_BUILD = argv.includes('--skip-build');
const TARGETS = (argv.find(a => a.startsWith('--targets=')) || '')
  .split('=')[1]
  ?.split(',')
  .filter(Boolean) || ['local', 'bundled', 'selftest'];

/* Distinct, non-default ports so a run cannot collide with a developer's local
   server on 4173, which is exactly the situation where an audit mysteriously
   tests the wrong build. */
const PORT_LOCAL = Number(process.env.AUDIT_PORT_LOCAL || 4311);
const PORT_BUNDLED = Number(process.env.AUDIT_PORT_BUNDLED || 4312);

const children = new Set();
let shuttingDown = false;

function log(msg) { console.log(`  ${msg}`); }

function killAll(signal = 'SIGTERM') {
  for (const c of children) {
    try { c.kill(signal); } catch (e) { /* already gone */ }
  }
  children.clear();
}

/* Cancellation must still clean up, or a cancelled run leaves an orphaned server
   holding its port and the next run fails for the wrong reason. */
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n  ${sig} received - stopping servers`);
    killAll();
    process.exit(130);
  });
}

function startServer(root, port, label) {
  if (!fs.existsSync(root)) throw new Error(`${label}: root does not exist: ${root}`);
  const child = spawn(process.execPath, [SERVE, String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  child.stdout.on('data', () => {});
  child.stderr.on('data', d => {
    const s = String(d).trim();
    /* Port-in-use is the failure this whole script exists to make legible. */
    if (s && !/listening on/i.test(s)) console.error(`  [${label} server] ${s}`);
  });
  return { child, port };
}

/* Poll until the server answers, rather than sleeping a fixed amount. A fixed
   sleep is either too short on a loaded runner (spurious failure) or wasteful on
   a fast one. */
function waitForServer(port, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/index.html', timeout: 1500 }, res => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`${label}: server did not become ready on port ${port} within ${timeoutMs}ms`));
      }
      setTimeout(attempt, 200);
    };
    attempt();
  });
}

function runNode(label, args, extraEnv) {
  log(`\n--- ${label} ---`);
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...(extraEnv || {}) }
  });
  if (res.error) throw res.error;
  return res.status === 0;
}

async function main() {
  const results = [];
  
  try {
    if (!SKIP_BUILD && TARGETS.includes('bundled')) {
      log('building production bundle (vite build) ...');
      const built = runNode('vite build', [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']);
      if (!built) {
        log('BUILD FAILED - cannot test the bundled path');
        results.push({ label: 'build', pass: false });
      } else if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        log('BUILD REPORTED SUCCESS BUT dist/index.html IS MISSING');
        results.push({ label: 'build', pass: false });
      } else {
        results.push({ label: 'build', pass: true });
      }
    }

    if (TARGETS.includes('local')) {
      startServer(ROOT, PORT_LOCAL, 'local');
      await waitForServer(PORT_LOCAL, 'local');
      log(`local server ready on http://127.0.0.1:${PORT_LOCAL}`);
      const base = `http://127.0.0.1:${PORT_LOCAL}`;
      results.push({ label: 'audit (unbundled)', pass: runNode('audit vs unbundled', [path.join(ROOT, 'tools', 'audit-sims.mjs'), base]) });
      if (TARGETS.includes('selftest')) {
        results.push({ label: 'audit self-test (proves it can fail)', pass: runNode('audit self-test', [path.join(ROOT, 'tools', 'audit-sims.mjs'), base, '--self-test']) });
      }
    }

    if (TARGETS.includes('bundled') && fs.existsSync(path.join(DIST, 'index.html'))) {
      startServer(DIST, PORT_BUNDLED, 'bundled');
      await waitForServer(PORT_BUNDLED, 'bundled');
      log(`bundled server ready on http://127.0.0.1:${PORT_BUNDLED}`);
      results.push({ label: 'audit (bundled dist)', pass: runNode('audit vs bundled dist', [path.join(ROOT, 'tools', 'audit-sims.mjs'), `http://127.0.0.1:${PORT_BUNDLED}`]) });
    }
  } finally {
    /* Always. This is the whole reason the runner exists. */
    killAll();
    log('\nservers stopped');
  }

  console.log(`\n  ${'='.repeat(70)}`);
  console.log('  CI AUDIT SUMMARY');
  console.log(`  ${'='.repeat(70)}`);
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.label}`);
  const failed = results.filter(r => !r.pass);

  /* GitHub renders $GITHUB_STEP_SUMMARY in the PR "Checks" tab, so a red gate
     tells you WHICH target broke without anyone opening the raw log. Written
     only when that variable exists, so local runs are unaffected. */
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `## Simulation Health Audit\n\n` +
        `| Target | Result |\n|---|---|\n` +
        results.map(r => `| ${r.label} | ${r.pass ? 'PASS' : '**FAIL**'} |`).join('\n') +
        `\n\n${failed.length ? `**${failed.length} target(s) failed.** The simulation and check responsible are named in the step log above.` : 'All targets passed.'}\n`);
    } catch (e) {
      console.log('  (could not write step summary: ' + e.message + ')');
    }
  }

  if (failed.length) {
    console.log(`\n  ${failed.length} target(s) failed. See the per-target output above for the`);
    console.log('  simulation and check responsible.');
    process.exitCode = 1;
  } else {
    console.log('\n  all targets passed');
  }
}

main().catch(err => {
  console.error('\n  RUNNER ERROR: ' + (err && err.message ? err.message : err));
  killAll();
  process.exitCode = 1;
});