/* PhysiX Academy — Assessment Question Metadata (M3)
 *
 * Enhanced metadata for adaptive assessment question selection.
 * Extends the existing QUIZ_BANK question shape with:
 * - skill: the cognitive skill tested
 * - objective: specific learning objective
 * - misconception: known misconception this question targets
 * - discriminability: how well this question distinguishes ability (0-1)
 * - prerequisites: question IDs that should be mastered first
 * - timeEstimate: estimated time in seconds
 */

import { QUIZ_BANK } from './data-quiz-a.js';

/* Skill taxonomy for adaptive assessment */
export const ASSESSMENT_SKILLS = {
  conceptual: 'Conceptual understanding',
  procedural: 'Procedural fluency',
  analytical: 'Analytical reasoning',
  application: 'Real-world application',
  diagnostic: 'Misconception diagnosis'
};

/* Difficulty calibration - maps to IRT-like difficulty parameter */
export const DIFFICULTY_CALIBRATION = {
  beginner: { theta: -1.5, weight: 0.3 },
  intermediate: { theta: -0.5, weight: 0.5 },
  advanced: { theta: 0.5, weight: 0.7 },
  expert: { theta: 1.5, weight: 1.0 }
};

/* Enhanced question metadata - selectively tagged for adaptive assessment
 * Start with ~25 high-value questions covering key concepts */
