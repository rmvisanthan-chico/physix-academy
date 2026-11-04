# PhysiX Academy — Master SEO Engineering Report

**Date:** 2026-11-05
**Worktree:** `F:\PhysixAcademy\physix-creator-identity`
**Branch:** `feat/creator-seo-v2` · Base commit `b13b2ec` (matches `origin/main` and production deploy `7557002274`)
**Production:** https://physix-academy.vercel.app/

**Disposition:** All implementation is present as **uncommitted working-tree changes** plus one new untracked tool (`tools/audit-seo.mjs`) and this report. Nothing was committed, pushed, merged, or deployed. The 7 pre-existing uncommitted v2 creator-SEO edits were preserved intact. No other worktree was modified.

---

## A. Initial SEO audit

| Area | State found at project start | Severity |
|---|---|---|
| 40 sim pages (`html5-sims/*.html`) + sim index | No meta description, no canonical, no robots meta, no Open Graph, no Twitter card — invisible to search engines as pages | Critical |
| Homepage title / description / OG | Creator-focused values ("…by R.M. Visanthan", "NCERT aligned"), not the approved brand positioning | High |
| `motion-graphs.html` | Description only; no canonical/robots/OG/Twitter; not listed in sitemap | High |
| `sitemap.xml` | 53 URLs including 6 hash routes (`#/learn`, `#/topics`, `#/sims`, `#/formulas`, `#/tutor`, `#/games`) that are not independently indexable documents; stale `lastmod` dates; `motion-graphs.html` missing | High |
| `404.html` | No `noindex` directive (soft-404 risk) | Medium |
| `index.html` meta keywords | Dead signal; Google ignores the keywords meta | Low |
| Blog (5 pages) | Already well tagged: canonical, OG, Twitter, valid JSON-LD | Informational |
| `login.html`, `privacy.html`, `terms.html` | Already correctly `noindex` | Informational |
| `robots.txt` | Valid: allows all, declares sitemap | Informational |
| Structured data | Valid JSON-LD on homepage and blog | Informational |

Whole-repository JEE/NEET text scan at baseline and after: **0 occurrences** in any public page.

## B. Implementation

51 files modified (+736 / −92) and 1 new file created.

| File(s) | Change | Reason |
|---|---|---|
| `index.html` | Title → exact master value `PhysiX Academy \| Free Physics Learning Without Ads`; meta description → exact master value; OG title/description and Twitter title/description → master values; `meta keywords` removed; schema `EducationalOrganization.description` → approved brand description; `Person.knowsAbout` → `["Physics", "Physics education", "Interactive physics learning"]` (removed "Exam preparation") | Mandated brand identity; removal of exam-preparation positioning signals |
| `html5-sims/*.html` (41 files) | Inserted after `<title>`: unique meta description (≤160 chars), absolute canonical `https://physix-academy.vercel.app/html5-sims/<file>`, `robots index,follow`, author, full Open Graph set (absolute 1200×630 image + alt), full Twitter card | 42 of 48 sitemap URLs had no page metadata at all |
| `motion-graphs.html` | Added canonical, robots, author, OG, Twitter card | High-value interactive page was undiscoverable |
| `404.html` | Added `<meta name="robots" content="noindex">` | Soft-404 hygiene |
| `sitemap.xml` | Removed all 6 hash-route URLs, added `motion-graphs.html`, refreshed all sim `lastmod`s → 48 URLs | Sitemap lists only genuinely indexable documents |
| `tools/audit-seo.mjs` (new) | Deterministic SEO verification script (details in §C) | Automated SEO verification requirement |

## C. SEO verification — `node tools/audit-seo.mjs`

```
Scanned 52 HTML files
Indexable pages: 48
Unique titles: 52
Unique descriptions: 48
Sitemap URLs: 48
SEO AUDIT PASSED
```

- **Canonicals:** all absolute; `og:url` equals canonical on every indexable page; sim and blog canonicals match file paths exactly; zero duplicate canonicals.
- **Sitemap:** 48 URLs, valid XML, zero hash routes, zero duplicates, every URL maps to an existing file.
- **Robots directives:** 48 indexable pages allow indexing; `404.html`, `login.html`, `privacy.html`, `terms.html` are `noindex`.
- **Social sharing:** every indexable page carries OG title/description/type/url/site_name/image/alt and a Twitter `summary_large_image` card with absolute URLs. OG image `assets/og-image.png` is 1200×630 px (ideal share size), 37 KB.
- **Structured data:** all JSON-LD parses as valid JSON; homepage `@graph` contains `EducationalOrganization`, `Person`, `WebSite`; blog pages contain `Blog`/`Article` nodes matching visible content.
- **Internal links:** 185 local `href`/`src` references crawled across all 52 pages → **0 broken**. The only unresolved references are `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`, which exist only in the deployed Vercel runtime by design.
- **JEE/NEET:** enforced zero occurrences in public pages; the audit script fails the build if any appear.

## D. Performance (measured with Chrome against a production-equivalent static serve)

| Page | LCP desktop / mobile | CLS | TTFB | Notes |
|---|---|---|---|---|
| Home (`#/`) | 840 ms / 764 ms | 0.18 / 0.19 | 7–10 ms | CLS from late-inserted footer (§F) |
| `#/learn` | 872 ms / 996 ms | 0.18 / 0.19 | 13–16 ms | same cause |
| Blog post | 752 ms / 440 ms | 0 / 0.031 | 8–10 ms | |
| Sim (`html5-sims/newton.html`) | 1276 ms / 1192 ms | 0 / 0 | 9 ms | |
| `motion-graphs.html` | 604 ms / 612 ms | 0.012 / 0 | 8 ms | |

