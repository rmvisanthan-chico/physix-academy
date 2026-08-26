/* PhysiX Academy — Level 4: Advanced Physics */
'use strict';

CURRICULUM.push({
  id:'l4', name:'Advanced & University Bridge', tag:'Level 4', icon:'🚀', color:'#f472b6',
  desc:'Special relativity, quantum mechanics, statistical mechanics and more — taught concept-first, with the mathematics introduced gently before use.',
  chapters:[

  {
    id:'l4.mathphys', title:'Mathematical Physics Toolkit', icon:'∑', tagline:'Vectors, calculus and differential equations for physicists.', mins:35,
    lessons:[
      { id:'l4.mathphys.main', title:'The Language Beyond Algebra', mins:35, content:[
        {why:{q:'Why do universities replace formulas with calculus?', p:'Because nature changes continuously. Derivatives capture instantaneous rates (velocity from position); integrals accumulate effects (distance from velocity). Every advanced theory is written in this language.'}},
        {ul:[
          '**Derivative taste:** if $x(t)=t^2$, then $v=dx/dt=2t$ — the slope idea from graphs, made exact.',
          '**Integral taste:** constant acceleration area under v–t gives $s=ut+\\tfrac12 at^2$ — you already integrated geometrically in the flagship lesson!',
          '**Differential equations:** equations whose unknown is a FUNCTION. $F=-kx$ becomes $m\\ddot{x}+kx=0$, whose solution IS the SHM cosine. Physics = guessing the equation, solving it, testing reality.',
          '**Vector calculus preview:** fields like E have gradients, divergences and curls — the vocabulary of Maxwell\u2019s equations.'
        ]},
        {mistakes:['Treating dy/dx as a fraction blindly (mostly OK in physics, but know when it breaks).','Skipping units through calculus — they flow through derivatives/integrals too.']},
        {revise:['Derivative = instantaneous slope.','Integral = accumulated area.','ODE solutions are physical motions.','Learn maths WITH its physical meaning.']}
      ]}
    ]
  },
  {
    id:'l4.advmech', title:'Advanced Mechanics', icon:'🌀', tagline:'Lagrangian & Hamiltonian viewpoints.', mins:30,
    lessons:[
      { id:'l4.advmech.main', title:'Beyond F = ma', mins:30, content:[
        {why:{q:'Why do roboticists never write force equations?', p:'They minimise energy instead: the Lagrangian L = KE − PE, and motion follows paths that keep the action integral stationary. One scalar recipe handles any constraint — pendulums on carts, double pendulums, anything.'}},
        {formulas:[
          {tex:'\\mathcal{L} = T - V', name:'The Lagrangian'},
          {tex:'\\frac{d}{dt}\\!\\left(\\frac{\\partial \\mathcal{L}}{\\partial \\dot q}\\right) - \\frac{\\partial \\mathcal{L}}{\\partial q}=0', name:'Euler–Lagrange equation', note:'One line replaces entire free-body diagrams.'}
        ]},
        {ul:['Hamiltonian H = T + V rewrites dynamics as first-order evolution — the launchpad toward quantum formulations.','Noether\u2019s theorem: every symmetry (time translation, rotation) yields a conservation law (energy, angular momentum). Deep and beautiful.']},
        {revise:['L = T − V; action-minimising paths.','Symmetry ⇔ conservation (Noether).','Constraints handled automatically.']}
      ]}
    ]
  },
  {
    id:'l4.advem', title:'Advanced Electromagnetism', icon:'📡', tagline:'Maxwell\u2019s four equations and light itself.', mins:30,
    lessons:[
      { id:'l4.advem.main', title:"Maxwell's Symphony", mins:30, content:[
        {why:{q:'What connects a magnet, a lightbulb and Wi-Fi?', p:'Four equations. Maxwell added one missing term (displacement current) to Faraday/Ampère laws and found that changing E and B regenerate each other — waves travelling at exactly measured light speed. Light IS electromagnetism.'}},
        {table:{head:['Law','Says what'], rows:[
          ['Gauss (∇·E)','Charges make fields; field lines end on charge'],
          ['Gauss-mag (∇·B=0)','No magnetic monopoles; B-lines close'],
          ['Faraday (∇×E)','Changing B makes circulating E'],
          ['Ampère–Maxwell (∇×B)','Currents AND changing E make circulating B']
        ]}},
        {formula:{tex:'c = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}}', name:'Light speed from constants', note:'Pure electromagnetic prediction — no optics needed.'}},
        {revise:['Two Gauss laws + two curl laws.','Displacement current completed Ampère.','EM waves need no medium.','Radiation pressure exists: photons carry momentum p=E/c.']}
      ]}
    ]
  },
  {
    id:'l4.rel', title:'Special Relativity', icon:'⏳', tagline:'Space and time lose their independence.', mins:35,
    lessons:[
      { id:'l4.rel.main', title:"Einstein's Special Relativity", mins:35, content:[
        {why:{q:'Can time really run slower for moving people?', p:'Yes — GPS satellites must correct for it DAILY or maps would drift by kilometres. Relativity is engineering, not philosophy.'}},
        {p:'**Two postulates only:** (1) physics laws identical in all inertial frames; (2) light speed c is the same for ALL observers regardless of source motion. Everything else follows.'},
        {formulas:[
          {tex:'\\gamma = \\frac{1}{\\sqrt{1-v^2/c^2}}', name:'Lorentz factor', note:'γ ≥ 1; explodes as v→c — nature\u2019s speed limit enforcer.'},
          {tex:'\\Delta t = \\gamma \\Delta t_0', name:'Time dilation', note:'Moving clocks tick slow as seen by “stationary” observers — symmetrically!'},
          {tex:'L = L_0/\\gamma', name:'Length contraction', note:'Along direction of motion only.'},
          {tex:'E^2 = (pc)^2 + (mc^2)^2', name:'Energy–momentum relation', note:'Massless particles: E = pc.'}
        ]},
        {example:{title:'Muon survival',
          given:['Atmospheric muons: lifetime 2.2 μs','speed ≈ 0.999c'],
          concept:'Without relativity they decay long before reaching ground.',
          solution:['γ ≈ 22 ⇒ Earth-frame lifetime ≈ 49 μs','Distance covered ≈ 15 km — enough to reach detectors'],
          answer:'Muons survive because of time dilation',
          interp:'Cosmic-ray muon flux is a tabletop proof of relativity.'}
        },
        {quiz:['q-sr1']},
        {revise:['Postulates ⇒ γ factor.','Moving clocks slow, rods shrink.','E=mc² rests within E²=(pc)²+(mc²)².','Simultaneity is relative.']}
      ]}
    ]
  },
  {
    id:'l4.quantum', title:'Quantum Mechanics Fundamentals', icon:'🎲', tagline:'Probability waves and quantised everything.', mins:40,
    lessons:[
      { id:'l4.quantum.main', title:'Entering the Quantum World', mins:40, content:[
        {why:{q:'How can something be both wave and particle?', p:'Electrons fired at double slits land one-by-one like bullets yet build interference patterns — each electron somehow explores both paths. Quantum mechanics embraces this: entities propagate as probability WAVES and interact as quanta.'}},
        {formulas:[
          {tex:'\\lambda = \\frac{h}{mv}', name:'de Broglie wavelength', note:'Matter waves: even you have one (~10⁻³⁶ m — unobservable!).'},
          {tex:'\\Delta x\\,\\Delta p \\ge \\hbar/2', name:'Heisenberg uncertainty', note:'Not measurement clumsiness — a fundamental property of waves.'},
          {tex:'i\\hbar\\frac{\\partial\\Psi}{\\partial t} = \\hat{H}\\Psi', name:'Schrödinger equation', note:'Quantum “F=ma”: tells how the wavefunction evolves.'},
          {tex:'P = |\\Psi|^2', name:'Born rule', note:'Wavefunction squared = probability density.'}
        ]},
        {ul:['Observables come in quantised lumps via eigenvalues — atoms stable BECAUSE electrons occupy discrete states without radiating.','Entanglement links particles beyond classical explanation — the resource of quantum computing.']},
        {quiz:['q-qm1']},
        {revise:['λ=h/mv for matter.','Uncertainty is built into nature.','|Ψ|² gives probabilities.','Energy levels explain atomic stability.']}
      ]}
    ]
  },
  {
    id:'l4.stat', title:'Statistical Mechanics', icon:'🌡️', tagline:'From coin flips to temperature.', mins:28,
    lessons:[
      { id:'l4.stat.main', title:'Macro from Micro', mins:28, content:[
        {why:{q:'How does randomness create certainty?', p:'No single molecule has a “temperature”, yet trillions averaging out yield precise thermodynamic laws. Statistical mechanics derives steam-engine science from atom counting.'}},
        {formulas:[
          {tex:'S = k_B \\ln W', name:'Boltzmann entropy', vars:[['W','number of microstates']], note:'Entropy counts arrangements — engraved on Boltzmann\u2019s tombstone.'},
          {tex:'P(E) \\propto e^{-E/k_BT}', name:'Boltzmann factor', note:'Hotter systems happily occupy higher-energy states.'}
        ]},
        {ul:['Second law reframed: systems drift toward overwhelmingly probable macrostates.','Same machinery powers information theory and machine learning today.']},
        {revise:['Entropy = log of microstate count.','Temperature sets Boltzmann weights.','Irreversibility = statistics of large numbers.']}
      ]}
    ]
  },
  {
    id:'l4.nucpart', title:'Nuclear & Particle Physics', icon:'⚛️', tagline:'Quarks, leptons and the Standard Model.', mins:32,
    lessons:[
      { id:'l4.nucpart.main', title:'Inside Matter\u2019s Core', mins:32, content:[
        {why:{q:'What are protons made of?', p:'Three quarks bound by gluons. The Standard Model catalogues 17 fundamental particles and three forces with staggering precision — but still excludes gravity.'}},
        {table:{head:['Family','Members'], rows:[
          ['Quarks','u, d, c, s, t, b'],
          ['Leptons','e, μ, τ + their neutrinos'],
          ['Force carriers','photon, W±, Z, gluons'],
          ['Higgs','the mass-giving scalar']
        ]}},
        {ul:['Four fundamental forces ranked by strength: strong → EM → weak → gravity.','Conservation rules (charge, baryon number, lepton number) govern every allowed reaction.','Accelerators recreate Big-Bang conditions to discover particles (Higgs found 2012).']},
        {revise:['Quarks come in six flavours.','Mediators carry forces.','Conservation laws filter reactions.','Standard Model ≠ final theory (no gravity).']}
      ]}
    ]
  },
  {
    id:'l4.astro', title:'Astrophysics', icon:'🌌', tagline:'Stars, black holes, cosmology.', mins:32,
    lessons:[
      { id:'l4.astro.main', title:'Physics at Cosmic Scale', mins:32, content:[
        {why:{q:'Why do stars shine for billions of years?', p:'Gravity compresses hydrogen until fusion ignites; radiation pressure balances collapse. A star is a self-regulating nuclear reactor the size of a million Earths.'}},
        {ul:[
          'Stellar lifecycle: nebula → main sequence → red giant → white dwarf / neutron star / black hole (mass decides).',
          'Chandrasekhar limit (1.4 M☉): beyond it, electron degeneracy fails and collapse continues.',
          'Redshift of galaxies ⇒ expanding universe ⇒ Big Bang; CMB is its afterglow.',
          'Dark matter (~27%) and dark energy (~68%) dominate cosmic budgets while remaining unidentified.'
        ]},
        {revise:['Hydrostatic equilibrium runs stars.','Fusion up to iron releases energy.','Expansion + CMB anchor cosmology.','Most of the universe is dark.']}
      ]}
    ]
  },
  {
    id:'l4.condensed', title:'Condensed Matter Basics', icon:'💎', tagline:'Band theory, superconductors, soft matter.', mins:26,
    lessons:[
      { id:'l4.condensed.main', title:'Solids, Bands & Superconductors', mins:26, content:[
        {why:{q:'Why is copper a conductor and diamond an insulator when both are crystals?', p:'Band structure. In copper the valence band is half-filled (electrons roam freely); in diamond a 5.5 eV gap forbids motion. All electronics lives between these bands.'}},
        {ul:[
          'Countless atoms merge orbitals into continuous bands separated by gaps.',
          'Conductors: overlapping/partial bands. Insulators: big gaps. Semiconductors: small, engineerable gaps.',
          'Superconductors: below critical temperature resistance vanishes EXACTLY (BCS pairing); MRI magnets rely on it.',
          'Doping semiconductors = placing donor/acceptor levels inside the gap (Level 3 electronics, explained deeply).'
        ]},
        {revise:['Band gaps classify materials.','Small gap ⇒ semiconductor.','Superconductivity: zero resistance below Tc.','Modern tech = applied condensed matter.']}
      ]}
    ]
  }
]});
