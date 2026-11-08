/* PhysiX Academy — Simulation Lazy Loader (M9)
 *
 * Defers loading of the 40 PhysiX-built simulation modules until they are
 * actually needed. The Sims registry (Sims.reg) is populated at module
 * evaluation time in the original sims-*.js files. This loader imports the
 * sim modules on demand, registering their simulations into the shared
 * Sims.reg object.
 *
 * sim-transform (Phase B): the 10 PhET iframe entries and the "ns" external-
 * site embed were dropped from this map (and from Sims.reg) so the catalogue
 * lists only PhysiX-built simulations. The source files remain; re-enabling is
 * a map entry + registration revert.
 *
 * Usage:
 *   await Sims.ensure('newton');   // loads sims-a.js if needed, returns the sim def
 *   await Sims.ensureAll();        // loads all sim modules (for catalogue view)
 */
import { Sims } from './sims-a.js';

/* Map of simulation ID → module path that registers it (40 PhysiX-built sims). */
const SIM_MODULE_MAP = {
  // sims-a.js (mechanics core)
  newton: './sims-a.js',
  energy: './sims-a.js',
  collision: './sims-a.js',
  orbit: './sims-a.js',

  // sims-b.js (waves, circuits, fields, kinematics)
  wave: './sims-b.js',
  circuit: './sims-b.js',
  bfield: './sims-b.js',
  kin1d: './sims-b.js',

  // sims-c.js (projectile, shm, doppler)
  projectile: './sims-c.js',
  shm: './sims-c.js',
  doppler: './sims-c.js',

  // sims-d.js (efield, induction, lens)
  efield: './sims-d.js',
  induction: './sims-d.js',
  lens: './sims-d.js',

  // sims-e.js (incline, atwood, standing, interference, refraction, buoyancy, rc, cooling, collision2d)
  incline: './sims-e.js',
  atwood: './sims-e.js',
  standing: './sims-e.js',
  interference: './sims-e.js',
  refraction: './sims-e.js',
  buoyancy: './sims-e.js',
  rc: './sims-e.js',
  cooling: './sims-e.js',
  collision2d: './sims-e.js',

  // sims-ncert.js (NCERT mapped)
  'ncert9-echo': './sims-ncert.js',
  'ncert10-mirror': './sims-ncert.js',
  'ncert10-eye': './sims-ncert.js',
  'ncert10-heating': './sims-ncert.js',
  'ncert11-measure': './sims-ncert.js',
  'ncert11-rotation': './sims-ncert.js',
  'ncert11-solids': './sims-ncert.js',
  'ncert11-venturi': './sims-ncert.js',
  'ncert11-pv': './sims-ncert.js',

  // sims-phet.js (PhET iframes) — de-registered in Phase B; see file header note

  // sims-more.js (thermo-engine, ktg-gas, atoms-bohr)
  'thermo-engine': './sims-more.js',
  'ktg-gas': './sims-more.js',
  'atoms-bohr': './sims-more.js',

  // sims-realism.js (CDN 3D Atom, WASM Fluid)
  'cdn-3d-atom': './sims-realism.js',
  'wasm-fluid': './sims-realism.js',

  // sims3d-a.js (orbit3d, wave3d)
  orbit3d: './sims3d-a.js',
  wave3d: './sims3d-a.js',

  // sims3d-b.js (efield3d)
  efield3d: './sims3d-b.js'

  // sims3d-pages.js - standalone 3D set, not Sims.register() modules
};

/* Cache of module load promises to avoid duplicate imports */
const loadCache = new Map();

/* Ensure a single simulation is registered (loads its module if needed) */
export async function ensureSim(id) {
  if (Sims.reg[id]) return Sims.reg[id];

  const modulePath = SIM_MODULE_MAP[id];
  if (!modulePath) {
    console.warn('[Sims.ensure] Unknown simulation ID:', id);
    return null;
  }

  /* Load the module (once) */
  let promise = loadCache.get(modulePath);
  if (!promise) {
    promise = import(modulePath).catch((err) => {
      console.error('[Sims.ensure] Failed to load', modulePath, err);
      loadCache.delete(modulePath);
      throw err;
    });
    loadCache.set(modulePath, promise);
  }
  await promise;

  return Sims.reg[id] || null;
}

/* Ensure multiple simulations (for catalogue) */
export async function ensureAll() {
  const allIds = Object.keys(SIM_MODULE_MAP);
  console.log('[Sims.ensureAll] Loading', allIds.length, 'sim modules...');
  const results = await Promise.all(
    allIds.map(async (id) => {
      try {
        await ensureSim(id);
        return { id, ok: true };
      } catch (err) {
        console.error('[Sims.ensureAll] Failed to load', id, err);
        return { id, ok: false, error: err.message };
      }
    })
  );
  const loaded = results.filter((r) => r.ok).map((r) => r.id);
  const failed = results.filter((r) => !r.ok);
  console.log('[Sims.ensureAll] Loaded:', loaded.length, 'Failed:', failed.length);
  if (failed.length)
    console.log(
      '[Sims.ensureAll] Failures:',
      failed.map((f) => f.id + ': ' + f.error)
    );
  return Sims.reg;
}

/* Get list of all known simulation IDs */
export function getKnownIds() {
  return Object.keys(SIM_MODULE_MAP);
}

/* Check if a simulation is already loaded */
export function isLoaded(id) {
  return !!Sims.reg[id];
}

/* Preload a group of simulations (e.g., for a topic) */
export async function preload(ids) {
  await Promise.all(ids.map(ensureSim));
}

/* Export for backward compatibility - Sims.mount will call ensureSim if needed */
export const SimsLoader = { ensureSim, ensureAll, getKnownIds, isLoaded, preload };
