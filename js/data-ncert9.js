/* ============================================================
   PhysiX Academy — NCERT Class 9 Physics (Science)
   5 chapters: Motion, Force & Laws, Gravitation, Work & Energy, Sound
   ============================================================ */
'use strict';

CURRICULUM.push({
  id:'ncert9', name:'NCERT Class 9 — Physics', tag:'NCERT 9', icon:'📗', color:'#22c55e',
  desc:'Complete Class 9 Physics from NCERT Science — motion graphs, Newton, gravity, energy and sound. Foundation for Class 10 and beyond, with numericals and next-day intuition.',
  chapters:[

  /* ---------------- Chapter 1: Motion ---------------- */
  {
    id:'ncert9.motion', title:'Motion', icon:'🏃', tagline:'Distance, displacement and the three equations you will use for 4 years.', mins:50,
    lessons:[
      { id:'ncert9.motion.basics', title:'Describing Motion — Distance to Acceleration', mins:25, content:[
        {why:{q:'Why does Google Maps show arrival time even in traffic?', p:'It predicts motion: distance, speed, velocity and acceleration — the first NCERT chapter. Every later chapter keeps referring to these definitions, so getting them razor-sharp now saves 20 marks later.'}},
        {def:[
          {term:'Distance', text:'Total path length. Scalar, always positive. SI: metre (m).'},
          {term:'Displacement', text:'Shortest straight line from start to finish with direction. Vector. Zero if you return to start; can be negative.'},
          {term:'Speed', text:'Distance / time. Average speed = total distance / total time. Scalar. Unit m/s.'},
          {term:'Velocity', text:'Displacement / time. Vector; includes direction. Average velocity may be zero even when speed is not.'},
          {term:'Acceleration', text:'Rate of change of velocity: a = (v−u)/t. Vector. Unit m/s². Uniform = same Δv per second.'}
        ]},
        {svg:'<svg viewBox="0 0 480 120" style="width:100%;max-width:560px"><line x1="40" y1="90" x2="440" y2="90" stroke="var(--txt3)" stroke-width="1.5"/><line x1="40" y1="90" x2="40" y2="15" stroke="var(--txt3)" stroke-width="1.5"/><text x="438" y="88" fill="var(--txt2)" font-size="11">t</text><text x="22" y="20" fill="var(--txt2)" font-size="11">v</text><polyline points="40,90 140,65 240,40 340,40 440,70" fill="none" stroke="#22c55e" stroke-width="3"/><rect x="140" y="40" width="100" height="50" fill="rgba(34,197,94,.14)"/><text x="155" y="70" fill="#22c55e" font-size="11">area = s</text><text x="250" y="32" fill="var(--txt2)" font-size="11">slope = a</text></svg>'},
        {h:'Uniform vs non-uniform motion'},
        {table:{head:['Type','What happens','v–t graph'], rows:[
          ['Uniform','Equal distances in equal times (constant v)','Horizontal line (a=0)'],
          ['Uniformly accelerated','v changes by equal amounts each second','Straight sloped line'],
          ['Non-uniform accelerated','v changes unevenly','Curved line']
        ]}},
        {formula:{tex:'a = \\frac{v-u}{t}', name:'Acceleration (average)', vars:[['u','initial velocity'],['v','final velocity'],['t','time']]}},
        {mistakes:['Using speed and velocity interchangeably when direction changes.','Confusing zero displacement with zero distance.','Reading slope vs area swapped: slope = a or v; area = s or Δv.']},
        {revise:['Distance scalar; displacement vector.','Speed = distance/t; velocity = displacement/t.','a = (v−u)/t; slope of v–t = a; area of v–t = displacement.']}
      ]},
      { id:'ncert9.motion.equations', title:'Equations of Motion & Graphs', mins:25, content:[
        {why:{q:'Can you predict where a ball will be without solving step-by-step?', p:'Three NCERT equations do it in one line — derived from area under v–t. They are the most-used equations in Class 9 and 10.'}},
        {formulas:[
          {tex:'v = u + at', name:'1st equation (velocity–time)', vars:[['u','initial velocity'],['v','final velocity'],['a','uniform acceleration'],['t','time']]},
          {tex:'s = ut + \\tfrac12 at^{2}', name:'2nd equation (position–time)', vars:[['s','displacement (or distance if straight line)']]},
          {tex:'v^{2} = u^{2} + 2as', name:'3rd equation (velocity–position, time eliminated)', vars:[]},
          {tex:'s = \\tfrac{(u+v)}{2}t', name:'Average-velocity form (handy shortcut)', vars:[]}
        ]},
        {h:'Uniform circular motion — NCERT twist'},
        {p:'Speed constant, velocity keeps changing direction → accelerated motion. Direction of acceleration is towards centre (centripetal).'},
        {table:{head:['Graph','Slope =','Area ='], rows:[
          ['s–t','velocity','—'],
          ['v–t','acceleration','displacement'],
          ['a–t','jerk (Class 11)','change in velocity']
        ]}},
        {example:{title:'NCERT — car 18 km/h to 36 km/h in 5 s, uniform a',
          given:['u = 18 km/h = 5 m/s','v = 36 km/h = 10 m/s','t = 5 s'],
          concept:'First find a, then s with 2nd or 3rd equation.',
          solution:['$a = (10−5)/5 = 1$ m/s²','$s = ut + ½at² = 5·5 + 0.5·1·25 = 37.5$ m','Check: $v² = 25+2·1·37.5=100$ ✓'],
          answer:'a = 1 m/s², s = 37.5 m',
          interp:'Convert km/h→m/s (÷3.6) first — most NCERT slips happen there.'
        }},
        {sim:'kinematics'},
        {mistakes:['Forgetting km/h→m/s (÷3.6).','Using v²=u²+2as with non-uniform acceleration.','Graph: area of s–t is NOT distance.']},
        {quiz:['q-nc9-motion1']},
        {revise:['v=u+at; s=ut+½at²; v²=u²+2as.','s–t slope=v; v–t slope=a, area=s.','Uniform circular motion is accelerated (direction changes).']}
      ]}
    ]
  },

  /* ---------------- Chapter 2: Force and Laws of Motion ---------------- */
  {
    id:'ncert9.force', title:'Force and Laws of Motion', icon:'💪', tagline:'Why things keep moving, why they stop, and what momentum conserves.', mins:45,
    lessons:[
      { id:'ncert9.force.laws', title:"Newton's Laws, Inertia & Momentum", mins:45, content:[
        {why:{q:'Why do you wear a seatbelt even for a short drive?', p:"First law: your body keeps moving at the car's speed. When the car stops, you do not — until the belt provides the unbalanced force. Law 2 tells how much force it must exert; law 3 explains why the belt pushes you."}},
        {def:[
          {term:'Force', text:'Push/pull that changes state of motion. Vector. Unit newton (N = kg·m/s²). Balanced forces → no acceleration; unbalanced → acceleration.'},
          {term:'Inertia', text:'Tendency to resist change in motion. ∝ mass. No such thing as "force of inertia".'},
          {term:"Newton I (law of inertia)", text:'Body stays at rest or uniform motion unless unbalanced net force acts.'},
          {term:"Newton II", text:'F_net = ma. The net (vector sum) force matters, not any single push.'},
          {term:"Newton III", text:'Action = −Reaction: forces are paired on DIFFERENT bodies, equal magnitude opposite direction.'}
        ]},
        {formulas:[
          {tex:'F_{net} = ma', name:'Second law', vars:[['F_{net}','vector sum of all forces'],['m','mass (kg)'],['a','acceleration']]},
          {tex:'p = mv', name:'Linear momentum', vars:[['p','kg·m/s, vector']]},
          {tex:'F_{net} = \\frac{\\Delta p}{\\Delta t}', name:'Force as rate of change of momentum (NCERT form)', vars:[]}
        ]},
        {h:'Conservation of momentum — NCERT highlight'},
        {p:'If F_net = 0 on a system, total momentum before = total momentum after. Rocket, recoil of gun, collision — all one principle.'},
        {example:{title:'Gun recoil — NCERT classic',
          given:['Bullet m₁=0.02 kg, v₁=300 m/s forward','Gun M=4 kg, initially at rest'],
          concept:'System F_net≈0 during firing → p conserved. Ground not included in isolated system for short time.',
          solution:['$0 = m_1 v_1 + M v_g$','$v_g = −(0.02×300)/4 = −1.5$ m/s'],
          answer:'Gun recoils 1.5 m/s backward',
          interp:'Heavier gun → smaller recoil; same logic scales to rocket exhaust.'
        }},
        {example:{title:'How much force to accelerate 2 kg at 3 m/s²?',
          given:['m=2 kg, a=3 m/s²'],
          concept:'F=ma directly.',
          solution:['$F = 2×3 = 6$ N'],
          answer:'6 N',
          interp:'If friction is 2 N opposing, you need 8 N push to keep net 6 N — always add with signs.'
        }},
        {sim:'newton'},
        {mistakes:['Action-reaction cancel? No — they act on different bodies.','Calling inertia a force.','Using weight (mg) as mass in F=ma without dividing by g.','Forgetting to use NET force (subtract friction/normal properly).']},
        {revise:['F_net = ma; F = Δp/Δt.','Inertia ∝ mass.','Action/reaction on different bodies.','Isolated system: Σ p before = Σ p after.']}
      ]}
    ]
  },

  /* ---------------- Chapter 3: Gravitation ---------------- */
  {
    id:'ncert9.gravitation', title:'Gravitation', icon:'🌍', tagline:'g, G, weight vs mass, and why the Moon does not fall.', mins:45,
    lessons:[
      { id:'ncert9.gravitation.universal', title:'Universal Law, g and Weight', mins:45, content:[
        {why:{q:'Why does a feather fall slowly on Earth but hammer and feather fell together on the Moon?', p:'Air resistance, not gravity. Universal law F = G m₁m₂/r² acts on both, but acceleration g = GM/r² is mass-independent in free fall. Apollo 15 proved it.'}},
        {def:[
          {term:'Universal gravitation', text:'Every mass attracts every other mass along the line joining them.'},
          {term:'G', text:'Gravitational constant 6.67×10⁻¹¹ N·m²/kg² — universal, never changes.'},
          {term:'g', text:'Acceleration due to gravity at a place: g = GM/R². On Earth ≈9.8 m/s² (varies with height/latitude). Not universal.'},
          {term:'Weight', text:'Force of gravity on a body: W = mg. Vector, newtons. Mass (kg) is invariant.'},
          {term:'Thrust & pressure', text:'Thrust = normal force on surface; pressure = thrust / area. Unit pascal (Pa = N/m²).'}
        ]},
        {formulas:[
          {tex:'F = G\\frac{m_1 m_2}{r^{2}}', name:'Newton’s universal law', vars:[['G','6.67×10⁻¹¹ N·m²/kg²'],['r','centre-to-centre distance']]},
          {tex:'g = \\frac{GM}{R^{2}}', name:'g from M and R of planet', vars:[['M','mass of planet'],['R','radius of planet']]},
          {tex:'W = mg', name:'Weight', vars:[]},
          {tex:'P = \\frac{F}{A}', name:'Pressure', vars:[]}
        ]},
        {h:'Thrust, pressure and buoyancy — NCERT link'},
        {ul:[
          'Pressure ∝ 1/A: sharp knife (small A) → huge P cuts; broad skis → small P do not sink in snow.',
          'Buoyancy: fluid exerts upthrust = weight of displaced fluid (Archimedes). Float if average density < fluid density.',
          'Density ρ = m/V (kg/m³); relative density = ρ_substance / ρ_water (unitless).'
        ]},
        {example:{title:'Weight of 10 kg on Earth vs Moon',
          given:['m=10 kg, g_E=9.8, g_M=1.62 m/s² (GM_M/R_M²)'],
          concept:'W=mg with local g.',
          solution:['$W_E=98$ N','$W_M=16.2$ N','$W_M/W_E≈1/6$'],
          answer:'~98 N on Earth, ~16 N on Moon',
          interp:'Mass still 10 kg everywhere — weighing machine reads weight, labelled in kg by calibration with Earth g.'
        }},
        {example:{title:'Pressure: 60 kg person on two feet vs one stiletto',
          given:['A_two_feet≈300 cm²=0.03 m²','A_stiletto≈1 cm²=1×10⁻⁴ m²'],
          concept:'P=F/A with F=W=mg.',
          solution:['$P_{two}=588/0.03≈19.6$ kPa','$P_{stiletto}=588/10⁻⁴=5.88$ MPa'],
          answer:'Stiletto pressure ~300× larger — floors dent',
          interp:'NCERT uses this to link thrust → pressure → why we feel it.'
        }},
        {h:'Free fall & Kepler hint'},
        {p:'All bodies fall with same g when air is removed (u=0, v=gt, s=½gt²). Bound satellites are in continuous free fall with sideways velocity — orbit.'},
        {mistakes:['G vs g: G constant, g varies (height, planet).','Mass vs weight units: kg vs N.','Density vs weight vs pressure confusion.','Buoyancy = weight of displaced fluid, not of object.']},
        {revise:['F= G m₁m₂/r²; g=GM/R²≈9.8 m/s².','W=mg; P=F/A; ρ=m/V.','Archimedes: upthrust = weight of displaced fluid.','Free fall g independent of mass (no air).']}
      ]}
    ]
  },

  /* ---------------- Chapter 4: Work and Energy ---------------- */
  {
    id:'ncert9.work', title:'Work and Energy', icon:'⚡', tagline:'No work without displacement, and energy never dies.', mins:45,
    lessons:[
      { id:'ncert9.work.energy', title:'Work, Power, KE, PE and Conservation', mins:45, content:[
        {why:{q:'Why does carrying a heavy bag on your head do no work (in physics)?', p:'Work needs force ALONG displacement: W = F s cosθ. Carrying horizontally → force (up) ⟂ displacement (horizontal) → cos90°=0 → zero work. The sweat is biology, not physics work.'}},
        {formulas:[
          {tex:'W = Fs\\cos\\theta', name:'Work (constant force)', vars:[['F','force (N)'],['s','displacement (m)'],['\\theta','angle between F and s']], note:'Joule (J). Positive if θ<90°, negative if θ>90° (friction).'},
          {tex:'KE = \\tfrac12 mv^{2}', name:'Kinetic energy', vars:[['m','kg'],['v','m/s']]},
          {tex:'PE = mgh', name:'Gravitational potential energy', vars:[['h','height above datum']]},
          {tex:'P = \\frac{W}{t}', name:'Power', vars:[], note:'Watt (W=J/s); 1 kW=1000 W; commercial unit 1 kWh=3.6 MJ.'},
          {tex:'E_{total}=KE+PE=\\text{constant (no friction)}', name:'Mechanical energy conservation', vars:[]}
        ]},
        {example:{title:'NCERT — 10 kg object lifted to 6 m',
          given:['m=10 kg, h=6 m, g=10 m/s² (NCERT often uses 10)'],
          concept:'Work against gravity = mgh stored as PE.',
          solution:['$W = 10×10×6=600$ J','$PE=600$ J','If dropped, just before ground KE=600 J → $v=\\sqrt{2gh}=\\sqrt{120}≈11$ m/s'],
          answer:'600 J; ~11 m/s on landing',
          interp:'Energy transforms, total conserved when only conservative forces act.'
        }},
        {example:{title:'Power — who climbs faster?',
          given:['Two boys 40 kg and 50 kg climb 10 m in 10 s vs 12 s'],
          concept:'P = W/t = mgh/t.',
          solution:['$P_1=40·10·10/10=400$ W','$P_2=50·10·10/12≈417$ W'],
          answer:'Second is slightly more powerful despite being slower overall',
          interp:'Power cares about time; work cares only about force × distance.'
        }},
        {sim:'energy'},
        {mistakes:['Calling effort "work" when s=0 or F⟂s.','KE uses speed squared — double speed → 4× KE.','kW vs kWh: kW is power, kWh is energy (bill).','Potential energy sign depends on chosen datum — must stay consistent.']},
        {revise:['W=Fs cosθ; 0 when θ=90°.','KE=½mv²; PE=mgh; P=W/t.','Energy conserved (transforms, not vanishes).','1 kWh=3.6×10⁶ J.']}
      ]}
    ]
  },

  /* ---------------- Chapter 5: Sound ---------------- */
  {
    id:'ncert9.sound', title:'Sound', icon:'🔊', tagline:'Vibrations, echo, and why sound cannot travel in space.', mins:45,
    lessons:[
      { id:'ncert9.sound.waves', title:'Nature of Sound — Waves, Echo, SONAR', mins:45, content:[
        {why:{q:'Why do you hear an echo in a big hall but not in your room?', p:'Echo needs reflected sound to arrive ≥0.1 s after direct sound (persistence of hearing). At v≈344 m/s that means ≥17.2 m to the wall and back — your room is too small; a hall qualifies.'}},
        {def:[
          {term:'Sound as longitudinal wave', text:'Particle vibration ∥ propagation; needs medium (solid/liquid/gas) → faster in solids, zero in vacuum. Compressions (high pressure) and rarefactions (low pressure).'},
          {term:'Speed, frequency, wavelength', text:'v = fλ. Frequency (Hz) decides pitch (high f → shrill); amplitude decides loudness; quality (timbre) decides voice vs instrument.'},
          {term:'Range', text:'Infrasonic <20 Hz, audible 20 Hz–20 kHz, ultrasonic >20 kHz. Bats, dogs hear ultrasound.'},
          {term:'Echo', text:'Reflection of sound. To distinguish from original: distance ≥ v×0.1/2 ≈ 17.2 m in air.'},
          {term:'SONAR', text:'Sound Navigation & Ranging: send ultrasonic pulse, measure echo time → distance = v·t/2. Also used in ultrasound imaging.'}
        ]},
        {formulas:[
          {tex:'v = f\\lambda', name:'Wave equation (sound too)', vars:[['v','speed (m/s)'],['f','frequency (Hz)'],['\\lambda','wavelength (m)']]},
          {tex:'d = \\frac{vt}{2}', name:'Echo / SONAR distance', vars:[['d','distance to reflector'],['t','round-trip time']], note:'Divide by 2 because t counts go+return.'},
          {tex:'v_{air} \\approx 344\\,\\text{m/s at }20^{\\circ}\\text{C}', name:'Speed of sound in air', vars:[]}
        ]},
        {h:'Reflection, reverberation and uses'},
        {ul:[
          'Multiple reflections → reverberation (hall needs absorbers/curtains, else speech muddles).',
          'Stethoscope, megaphone, sound boards of auditoriums all use reflection.',
          'Ultrasound cleaning, flaw detection, medical imaging — high f → short λ → fine resolution, no ionising radiation.'
        ]},
        {example:{title:'NCERT echo — wall 34.4 m away',
          given:['Wall distance 34.4 m, v=344 m/s'],
          concept:'Round trip 2d = 68.8 m; t = 2d/v.',
          solution:['$t = 68.8/344 = 0.2$ s'],
          answer:'0.2 s (clearly heard as separate echo; >0.1 s)',
          interp:'At 12 m the echo lag would be <0.1 s and would merge as reverberation.'
        }},
        {example:{title:'SONAR — seabed depth',
          given:['Ultrasonic pulse returns after 1.6 s','v_water≈1500 m/s'],
          concept:'d = vt/2.',
          solution:['$d = 1500×1.6/2 = 1200$ m'],
          answer:'1200 m depth',
          interp:'Ship keeps pinging while moving → continuous depth map.'
        }},
        {sim:'wave'},
        {mistakes:['Sound needs NO medium — it DOES (unlike light).','Echo distance is vt, not vt/2 (forgetting go+return).','Pitch = frequency, not loudness (amplitude).','Ultrasound audible to humans — it is not.']},
        {revise:['Longitudinal, needs medium; v = fλ.','Audible 20 Hz–20 kHz; >20 kHz ultrasonic.','Echo if t≥0.1 s → d≥17.2 m in air.','SONAR d = vt/2; uses ultrasound.']}
      ]}
    ]
  }

]});
