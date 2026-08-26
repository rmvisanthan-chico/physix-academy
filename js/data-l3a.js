/* PhysiX Academy — Level 3 Part A: Units & Flagship Kinematics Lesson */
'use strict';

CURRICULUM.push({
  id:'l3', name:'Class 11–12 · Higher Secondary', tag:'Level 3', icon:'🎓', color:'#6d5df6',
  desc:'A complete senior-secondary curriculum: mechanics, matter, waves, electromagnetism, optics and modern physics — exam-ready but understanding-first.',
  chapters:[

  /* ---------------- UNITS ---------------- */
  {
    id:'l3.unitsdim', title:'Units & Measurements', icon:'📐', tagline:'Dimensional analysis and error handling.', mins:15,
    lessons:[
      { id:'l3.unitsdim.main', title:'Dimensions, Significant Figures & Errors', mins:15, content:[
        {why:{q:'Can you check an equation WITHOUT solving it?', p:'Yes — dimensional analysis. If the dimensions on both sides disagree, the equation is certainly wrong. Engineers use it as a first line of defence against unit mistakes like the one that once destroyed a Mars orbiter.'}},
        {def:[{term:'Dimension', text:'The fundamental makeup of a unit in terms of mass [M], length [L], time [T]. Velocity has dimensions $[LT^{-1}]$.'}]},
        {table:{head:['Quantity','Formula','Dimensions'], rows:[
          ['Force','ma','$[MLT^{-2}]$'],
          ['Work / Energy','Fd','$[ML^2T^{-2}]$'],
          ['Power','W/t','$[ML^2T^{-3}]$'],
          ['Pressure','F/A','$[ML^{-1}T^{-2}]$']
        ]}},
        {example:{title:'Is $v^2 = u^2 + 2as$ dimensionally valid?',
          given:['LHS: velocity squared','RHS terms added together'],
          concept:'Quantities can only be added if dimensions match.',
          solution:['$v^2$: $[L^2T^{-2}]$','$u^2$: $[L^2T^{-2}]$','$as$: $[LT^{-2}][L]=[L^2T^{-2}]$'],
          answer:'Valid — all terms $[L^2T^{-2}]$', interp:'Structure confirmed. Dimensional checks cannot verify numerical constants like the 2.'
        }},
        {h:'Significant figures'},
        {ul:['Non-zero digits always count; zeros between non-zeros count (5002 → 4 sf); leading zeros never (0.0042 → 2 sf).','Multiplying/dividing: round to the FEWEST significant figures.','Adding/subtracting: round to the FEWEST decimal places.']},
        {formula:{tex:'\\frac{\\Delta Z}{Z} = \\frac{\\Delta A}{A} + \\frac{\\Delta B}{B}', name:'Error propagation (product)', vars:[['ΔA','absolute uncertainty in A']], note:'For powers: if $Z=A^n$ then relative error is multiplied by n — squared quantities carry double relative error.'}},
        {quiz:['q-un1']},
        {revise:['Dimensions test equation structure.','Relative errors add under multiplication; powers amplify them.','Sig-fig rules differ for ×÷ vs +−.']}
      ]}
    ]
  },

  /* ---------------- FLAGSHIP: MOTION IN A STRAIGHT LINE ---------------- */
  {
    id:'l3.kin1d', title:'Motion in a Straight Line ⭐', icon:'🚗', tagline:'Flagship demonstration lesson — every idea of 1-D kinematics.', mins:45,
    lessons:[
      { id:'l3.kin1d.motion', title:'Motion in a Straight Line — Complete Lesson', mins:45, content:[

        {h:'1 · What is motion?'},
        {why:{q:'Are you moving right now?', p:'Sitting still, you race around the Sun at 30 km/s. Motion only makes sense RELATIVE to what you compare with — a fact that shapes everything from GPS satellites to relativity at Level 4.'}},
        {p:'An object is **in motion** relative to a chosen reference if its position changes with time. Pick different references and the same object is simultaneously at rest (relative to your chair) and moving (relative to the Sun).'},
        {def:[{term:'Frame of reference', text:'The physical setup (origin + axes + clock) from which motion is described. Results depend on the frame chosen — choose wisely.'}]},
        {intuition:[{h:'Train thought experiment', p:'Drop a coin inside a smoothly moving train and it lands at your feet. For you it fell straight down; for someone on the platform it traced a forward arc. Both descriptions are correct — each in its own frame.'}]},

        {h:'2 · Position'},
        {p:'Describe motion along a straight road by fixing an **axis**: choose an origin O and a positive direction, then state position x as a signed number of metres.'},
        {svg:'<svg viewBox="0 0 480 90" style="width:100%;max-width:560px"><defs><marker id="axm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9aa8c3"/></marker></defs><line x1="20" y1="50" x2="460" y2="50" stroke="#9aa8c3" stroke-width="1.5" marker-end="url(#axm)"/><circle cx="240" cy="50" r="5" fill="#fbbf24"/><text x="222" y="76" fill="#e8edf7" font-size="12">O (x=0)</text><circle cx="380" cy="50" r="7" fill="#34d399"/><text x="356" y="34" fill="#e8edf7" font-size="12">car: +70 m</text><circle cx="110" cy="50" r="7" fill="#f472b6"/><text x="84" y="34" fill="#e8edf7" font-size="12">bike: −65 m</text></svg>'},
        {ul:['Position is a VECTOR: +70 m means 70 m in the positive direction.','−65 m does not mean negative distance — the sign IS the direction.']},

        {h:'3 · Distance'},
        {def:[{term:'Distance', text:'Total length of the path travelled regardless of direction. Scalar; never decreases; SI unit metre.'}]},
        {example:{title:'Odometer logic',
          given:['Walk 300 m east, then 200 m west.'],
          concept:'Distance adds every metre of the path.',
          solution:['$d = 300 + 200$'],
          answer:'500 m',
          interp:'Your legs did 500 m of work even though you ended only 100 m from home.'}
        },

        {h:'4 · Displacement'},
        {def:[{term:'Displacement', text:'Straight-arrow change of position: $\\Delta x = x_f - x_i$. Vector; may be zero or negative; always ≤ distance.'}]},
        {p:'**Key inequality:** magnitude of displacement ≤ distance, with equality only when motion never reverses.'},

        {h:'5 · Speed'},
        {formulas:[
          {tex:'\\text{average speed} = \\frac{\\text{total distance}}{\\text{total time}}', name:'Average speed', vars:[['d','total path length (m)'],['t','elapsed time (s)']]},
          {tex:'v_{inst} = \\frac{dx}{dt}', name:'Instantaneous speed', vars:[['dx/dt','derivative of position']], note:'What a speedometer reads RIGHT NOW.'}
        ]},

        {h:'6 · Velocity'},
        {formula:{tex:'v_{avg}=\\frac{x_f-x_i}{t_f-t_i}, \\qquad v=\\frac{dx}{dt}', name:'Average & instantaneous velocity', vars:[['x_f, x_i','final / initial positions'],['dx/dt','slope of the x–t graph']]}},
        {intuition:[{h:'Why instantaneous matters', p:'Police do not fine your average speed across the city; they fine your velocity AT one moment. Calculus exists precisely to capture such instant rates.'}]},

        {h:'7 · Acceleration'},
        {formula:{tex:'a_{avg}=\\frac{v-u}{t}, \\qquad a=\\frac{dv}{dt}', name:'Acceleration', vars:[['u, v','initial / final velocity'],['dv/dt','slope of v–t graph']], note:'SI unit m/s². An acceleration of 2 m/s² adds 2 m/s of velocity every second.'}},
        {p:'Acceleration is about CHANGES: a car cornering at steady 60 km/h still accelerates because its direction changes (that story continues in Motion in a Plane).'},

        {h:'8 · Position–time graphs'},
        {ul:['**Slope = velocity.** Steeper ⇒ faster; downward slope ⇒ negative velocity.','Curve bending upward ⇒ accelerating; bending downward ⇒ decelerating.','Crossing the t-axis ⇒ passing the origin.']},
        {svg:'<svg viewBox="0 0 520 180" style="width:100%;max-width:600px"><line x1="40" y1="150" x2="500" y2="150" stroke="#6b7a99" stroke-width="1"/><line x1="40" y1="150" x2="40" y2="20" stroke="#6b7a99" stroke-width="1"/><text x="495" y="165" fill="#9aa8c3" font-size="11">t</text><text x="18" y="18" fill="#9aa8c3" font-size="11">x</text><polyline points="40,130 160,60 250,60 400,20" fill="none" stroke="#22d3ee" stroke-width="3"/><text x="55" y="105" fill="#22d3ee" font-size="10" transform="rotate(-29 80 115)">fast</text><text x="178" y="52" fill="#6d5df6" font-size="10">at rest</text><text x="305" y="45" fill="#22d3ee" font-size="10" transform="rotate(-16 310 48)">slower</text></svg>'},

        {h:'9 · Velocity–time graphs'},
        {ul:['**Slope = acceleration.**','**Area under curve = displacement** (area below the axis counts negative).','Flat line ⇒ constant velocity; sloped line ⇒ uniform acceleration.']},
        {svg:'<svg viewBox="0 0 520 190" style="width:100%;max-width:600px"><defs><linearGradient id="vtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(109,93,246,.35)"/><stop offset="1" stop-color="rgba(109,93,246,0)"/></linearGradient></defs><line x1="40" y1="155" x2="500" y2="155" stroke="#6b7a99" stroke-width="1"/><line x1="40" y1="155" x2="40" y2="20" stroke="#6b7a99" stroke-width="1"/><polygon points="40,140 170,140 320,25 320,155 40,155" fill="url(#vtg)"/><polyline points="40,140 170,140 320,25" fill="none" stroke="#6d5df6" stroke-width="3"/><text x="70" y="128" fill="#e8edf7" font-size="10">constant v</text><text x="230" y="120" fill="#a99df8" font-size="10">area = displacement</text><text x="215" y="55" fill="#6d5df6" font-size="10" transform="rotate(-38 225 62)">accelerating</text></svg>'},

        {h:'10 · Acceleration–time graphs'},
        {p:'Area under the a–t curve gives CHANGE IN VELOCITY. For uniform acceleration this graph is a horizontal line — which is exactly why the equations below are so simple.'},

        {h:'11 · Equations of motion (uniform acceleration only!)'},
        {formulas:[
          {tex:'v = u + at', name:'Velocity after time t', vars:[['u','initial velocity'],['v','velocity at time t'],['a','constant acceleration'],['t','elapsed time']]},
          {tex:'s = ut + \\tfrac{1}{2}at^2', name:'Displacement in time t', vars:[['s','displacement']]},
          {tex:'v^2 = u^2 + 2as', name:'Time-free equation', vars:[['s','displacement during change']], note:'Perfect when t is neither given nor wanted.'}
        ]},

        {h:'12 · Derivation (from definitions — not magic)'},
        {derive:{steps:[
          {do:'Start from average acceleration with CONSTANT a: $a=\\dfrac{v-u}{t}$.', why:'Definition of acceleration.'},
          {do:'Rearrange: $v=u+at$ ✔ (Equation 1).', why:'Algebra only.'},
          {do:'On a linear v–t graph the average velocity over the interval is $\\dfrac{u+v}{2}$ (midpoint rule).', why:'Trapezium area = average height × width.'},
          {do:'So $s=\\dfrac{u+v}{2}\\,t$. Substitute Eq.1: $s=ut+\\tfrac12 at^2$ ✔ (Equation 2).', why:'Graph geometry + substitution.'},
          {do:'From Eq.1, $t=\\dfrac{v-u}{a}$; insert into Eq.2 and simplify: $v^2=u^2+2as$ ✔ (Equation 3).', why:'Eliminate the variable you do not want.'}
        ]}},
        {p:'All three equations flow from two DEFINITIONS plus one assumption (constant a). Nothing memorised blindly.'},

        {h:'13 · Real-world examples'},
        {ul:['Runway design: take-off speed fixes needed length via $v^2=u^2+2as$.','Yellow traffic lights: timed from reaction time + braking distance (∝ v²).','Free fall: set a = g ≈ 9.8 m/s² downward — same equations govern skydivers before air drag balances.']},

        {h:'14 · Interactive simulation'},
        {sim:'kin1d'},

        {h:'15 · Worked problems'},
        {example:{title:'Problem A — accelerate from rest',
          given:['u = 0','a = 4 m/s²','t = 6 s'], concept:'Time known → Equations 1 & 2.',
          solution:['$v = 0 + 4×6 = 24$ m/s','$s = \\tfrac12(4)(36) = 72$ m'],
          answer:'v = 24 m/s; s = 72 m', interp:'Check: average velocity (0+24)/2 times 6 s = 72 m ✔'}
        },
        {example:{title:'Problem B — braking distance',
          given:['u = 20 m/s','brakes give −5 m/s² until stop'], concept:'No time given → Equation 3.',
          solution:['$0 = 400 − 10s$','$s = 40$ m'],
          answer:'40 m', interp:'At 72 km/h you need about four car lengths — and doubling speed QUADRUPLES this distance (v² dependence).'}
        },
        {example:{title:'Problem C — average-speed trap',
          given:['Half the journey at 20 m/s, half at 10 m/s (equal DISTANCES)'],
          concept:'Never average speeds arithmetically unless TIMES are equal.',
          solution:['Let total distance be 2D: $t_1=D/20$, $t_2=D/10$','average speed $= 2D ÷ (3D/20)$'],
          answer:'≈ 13.3 m/s', interp:'The slow leg eats disproportionate time — harmonic-mean behaviour.'}
        },

        {h:'16 · Practice quiz'},
        {quiz:['q-k4','q-k5','q-k6']},

        {h:'17 · Common mistakes'},
        {mistakes:['Using SUVAT equations when acceleration changes (drag, varying engine force) — they demand constant a.','Putting distance where displacement s belongs.','Dropping minus signs: braking needs a < 0 if forward is positive.','Assuming average velocity = (u+v)/2 when a varies — true only for constant a.']},

        {h:'18 · Quick revision'},
        {revise:['Motion is frame-dependent.','x vector; d scalar; |Δx| ≤ d.','Slopes: x–t → v, v–t → a. Areas: v–t → Δx.','SUVAT valid ONLY for constant a.','Braking distance ∝ v².','Define the positive direction first, always.']}
      ]}
    ]
  }
]});
