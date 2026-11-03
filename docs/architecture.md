# Architecture

> PhysiX Academy — system architecture. Last verified: 2026-11-03.

## Overview

PhysiX Academy is a framework-free, single-page application (SPA) written in vanilla ES modules. It runs entirely in the browser with no build step in production (Vercel serves the repository as authored — `framework: null`). All state is local-first via `Store` (localStorage + IndexedDB).

## Module graph

```
index.html
  └── js/main.js (module entry)
        ├── js/tex-speech.js       # TeX → speech synthesis
        ├── js/utils.js            # $, $$, esc, debounce, Store, Tex, toast
        ├── js/data-*.js           # CURRICULUM: 54 lessons across 4 levels
        ├── js/data-quiz-*.js      # QUIZ_BANK: 87 questions
        ├── js/sims-*.js           # 51 simulations (Sims registry)
        ├── js/blocks.js           # content block renderers (14 types)
        ├── js/tutor.js            # offline AI tutor (IDF retrieval + solvers)
        ├── js/views.js            # hash router + Home/Learn/Lesson/Topics views
        ├── js/pages.js            # Sims/Tutor/Practice views
        ├── js/formulas.js         # formula library
        ├── js/calculators.js      # physics calculators
        ├── js/graph.js            # knowledge graph (KG_EDGES: 53 prerequisite edges)
        ├── js/progress.js         # progress view
        ├── js/mastery.js          # mastery + recommendation engine (pure functions)
        ├── js/mistakes.js         # Mistake Notebook
        ├── js/dashboard.js        # personalized dashboard
        ├── js/scientists.js       # scientist profiles
        ├── js/lab.js              # Virtual Physics Lab workspace
        ├── js/lab-experiments.js  # lab experiment registry (3 experiments)
        ├── js/cinematic.js        # scroll animations
        ├── js/hero3d.js           # Three.js hero atom
        └── js/app.js              # global search, boot
```

## Data flow

```
User → hash route → views.js route() → view render
  → afterRender() → Sims.mount() / Quiz.renderList() / renderHooks
  → Store (localStorage mirror + IndexedDB)
```

## Key engines

| Engine       | File                 | Role                                           |
| ------------ | -------------------- | ---------------------------------------------- |
| Graph Engine | `js/graph-engine.js` | Simulation graphs (createGraph, sample series) |
| Sim Controls | `js/sim-controls.js` | Fixed-timestep Play/Pause/Step/Reset           |
| Prediction   | `js/prediction.js`   | Predict → Observe → Reason                     |
| Mastery      | `js/mastery.js`      | Topic mastery, recommendations, review queue   |
| Store        | `js/utils.js`        | localStorage + IndexedDB persistence           |

## Deployment

- **Production:** https://physix-academy.vercel.app (Vercel, `framework: null`)
- **CI:** GitHub Actions — `Simulation Health Audit` (51 sims, Playwright)
- **Repo:** https://github.com/rmvisanthan-chico/physix-academy
