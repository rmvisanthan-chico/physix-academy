/* PhysiX Academy — Level 3 Part D: Electricity & Magnetism */
'use strict';

(function(){
const lv = CURRICULUM.find(l => l.id === 'l3');

lv.chapters.push(
  {
    id:'l3.charges', title:'Electric Charges & Fields', icon:'⚡', tagline:'Coulomb\u2019s law and the field idea.', mins:28,
    lessons:[
      { id:'l3.charges.main', title:'Charges, Coulomb & Electric Field', mins:28, content:[
        {why:{q:'Why does a balloon stick to the wall after rubbing?', p:'Rubbing transfers electrons; the charged balloon polarises the wall surface, attracting opposite charge nearby. Static electricity is physics you can feel — sometimes painfully in winter.'}},
        {formulas:[
          {tex:'F = k\\frac{q_1q_2}{r^2}', name:'Coulomb\u2019s law', vars:[['k = 9×10⁹','N·m²/C²'],['r','separation']], note:'Inverse-square like gravity but enormously stronger between particles.'},
          {tex:'\\vec{E} = \\frac{\\vec{F}}{q_0}', name:'Electric field definition', note:'Force per unit positive test charge — a property of SPACE itself.'}
        ]},
        {example:{title:'Two small charges',
          given:['q₁ = q₂ = 2 μC','r = 10 cm'],
          concept:'Direct substitution into Coulomb\u2019s law.',
          solution:['$F = 9×10^9 × (2×10^{-6})^2 / (0.1)^2$','$= 9×10^9 × 4×10^{-12} / 0.01$'],
          answer:'F = 3.6 N',
          interp:'Microcoulombs already push with newton-scale forces at hand distances.'}
        },
        {sim:'efield3d'},
        {mistakes:['Adding field contributions without treating them as vectors.','Forgetting field lines never cross.','Using edge distance instead of centre-to-centre for spheres.']},
        {quiz:['q-ch1','q-ch2']},
        {revise:['Like repels, unlike attracts — inverse-square.','E = F/q₀.','Field lines: out of +, into −, never crossing.']}
      ]}
    ]
  },
  {
    id:'l3.potcap', title:'Potential & Capacitance', icon:'🔋', tagline:'Energy landscapes and charge storage.', mins:24,
    lessons:[
      { id:'l3.potcap.main', title:'Potential, Energy & Capacitors', mins:24, content:[
        {why:{q:'Why do defibrillators say “charging… stand clear”?', p:'A capacitor banks energy ½CV² and releases it through the chest in milliseconds. Capacitance is life-support engineering.'}},
        {formulas:[
          {tex:'V = k\\frac{Q}{r}', name:'Potential of a point charge', vars:[['V','work per unit charge from infinity']]},
          {tex:'C = \\frac{Q}{V}, \\quad C = \\frac{\\varepsilon_0 A}{d}', name:'Capacitance (parallel plate)', vars:[['A','plate area'],['d','separation'],['ε₀ = 8.85×10⁻¹²','F/m']]},
          {tex:'U = \\tfrac12 CV^2', name:'Stored energy'},
          {tex:'C_{series}^{-1}=\\sum C_i^{-1}, \\quad C_{parallel}=\\sum C_i', name:'Combinations', note:'Opposite pattern from resistors!'}
        ]},
        {example:{title:'Camera flash capacitor',
          given:['C = 1000 μF','charged to 300 V'],
          concept:'Energy formula.',
          solution:['$U = \\tfrac12 × 10^{-3} × 300^2 = \\tfrac12 × 10^{-3} × 90000$'],
          answer:'U = 45 J',
          interp:'Released in ~1 ms that is 45 kW peak power.'}
        },
        {mistakes:['Swapping series/parallel rules with resistors.','Ignoring dielectric constant κ (multiplies C).','Treating potential as force rather than energy per charge.']},
        {quiz:['q-pc1','q-pc2']},
        {revise:['C=Q/V; U=½CV².','Closer plates ⇒ larger C.','Series capacitors add reciprocally.','Dielectrics boost C by κ.']}
      ]}
    ]
  },
  {
    id:'l3.current', title:'Current Electricity', icon:'🔌', tagline:'Ohm, Kirchhoff, drift velocity.', mins:26,
    lessons:[
      { id:'l3.current.main', title:'Currents, Resistance & Kirchhoff', mins:26, content:[
        {why:{q:'How fast do electrons drift inside wires?', p:'Less than a millimetre per second! Lights turn on instantly because the electric FIELD races through at near light speed, nudging electrons everywhere almost simultaneously.'}},
        {formulas:[
          {tex:'I = nAev_d', name:'Drift-current relation', vars:[['n','carrier density'],['v_d','drift velocity'],['e','1.6×10⁻¹⁹ C']]},
          {tex:'R = \\rho\\frac{L}{A}', name:'Wire resistance', vars:[['ρ','resistivity (material property)']]},
          {tex:'R_{series}=\\sum R_i, \\quad R_{par}^{-1}=\\sum R_i^{-1}', name:'Combinations'}
        ]},
        {p:'**Kirchhoff\u2019s rules:** junction rule (ΣI in = ΣI out — charge conservation) and loop rule (ΣΔV = 0 around any closed path — energy conservation). Together they crack any circuit.'},
        {example:{title:'Parallel resistors',
          given:['6 Ω ∥ 3 Ω across 12 V'],
          concept:'Equivalent resistance first.',
          solution:['$1/R = 1/6+1/3=1/2 ⇒ R=2$ Ω','$I = 12/2 = 6$ A'],
          answer:'6 A total (4 A through 3 Ω, 2 A through 6 Ω)',
          interp:'Current divides inversely with resistance; equivalent dips below smallest branch.'}
        },
        {sim:'circuit'},
        {mistakes:['Adding parallel resistances directly.','Confusing resistivity (material) with resistance (object).','Applying V=IR to one component using full battery voltage when elements share it.']},
        {quiz:['q-cr1','q-cr2']},
        {revise:['I=nAev_d explains conduction limits.','Kirchhoff = conservation laws.','Parallel ⇒ R_eq < smallest branch.','Resistivity rises with temperature for metals.']}
      ]}
    ]
  },
  {
    id:'l3.moving', title:'Moving Charges & Magnetism', icon:'🧭', tagline:'Charges in B fields, motors.', mins:26,
    lessons:[
      { id:'l3.moving.main', title:'Magnetic Force & Fields from Currents', mins:26, content:[
        {why:{q:'Why do MRI machines weigh tonnes?', p:'They sustain fields of 1.5–3 T steadily — tens of thousands of times Earth\u2019s field — requiring superconducting coils. Currents genuinely create powerful magnetism.'}},
        {formulas:[
          {tex:'\\vec{F} = q\\,\\vec{v}\\times\\vec{B}', name:'Force on moving charge', vars:[['B','flux density (tesla)']], note:'Magnitude qvB sinθ; zero when v ∥ B; always ⟂ v so it does NO work.'},
          {tex:'r = \\frac{mv}{qB}', name:'Circle radius in uniform B'},
          {tex:'F = BIL\\sin\\theta', name:'Force on straight wire', note:'The motor principle.'}
        ]},
        {example:{title:'Proton corkscrewing in an MRI',
          given:['v = 10⁶ m/s','B = 0.5 T'],
          concept:'Radius formula.',
          solution:['$r = \\frac{1.67×10^{-27} × 10^6}{1.6×10^{-19} × 0.5}$'],
          answer:'≈ 2.1 cm',
          interp:'Particles spiral tightly along field lines — cyclotrons and auroras run on this.'}
        },
        {sim:'bfield'},
        {mistakes:['Expecting magnetic force to speed particles up (it cannot — always ⟂ v).','Right-hand-rule mix-ups between current direction and encircling field.','Assuming force exists when v is parallel to B.']},
        {quiz:['q-mv1','q-mv2']},
        {revise:['F=qvB sinθ; no work done.','r = mv/qB.','Wire: F=BIL sinθ → motors.','Parallel currents attract; anti-parallel repel.']}
      ]}
    ]
  },
  {
    id:'l3.matter', title:'Magnetism & Matter', icon:'🌐', tagline:'Earth\u2019s dynamo and magnetic materials.', mins:18,
    lessons:[
      { id:'l3.matter.main', title:'Magnets, Earth & Materials', mins:18, content:[
        {why:{q:'Will compass north stop matching true north?', p:'Earth\u2019s poles wander continuously and have reversed hundreds of times over geological history. Compasses survive; navigation charts keep updating declination.'}},
        {def:[
          {term:'Magnetic dipole moment', text:'Strength × geometry measure; bar magnets behave like current loops: m = IA.'},
          {term:'Ferromagnetism', text:'Iron-like domain alignment; strong attraction; hysteresis memory.'},
          {term:'Para / Diamagnetism', text:'Weak attraction / weak repulsion — every material responds somehow.'}
        ]},
        {ul:['Earth resembles a tilted dipole (~11° off rotation axis).','Heat iron past its Curie point (~770°C) and permanent magnetism dies.']},

        {mistakes:['Imagining field lines begin/end at poles — magnetic lines are CLOSED loops (no monopoles).','Blaming compass errors on anything but nearby magnets/currents.']},
        {quiz:['q-mm1']},
        {revise:['m = IA for loops.','Domains explain ferromagnets.','Curie temperature erases alignment.','No isolated poles exist.']}
      ]}
    ]
  },
  {
    id:'l3.emi', title:'Electromagnetic Induction', icon:'🌀', tagline:'Faraday\u2019s discovery powers civilisation.', mins:25,
    lessons:[
      { id:'l3.emi.main', title:'Faraday & Lenz Laws', mins:25, content:[
        {why:{q:'What happens inside every generator?', p:'Coils sweep through magnetic fields; changing flux induces EMF. Coal, hydro, wind or nuclear — all grid electricity flows from Faraday\u2019s single equation.'}},
        {formulas:[
          {tex:'\\varepsilon = -N\\frac{d\\Phi_B}{dt}', name:'Faraday\u2019s law of induction', vars:[['Φ_B = BA cosθ','magnetic flux'],['N','turns']], note:'Minus sign embodies Lenz\u2019s law: induced effects oppose their cause — energy conservation in disguise.'},
          {tex:'\\varepsilon = BLv', name:'Motional EMF (rod)'}
        ]},
        {example:{title:'Generator coil pulse',
          given:['N = 100 turns','flux drops 0.02 Wb in 0.1 s'],
          concept:'Faraday magnitude.',
          solution:['$|\\varepsilon| = N·ΔΦ/Δt = 100 × 0.02/0.1$'],
          answer:'20 V',
          interp:'Rotate continuously and this becomes sinusoidal AC — a dynamo.'}
        },
        {sim:'induction'},
        {mistakes:['Dropping Lenz\u2019s minus sign and failing direction questions.','Expecting induction from CONSTANT flux — only changes count.','Confusing flux (Wb) with field strength (T).']},
        {quiz:['q-em1','q-em2']},
        {revise:['Changing flux ⇒ EMF.','Lenz opposes change.','Generators: motion→electricity.','Eddy currents can brake metal.']}
      ]}
    ]
  },
  {
    id:'l3.ac', title:'Alternating Current', icon:'📈', tagline:'Reactance, resonance, transformers.', mins:24,
    lessons:[
      { id:'l3.ac.main', title:'AC Circuits & the Grid', mins:24, content:[
        {why:{q:'Why is grid power AC?', p:'Transformers need CHANGING currents. Stepping voltage up slashes I²R transmission losses, making national grids economical. AC won the 1890s “War of Currents” on this arithmetic alone.'}},
        {formulas:[
          {tex:'X_L = \\omega L, \\quad X_C = \\frac{1}{\\omega C}', name:'Reactances', note:'XL grows with frequency, XC shrinks — filters are born here.'},
          {tex:'Z = \\sqrt{R^2+(X_L-X_C)^2}', name:'Impedance'},
          {tex:'f_{res} = \\frac{1}{2\\pi\\sqrt{LC}}', name:'Resonance', note:'At XL=XC impedance collapses to R — radio tuning.'},
          {tex:'V_{rms} = V_0/\\sqrt{2}', name:'rms vs peak', note:'“230 V” mains actually peaks near ±325 V.'}
        ]},
        {mistakes:['Mixing peak and rms values in power sums.','Saying inductors block high frequencies (they block CURRENT CHANGE — XL rises with f).','Ignoring phase differences in LC circuits.']},
        {quiz:['q-ac1','q-ac2']},
        {revise:['Z combines R and reactances vectorially.','Resonance: XL=XC.','rms = peak/√2.','Transformers require AC.']}
      ]}
    ]
  }
);
})();
