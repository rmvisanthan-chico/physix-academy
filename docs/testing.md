# Testing Guide

> PhysiX Academy — test infrastructure and execution. Last verified: 2026-11-03.

## Test pyramid

| Layer            | Tool           | Location                                        | Status                                     |
| ---------------- | -------------- | ----------------------------------------------- | ------------------------------------------ |
| Unit             | node:test      | `tests/unit/*.test.mjs`                         | 44 tests (mastery, quiz-schema, kg-graph)  |
| Integration      | Playwright     | `tools/verify-*.mjs`                            | Existing (graph 63, timecontrols 74, etc.) |
| Simulation audit | Playwright     | `tools/audit-sims.mjs`                          | 51/51 sims, 472/472 checks                 |
| Accessibility    | Playwright     | `tools/audit-a11y.mjs`                          | 26/26 checks                               |
| Performance      | Playwright     | `tools/audit-perf.mjs`                          | 12/12 checks                               |
| CI               | GitHub Actions | `.github/workflows/simulation-health-audit.yml` | Simulation Health Audit                    |

## Running tests

### All unit tests

```bash
node --test tests/unit/
```

### Integration / verification (requires local server)

```bash
# Start server
python -m http.server <port> --bind 127.0.0.1

# Run individual verifiers
node tools/verify-graph.mjs
node tools/verify-timecontrols.mjs
node tools/verify-graph-scheduling.mjs
node tools/verify-simstore.mjs
node tools/verify-prediction.mjs
node tools/verify-dashboard.mjs
node tools/verify-mistakes.mjs

# Audits
node tools/audit-sims.mjs http://localhost:<port>
node tools/audit-a11y.mjs http://localhost:<port>
node tools/audit-perf.mjs http://localhost:<port>
```

### Full quality gate (Phase 4A — requires devDependencies installed)

```bash
npm run verify:4a
```

## Baseline results (2026-11-03, commit d37cee0)

| Suite                   | Result                               |
| ----------------------- | ------------------------------------ |
| audit-sims              | 51/51 sims, 472/472 checks, 0 failed |
| verify-graph            | 63/63 ok                             |
| verify-timecontrols     | 74/74 ok                             |
| verify-graph-scheduling | 37/37 ok                             |
| verify-simstore         | 6/6 ok                               |
| verify-prediction       | 52/52 ok                             |
| verify-dashboard        | 53/53 ok                             |
| verify-mistakes         | 20/20 ok                             |
| audit-a11y              | 26/26 ok                             |
| audit-perf              | 12/12 ok                             |
| Unit tests              | 44 passed, 0 failed                  |
