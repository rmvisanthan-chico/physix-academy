/* PhysiX Academy — Virtual Physics Lab: experiment registry (Phase 1).

 * DATA ONLY. This module has no imports, touches no DOM, and runs no code on
 * load, so it can be read by the test suite in plain Node without a browser.
 * That constraint is deliberate: the moment a registry starts importing the
 * simulation layer it inherits a DOM dependency, and a registry that cannot be
 * loaded headlessly is a registry nothing can verify.
 *
 * Nothing here drives the simulations. These are declared facts about what each
 * experiment IS — which simulation backs it, which parameters it exposes, and
 * what those parameters physically mean. The simulations remain the single
 * source of truth for behaviour; this file describes them, and never replaces
 * them.
 *
 * Every `min`/`max`/`step`/`default` below is transcribed from the SU.slider
 * call in the simulation it names, and tools/test-lab-experiments.mjs re-parses
 * those same source files to prove the two have not drifted apart. Editing a
 * slider without editing this registry fails the test.
 */

/* ---------------------------------------------------------------------------
 * PROJECTILE DRAG COEFFICIENT k  —  units, equation, reasoning
 * ------------------------------------------------------------------------- *
 *
 * The integrator in js/sims-c.js applies, per sub-step of duration h:
 *
 *     vx' = vx + (-k * vx * |v|) * h
 *     vy' = vy + (-G - k * vy * |v|) * h          where |v| = hypot(vx, vy)
 *
 * so the drag term is the vector
 *
 *     a_drag = -k * v * |v|            (opposes v; magnitude k|v|^2)
 *
 * Dimensional analysis gives the unit of k directly:
 *
 *     [k] = [a] / [v * |v|] = (m s^-2) / ((m s^-1)(m s^-1)) = (m s^-2)/(m^2 s^-2)
 *         = m^-1
 *
 * k therefore has units of INVERSE METRE, not m/s and not dimensionless. It is
 * the same quantity as the linear/quadratic drag coefficient written k·v·|v| in
 * an atmosphere: a per-metre rate, because the force is larger for a larger
 * cross-section-to-mass ratio, and the simulated "air" has no geometry of its
 * own — only this number stands in for it.
 *
 * Practical consequence for the lab: k is NOT the same quantity as the spring
 * constant k of the SHM experiment, which has units N/m (kg s^-2). Both are
 * written "k". They are unrelated and must never be substituted for one another.
 */

export const LAB_EXPERIMENTS_VERSION = 1;

/* Every topic below must exist in the canonical topic vocabulary, which the
 * test suite derives by parsing `topic:'…'` out of js/data-quiz-*.js. */
export const LAB_EXPERIMENTS = [
  {
    id: 'projectile-launch',
    simId: 'projectile',
    title: 'Projectile Motion',
    summary: 'Launch under gravity with optional quadratic air drag, and watch the parabola form.',
    topics: ['projectile', 'kinematics', 'gravity', 'vectors'],
    source: 'js/sims-c.js',
    parameters: [
      {
        key: 'u', label: 'Speed u', unit: 'm/s', si: true,
        min: 5, max: 45, step: 1, default: 25,
      },
      {
        key: 'theta', label: 'Launch angle', unit: 'deg', si: false,
        min: 10, max: 80, step: 1, default: 45,
      },
      {
        key: 'h0', label: 'Launch height', unit: 'm', si: true,
        min: 0, max: 30, step: 1, default: 0,
      },
      {
        key: 'drag', label: 'Air drag k', unit: 'm^-1', si: true,
        min: 0, max: 0.4, step: 0.01, default: 0,
        /* Full derivation of the unit is in the block comment at the top of
         * this file: a_drag = -k * v * |v|, so [k] = [a]/[v|v|] = m^-1. */
        note: 'Quadratic drag coefficient in m^-1. Drag acceleration is -k*v*|v| '
            + '(magnitude k|v|^2). Not the same quantity as the SHM spring constant, '
            + 'which is N/m. Do not label this k/s or leave it dimensionless.',
      },
    ],
  },

  {
    id: 'kinematics-1d',
    simId: 'kin1d',
    title: '1-D Motion Lab',
    summary: 'Move a car along one axis; position and velocity are plotted against time together.',
    topics: ['kinematics', 'newton'],
    source: 'js/sims-b.js',
    parameters: [
      {
        key: 'u', label: 'Initial velocity u', unit: 'm/s', si: true,
        min: -15, max: 15, step: 0.5, default: 4,
      },
      {
        key: 'a', label: 'Acceleration a', unit: 'm/s^2', si: true,
        min: -4, max: 4, step: 0.1, default: 1,
      },
    ],
  },

  {
    id: 'spring-mass-shm',
    simId: 'shm',
    title: 'Spring-Mass SHM',
    summary: 'A damped mass on a spring; displacement and velocity trace a quarter-period offset.',
    topics: ['shm', 'waves', 'kinetic'],
    source: 'js/sims-c.js',
    parameters: [
      {
        key: 'm', label: 'Mass m', unit: 'kg', si: true,
        min: 0.5, max: 5, step: 0.25, default: 1.5,
      },
      {
        key: 'k', label: 'Spring constant k', unit: 'N/m', si: true,
        min: 5, max: 80, step: 1, default: 25,
      },
      {
        key: 'damping', label: 'Damping', unit: 's^-1', si: true,
        min: 0, max: 0.6, step: 0.02, default: 0,
      },
      {
        /* Amplitude is a PIXEL quantity and stays one. The simulation's state
         * variable is xPix, integrated as `v += (-k/m * xPix - damping*v) * h`,
         * i.e. in pixels per second, not metres per second. The readouts then
         * apply PX_PER_M = 60 (js/sims-c.js), a chosen display constant: the
         * integrator is scale-invariant, so it changes no period, frequency or
         * damping rate. It is not a physical derivation, and the pixel
         * amplitude must not be presented as an SI amplitude. */
        key: 'A', label: 'Amplitude A', unit: 'px', si: false,
        siStatus: 'unverified',
        min: 30, max: 110, step: 5, default: 80,
        note: 'Pixel amplitude, not metres. The simulation integrates in pixel space and '
            + 'its readouts apply the chosen display constant PX_PER_M = 60 (js/sims-c.js), '
            + 'which is scale-invariant and not a physical derivation. Must not be presented '
            + 'as an SI amplitude.',
      },
    ],
    caveats: [
      'The integrator runs in pixel space: v += (-k/m * xPix - damping*v) * h, with xPix in pixels.',
      'The /60 applied by the readouts and the graph is the chosen display constant PX_PER_M = 60 '
      + '(js/sims-c.js), not a derived scale.',
      'The period readout uses T = 2*pi*sqrt(m/k) in SI, which is an idealised value rather than a '
      + 'measurement of the pixel-space motion actually being drawn.',
    ],
  },
];

export const LAB_EXPERIMENTS_BY_ID = Object.fromEntries(
  LAB_EXPERIMENTS.map(e => [e.id, e]),
);

export const getLabExperiment = id => LAB_EXPERIMENTS_BY_ID[id] || null;