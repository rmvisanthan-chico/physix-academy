/* PhysiX Academy — Level 3 Part B: Kinematics 2D, Laws, Work, Systems, Rotation, Gravitation */
'use strict';

(function(){
const lv = CURRICULUM.find(l => l.id === 'l3');

lv.chapters.push(
  {
    id:'l3.kin2d', title:'Motion in a Plane', icon:'🎯', tagline:'Projectiles and circular motion.', mins:30,
    lessons:[
      { id:'l3.kin2d.projectile', title:'Projectile Motion', mins:30, content:[
        {why:{q:'Why do artillery officers and basketball players solve the same equation?', p:'Any object launched and left to gravity alone traces a parabola. Cannon shells, fountains, long-jumpers — one model explains them all.'}},
        {p:'Core strategy: **split the motion into independent components** — horizontal (no forces ⇒ constant velocity) and vertical (gravity only ⇒ constant g downward). Time is the bridge between them.'},
        {formulas:[
          {tex:'u_x = u\\cos\\theta, \\qquad u_y = u\\sin\\theta', name:'Launch decomposition', vars:[['u','launch speed'],['θ','angle above horizontal']]},
          {tex:'T = \\frac{2u\\sin\\theta}{g}', name:'Time of flight', vars:[['T','total airtime']]},
          {tex:'H = \\frac{u^2\\sin^2\\theta}{2g}', name:'Maximum height'},
          {tex:'R = \\frac{u^2\\sin 2\\theta}{g}', name:'Range (level ground)', note:'Maximised at θ = 45°; complementary angles like 30° & 60° give equal range.'}
        ]},
        {derive:{title:'Range formula', steps:[
          {do:'Vertical return to launch height: $0 = u_yT - \\tfrac12 gT^2$.', why:'Net vertical displacement zero.'},
          {do:'So $T = 2u_y/g = 2u\\sin\\theta / g$.', why:'Reject the trivial T = 0 root.'},
          {do:'Horizontal distance $R = u_xT = u\\cos\\theta · 2u\\sin\\theta/g$.', why:'Constant horizontal velocity.'},
          {do:'Using $2\\sin\\theta\\cos\\theta=\\sin2\\theta$: $R=u^2\\sin2\\theta/g$.', why:'Double-angle identity.'}
        ]}},
        {example:{title:'Football kicked at 20 m/s, 30°',
          given:['u = 20 m/s','θ = 30°','g = 9.8 m/s²'],
          concept:'Resolve, then treat each axis independently.',
          solution:['$u_x=17.32$, $u_y=10$ m/s','$T = 2(10)/9.8 ≈ 2.04$ s','$H = 100/19.6 ≈ 5.1$ m','$R = 17.32 × 2.04 ≈ 35.3$ m'],
          answer:'Airtime ≈ 2 s, H ≈ 5.1 m, R ≈ 35.3 m',
          interp:'Cross-check via $R=u^2\\sin60°/g ≈ 35.3$ ✔'}
        },
        {sim:'projectile'},
        {p:'**Circular teaser:** constant SPEED around a circle still means acceleration, because direction changes: centripetal acceleration $a_c=v^2/r$ points to the centre. More in Rotational Motion.'},
        {mistakes:['Applying vertical SUVAT with full u instead of component $u_y$.','Thinking gravity acts horizontally during flight.','Believing 45° also maximises height (it maximises RANGE; height peaks at 90°).']},
        {quiz:['q-pr1','q-pr2']},
        {revise:['Independent axes; time links them.','$T,H,R$ formulas for level ground.','45° maximises range.','Circular motion needs inward $v^2/r$ acceleration.']}
      ]}
    ]
  },
  {
    id:'l3.laws', title:'Laws of Motion', icon:'🧨', tagline:'Free-body diagrams, friction, circular dynamics.', mins:35,
    lessons:[
      { id:'l3.laws.main', title:"Newton's Laws in Action", mins:35, content:[
        {why:{q:'Why does a passenger feel heavier as a lift accelerates up?', p:'The floor must push harder than mg to accelerate you upward. Apparent weight is a force-balance story — mastering free-body diagrams makes such questions trivial.'}},
        {h:'Method: free-body diagrams (FBD)'},
        {ul:['Isolate ONE object; draw every force ON it as an arrow from its centre.','Typical forces: gravity $mg$, normal $N$, tension $T$, friction $f$, applied pushes.','Choose axes along the motion; apply $\\Sigma F = ma$ per axis.']},
        {formulas:[
          {tex:'\\Sigma F = ma', name:'Second law per axis'},
          {tex:'N = m(g+a) \\text{ (lift accelerating up)}', name:'Apparent weight in lifts', vars:[['a','lift acceleration (up +)']], note:'Free-fall lift: a = −g gives N = 0 — weightlessness!'},
          {tex:'f_s \\le \\mu_s N, \\quad f_k = \\mu_k N', name:'Static vs kinetic friction', vars:[['μ','coefficient (μs > μk)']], note:'Static adjusts up to a maximum; kinetic is roughly constant.'},
          {tex:'\\Sigma F_{net} = \\frac{mv^2}{r} \\text{ toward centre}', name:'Uniform circular motion dynamics'}
        ]},
        {example:{title:'Block on rough table pulled horizontally',
          given:['m = 5 kg','F = 40 N','μk = 0.4','g = 10'],
          concept:'Net force = pull minus friction.',
          solution:['$N = mg = 50$ N','$f_k = μ_kN = 20$ N','$ΣF = 40−20 = 20$ N','$a = 20/5$'],
          answer:'a = 4 m/s²',
          interp:'Half the pull is eaten by friction — efficiency thinking engineers live by.'}
        },
        {sim:'newton'},
        {mistakes:["Putting action–reaction pairs on the same body diagram (they never cancel there).","Using N = mg on inclines or accelerating lifts without re-deriving.","Forgetting that friction opposes RELATIVE sliding, not always 'motion'."]},
        {quiz:['q-f5','q-f6']},
        {revise:['FBD first, then ΣF = ma per axis.','Lifts: apparent weight = m(g±a).','Friction ≤ μsN; kinetic = μkN.','Centripetal force is a ROLE played by real forces.']}
      ]}
    ]
  },
  {
    id:'l3.work', title:'Work, Energy & Power', icon:'⚡', tagline:'Energy bookkeeping with springs and variable forces.', mins:28,
    lessons:[
      { id:'l3.work.main', title:'Work–Energy Theorem & Power', mins:28, content:[
        {why:{q:'How much energy does a cricket bowler deliver in one ball?', p:'A 160 g ball at 140 km/h carries about 122 J of kinetic energy — delivered in under half a second, i.e. ~300 W peak power. Energy accounting turns such feats into single-line calculations.'}},
        {formula:{tex:'W_{net} = \\Delta KE = \\tfrac12 mv^2 - \\tfrac12 mu^2', name:'Work–energy theorem', vars:[['W_net','total work by ALL forces']], note:'The deepest shortcut in mechanics: track energy instead of forces.'}},
        {formulas:[
          {tex:'U_s = \\tfrac12 kx^2', name:'Spring potential energy', vars:[['k','spring constant (N/m)'],['x','extension/compression']]},
          {tex:'P = Fv', name:'Instantaneous power', vars:[['v','velocity along the force']]}
        ]},
        {example:{title:'Water pump',
          given:['100 kg water raised 10 m every 20 s'],
          concept:'Power = work per time.',
          solution:['$W = mgh = 100×9.8×10 = 9800$ J','$P = 9800/20$'],
          answer:'P = 490 W',
          interp:'Real pumps need more input because they are not 100% efficient — losses appear as heat.'}
        },
        {mistakes:['Forgetting gravity/normal can do zero work on horizontal slides but not on ramps.','Confusing conservative (path-independent) vs non-conservative (friction) forces when applying conservation.','Mixing kW and kWh in electricity bills — kWh is ENERGY (power × time).']},
        {quiz:['q-e5','q-e6']},
        {revise:['W_net = ΔKE — always true.','Spring U = ½kx².','P = Fv instantaneously.','Friction converts mechanical energy to heat irreversibly.']}
      ]}
    ]
  },
  {
    id:'l3.systems', title:'System of Particles', icon:'⚖️', tagline:'Centre of mass and its sneaky straight lines.', mins:22,
    lessons:[
      { id:'l3.systems.com', title:'Centre of Mass & Momentum of Systems', mins:22, content:[
        {why:{q:'Why does a high-jumper arch their back to clear the bar?', p:'By curving the body, the centre of mass can pass UNDER the bar while limbs pass over it — the COM path obeys physics, not the whole body. Athletes exploit this geometry legally!'}},
        {formula:{tex:'\\vec{R}_{cm} = \\frac{\\sum m_i\\vec{r}_i}{\\sum m_i}', name:'Centre of mass position', vars:[['m_i','particle masses'],['r_i','their positions']], note:'Weighted average location of mass.'}},
        {p:'**Golden result:** the COM of any isolated system moves at constant velocity. Explosions, internal collisions — none can shift COM motion. Rocket propulsion works precisely by throwing mass backward so the remaining system moves forward.'},
        {example:{title:'Two-mass COM',
          given:['2 kg at x = 0','4 kg at x = 3 m'],
          concept:'Weighted average.',
          solution:['$x_{cm} = (2×0 + 4×3)/(2+4) = 12/6$'],
          answer:'x_cm = 2 m',
          interp:'COM sits closer to the heavier mass — it is mass-weighted, not midpointed.'}
        },
        {mistakes:['Assuming COM lies inside the object (it may lie outside — e.g. a ring!).','Applying momentum conservation while external forces act (friction during explosion recoil).']},
        {quiz:['q-cm1']},
        {revise:['COM = mass-weighted average point.','Isolated system ⇒ COM velocity constant.','Internal forces cannot move the COM.']}
      ]}
    ]
  },
  {
    id:'l3.rot', title:'Rotational Motion', icon:'🎡', tagline:'Angular cousins of everything you know.', mins:30,
    lessons:[
      { id:'l3.rot.main', title:'Rotation: Torque, Moment of Inertia, Angular Momentum', mins:30, content:[
        {why:{q:'Why do figure skaters spin faster when they tuck their arms in?', p:'Angular momentum L = Iω must stay constant (no external twist), so shrinking I forces ω up. The same physics stabilises bicycles, gyros and satellites.'}},
        {table:{head:['Linear quantity','Rotational twin'], rows:[
          ['displacement x →','angle θ (rad)'],
          ['velocity v →','ω = dθ/dt'],
          ['acceleration a →','α = dω/dt'],
          ['mass m →','moment of inertia $I = \\sum mr^2$'],
          ['force F →','torque $\\tau = rF\\sin\\theta$'],
          ['$F=ma$ →','$\\tau = I\\alpha$'],
          ['KE ½mv² →','½Iω²'],
          ['p = mv →','$L = Iω$']
        ]}},
        {ul:['Moment of inertia depends on WHERE mass sits relative to the axis — hollow cylinders beat solid ones of equal mass.','Rolling without slipping couples axes: $v = R\\omega$ and total KE = ½mv² + ½Iω².']}, 
        {example:{title:'Spinning disc energy',
          given:['Solid disc: m = 2 kg, r = 0.5 m','ω = 4 rad/s'],
          concept:'$I = \\tfrac12mr^2$ for a solid disc.',
          solution:['$I = \\tfrac12(2)(0.25) = 0.25$ kg·m²','$KE = \\tfrac12(0.25)(16)$'],
          answer:'KE_rot = 2 J',
          interp:'Same mass at larger radius would store far more energy — flywheels exploit exactly this.'}
        },
        {mistakes:['Treating moment of inertia as just "rotational mass" ignoring geometry/radius dependence.','Using degrees instead of radians in ω, α formulas.','Believing torque needs force through the axis — off-axis lever arm matters ($r\\sinθ$).']},
        {quiz:['q-rot1','q-rot2']},
        {revise:['Every linear law has a rotational twin.','τ = rF sinθ; τ_net = Iα.','Skater effect: I↓ ⇒ ω↑ keeps L fixed.','Rolling KE splits translation + rotation.']}
      ]}
    ]
  },
  {
    id:'l3.grav', title:'Gravitation', icon:'🌍', tagline:'Kepler, Newton, satellites, escape velocity.', mins:28,
    lessons:[
      { id:'l3.grav.main', title:'Universal Gravitation & Orbits', mins:28, content:[
        {why:{q:'What keeps a satellite up?', p:'Nothing "holds" it up — it is falling continuously while moving sideways fast enough to keep missing Earth. Orbiting IS falling, elegantly.'}},
        {formulas:[
          {tex:'F = G\\frac{m_1m_2}{r^2}', name:'Newton\u2019s law of gravitation', vars:[['G = 6.67×10⁻¹¹','N·m²/kg²'],['r','centre-to-centre distance']]},
          {tex:'g_h = g\\left(\\frac{R}{R+h}\\right)^2', name:'Gravity variation with height', vars:[['R','planet radius'],['h','altitude']]},
          {tex:'v_o = \\sqrt{\\frac{GM}{r}}, \\quad T^2 \\propto r^3', name:'Orbital speed & Kepler III', vars:[['M','central mass']]},
          {tex:'v_e = \\sqrt{\\frac{2GM}{R}}', name:'Escape velocity', note:'Earth ≈ 11.2 km/s. Independent of launch direction (neglecting drag) and of object mass.'}
        ]},
        {derive:{title:'Orbital speed', steps:[
          {do:'Gravity provides centripetal force: $\\dfrac{GMm}{r^2} = \\dfrac{mv_o^2}{r}$.', why:'Newton II in radial direction for circular orbit.'},
          {do:'Cancel one m and one r: $v_o^2 = GM/r$.', why:'Algebra.'}
        ]}},
        {example:{title:'Gravity at ISS height',
          given:['h = 400 km','R = 6400 km'],
          concept:'Inverse-square falloff.',
          solution:['$g_h = 9.8 × (6400/6800)^2 = 9.8 × 0.886$'],
          answer:'≈ 8.7 m/s² (89% of surface)',
          interp:'Astronauts float because they fall WITH their station, not because gravity vanished.'}
        },
        {mistakes:['Cancelling masses in F = Gm₁m₂/r² then wondering where m went (acceleration is mass-free; force is not).','Thinking escape velocity depends on payload mass.','Using surface g for orbital problems instead of GM/r².']},
        {quiz:['q-g3','q-g4']},
        {revise:['Inverse-square attraction.','g decreases as (R/(R+h))².','v_orbit = √(GM/r); T² ∝ r³.','Escape = √2 × circular-at-surface speed.']}
      ]}
    ]
  }
);
})();