- All measured LCP values ≤ 1.3 s on a fast local connection — within the 2.5 s target. Real-network values will be higher; treat as directional.
- Layout-shift attribution (PerformanceObserver): the 0.178 CLS on SPA views comes entirely from the **lazy-inserted footer** (h=211 px). Pre-existing behaviour, unrelated to SEO changes.
- `tools/audit-perf.mjs`: **12/12 ok** — hidden-tab simulation pausing, loop lifecycle on remounts, canvas backing store at exactly 1.00× device pixel ratio, bounded DOM over 12 remounts.
- Bundle check (`npm run bundle`): success in 1.45 s. Largest chunk 417 KB → **148.7 KB gzip**; main CSS 83 KB → 17.9 KB gzip. Build warnings are pre-existing (classic vendor `<script>`s, Vercel insights). Note: per `vite.config.js`, production is pinned to serving the repo as authored, so CI bundle sizes are informational only.

## E. Regression testing

| Suite | Result |
|---|---|
| `npm run verify:4a` (unit) | **20/20 pass** across 7 suites (mastery logic, curriculum, quiz bank schema) |
| `node tools/audit-encoding.mjs` | **199 files clean** — zero invalid UTF-8 / mojibake |
| `node tools/audit-sims.mjs` (physics engine health, full registry) | **472/472 assertions pass across 51 simulations** — canvas pixels advance, physics clocks advance, readouts change, loops stop on unmount; 11 cross-origin PhET embeds verified to load (internals not inspectable by design) |
| `node tools/verify.mjs` (browser regression, production-equivalent static serve) | **routes 16/16 ok · standalone sims 40/40 ok** — matches the recorded baseline; all 40 standalone sims render correctly with the new `<head>` metadata |
| `node tools/audit-a11y.mjs` | **25/25 ok** — 5 sampled sims: labelled sliders, text readouts, focusable + keyboard-operable sliders, visible focus indicators, reduced-motion initial frame |
| `node tools/audit-mobile.mjs` | **44/44 ok** — phone 390 px and tablet 820 px: no horizontal overflow, tap targets ≥ 32 px, canvas fits viewport |
| `npm run bundle` | Build success (see §D) |
| `git diff --check` | Clean (LF→CRLF advisories only, on `index.html` and `sitemap.xml`) |

One diagnostic note: against a **vite `dist` preview** only, dynamic import of `sims-b.js` 404s (it is not part of the module graph). This does **not** occur in production, which serves the repo directly (`https://physix-academy.vercel.app/js/sims-b.js` → 200), and is unchanged by this project's edits.

## F. Remaining work

**Fixed in this project**
- Homepage title/description/OG/Twitter now carry the exact approved values.
- 42 previously metadata-less pages (40 sims + sim index + motion-graphs) fully tagged.
- Sitemap corrected from 53 to 48 indexable URLs; motion-graphs added.
- 404 noindex; keyword meta removed; exam-preparation signals removed from schema.
- Permanent deterministic SEO audit installed at `tools/audit-seo.mjs`.

**Known, unfixed (pre-existing; intentionally left outside safe scope)**
- Homepage meta description is 181 characters — it is the exact mandated text; Google may truncate the snippet on display.
- Home/About catalog renders "4 Simulations" due to lazy counting; the real catalogue is 51 — a cosmetic trust issue for visitors.
- Home and `#/learn` CLS ≈ 0.18 caused by the late-inserted footer; fixable by reserving a footer slot.
- `login.html` still 404s `assets/login-bg.webm` and `assets/login-bg.mp4` (lazy-loaded through JS, so only visible at runtime).
- `README.md` still shows stale simulation/article counts and an incorrect GitHub handle — belongs to the owner's own uncommitted v2 edits and was deliberately preserved untouched.
- Hash-route views (`#/learn` etc.) share the homepage canonical by architecture; Google indexes them together with the homepage unless prerendering is introduced later.
- YouTube/Instagram channel identity remains unverified externally (schema `sameAs` lists them as-is).

**External actions requiring the owner's accounts (after deploy approval)**
1. **Google Search Console:** add property `https://physix-academy.vercel.app/`; verify ownership via the HTML-file method (upload file) or DNS method with Веrcel — never share your Google password with anyone.
2. **Submit the sitemap:** `https://physix-academy.vercel.app/sitemap.xml` under Sitemaps.
3. **URL Inspection:** inspect `https://physix-academy.vercel.app/`, one simulation page (e.g. `/html5-sims/projectile.html`) and one blog post; use "Request indexing" after a fresh deploy.
4. **Harness errors:** monitor Pages → Indexing coverage for the 48 sitemap URLs; expect "Page indexed" or "Discovered – currently not indexed" early on.
5. **Performance monitoring:** track impressions, clicks, CTR and average position weekly; treat them as trends, not targets — no ranking outcome is guaranteed.
6. **Bing Webmaster Tools:** optional second channel; same URL set and sitemap submission.

## G. Final release recommendation

All 16 project acceptance criteria are met with verified evidence: metadata correct and unique, canonicals consistent, robots/sitemap valid, structured data valid, social previews configured, public pages crawlable, private routes protected, mobile and accessibility audited, performance measured, internal links clean, no JEE/NEET positioning, physics functionality fully preserved (472/472), regression tests pass (20/20, routes 16/16, sims 40/40), and no unrelated worktree touched.

**SEO IMPLEMENTATION COMPLETE — READY FOR REVIEW.**

Release is a human decision: the branch awaits explicit approval before any commit, push or deploy.
