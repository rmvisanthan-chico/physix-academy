# Release Guide

> PhysiX Academy — release workflow. Last verified: 2026-11-03.

## Overview

Production is served by Vercel with `framework: null` — Vercel serves the repository as authored. Pushes to `main` trigger automatic deployment. There is no build step in production.

## Release process

1. **Feature branch** — create a branch from `origin/main`
2. **Implement + test** — all tests must pass (unit, integration, simulation audit)
3. **Pull Request** — create PR targeting `main`
4. **CI** — `Simulation Health Audit` must pass (51 sims)
5. **Merge** — regular merge (preserve commits, no squash)
6. **Deploy** — Vercel auto-deploys from `main`
7. **Verify** — check production at https://physix-academy.vercel.app

## Rollback

Vercel keeps previous deployments. To rollback:

1. Go to Vercel dashboard → Deployments
2. Find the last known-good deployment
3. Click "Promote to Production"

Or revert the merge commit on GitHub and push — Vercel will auto-deploy.

## Worktree layout

| Worktree                                         | Branch           | Purpose                        |
| ------------------------------------------------ | ---------------- | ------------------------------ |
| `F:\PhysixAcademy\physix academy project`        | `main`           | Development (protected, dirty) |
| `F:\PhysixAcademy\physix-academy-release-lab-v1` | `release/lab-v1` | Lab release (clean, merged)    |
| `F:\PhysixAcademy\physix-academy-4a`             | `phase4a`        | Phase 4A implementation        |

## Git rules

- Never force-push
- Never rewrite history
- Preserve all release commits
- Use regular merge commits (not squash)
- Protected worktrees must never be modified by automation
