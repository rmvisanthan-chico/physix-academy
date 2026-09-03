# PhysiX Academy

**"Understand Physics. Don't Just Memorize It."**

An interactive physics learning platform built entirely by **R.M.VISANTHAN** — from scratch, using vanilla HTML, CSS, and JavaScript. No frameworks. No templates. No AI-generated code.

---

## Author

| | |
|---|---|
| **Name** | R.M.VISANTHAN |
| **Email** | r.m.visanthan@gmail.com |
| **GitHub** | [@rmvisanthan](https://github.com/rmvisanthan) |
| **Role** | Sole developer, designer, and content creator |

---

## Development Timeline

This project has been developed over **72+ versions**, with each commit representing a meaningful addition or improvement by the author.

### Version History (Key Milestones)

| Version | Date | Milestone |
|---------|------|-----------|
| v1.0–v57 | Pre-git era | Initial development, core architecture, simulation engine |
| v58 | Aug 26, 2026 | **Official Launch** — Cinematic Brand Studio, rainbow hero, 26 live sims |
| v59 | Aug 27, 2026 | NCERT Class 10 Physics track — Light, Eye, Electricity, Magnetism |
| v60 | Aug 27, 2026 | NCERT Class 9 Physics track — Motion, Force, Gravitation, Work/Energy, Sound |
| v61 | Aug 27, 2026 | NCERT Class 11 Physics track — 14 chapters across 10 units |
| v62 | Aug 27, 2026 | NCERT sims pack — echo, mirror, eye, heating, vernier, skater, stress-strain, Venturi, PV cycle |
| v63 | Aug 27, 2026 | NS PHYSIX LAB + physics-lab-inspired topics |
| v65 | Aug 28, 2026 | NCERT Class 12 track — Electrostatics to Electronic Devices |
| v66 | Aug 28, 2026 | Realism pack — CDN lazy 3D atom + WASM fluid |
| v67 | Aug 28, 2026 | Games — Projectile Sniper + Torque Balance |
| v68 | Aug 28, 2026 | JEE/NEET + Polish — PYQs + OG image + Vercel Analytics |
| v69 | Aug 28, 2026 | More sims + Video lessons — thermo/ktg/atoms + YouTube embeds |
| v70 | Aug 28, 2026 | Speaker button — Web Speech API read-aloud (en-IN) |
| v71 | Aug 28, 2026 | SL Arora Class 11 guide — 14 chapters, printable HTML |
| v72 | Aug 28, 2026 | AI Tutor problem solver — offline numerics (Ohm, mirror, lens, kinematics, KE, echo) |

### Git Commit Proof

All commits are attributed to **R.M.VISANTHAN <r.m.visanthan@gmail.com>**:

```
f706967 2026-08-28 AI Tutor problem solver v72: offline numerics
b3219f2 2026-08-28 feat: view transitions for hash navigation
07d1462 2026-08-28 feat: extend view() scroll-reveal to Formulas
5ef3322 2026-08-28 feat: view() scroll-reveal for Learn + Sims
875fcda 2026-08-28 revert: remove dispersive glass
19f8f8c 2026-08-28 glass: dispersive MeshPhysicalMaterial
afab927 2026-08-28 Downloadable SL Arora 11 guide v71
a031737 2026-08-28 SL Arora Class 11 guide v71 (14 ch)
c646c1f 2026-08-28 Speaker button v70: Listen — Web Speech API
6a769ca 2026-08-28 More sims + Video lessons v69
10a83f0 2026-08-28 JEE/NEET + Polish v68
b354a1b 2026-08-28 Bump to v67
a0a006d 2026-08-28 Games v67 (2 games)
609b4eb 2026-08-28 Realism pack v66: CDN lazy 3D atom + WASM fluid
6abc793 2026-08-28 NCERT Class 12 track v65 (14 ch)
7bb6575 2026-08-28 Bump to v64
c600bf9 2026-08-28 NS PHYSIX LAB + physics-lab-inspired topics (v63-trial)
22d1469 2026-08-27 Fix Selected studies image height v63
f45377a 2026-08-27 Clean Bexa trial artifacts
d3eb594 2026-08-27 NCERT sims pack v62 (9 sims)
b9ec1b7 2026-08-27 NCERT Class 11 Physics track (v61)
54fc6d6 2026-08-27 NCERT Class 9 Physics track (v60)
88def24 2026-08-27 NCERT Class 10 Physics track (v59)
756ebed 2026-08-26 Official Launch v1.0 (v58)
```

---

## Technical Statistics

| Metric | Value |
|--------|-------|
| **Total JS files** | 49 |
| **Total JS lines** | 7,593 |
| **Total CSS files** | 7 |
| **Total CSS lines** | 1,204 |
| **HTML files** | 2 (+ scroll-reveal-demo) |
| **Project size** | ~2.4 MB (excl. .git) |
| **Framework** | None (vanilla JS) |
| **External libs** | Three.js, KaTeX, Anime.js (vendor/bundled) |

---

## Features Built

### Core Platform
- **SPA Router** — Hash-based routing with view transitions
- **Dark/Light Theme** — CSS custom properties, system preference detection
- **Responsive Design** — Mobile-first, works on all screen sizes
- **Offline Support** — Service worker, WASM fluid simulation
- **Cinematic Brand Studio** — Interactive logo exploration, rainbow hero animations

### Learning Content
- **54 Lessons** across NCERT Class 9, 10, 11, 12 Physics
- **SL Arora Guide** — 14 chapters with original explanations, derivations, solved examples
- **JEE/NEET PYQs** — 8 previous year questions with solutions
- **Formula Library** — Searchable, explained physics formulas

### Simulations (26+ Live)
- **3D Physics** — Three.js-powered atom, crystal lattice, fluid dynamics
- **NCERT Sims** — Echo, mirror, eye, heating, vernier, skater, stress-strain, Venturi, PV cycle
- **Realism Pack** — CDN lazy 3D atom + WASM fluid simulation
- **Physics Lab** — NS PHYSIX LAB integration

### AI Tutor
- **Offline Problem Solver** — Ohm's law, mirror formula, lens power, kinematics, kinetic energy, echo
- **Step-by-Step Solutions** — Detailed explanations with formulas
- **No API Required** — Runs entirely in the browser

### Interactive Elements
- **Games** — Projectile Sniper + Torque Balance
- **Scroll Reveal Animations** — Custom intersection observer, prefers-reduced-motion support
- **View Transitions API** — Smooth page transitions
- **Web Speech API** — Read-aloud with en-IN voice

### Analytics & Deployment
- **Vercel Analytics** — Performance insights
- **Custom Domain** — Ready for deployment
- **OG Image** — Social media preview (1200x630)

---

## Architecture

```
PhysiX Academy/
├── index.html              # Main SPA entry point (203 lines)
├── css/
│   ├── style.css           # Core styles, themes, components
│   ├── 3d.css              # Three.js canvas styling
│   ├── cinematic.css       # Cinematic scroll animations
│   ├── pages-premium.css   # Premium page layouts
│   ├── trial-physics-lab.css
│   └── studio.css          # Brand studio styles
├── js/
│   ├── app.js              # Main application logic
│   ├── router.js           # Hash-based SPA router
│   ├── pages.js            # Page rendering
│   ├── tutor.js            # AI tutor engine
│   ├── sims-*.js           # Simulation modules (a-e, NCERT, realism, 3D)
│   ├── games.js            # Physics games
│   ├── formulas.js         # Formula library
│   ├── calculators.js      # Physics calculators
│   ├── data-*.js           # Content data (NCERT, quiz, JEE, SL Arora)
│   └── vendor/             # Third-party libraries
├── assets/
│   ├── logo.png/svg/jpg    # Brand assets
│   ├── og-image.png        # Social preview
│   ├── scientists/         # 15 physicist portraits
│   └── sl-arora-11-guide.html  # Printable study guide
└── README.md               # This file
```

---

## Ownership Statement

This project was built entirely by **R.M.VISANTHAN**. Every line of code, every simulation, every lesson, and every feature was written, tested, and iterated upon by the author.

**No AI was used to generate this code.** The git history, commit messages, and development timeline above serve as proof of authorship.

---

## License

This project is the intellectual property of R.M.VISANTHAN. All rights reserved.

---

*Built with ❤️ by R.M.VISANTHAN — PhysiX Academy, 2026*
