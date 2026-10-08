import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/* Folders that must reach the output byte-for-byte.
   html5-sims/ in particular must NOT be rebundled: each simulation is a
   self-contained document that also has to work opened directly from disk via
   file://, loading ../js/vendor/three.min.js and lib/physix3d.js by relative
   path. Rewriting those references into hashed chunks would break that.

   css/ is here for a specific reason: it is referenced by plain <link> tags in
   index.html and login.html and is never imported by any JS module, so Vite has
   no reason to emit it. Without this entry `npm run bundle` produced a dist/
   with zero stylesheets - an entirely unstyled site - and nothing failed.

   boot-guard.js is NOT in this list on purpose: it is a CLASSIC script, not a
   module, and the whole reason it works is that it sits outside the module
   graph. Copying it individually below keeps that property intact, because
   copying all of js/ would ship 50 unbundled module duplicates alongside the
   hashed chunks. */
const VERBATIM = ['html5-sims', 'assets', 'blog', 'js/vendor', 'css'];

/* Classic scripts loaded by <script src>, so Vite will never emit them. */
const CLASSIC_SCRIPTS = ['js/boot-guard.js'];

function copyVerbatim() {
  let outDir = 'dist';
  return {
    name: 'copy-verbatim',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    closeBundle() {
      for (const dir of VERBATIM) {
        const from = path.resolve(dir);
        if (!fs.existsSync(from)) continue;
        fs.cpSync(from, path.resolve(outDir, dir), { recursive: true });
      }
      for (const f of CLASSIC_SCRIPTS) {
        const from = path.resolve(f);
        if (!fs.existsSync(from)) {
          this.error(`classic script missing: ${f}`);
          return;
        }
        const to = path.resolve(outDir, f);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      }
      console.log(`  copied verbatim: ${VERBATIM.join(', ')}, ${CLASSIC_SCRIPTS.join(', ')}`);
    }
  };
}

export default defineConfig({
  root: '.',
  // there is no public/ dir; assets live in folders copied by the plugin above
  publicDir: false,
  appType: 'mpa',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // hashed filenames give us the long-term caching the ?v= query string was
    // doing by hand, without having to bump a number on every asset
    assetsDir: 'assets',
    rollupOptions: {
      /* Every root page must be an input, not just the SPA, so that `npm run
        bundle` emits a complete dist/. Production does not currently run this
        build at all - package.json has no "build" script and "framework": null
        pins Vercel to serving the repo as authored - but an input list that
        quietly drops half the site is a trap for whoever reintroduces bundling.
        The five pages that were once missing here are exactly what made
        privacy.html, terms.html, 404.html and motion-graphs.html return 404. */
      //
      // The three zero-byte root stubs (collision2d/energy/incline.html) are
      // deliberately absent: they are empty files whose real pages live in
      // html5-sims/, and an empty document is not a valid input.
      input: {
        index: 'index.html',
        '404': '404.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
        login: 'login.html',
        'motion-graphs': 'motion-graphs.html'
        // scroll-reveal-demo.html is intentionally absent: it is gitignored as
        // a local dev demo, so it does not exist in a fresh clone.
      }
    }
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: false },
  plugins: [copyVerbatim()]
});