export const QUESTION_METADATA = {
  /* Mechanics - Kinematics */
  'q-k1': {
    skill: 'conceptual',
    objective: 'Identify SI units of motion quantities',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-k2': {
    skill: 'procedural',
    objective: 'Calculate average acceleration from v, u, t',
    discriminability: 0.8,
    timeEstimate: 20,
    prerequisites: ['q-k1']
  },
  'q-k3': {
    skill: 'conceptual',
    objective: 'Interpret distance-time graph flat line',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-k4': {
    skill: 'conceptual',
    objective: 'Understand horizontal velocity independence in projectile motion',
    discriminability: 0.85,
    timeEstimate: 20,
    misconception: 'Horizontal velocity changes due to gravity'
  },
  'q-k5': {
    skill: 'analytical',
    objective: 'Determine optimal launch angle for maximum range',
    discriminability: 0.9,
    timeEstimate: 25
  },
  'q-k6': {
    skill: 'conceptual',
    objective: 'Interpret area under speed-time graph',
    discriminability: 0.8,
    timeEstimate: 15
  },

  /* Mechanics - Newton's Laws & Friction */
  'q-f1': {
    skill: 'conceptual',
    objective: "Identify Newton's First Law as law of inertia",
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-f2': {
    skill: 'procedural',
    objective: 'Calculate net force from mass and acceleration',
    discriminability: 0.85,
    timeEstimate: 20,
    prerequisites: ['q-f1']
  },
  'q-f3': {
    skill: 'conceptual',
    objective: 'Identify friction direction opposes sliding',
    discriminability: 0.8,
    timeEstimate: 15,
    misconception: 'Friction always opposes motion direction (not just sliding)'
  },
  'q-f4': {
    skill: 'conceptual',
    objective: 'Understand action-reaction pairs act on different objects',
    discriminability: 0.9,
    timeEstimate: 20,
    misconception: 'Action-reaction pairs cancel on same object'
  },
  'q-f5': {
    skill: 'analytical',
    objective: 'Analyze forces on block sliding at constant velocity',
    discriminability: 0.85,
    timeEstimate: 25,
    prerequisites: ['q-f3']
  },
  'q-f6': {
    skill: 'procedural',
    objective: 'Calculate maximum speed on unbanked curve with friction',
    discriminability: 0.9,
    timeEstimate: 30,
    prerequisites: ['q-f3']
  },

  /* Mechanics - Energy */
  'q-e1': {
    skill: 'conceptual',
    objective: 'Understand KE depends on v²',
    discriminability: 0.8,
    timeEstimate: 15
  },
  'q-e2': {
    skill: 'application',
    objective: 'Relate speed to braking distance',
    discriminability: 0.85,
    timeEstimate: 20,
    prerequisites: ['q-e1']
  },
  'q-e3': {
    skill: 'procedural',
    objective: 'Calculate gravitational potential energy',
    discriminability: 0.75,
    timeEstimate: 20
  },
  'q-e4': {
    skill: 'analytical',
    objective: 'Determine work when force perpendicular to displacement',
    discriminability: 0.85,
    timeEstimate: 20,
    misconception: 'Any force does work if there is displacement'
  },

  /* Mechanics - Momentum */
  'q-p1': {
    skill: 'conceptual',
    objective: 'Define linear momentum',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-p2': {
    skill: 'conceptual',
    objective: 'Explain how airbags reduce force via impulse',
    discriminability: 0.85,
    timeEstimate: 20,
    misconception: "Airbags reduce change in momentum (they don't, they extend time)"
  },
  'q-p3': {
    skill: 'analytical',
    objective: 'Identify momentum conservation in all collisions',
    discriminability: 0.9,
    timeEstimate: 25
  },

  /* Waves & Optics */
  'q-shm1': {
    skill: 'conceptual',
    objective: 'Understand acceleration-displacement relationship in SHM',
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-shm2': {
    skill: 'analytical',
    objective: 'Analyze energy in damped oscillations',
    discriminability: 0.85,
    timeEstimate: 25,
    prerequisites: ['q-shm1']
  },

  /* Electricity & Magnetism */
  'q-cr1': {
    skill: 'conceptual',
    objective: 'Understand drift velocity vs field propagation',
    discriminability: 0.75,
    timeEstimate: 15,
    misconception: 'Electrons move at light speed in wires'
  },
  'q-cr2': {
    skill: 'procedural',
    objective: 'Calculate equivalent parallel resistance',
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-mv1': {
    skill: 'conceptual',
    objective: 'Understand magnetic force is perpendicular to velocity',
    discriminability: 0.85,
    timeEstimate: 20,
    misconception: 'Magnetic force does work/changes speed'
  },
  'q-mv2': {
    skill: 'analytical',
    objective: 'Determine particle path in uniform B-field',
    discriminability: 0.9,
    timeEstimate: 25,
    prerequisites: ['q-mv1']
  },
  'q-em1': {
    skill: 'conceptual',
    objective: "Identify Faraday's law: induced EMF proportional to rate of flux change",
    discriminability: 0.8,
    timeEstimate: 15
  },
  'q-em2': {
    skill: 'conceptual',
    objective: "Understand Lenz's law and energy conservation",
    discriminability: 0.9,
    timeEstimate: 20,
    misconception: 'Induced current aids the flux change'
  },

  /* Optics */
  'q-ro1': {
    skill: 'procedural',
    objective: 'Calculate image distance using lens formula',
    discriminability: 0.85,
    timeEstimate: 25
  },
  'q-ro2': {
    skill: 'analytical',
    objective: 'Determine total internal reflection condition',
    discriminability: 0.9,
    timeEstimate: 20,
    prerequisites: ['q-ro1']
  },

  /* Modern Physics */
  'q-dn1': {
    skill: 'conceptual',
    objective: 'Understand photoelectric threshold frequency',
    discriminability: 0.9,
    timeEstimate: 15,
    misconception: 'Brighter light always ejects electrons'
  },
  'q-dn2': {
    skill: 'procedural',
    objective: 'Calculate photon energy from wavelength',
    discriminability: 0.8,
    timeEstimate: 15
  },
  'q-at1': {
    skill: 'procedural',
    objective: 'Calculate ionization energy from ground state',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-at2': {
    skill: 'analytical',
    objective: 'Relate hydrogen transition energy to emitted photon',
    discriminability: 0.85,
    timeEstimate: 20
  },

  /* Thermodynamics */
  'q-th1': {
    skill: 'conceptual',
    objective: 'State first law of thermodynamics',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-th2': {
    skill: 'analytical',
    objective: 'Understand why 100% efficient heat engine violates second law',
    discriminability: 0.9,
    timeEstimate: 25
  },
  'q-thp1': {
    skill: 'conceptual',
    objective: 'Understand latent heat breaks intermolecular bonds',
    discriminability: 0.8,
    timeEstimate: 15
  },

  /* Kinetic Theory & Statistical Mechanics */
  'q-kt1': {
    skill: 'conceptual',
    objective: 'Understand KE depends only on temperature',
    discriminability: 0.8,
    timeEstimate: 15
  },

  /* Units & Measurements */
  'q-un1': {
    skill: 'analytical',
    objective: 'Determine dimensional formula of force',
    discriminability: 0.85,
    timeEstimate: 20
  },

  /* Rotation */
  'q-rot1': {
    skill: 'conceptual',
    objective: 'Identify moment of inertia as rotational analogue of mass',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-rot2': {
    skill: 'conceptual',
    objective: 'Understand angular momentum conservation in figure skater',
    discriminability: 0.85,
    timeEstimate: 20
  },

  /* Gravity */
  'q-g3': {
    skill: 'procedural',
    objective: "Apply Kepler's third law",
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-g4': {
    skill: 'analytical',
    objective: 'Calculate escape velocity scaling with mass',
    discriminability: 0.85,
    timeEstimate: 25
  },

  /* Fluids */
  'q-fl1': {
    skill: 'conceptual',
    objective: "State Archimedes' principle",
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-fl2': {
    skill: 'conceptual',
    objective: 'Understand Bernoulli: faster flow = lower pressure',
    discriminability: 0.85,
    timeEstimate: 20
  },

  /* Waves & Wave Optics */
  'q-wo1': {
    skill: 'procedural',
    objective: 'Determine effect of slit separation on fringe spacing',
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-wo2': {
    skill: 'analytical',
    objective: 'Explain soap bubble colors via thin-film interference',
    discriminability: 0.85,
    timeEstimate: 20
  },

  /* Modern Physics */
  'q-ch1': {
    skill: 'procedural',
    objective: "Apply Coulomb's inverse-square law",
    discriminability: 0.8,
    timeEstimate: 15
  },
  'q-ch2': {
    skill: 'conceptual',
    objective: 'Understand why electric field lines never cross',
    discriminability: 0.85,
    timeEstimate: 15
  },
  'q-pc1': {
    skill: 'procedural',
    objective: 'Calculate capacitor energy',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-pc2': {
    skill: 'procedural',
    objective: 'Calculate parallel capacitor equivalent',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-mm1': {
    skill: 'conceptual',
    objective: 'Understand Curie temperature effect on magnetism',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-ac1': {
    skill: 'procedural',
    objective: 'Calculate peak voltage from RMS',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-ac2': {
    skill: 'analytical',
    objective: 'Understand impedance at RLC resonance',
    discriminability: 0.85,
    timeEstimate: 25
  },
  'q-sl1': {
    skill: 'procedural',
    objective: "Apply Hooke's law to stress-strain graph",
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-pr1': {
    skill: 'conceptual',
    objective: 'Understand independence of horizontal and vertical projectile motion',
    discriminability: 0.85,
    timeEstimate: 15
  },
  'q-pr2': {
    skill: 'conceptual',
    objective: 'Understand acceleration at top of projectile arc',
    discriminability: 0.8,
    timeEstimate: 15
  },
  'q-cm1': {
    skill: 'procedural',
    objective: 'Calculate center of mass for two equal masses',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-v1': {
    skill: 'conceptual',
    objective: 'Distinguish vector from scalar quantities',
    discriminability: 0.75,
    timeEstimate: 15
  },
  'q-v2': {
    skill: 'procedural',
    objective: 'Calculate vector component using trigonometry',
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-v3': {
    skill: 'procedural',
    objective: 'Calculate resultant of perpendicular vectors',
    discriminability: 0.8,
    timeEstimate: 20
  },
  'q-ma1': {
    skill: 'conceptual',
    objective: 'Interpret slope of distance-time graph',
    discriminability: 0.7,
    timeEstimate: 15
  },
  'q-ma2': {
    skill: 'procedural',
    objective: 'Rearrange kinetic energy formula for velocity',
    discriminability: 0.75,
    timeEstimate: 20
  }
};

