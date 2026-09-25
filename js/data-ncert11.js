/* ============================================================
   PhysiX Academy — NCERT Class 11 Physics
   14 chapters across 10 units (as per your table)
   ============================================================ */
'use strict';

CURRICULUM.push({
  id:'ncert11', name:'NCERT Class 11 — Physics', tag:'NCERT 11', icon:'📘', color:'#8b5cf6',
  desc:'Complete Class 11 Physics — 14 chapters, 10 units. NCERT-exact sequence from Units & Measurement to Waves, with derivations, graphs and JEE/NEET foundation numericals.',
  chapters:[

  {
    id:'ncert11.units', title:'Units and Measurements', icon:'📏', tagline:'Unit I — Physical World & Measurement', mins:22,
    lessons:[
      { id:'ncert11.units.main', title:'Units, Dimensions & Errors', mins:22, content:[
        {why:{q:'Why did NASA lose a $125M orbiter?', p:'Unit mismatch: pound-force vs newton. NCERT Ch 1 makes this non-negotiable — seven base SI units, dimensional analysis as a lie-detector for physics equations.'}},
        {def:[
          {term:'Base SI (7)', text:'m (length), kg (mass), s (time), A (current), K (temp), mol (amount), cd (luminous). All other units derive.'},
          {term:'Dimension', text:'[M] mass, [L] length, [T] time. Velocity [M⁰LT⁻¹], force [MLT⁻²].'},
          {term:'Least count & errors', text:'Least count = smallest measurable; absolute error |Δa_m|, mean absolute error Δa_mean, relative = Δa_mean/a_mean, percentage = ×100%. Combinations: sum/diff → add absolute; product/quotient → add relative.'}
        ]},
        {formulas:[
          {tex:'[E]=[ML^{2}T^{-2}],\\; [F]=[MLT^{-2}],\\; [P]=[ML^{-1}T^{-2}]', name:'Dimensions', vars:[]},
          {tex:'\\Delta a_{mean}=\\frac{|\\Delta a_1|+\\cdots+|\\Delta a_n|}{n}', name:'Mean absolute error', vars:[]}
        ]},
        {example:{title:'Check v = at — dimensionally correct?',
          given:['v [LT⁻¹], a [LT⁻²], t [T]'],
          concept:'RHS: at → [LT⁻²][T]=[LT⁻¹] matches v.',
          solution:['Both sides [LT⁻¹] ✓'],
          answer:'Dimensionally correct (necessary, not sufficient for constants)',
          interp:'Dimensional check never proves ½ hidden — needs experiment.'
        }},
        {mistakes:['Writing dimensions of angle as [L] — it is dimensionless.','Adding quantities of different dimensions.','Forgetting to convert absolute→relative→percentage correctly.']},
        {revise:['7 base SI; dimensions: [M][L][T].','Homogeneity: add/subtract only same dimensions.','Error in sum → add absolutes; product → add relatives.']}
      ]}
    ]
  },

  {
    id:'ncert11.kin1', title:'Motion in a Straight Line', icon:'➡️', tagline:'Unit II — Kinematics (1/2)', mins:28,
    lessons:[
      { id:'ncert11.kin1.main', title:'Straight-line Kinematics & Graphs', mins:28, content:[
        {why:{q:'Can you tell if a car sped without seeing the speedometer?', p:'s–t and v–t graphs do. NCERT builds position, displacement, average vs instantaneous, plus the three equations for uniform acceleration.'}},
        {formulas:[
          {tex:'v = \\frac{dx}{dt},\\; a = \\frac{dv}{dt}=\\frac{d^{2}x}{dt^{2}}', name:'Instantaneous definitions', vars:[]},
          {tex:'v = u+at,\\; s = ut+\\tfrac12 at^{2},\\; v^{2}=u^{2}+2as', name:'Uniform acceleration', vars:[]},
          {tex:'v_{av}=\\frac{x_2-x_1}{t_2-t_1},\\; \\text{speed}_{av}=\\frac{\\text{total path}}{\\text{total time}}', name:'Averages', vars:[]}
        ]},
        {h:'Graphs — NCAA must-know'},
        {table:{head:['Graph','Slope','Area'], rows:[
          ['x–t','velocity','—'],
          ['v–t','acceleration','displacement'],
          ['a–t','jerk','change in velocity']
        ]}},
        {example:{title:'Braking distance scales as v²',
          given:['Car at 72 km/h (20 m/s), a=−5 m/s²'],
          concept:'v²=u²+2as with v=0.',
          solution:['$0=400+2(−5)s$ → $s=40$ m','At 36 km/h (10 m/s): $s=10$ m'],
          answer:'Doubling speed quadruples braking distance',
          interp:'Highway boards are physics, not advice.'
        }},
        {sim:'kinematics'},
        {mistakes:['Average speed vs velocity swapped when direction reverses.','Using uniform-a equations with varying a.','Reading x–t area as distance.']},
        {revise:['Instantaneous = derivative; average = total/time.','Three equations only for uniform a.','Uniform circular even with constant speed → acceleration.']}
      ]}
    ]
  },

  {
    id:'ncert11.kin2', title:'Motion in a Plane', icon:'↗️', tagline:'Unit II — Kinematics (2/2)', mins:30,
    lessons:[
      { id:'ncert11.kin2.main', title:'Vectors, Projectile & Uniform Circular Motion', mins:30, content:[
        {why:{q:'Why does a cricket ball hit for six follow a symmetric arc?', p:'Projectile motion: horizontal uniform velocity + vertical uniform acceleration (g) act independently — the parabola is the sum of two straight-line motions.'}},
        {formulas:[
          {tex:'\\vec r = x\\hat i+y\\hat j,\\; \\vec v = \\frac{d\\vec r}{dt},\\; \\vec a = \\frac{d\\vec v}{dt}', name:'Vector kinematics', vars:[]},
          {tex:'R = \\frac{u^{2}\\sin2\\theta}{g},\\; H = \\frac{u^{2}\\sin^{2}\\theta}{2g},\\; T = \\frac{2u\\sin\\theta}{g}', name:'Projectile (ground-to-ground)', vars:[['R','range'],['H','max height'],['T','time of flight']]},
          {tex:'a_c = \\frac{v^{2}}{r}=r\\omega^{2},\\; \\omega=\\frac{v}{r}', name:'Centripetal (circular)', vars:[]}
        ]},
        {example:{title:'Projectile at 30° with 20 m/s',
          given:['u=20, θ=30°, g=10'],
          concept:'Plug into R, H, T.',
          solution:['$R=400·sin60/10=20√3≈34.6$ m','$H=400·0.25/20=5$ m','$T=2·10/10=2$ s'],
          answer:'R≈34.6 m, H=5 m, T=2 s',
          interp:'Max range at 45° (sin90=1); complementary angles (30°/60°) share same range.'
        }},
        {sim:'projectile'},
        {mistakes:['Resolving vectors with sin/cos swapped.','Range formula with unequal heights (needs full trajectory).','Centripetal vs centrifugal confusion.']},
        {revise:['Separate x and y; x uniform, y with g.','R max at 45°.','a_c always to centre in uniform circular.']}
      ]}
    ]
  },

  {
    id:'ncert11.laws', title:'Laws of Motion', icon:'💪', tagline:'Unit III — Laws of Motion', mins:32,
    lessons:[
      { id:'ncert11.laws.main', title:'Newton, Friction, Circular Dynamics', mins:32, content:[
        {why:{q:'Why do you lean inward on a turning bike?', p:'You need centripetal force (friction). Exceed µN and you skid — laws + friction explain everyday manoeuvre limits.'}},
        {formulas:[
          {tex:'\\Sigma \\vec F = m\\vec a,\\; \\vec F_{12}=-\\vec F_{21}', name:'Newton II & III', vars:[]},
          {tex:'f_s \\le \\mu_s N,\\; f_k = \\mu_k N', name:'Static / kinetic friction', vars:[['\\mu_s,\\mu_k','coefficients']]},
          {tex:'N\\cos\\theta = mg,\\; N\\sin\\theta = \\frac{mv^{2}}{r} \\Rightarrow \\tan\\theta = \\frac{v^{2}}{rg}', name:'Banking angle (no friction ideal)', vars:[]}
        ]},
        {example:{title:'Block on 30° incline, µ_s=0.4 — will it slide?',
          given:['m=2 kg, θ=30°, g=10'],
          concept:'Down-slope component vs max static friction.',
          solution:['$mg\\sinθ=10$ N','$f_{s,max}=µ_s mg\\cosθ=0.4·17.3≈6.9$ N','$10>6.9$ → slides'],
          answer:'Slides; kinetic case then: a = g(sinθ−µ_k cosθ)',
          interp:'Angle of repose tanθ=µ_s is the threshold.'
        }},
        {sim:'newton'},
        {mistakes:['Action-reaction cancel on same body — they do not.','Static friction = µ_sN always (it is ≤).','Forgetting pseudo force in accelerated frames.']},
        {revise:['Inertia ∝ mass; F_net=ma.','Friction opposes relative motion; banking reduces reliance on friction.','Free-body diagram first, equations second.']}
      ]}
    ]
  },

  {
    id:'ncert11.wep', title:'Work, Energy and Power', icon:'⚡', tagline:'Unit IV — Work, Energy & Power', mins:30,
    lessons:[
      { id:'ncert11.wep.main', title:'Work–Energy Theorem & Conservation', mins:30, content:[
        {why:{q:'Why does a 2× speed crash do 4× damage?', p:'KE = ½mv². Work–energy theorem W_net = ΔKE turns dynamics into scalar bookkeeping — conservative vs non-conservative decides if mechanical energy survives.'}},
        {formulas:[
          {tex:'W = \\vec F\\cdot\\vec s = Fs\\cos\\theta', name:'Work', vars:[]},
          {tex:'W_{net}=\\Delta KE', name:'Work–energy theorem', vars:[]},
          {tex:'U_{spring}=\\tfrac12 kx^{2},\\; U_{grav}=mgh', name:'Potentials', vars:[]},
          {tex:'P = \\frac{dW}{dt}=\\vec F\\cdot\\vec v,\\; P_{av}=W/t', name:'Power', vars:[]}
        ]},
        {example:{title:'Spring block: k=200 N/m compressed 0.1 m',
          given:['k=200, x=0.1'],
          concept:'Elastic potential → kinetic.',
          solution:['$U=0.5·200·0.01=1$ J at release','$v=\\sqrt{2U/m}$ with m=0.5 kg → $v=2$ m/s'],
          answer:'1 J stored; 2 m/s if frictionless',
          interp:'For variable force, work is area under F–x, not Fs.'
        }},
        {sim:'energy'},
        {mistakes:['Work sign wrong when θ>90° (negative).','Conservation with friction treated as conservative.','Power = force × velocity, not just W/t instant.']},
        {revise:['W=Fs cosθ; work–energy: net work = ΔKE.','Collisions: momentum always, KE only if elastic.','Power = F·v instantaneous.']}
      ]}
    ]
  },

  {
    id:'ncert11.rotation', title:'System of Particles and Rotational Motion', icon:'🌀', tagline:'Unit V — Motion of System & Rigid Body', mins:35,
    lessons:[
      { id:'ncert11.rotation.main', title:'COM, Torque, Angular Momentum', mins:35, content:[
        {why:{q:'Why does a figure skater spin faster with arms in?', p:'Angular momentum L = Iω is conserved when external torque τ=0. Pulling arms in cuts I, so ω must rise — rotational inertia is the sequel to mass.'}},
        {formulas:[
          {tex:'\\vec r_{cm}=\\frac{\\sum m_i \\vec r_i}{M}', name:'Centre of mass', vars:[]},
          {tex:'\\vec \\tau = \\vec r\\times\\vec F,\\; \\vec L = \\vec r\\times\\vec p,\\; \\vec\\tau = \\frac{d\\vec L}{dt}', name:'Rotational dynamics', vars:[]},
          {tex:'I = \\sum m_i r_i^{2},\\; L=I\\omega,\\; K_{rot}=\\tfrac12 I\\omega^{2}', name:'Moment of inertia', vars:[]},
          {tex:'\\text{Rolling without slipping: } v_{cm}=R\\omega,\\; K=\\tfrac12 Mv_{cm}^{2}+\\tfrac12 I_{cm}\\omega^{2}', name:'Rolling', vars:[]}
        ]},
        {table:{head:['Body (axis through COM)','I'], rows:[
          ['Solid sphere','(2/5)MR²'],
          ['Hollow sphere','(2/3)MR²'],
          ['Solid cylinder','(1/2)MR²'],
          ['Rod (centre ⟂)','(1/12)ML²'],
          ['Ring / hollow cylinder','MR²']
        ]}},
        {example:{title:'Which rolls faster down same incline?',
          given:['Solid sphere vs ring, same M,R'],
          concept:'Less I → less rotational KE → more translational.',
          solution:['$a = g\\sinθ/(1+I/MR²)$','Solid: $a=5g\\sinθ/7$','Ring: $a=g\\sinθ/2$ → solid wins'],
          answer:'Solid sphere reaches bottom first',
          interp:'That is why race tracks use solid wheels in demos.'
        }},
        {mistakes:['τ = Fr assumed always — need r×F perpendicular component.','I same about any axis — parallel/perpendicular theorems shift it.','L conservation without checking external τ.']},
        {revise:['COM = weighted r; τ = r×F; L=r×p.','I depends on mass distribution & axis.','L conserved if τ_ext=0.','Rolling K = trans + rot.']}
      ]}
    ]
  },

  {
    id:'ncert11.gravitation', title:'Gravitation', icon:'🌌', tagline:'Unit VI — Gravitation', mins:28,
    lessons:[
      { id:'ncert11.gravitation.main', title:'Universal, g variation, Kepler & Escape', mins:28, content:[
        {why:{q:'Why does g feel weaker on a mountain?', p:'g = GM/r² with r from Earth centre. Climb 10 km and r grows; g drops measurably. Kepler and escape are the same GM/r logic extended.'}},
        {formulas:[
          {tex:'F=G\\frac{m_1 m_2}{r^{2}},\\; g=\\frac{GM}{R^{2}}', name:'Newton & g', vars:[['G','6.67×10⁻¹¹']]},
          {tex:'g(h)=g(1-2h/R),\\; g(d)=g(1-d/R)', name:'Variation (h≪R, depth d)', vars:[]},
          {tex:'T^{2}\\propto r^{3}', name:"Kepler III", vars:[]},
          {tex:'v_e=\\sqrt{2gR}=\\sqrt{2GM/R},\\; v_o=\\sqrt{GM/r}', name:'Escape / orbital', vars:[]},
          {tex:'V_g=-\\frac{GM}{r},\\; U=-\\frac{GMm}{r}', name:'Potential', vars:[]}
        ]},
        {example:{title:'Geostationary radius',
          given:['T=24 h, GM=4×10¹⁴'],
          concept:'T²=4π²r³/GM.',
          solution:['$r³=GMT²/4π²$ → $r≈4.22×10⁷$ m'],
          answer:'~42,000 km from centre (~36,000 km height)',
          interp:'Same formula spaces GPS, weather satellites.'
        }},
        {mistakes:['g vs G confusion.','Escape independent of mass of projectile — surprise to many.','Potential negative sign dropped.']},
        {revise:['F∝1/r²; Kepler III T²∝r³.','v_e=√(2gR)≈11.2 km/s; v_o=√(gR).','g falls with h and depth.']}
      ]}
    ]
  },

  {
    id:'ncert11.solids', title:'Mechanical Properties of Solids', icon:'🧱', tagline:'Unit VII — Properties of Bulk Matter (1/3)', mins:18,
    lessons:[
      { id:'ncert11.solids.main', title:'Stress, Strain, Hooke & Modulus', mins:18, content:[
        {why:{q:'Why do rubber bands snap back but steel deforms little?', p:"Young's modulus Y = stress/strain: steel Y ~2×10¹¹ Pa vs rubber ~10⁷ Pa — four orders stiffer. Stress–strain curve tells yield, fracture, elasticity."}},
        {formulas:[
          {tex:'\\text{Stress}=F/A,\\; \\text{Strain}=\\Delta L/L,\\; Y=\\frac{\\text{stress}}{\\text{strain}}', name:"Young's modulus", vars:[]},
          {tex:'S=\\frac{F/A}{\\Delta x/h},\\; B=-\\frac{\\Delta P}{\\Delta V/V}', name:'Shear / Bulk moduli', vars:[]},
          {tex:'U=\\tfrac12 \\text{stress}×\\text{strain}×\\text{volume}', name:'Elastic potential energy', vars:[]}
        ]},
        {example:{title:'Elongation of steel wire',
          given:['L=2 m, A=1 mm²=1e-6, F=100 N, Y=2e11'],
          concept:'ΔL = FL/AY.',
          solution:['$ΔL=100·2/(2e11·1e-6)=1×10⁻³$ m'],
          answer:'1 mm stretch',
          interp:'Same F on rubber would stretch metres.'
        }},
        {mistakes:['Stress vs pressure confusion (both F/A but context differs).','Elastic limit vs breaking point swapped.','Using engineering stress after necking vs true stress.']},
        {revise:['Hooke: stress∝strain within elastic limit.','Y large → stiff; elastomers have low Y, no linear region.','Poisson ratio ν = −(lateral strain/longitudinal strain).']}
      ]}
    ]
  },

  {
    id:'ncert11.fluids', title:'Mechanical Properties of Fluids', icon:'💧', tagline:'Unit VII — Properties of Bulk Matter (2/3)', mins:30,
    lessons:[
      { id:'ncert11.fluids.main', title:'Pressure, Bernoulli, Viscosity & Surface Tension', mins:30, content:[
        {why:{q:'Why do aeroplane wings lift without flapping?', p:'Bernoulli: faster air over curved top → lower pressure → lift = ΔP × area. Viscosity, Reynolds number and surface tension explain whether that flow stays smooth.'}},
        {formulas:[
          {tex:'P = \\frac{F}{A}+\\rho gh', name:'Pressure + hydrostatic', vars:[]},
          {tex:'P+\\tfrac12 \\rho v^{2}+\\rho gh = \\text{const}', name:'Bernoulli (incompressible, steady, non-viscous)', vars:[]},
          {tex:'A_1 v_1 = A_2 v_2', name:'Continuity', vars:[]},
          {tex:'F=6\\pi\\eta r v,\\; v_t = \\frac{2r^{2}(\\rho-\\sigma)g}{9\\eta}', name:'Stokes / terminal velocity', vars:[['\\eta','viscosity']]},
          {tex:'Re = \\frac{\\rho v D}{\\eta}', name:'Reynolds number', vars:[], note:'Re<1000 laminar, >2000 turbulent.'},
          {tex:'\\Delta P = \\frac{2S}{r},\\; h=\\frac{2S\\cos\\theta}{r\\rho g}', name:'Excess pressure / capillary rise', vars:[['S','surface tension']]},
          {tex:'F_b=\\rho_{fluid} V_{displaced} g', name:'Archimedes', vars:[]}
        ]},
        {example:{title:'Venturi: A halves, what happens to P?',
          given:['A2=A1/2 → v2=2v1 by continuity'],
          concept:'Bernoulli: higher v → lower P.',
          solution:['$ΔP = ½ρ(v2²−v1²)=½ρ·3v1²$'],
          answer:'Pressure drops along constriction — atomizer principle',
          interp:'Carburettor and spray bottle are Venturi direct.'
        }},
        {mistakes:['Applying Bernoulli to viscous/turbulent/compressible flow.','Capillary rise inversely with radius forgotten.','Gauge vs absolute pressure swapped.']},
        {revise:['Continuity + Bernoulli + hydrostatic = fluid trio.','Stokes terminal ∝ r²; surface tension excess 2S/r.','Re decides laminar vs turbulent.']}
      ]}
    ]
  },

  {
    id:'ncert11.thermal', title:'Thermal Properties of Matter', icon:'🌡️', tagline:'Unit VII — Properties of Bulk Matter (3/3)', mins:22,
    lessons:[
      { id:'ncert11.thermal.main', title:'Expansion, Calorimetry & Heat Transfer', mins:22, content:[
        {why:{q:'Why do railway tracks have gaps?', p:'Linear expansion ΔL = αLΔT: a 10 m steel rail heated 40°C grows ~4.8 mm. No gap → buckling. Same α, β=2α, γ=3α logic runs thermometers to calorimetry.'}},
        {formulas:[
          {tex:'\\Delta L=\\alpha L\\Delta T,\\; \\Delta V=\\gamma V\\Delta T,\\; \\gamma\\approx3\\alpha', name:'Thermal expansion', vars:[]},
          {tex:'Q=mc\\Delta T,\\; Q=mL', name:'Calorimetry (sensible + latent)', vars:[['c','specific heat'],['L','latent']]},
          {tex:'\\frac{Q}{t}=\\frac{kA\\Delta T}{l},\\; R_{th}=l/kA', name:'Conduction (Fourier)', vars:[['k','thermal conductivity']]},
          {tex:'P = e\\sigma AT^{4},\\; \\lambda_{max}T = b', name:'Radiation: Stefan–Boltzmann & Wien', vars:[['\\sigma','5.67×10⁻⁸'],['b','2.89×10⁻³ m·K']]},
          {tex:'\\frac{\\Delta Q}{\\Delta T}=ms', name:'Heat capacity', vars:[]}
        ]},
        {example:{title:'Mix 0.2 kg water 80°C + 0.3 kg 20°C',
          given:['c=4186, no loss'],
          concept:'Heat lost = heat gained; find equilibrium T.',
          solution:['$0.2·(80−T)=0.3·(T−20)$ → $16−0.2T=0.3T−6$ → $T=44$°C'],
          answer:'44°C',
          interp:'Same method with latent: 0°C ice→water needs mL first.'
        }},
        {mistakes:['Using °C in Wien/T⁴ — must use Kelvin.','Conduction vs convection vs radiation mode confusion.','Black body emissivity e=1 assumption missed.']},
        {revise:['α for length, γ=3α for volume.','Q=mcΔT + mL; Fourier conduction kAΔT/l.','Radiation power ∝ T⁴; Wien λ_max T = const.']}
      ]}
    ]
  },

  {
    id:'ncert11.thermo', title:'Thermodynamics', icon:'🔥', tagline:'Unit VIII — Thermodynamics', mins:28,
    lessons:[
      { id:'ncert11.thermo.main', title:'First Law, Processes & Second Law', mins:28, content:[
        {why:{q:'Why can no engine be 100% efficient?', p:'Second law and Kelvin–Planck: you must dump heat to a cold sink. First law ΔU=Q−W quantifies it; Carnot sets the ceiling η=1−T_c/T_h.'}},
        {formulas:[
          {tex:'\\Delta U = Q - W', name:'First law (work done BY system)', vars:[['\\Delta U','change in internal energy'],['Q','heat added to system'],['W','work done by system']]},
          {tex:'W = \\int P dV', name:'Work from P–V area', vars:[], note:'Cyclic: W = area enclosed; clockwise = positive (engine).'},
          {tex:'C_p - C_v = R,\\; \\gamma = C_p/C_v', name:'Molar heats (ideal gas)', vars:[]},
          {tex:'\\eta = 1-\\frac{T_c}{T_h},\\; COP = \\frac{T_c}{T_h-T_c}', name:'Carnot efficiency / refrigerator COP', vars:[['T','kelvin!']]},
          {tex:'\\Delta S \\ge 0\\text{ for isolated}', name:'Entropy (second law)', vars:[]}
        ]},
        {table:{head:['Process','Condition','Work'], rows:[
          ['Isothermal','ΔT=0, ΔU=0','W = nRT ln(V₂/V₁)'],
          ['Adiabatic','Q=0','PV^γ=const, TV^{γ−1}=const'],
          ['Isobaric','P const','W=PΔV'],
          ['Isochoric','V const','W=0'],
          ['Cyclic','ΔU=0','W=area']
        ]}},
        {example:{title:'Carnot between 500 K and 300 K',
          given:['T_h=500, T_c=300'],
          concept:'η=1−T_c/T_h.',
          solution:['$η=1−300/500=0.4$'],
          answer:'40% max; 60% heat must be rejected even ideally',
          interp:'Real engines do worse; claim of >40% here breaks second law.'
        }},
        {mistakes:['First-law sign convention flipped (chemistry uses ΔU=Q+W).','Carnot T in °C instead of K.','Adiabatic vs isothermal PV curves confused.']},
        {revise:['ΔU=Q−W; W=∫PdV = P–V area.','Adiabatic: PV^γ const; isothermal: PV const.','Carnot η=1−T_c/T_h is the ceiling.']}
      ]}
    ]
  },

  {
    id:'ncert11.ktg', title:'Kinetic Theory', icon:'💨', tagline:'Unit IX — Behaviour of Perfect Gas & Kinetic Theory', mins:22,
    lessons:[
      { id:'ncert11.ktg.main', title:'Ideal Gas, Pressure & Energy Equipartition', mins:22, content:[
        {why:{q:'Why does pressure rise when you heat a sealed bottle?', p:'Kinetic theory: P comes from molecular collisions; heating raises <c²> → more momentum per hit. Equation PV=nRT is the macroscopic face of molecular chaos.'}},
        {formulas:[
          {tex:'PV=nRT = Nk_B T', name:'Ideal gas', vars:[['R','8.314'],['k_B','1.38×10⁻²³']]},
          {tex:'P=\\tfrac13 \\rho \\bar{c^{2}},\\; \\bar{c}=\\sqrt{3RT/M}', name:'Pressure from collisions & rms speed', vars:[['\\bar c','rms speed']]},
          {tex:'\\langle E\\rangle = \\tfrac12 m\\bar{c^{2}} = \\tfrac32 k_B T,\\; U = \\tfrac32 nRT', name:'Energy per molecule / internal energy (monoatomic)', vars:[]},
          {tex:'U = \\tfrac{f}{2} nRT,\\; C_v=\\tfrac{f}{2}R', name:'Equipartition (f = degrees of freedom)', vars:[['f','3 mono, 5 diatomic at room T']]},
          {tex:'\\lambda = \\frac{1}{\\sqrt2 \\pi d^{2} n}', name:'Mean free path', vars:[]}
        ]},
        {example:{title:'RMS speed of O₂ at 300 K',
          given:['M=32 g/mol=0.032 kg/mol'],
          concept:'c_rms = √(3RT/M).',
          solution:['$c=\\sqrt{3·8.314·300/0.032}≈483$ m/s'],
          answer:'~480 m/s — yet smell diffuses slowly due to collisions (mean free path ~70 nm)',
          interp:'High molecular speed ≠ fast diffusion.'
        }},
        {mistakes:['Mean vs rms vs most probable swapped.','U = 3/2 nRT applied to diatomic without correction.','Dalton partial pressures added incorrectly when gases react.']},
        {revise:['Ideal: PV=nRT; rms  √(3RT/M).','<E>=3/2 k_B T per molecule mono.','f/2 nRT = U; Cp−Cv=R always for ideal.']}
      ]}
    ]
  },

  {
    id:'ncert11.osc', title:'Oscillations', icon:'〰️', tagline:'Unit X — Oscillations & Waves (1/2)', mins:28,
    lessons:[
      { id:'ncert11.osc.main', title:'SHM, Energy & Pendulum', mins:28, content:[
        {why:{q:'Why does a swing keep time even when amplitude changes a bit?', p:'SHM period is amplitude-independent (for small angles). x = A cos(ωt+φ) with ω=√(k/m) or √(g/L) — the same differential equation hides in springs and pendulums.'}},
        {formulas:[
          {tex:'\\frac{d^{2}x}{dt^{2}}+\\omega^{2}x=0 \\Rightarrow x=A\\cos(\\omega t+\\phi)', name:'SHM equation & solution', vars:[]},
          {tex:'\\omega=\\sqrt{k/m},\\; T=2\\pi\\sqrt{m/k}', name:'Spring', vars:[]},
          {tex:'\\omega=\\sqrt{g/L},\\; T=2\\pi\\sqrt{L/g}', name:'Simple pendulum (small α)', vars:[]},
          {tex:'E=\\tfrac12 kA^{2}=\\tfrac12 m\\omega^{2}A^{2},\\; \\langle K\\rangle=\\langle U\\rangle=E/2', name:'Energy in SHM', vars:[]},
          {tex:'x_1+A_1\\cos(\\omega t+φ_1)', name:'Superposition (beats: close ω)', vars:[]}
        ]},
        {example:{title:'T of 1 m pendulum on Earth',
          given:['L=1, g=9.8'],
          concept:'T=2π√(L/g).',
          solution:['$T=2π·0.319≈2.01$ s'],
          answer:'~2 s (hence “seconds pendulum” ~1 m)',
          interp:'On Moon g=1.62 → T≈4.9 s — astronauts waited longer.'
        }},
        {sim:'shm'},
        {mistakes:['Simple pendulum T depends on mass — it does not.','Large amplitude still SHM — it deviates.','Phase φ confuses sine vs cosine start.']},
        {revise:['SHM: d²x/dt²+ω²x=0 → cos.','Spring T=2π√(m/k); pendulum T=2π√(L/g).','Energy ∝ A²; damping & resonance beyond NCERT but hinted.']}
      ]}
    ]
  },

  {
    id:'ncert11.waves', title:'Waves', icon:'🌊', tagline:'Unit X — Oscillations & Waves (2/2)', mins:30,
    lessons:[
      { id:'ncert11.waves.main', title:'Transverse, Sound, Standing & Beats', mins:30, content:[
        {why:{q:'Why does a guitar string sound louder in a wooden box?', p:'Standing waves and resonance: the box air column has natural frequencies; when the string excites one, amplitude surges. Traveling vs standing vs beats are the vocab of every instrument.'}},
        {formulas:[
          {tex:'y(x,t)=A\\sin(kx-\\omega t+\\phi),\\; v=\\omega/k = f\\lambda', name:'Travelling wave', vars:[['k','2π/λ'],['\\omega','2πf']]},
          {tex:'v=\\sqrt{T/\\mu},\\; v_{sound}=\\sqrt{\\frac{\\gamma P}{\\rho}}=\\sqrt{\\frac{\\gamma RT}{M}}', name:'Speed on string / sound in gas', vars:[['T','tension'],['\\mu','linear mass density']]},
          {tex:'f_n = n\\frac{v}{2L}\\text{ (string/open pipe)},\\; f_n=(2n-1)\\frac{v}{4L}\\text{ (closed pipe)}', name:'Standing frequencies', vars:[]},
          {tex:'f_{beat}=|f_1-f_2|', name:'Beats', vars:[]},
          {tex:'L_{dB}=10\\log_{10}(I/I_0)', name:'Intensity level', vars:[['I_0','10⁻¹² W/m²']]},
          {tex:'I \\propto A^{2} f^{2}', name:'Intensity', vars:[]}
        ]},
        {example:{title:'Open pipe 1 m, v=340 m/s — first two harmonics',
          given:['L=1, open both ends'],
          concept:'f_n = n v/(2L).',
          solution:['$f1=170$ Hz','$f2=340$ Hz'],
          answer:'170, 340 Hz',
          interp:'Closed pipe 1 m would give 85 Hz (only odd): why flute vs clarinet timbre differ.'
        }},
        {sim:'wave'},
        {mistakes:['Node vs antinode swapped.','Open vs closed pipe harmonic series swapped (closed odd only).','Beats heard when f1≈f2 only; distant frequencies just sound discordant.']},
        {revise:['v=fλ; v_string=√(T/µ).','Standing: string/open n·v/2L; closed (2n−1)v/4L.','Beats |f1−f2|; Doppler beyond but hinted.']}
      ]}
    ]
  }

]});
