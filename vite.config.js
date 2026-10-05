import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/* Folders that must reach the output byte-for-byte.
   html5-sims/ in particular must NOT be rebundled: each simulation is a
   self-contained document that also has to work opened directly from disk via
   file://, loading ../js/vendor/three.min.js and lib/physix3d.js by relative
   path. Rewriting those references into hashed chunks would break that. */
const VERBATIM = ['html5-sims', 'assets', 'blog', 'js/vendor'];

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
      console.log(`  copied verbatim: ${VERBATIM.join(', ')}`);
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
      // Every root page must be an input, not just the SPA. Vercel runs this
      // build (package.json has a "build" script, and "framework": null does
      // not suppress it), then serves dist/. An HTML file that is not an input
      // is simply never emitted, which is how privacy.html, terms.html,
      // 404.html, motion-graphs.html and scroll-reveal-demo.html all started
      // returning 404 in production.
      //
      // The three zero-byte root stubs (collision2d/energy/incline.html) are
      // deliberately absent: they are empty files whose real pages live in
      // html5-sims/, and an empty document is not a valid input.
      input: {
        index: 'index.html',
        '404': '404.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
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