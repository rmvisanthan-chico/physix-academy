/* PhysiX Academy — Level 3 Part C: Properties of Matter + Oscillations & Waves */
'use strict';

(function(){
const lv = CURRICULUM.find(l => l.id === 'l3');

lv.chapters.push(
  /* ---------------- PROPERTIES OF MATTER ---------------- */
  {
    id:'l3.solids', title:'Mechanical Properties of Solids', icon:'🧱', tagline:'Stress, strain and Hooke\u2019s law.', mins:18,
    lessons:[
      { id:'l3.solids.main', title:'Elasticity: Stress & Strain', mins:18, content:[
        {why:{q:'Why do bridges have expansion joints?', p:'Steel stretches under load and with temperature. Engineers quantify stretch via stress–strain curves so structures flex safely instead of snapping.'}},
        {formulas:[
          {tex:'\\text{stress} = \\frac{F}{A}, \\quad \\text{strain} = \\frac{\\Delta L}{L}', name:'Stress & strain', vars:[['A','cross-section area'],['L','original length']]},
          {tex:'Y = \\frac{\\text{stress}}{\\text{strain}} = \\frac{F L}{A\\,\\Delta L}', name:'Young\u2019s modulus', note:'Steel ≈ 2×10¹¹ Pa — enormously stiff; rubber ~10⁶ Pa.'}
        ]},
        {example:{title:'Wire stretch',
          given:['F=1000 N on A=1 mm² steel wire','L = 1 m','Y = 2×10¹¹ Pa'],
          concept:'Rearrange Young\u2019s modulus for ΔL.',
          solution:['$A = 10^{-6}$ m²','stress $= 1000/10^{-6} = 10^7$ Pa','strain $= 10^7 / 2×10^{11} = 5×10^{-5}$'],
          answer:'ΔL = 0.05 mm',
          interp:'Tiny — which is why steel feels "rigid" yet is measurably springy in precision instruments.'}
        },
        {mistakes:['Confusing stress (N/m²) with force itself.','Exceeding elastic limit then still using Hooke\u2019s law.','Mixing units: area must be in m².']},
        {quiz:['q-sol1']},
        {revise:['Stress=F/A; strain=ΔL/L.','Hooke region: strain ∝ stress.','Y measures stiffness.','Beyond yield → permanent deformation.']}
      ]}
    ]
  },
  {
    id:'l3.fluids', title:'Mechanical Properties of Fluids', icon:'💧', tagline:'Pressure, buoyancy, Bernoulli.', mins:25,
    lessons:[
      { id:'l3.fluids.main', title:'Pressure, Buoyancy & Flow', mins:25, content:[
        {why:{q:'How can a steel ship float while a steel bolt sinks?', p:'Buoyancy depends on displaced WATER weight, not material density alone. Shape the hull to displace enough water and even steel swims — Archimedes knew this in 250 BCE.'}},
        {formulas:[
          {tex:'P = P_0 + \\rho g h', name:'Hydrostatic pressure at depth h', vars:[['ρ','fluid density'],['h','depth below surface']]},
          {tex:'F_b = \\rho_{fluid}\\, g\\, V_{disp}', name:'Archimedes\u2019 buoyant force'},
          {tex:'A_1v_1 = A_2v_2', name:'Continuity (incompressible flow)', note:'Pipe narrows ⇒ flow speeds up.'},
          {tex:'P + \\tfrac12\\rho v^2 + \\rho g h = \\text{const}', name:'Bernoulli\u2019s equation', note:'Faster flow ⇒ lower pressure — aeroplane wings, atomisers.'}
        ]},
        {example:{title:'Pressure at 10 m depth',
          given:['Fresh water, ρ = 1000 kg/m³','g = 9.8'],
          concept:'Add ρgh to atmospheric.',
          solution:['$\\rho gh = 1000×9.8×10 = 98{,}000$ Pa'],
          answer:'≈ 98 kPa gauge (+1 atm absolute)',
          interp:'Every 10 m ≈ one extra atmosphere — why divers need careful pressure equalisation.'}
        },
        {sim:null},
        {mistakes:['Using object volume instead of SUBMERGED volume in buoyancy.','Applying Bernoulli to viscous/turbulent flows blindly.','Forgetting Pascal transmission in hydraulics multiplies FORCE, not energy.']},
        {quiz:['q-fl1','q-fl2']},
        {revise:['Depth pressure ρgh.','Float ⇔ displaced water weight ≥ object weight.','Narrow pipe ⇒ faster flow.','Bernoulli: fast = low pressure.']}
      ]}
    ]
  },
  {
    id:'l3.thermal', title:'Thermal Properties of Matter', icon:'🌡️', tagline:'Expansion, calorimetry, latent heat.', mins:20,
    lessons:[
      { id:'l3.thermal.main', title:'Heat Transfer & Phase Changes', mins:20, content:[
        {why:{q:'Why do railway tracks have gaps?', p:'Solids expand when heated: $\\Delta L = \\alpha L \\Delta T$. Without gaps summer rails would buckle. The same physics fits bridge bearings and bimetal thermostats.'}},
        {formulas:[
          {tex:'\\Delta L = \\alpha L \\Delta T', name:'Linear expansion', vars:[['α','coefficient (~10⁻⁵/K for metals)']]},
          {tex:'Q = mL', name:'Latent heat', vars:[['L','latent heat of fusion/vaporisation']], note:'Phase change absorbs/releases heat with NO temperature change.'}
        ]},
        {example:{title:'Melting ice vs heating water',
          given:['Melt 0.5 kg ice at 0°C','L_fusion = 334 kJ/kg'],
          concept:'Energy goes into breaking bonds, not raising temperature.',
          solution:['$Q = 0.5 × 334{,}000$'],
          answer:'167 kJ',
          interp:'That same energy would heat the melted water by another 80°C! Latent heat is huge.'}
        },
        {mistakes:['Adding heat during phase change into ΔT formulas.','Forgetting expansion is proportional to ORIGINAL length.','Assuming all materials expand positively (water 0–4°C contracts!).']},
        {quiz:['q-thp1']},
        {revise:['ΔL = αLΔT.','Calorimetry: heat lost = heat gained.','Plateaus on T–t graphs = latent heat.']}
      ]}
    ]
  },
  {
    id:'l3.thermo', title:'Thermodynamics', icon:'♨️', tagline:'The laws nothing in the universe escapes.', mins:30,
    lessons:[
      { id:'l3.thermo.main', title:'First Law, Engines & Entropy', mins:30, content:[
        {why:{q:'Why can\u2019t your fridge cool the whole room with its door open?', p:'It moves heat from inside to outside plus adds compressor work as more heat — the room warms up. The Second Law guarantees no free cooling: entropy wins.'}},
        {formula:{tex:'\\Delta U = Q - W', name:'First Law of Thermodynamics', vars:[['U','internal energy'],['Q','heat ADDED to gas'],['W','work done BY gas']], note:'Sign conventions vary by book — this site uses physics convention (W = work BY system).'}},
        {table:{head:['Process','What stays constant','Key relation'], rows:[
          ['Isothermal','T','$PV=$ const'],
          ['Adiabatic','Q','$PV^\\gamma=$ const'],
          ['Isobaric','P','$W=P\\Delta V$'],
          ['Isochoric','V','$W=0$']
        ]}},
        {formula:{tex:'\\eta = 1 - \\frac{T_c}{T_h}', name:'Carnot efficiency (Kelvin!)', vars:[['T_c,T_h','cold/hot reservoir temperatures']], note:'No engine between two reservoirs beats Carnot — ever.'}},
        {example:{title:'Power-plant ceiling',
          given:['Steam at 600 K','cooling tower 300 K'],
          concept:'Carnot limit.',
          solution:['$\\eta = 1 - 300/600 = 0.5$'],
          answer:'50% maximum',
          interp:'Real plants reach ~40% — the gap is friction and imperfect heat exchange.'}
        },
        {p:'**Second Law:** heat never flows cold→hot unaided, and isolated-system entropy never decreases. This is why perpetual motion machines are impossible and time has a direction.'},
        {mistakes:['Inserting Celsius temperatures into η = 1 − Tc/Th (Kelvin required).','Flipping Q/W signs mid-problem without stating a convention.','Believing energy conservation forbids inefficiency — it doesn\u2019t; entropy does.']},
        {quiz:['q-th1','q-th2']},
        {revise:['ΔU = Q − W.','γ-processes: adiabatic steepest on PV plot.','η_Carnot = 1 − Tc/Th (K).','Entropy: the arrow-of-time tax.']}
      ]}
    ]
  },
  {
    id:'l3.kt', title:'Kinetic Theory', icon:'💨', tagline:'Temperature IS molecular motion.', mins:20,
    lessons:[
      { id:'l3.kt.main', title:'Gases From Molecules Up', mins:20, content:[
        {why:{q:'Why does a sealed chip packet inflate on a mountain flight?', p:'Outside pressure drops while molecules inside keep hammering the walls at the same rate — so the pack puffs. Kinetic theory turns such everyday puzzles into precise equations.'}},
        {formulas:[
          {tex:'PV = nRT = Nk_BT', name:'Ideal gas law', vars:[['n','moles'],['R = 8.314 J/mol·K'],['k_B = 1.38×10⁻²³ J/K']]},
          {tex:'\\bar{KE} = \\tfrac32 k_B T', name:'Average molecular KE', note:'Directly proportional to ABSOLUTE temperature.'},
          {tex:'v_{rms} = \\sqrt{\\frac{3RT}{M}}', name:'rms speed', note:'Lighter gases move faster — hydrogen escapes atmospheres!'}

        ]},
        {example:{title:'Speed of air molecules',
          given:['T = 300 K','M_air ≈ 0.029 kg/mol'],
          concept:'rms speed formula.',
          solution:['$v_{rms}=\\sqrt{3×8.31×300/0.029}$','$=\\sqrt{258{,}000}$'],
          answer:'≈ 508 m/s',
          interp:'Nitrogen zips around at ~1800 km/h inside every quiet room.'}
        },
        {mistakes:['Using °C instead of K in gas laws (double it wrong, get nonsense).','Thinking all molecules share one speed — they follow a Maxwell distribution.','Assuming ideal behaviour at high pressure/low temperature near liquefaction.']},
        {quiz:['q-kt1']},
        {revise:['PV=nRT with Kelvin only.','½mv̄² ∝ T.','Lighter ⇒ faster rms.','Real gases deviate when molecules interact.']}
      ]}
    ]
  },

  /* ---------------- OSCILLATIONS & WAVES ---------------- */
  {
    id:'l3.shm', title:'Oscillations (SHM)', icon:'⏱️', tagline:'Springs, pendulums and the sine-wave heart of physics.', mins:28,
    lessons:[
      { id:'l3.shm.main', title:'Simple Harmonic Motion', mins:28, content:[
        {why:{q:'Why does every watch company obsess over quartz crystals?', p:'Because SHM gives nature\u2019s most reliable clock: acceleration proportional to displacement produces perfectly repeatable oscillation. Quartz vibrates 32,768 times per second — count those and you keep time for years.'}},
        {def:[{term:'SHM defined', text:'Motion where restoring force ∝ displacement and opposes it: $F=-kx$. Result: sinusoidal motion about equilibrium.'}]},
        {formulas:[
          {tex:'x(t) = A\\cos(\\omega t + \\phi)', name:'Displacement', vars:[['A','amplitude'],['ω','angular frequency (rad/s)'],['φ','phase constant']]},
          {tex:'\\omega = \\sqrt{\\frac{k}{m}}, \\quad T = 2\\pi\\sqrt{\\frac{m}{k}}', name:'Mass–spring period', note:'Independent of amplitude — isochronism!'},
          {tex:'T = 2\\pi\\sqrt{\\frac{L}{g}}', name:'Simple pendulum period', vars:[['L','length to centre of bob']], note:'Valid for small angles (θ ≲ 15°).'},
          {tex:'E = \\tfrac12 kA^2', name:'Total SHM energy', note:'Swaps between KE and PE twice per cycle but total stays fixed.'}
        ]},
        {example:{title:'Spring clock',
          given:['m = 0.5 kg','k = 200 N/m'],
          concept:'Plug into period formula.',
          solution:['$T = 2π\\sqrt{0.5/200} = 2π(0.05)$'],
          answer:'T ≈ 0.314 s',
          interp:'≈ 3.2 oscillations per second — audible hum territory.'}
        },
        {sim:'shm'},
        {mistakes:['Max speed occurs at EQUILIBRIUM (x=0), not at extremes — extremes hold max PE.','Thinking heavier bobs change pendulum period (mass cancels!).','Large-angle pendulums are NOT isochronous — small-angle approximation matters.']},
        {quiz:['q-shm1','q-shm2']},
        {revise:['F = −kx defines SHM.','x = A cos(ωt+φ); v max at centre.','T_spring independent of A; T_pendulum independent of m.','E_total = ½kA² conserved.']}
      ]}
    ]
  },
  {
    id:'l3.waves', title:'Waves', icon:'〰️', tagline:'Superposition, standing waves, resonance.', mins:24,
    lessons:[
      { id:'l3.waves.main', title:'Wave Behaviour Deep Dive', mins:24, content:[
        {why:{q:'Why does a guitar sound different from a flute playing the same note?', p:'Same fundamental frequency, different harmonic mix. Strings and air columns support specific standing-wave patterns — the physics below explains every musical instrument.'}},
        {formulas:[
          {tex:'v = \\sqrt{\\frac{T}{\\mu}}', name:'Wave speed on string', vars:[['T','string tension'],['μ','mass per length']]},
          {tex:'f_n = \\frac{nv}{2L}', name:'String harmonics (both ends fixed)', note:'n = 1, 2, 3… nodes at both ends.'},
          {tex:'f_{beat} = |f_1 - f_2|', name:'Beat frequency', note:'Two close frequencies drift in and out of step.'}
        ]},
        {p:'**Standing waves** form when identical waves travelling opposite directions superpose: fixed points (nodes) and maximal swing points (antinodes) appear. Only certain wavelengths "fit" each boundary condition — that quantisation foreshadows quantum mechanics!'},
        {example:{title:'Beats',
          given:['Tuning forks at 512 Hz and 508 Hz'],
          concept:'Beat frequency = |f₁−f₂|.',
          solution:['$f_{beat} = |512-508|$'],
          answer:'4 beats per second',
          interp:'Musicians tune instruments by listening until beats vanish.'}
        },
        {sim:'wave3d'},
        {mistakes:['Counting antinodes wrong for open vs closed pipes (closed ends force odd harmonics only).','Thinking superposition permanently mixes waves — they pass through unchanged.','Using tension units carelessly: μ in kg/m.']},
        {quiz:['q-wv3','q-wv4']},
        {revise:['v_string = √(T/μ).','Fixed-fixed: f_n = nv/2L.','Closed pipes: odd harmonics.','Beats: |f₁−f₂|.']}
      ]}
    ]
  },
  {
    id:'l3.sound', title:'Sound', icon:'🔊', tagline:'Doppler effect, intensity, decibels.', mins:20,
    lessons:[
      { id:'l3.sound.main', title:'Sound in Depth', mins:20, content:[
        {why:{q:'Why does an ambulance siren drop in pitch as it passes?', p:'Waves bunch up ahead of the moving source and stretch behind — frequency shifts with relative motion. Radar guns, medical ultrasound and cosmic redshifts all use this Doppler effect.'}},
        {formulas:[
          {tex:"f' = f\\left(\\frac{v \\pm v_o}{v \\mp v_s}\\right)", name:'Doppler effect', vars:[['v','sound speed in medium'],['v_o','observer speed'],['v_s','source speed']], note:'Top signs: observer approaching (+) or source approaching (−). Motion toward raises pitch.'},
          {tex:'\\beta = 10\\log_{10}\\!\\left(\\frac{I}{I_0}\\right)', name:'Decibel level', vars:[['I₀ = 10⁻¹² W/m²','threshold of hearing']], note:'+10 dB = ten times intensity.'}
        ]},
        {sim:'doppler'},
        {mistakes:['Applying Doppler sign conventions mechanically without drawing the geometry.','Confusing loudness (intensity) with pitch (frequency).','Expecting Doppler shift for purely transverse motion (none classically).']},
        {quiz:['q-so1','q-so2']},
        {revise:['Approach ⇒ higher pitch.','dB scale logarithmic.','Sound fastest in solids, none in vacuum.']}
      ]}
    ]
  }
);
})();
