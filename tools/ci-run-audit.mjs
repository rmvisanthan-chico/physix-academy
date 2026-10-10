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
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
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
    const { spawn, spawnSync } = await import('node:child_process');
  /* Resolve vite through Node's own resolution rather than a hardcoded path.
     This looked fine locally and failed in CI, twice. tools/ci-run-audit.mjs
     called ROOT/node_modules/vite/bin/vite.js directly - a path that happens to
     exist on a developer machine with a warm node_modules, and does NOT exist on
     a runner, where vite is installed into an isolated prefix and exposed via
     NODE_PATH precisely so the repository's own dependency tree is left alone.
     require.resolve honours NODE_PATH, so this works in both places and fails
     with a legible message instead of a MODULE_NOT_FOUND from inside vite. */
  /* Resolve vite, then drive its programmatic build API.
     Two earlier approaches both looked right and were wrong:
       - a hardcoded ROOT/node_modules/vite/bin/vite.js path, which exists on a
         developer machine with a warm node_modules and does NOT exist on a CI
         runner, where vite lives in an isolated prefix. That failed both remote
         runs.
       - require.resolve('vite/bin/vite.js'), which throws
         ERR_PACKAGE_PATH_NOT_EXPORTED because vite's exports map does not
         publish that path.
     require.resolve('vite') is the supported entry point AND honours NODE_PATH,
     which a bare import() does not. The resolved path becomes a file URL because
     import() rejects raw Windows paths. */
  let vite = null;
  try {
    const viteEntry = createRequire(path.join(ROOT, 'tools', 'ci-run-audit.mjs')).resolve('vite');
    vite = await import(pathToFileURL(viteEntry).href);
    log('  vite resolved: ' + viteEntry + (vite.version ? ' (v' + vite.version + ')' : ''));
  } catch (e) {
    log('CANNOT RESOLVE vite: ' + (e && e.message ? e.message : e));
    log('  Install vite, or set NODE_PATH to a prefix that contains it.');
    results.push({ label: 'build', pass: false });
    vite = null;
  }

  if (!SKIP_BUILD && TARGETS.includes('bundled') && vite) {
    log('building production bundle (vite build) ...');
    let builtOk = false;
    try {
      await vite.build({ root: ROOT, logLevel: 'warn' });
      builtOk = fs.existsSync(path.join(DIST, 'index.html'));
      if (!builtOk) log('vite.build returned but dist/index.html is MISSING');
    } catch (e) {
      log('vite.build threw: ' + (e && e.message ? e.message : e));
      builtOk = false;
    }
    results.push({ label: 'build', pass: builtOk });
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