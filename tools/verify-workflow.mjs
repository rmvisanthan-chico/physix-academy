/* PhysiX Academy — workflow schema sanity check.
 *
 * Written because this workflow once carried `timeout-minutes` at the TOP level,
 * which GitHub rejects with "Unexpected value 'timeout-minutes'" before any job
 * starts. That is a whole class of mistake: a key that is legal YAML but illegal
 * in that position, and it is invisible locally because nothing runs.
 *
 * Two earlier versions of this checker were themselves wrong and are the reason
 * this note exists:
 *   1. it collected every indented key as a job key, flagging env:/steps: children;
 *   2. it treated indent-2 keys under `on:`/`concurrency:`/`permissions:` as the
 *      job, because those blocks also have indent-2 children.
 * The fix is to anchor on `jobs:` and then measure depth relative to it.
 */
import fs from 'node:fs';

const file = '.github/workflows/simulation-health-audit.yml';
const src = fs.readFileSync(file, 'utf8');

const WORKFLOW_LEVEL = new Set(['name', 'on', 'permissions', 'concurrency', 'env', 'defaults', 'run-name', 'jobs']);
const JOB_LEVEL = new Set([
  'name', 'runs-on', 'timeout-minutes', 'strategy', 'needs', 'if', 'permissions',
  'env', 'defaults', 'container', 'services', 'outputs', 'steps'
]);

const problems = [];

/* (indent, key, line) for every mapping key. */
const keys = [];
src.split(/\r?\n/).forEach((raw, i) => {
  if (!raw.trim() || /^\s*#/.test(raw)) return;
  const m = /^(\s*)([A-Za-z_][\w.-]*):/.exec(raw);
  if (m) keys.push({ indent: m[1].length, key: m[2], line: i + 1 });
});

const workflowKeys = keys.filter(k => k.indent === 0).map(k => k.key);
const jobsLine = keys.find(k => k.indent === 0 && k.key === 'jobs');
if (!jobsLine) {
  problems.push('no `jobs:` block found');
}

let jobId = null;
let jobKeys = [];
if (jobsLine) {
  const after = keys.filter(k => k.line > jobsLine.line);
  const id = after.find(k => k.indent === 2);
  jobId = id ? id.key : null;
  if (id) jobKeys = after.filter(k => k.line > id.line && k.indent === 4).map(k => k.key);
}

workflowKeys.forEach(k => {
  if (!WORKFLOW_LEVEL.has(k)) problems.push(`"${k}" is not a valid workflow-level key`);
});
jobKeys.forEach(k => {
  if (!JOB_LEVEL.has(k)) problems.push(`"${k}" is not a valid job-level key`);
});

/* The specific regression this file exists for. */
if (workflowKeys.includes('timeout-minutes')) {
  problems.push('timeout-minutes is at workflow level - GitHub rejects the file and no job ever runs');
}
if (!jobKeys.includes('timeout-minutes')) {
  problems.push('timeout-minutes is missing from the job');
}

if (!/^ {6}- (name|uses|run):/m.test(src)) problems.push('no steps found at 6-space indentation under the job');
if (/\t/.test(src)) problems.push('tab character present - invalid YAML');
if (!/node tools\/ci-run-audit\.mjs/.test(src)) problems.push('the audit runner is not invoked');

[["concurrency + cancel-in-progress", /cancel-in-progress:\s*true/],
 ["read-only permissions", /contents:\s*read/],
 ["push trigger on main", /push:\s*\r?\n\s*branches:\s*\[main\]/],
 ["pull_request trigger on main", /pull_request:\s*\r?\n\s*branches:\s*\[main\]/],
 ["manual dispatch", /workflow_dispatch:/],
 ["failure explanation step", /if:\s*failure\(\)/],
 ["own browser provisioned", /PW_CHANNEL:\s*chromium/],
 ["isolated dependency prefix", /DEPS="\$\{RUNNER_TEMP\}\/ci-deps"/],
 ["no bare npm install in repo", /npm install --prefix "\$DEPS"/]
].forEach(([label, re]) => { if (!re.test(src)) problems.push(`lost: ${label}`); });

console.log('  workflow-level keys : ' + workflowKeys.join(', '));
console.log('  job id              : ' + jobId);
console.log('  job-level keys      : ' + jobKeys.join(', '));

if (problems.length) {
  console.log('\n  PROBLEMS:');
  [...new Set(problems)].forEach(p => console.log('    x ' + p));
  console.log('\n  ' + new Set(problems).size + ' problem(s)');
  process.exit(1);
}
console.log('\n  workflow shape OK');