/* Attach each metadata entry to its question's topic. The engine and the
   #/assessment view filter by metadata.topic, but the topic itself is owned
   by the question bank, so it is derived from QUIZ_BANK (single source of
   truth) instead of being duplicated here. Wiring is deferred to first
   access, not module-evaluation time: the later bank parts
   (data-quiz-b.js / data-quiz-c.js) may not have pushed their questions when
   this module is evaluated. Entries whose qid is absent from the bank
   (planned questions) stay untagged and are naturally excluded from
   selection by the engine's null filter. */
let _topicsWired = false;
function wireTopics() {
  if (_topicsWired) return;
  _topicsWired = true;
  for (const qid of Object.keys(QUESTION_METADATA)) {
    const m = QUESTION_METADATA[qid];
    if (!m.topic) {
      const q = QUIZ_BANK.find((x) => x.id === qid);
      if (q) m.topic = q.topic;
    }
  }
}

/* Get metadata for a question ID */
export function getQuestionMeta(qid) {
  wireTopics();
  return (
    QUESTION_METADATA[qid] || {
      skill: 'conceptual',
      objective: 'General assessment',
      discriminability: 0.5,
      timeEstimate: 20
    }
  );
}

/* Get all metadata entries */
export function getAllMetadata() {
  wireTopics();
  return QUESTION_METADATA;
}
