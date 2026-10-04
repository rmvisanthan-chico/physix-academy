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
      input: { main: path.resolve('js/main.js') }
    }
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: false },
  plugins: [copyVerbatim()]
});