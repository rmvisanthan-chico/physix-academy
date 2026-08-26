/* ============================================================
   PhysiX Academy — Curriculum Data: Levels 1 & 2
   Content block schema (rendered by app.js):
   h | p | why | intuition | def | formula(s) | derive | example |
   mistakes | revise | sim | svg | table | quiz | ul
   ============================================================ */
'use strict';

const CURRICULUM = [];

/* ============================ LEVEL 1 ============================ */
CURRICULUM.push({
  id:'l1', name:'Absolute Beginner', tag:'Level 1', icon:'🌱', color:'#34d399',
  desc:'Start from zero. What physics is, how to measure it, the maths you need — explained assuming no prior knowledge.',
  chapters:[
  /* ---------------- What is Physics ---------------- */
  {
    id:'l1.what', title:'What is Physics?', icon:'🔭', tagline:'The science of everything — and how to think like a physicist.', mins:12,
    lessons:[
      { id:'l1.what.intro', title:'Physics: The Science of Everything', mins:12, content:[
        {why:{q:'Why does a phone know which way is up?', p:'Your phone screen rotates because a tiny chip inside measures gravity using physics. Physics is not a school subject invented for exams — it is the operating manual of reality. Every bridge, satellite, heart-beat monitor and mobile phone works because someone understood physics.'}},
        {p:'Physics is the study of **matter, energy, motion and forces** — and the search for simple rules that explain complicated things. Its goal is always the same: find patterns that let us **predict** what happens next.'},
        {intuition:[
          {h:'A physicist looks at a falling apple…', p:'…and sees the same rule that keeps the Moon in orbit. That leap — from one situation to a universal law — is the whole spirit of physics.'},
          {h:'Physicists build models', p:'A model is a simplified description that captures what matters and ignores what does not. A map is a model of a city: useless details are removed so the useful ones stand out. Physics equations are maps of reality.'}
        ]},
        {def:[
          {term:'Matter', text:'Anything that has mass and takes up space — atoms, air, you.'},
          {term:'Energy', text:'The ability to do things: move objects, heat them, light bulbs. Measured in joules (J).'},
          {term:'Force', text:'A push or pull that can change an object\'s motion. Measured in newtons (N).'},
          {term:'Model', text:'A simplified representation of reality used to explain and predict behaviour.'}
        ]},
        {p:'Physics is organised into branches you will meet as you climb the levels here:'},
        {table:{head:['Branch','Asks questions like'], rows:[
          ['Mechanics','How do objects move? Why do they stop?'],
          ['Thermodynamics','Why does heat flow from hot to cold?'],
          ['Waves & Optics','How do sound and light travel?'],
          ['Electricity & Magnetism','What makes current flow? Why do magnets attract?'],
          ['Modern Physics','What is light really? What is inside an atom?']
        ]}},
        {h:'How to actually learn physics'},
        {ul:[
          'Understand before memorising — if you can explain an idea to a friend, you own it.',
          'Draw pictures. Almost every physics problem becomes easier as a diagram.',
          'Check units at every step. Wrong units = wrong physics.',
          'Ask "what would happen if…?" and test your intuition with simulations.'
        ]},
        {mistakes:[
          'Treating formulas as magic recipes instead of sentences about reality.',
          'Skipping diagrams and jumping straight to algebra.',
          'Assuming physics is only for "geniuses" — it is a skill built by practice, like cycling.'
        ]},
        {revise:['Physics studies matter, energy, motion and forces.','Its goal: simple laws that predict complex behaviour.','Models simplify; good models keep what matters.','Always draw, estimate, and check units.']}
      ]}
    ]
  },
  /* ---------------- Units & Measurement ---------------- */
  {
    id:'l1.units', title:'Units & Measurement', icon:'📏', tagline:'A number without a unit means nothing.', mins:18,
    lessons:[
      { id:'l1.units.si', title:'Units, SI & Converting Them', mins:18, content:[
        {why:{q:'NASA lost a $327-million spacecraft because of units.', p:'In 1999, the Mars Climate Orbiter burned up because one engineering team used pound-force·seconds while another used newton·seconds. One mixed-up unit destroyed a mission. Units are not decoration — they are half of every physical answer.'}},
        {def:[{term:'Physical quantity', text:'Any property that can be measured, written as a number with a unit: length = 5 m, time = 3 s, mass = 70 kg.'}]},
        {p:'Science uses the **SI system** (Système International) built on seven base quantities. Every other unit is derived from these.'},
        {table:{head:['Quantity','Unit','Symbol','Measured with'], rows:[
          ['Length','metre','m','ruler'],
          ['Mass','kilogram','kg','balance'],
          ['Time','second','s','clock'],
          ['Electric current','ampere','A','ammeter'],
          ['Temperature','kelvin','K','thermometer'],
          ['Amount of substance','mole','mol','—'],
          ['Luminous intensity','candela','cd','photometer']
        ]}},
        {p:'Derived units combine base ones: speed = distance/time has unit m/s; force (kg·m/s²) is renamed the **newton (N)**; energy (N·m) is renamed the **joule (J)**.'},
        {h:'SI prefixes'},
        {table:{head:['Prefix','Meaning','Example'], rows:[
          ['nano (n)','10⁻⁹','380 nm light'],
          ['micro (μ)','10⁻⁶','20 μs pulse'],
          ['milli (m)','10⁻³','250 mA current'],
          ['centi (c)','10⁻²','your height in cm'],
          ['kilo (k)','10³','5 km run'],
          ['mega (M)','10⁶','3 MW power station'],
          ['giga (G)','10⁹','2 GHz processor']
        ]}},
        {h:'Converting units — the safe recipe'},
        {p:'Multiply by a fraction equal to 1, arranged so unwanted units cancel: to turn kilometres into metres multiply by $\\frac{1000\\ \\text{m}}{1\\ \\text{km}}$.'},
        {example:{title:'Convert 72 km/h into m/s',
          given:['Speed = 72 km/h'],
          concept:'Two conversions chained: km→m (×1000) and hour→second (÷3600).',
          solution:[
            '$72\\ \\tfrac{\\text{km}}{\\text{h}} = 72 \\times \\frac{1000\\ \\text{m}}{3600\\ \\text{s}}$',
            '$= \\frac{72{,}000}{3600}\\ \\text{m/s}$'
          ],
          answer:'20 m/s',
          interp:'This exact conversion appears constantly — 72 km/h is 20 m/s. Remember ÷3.6 for quick km/h→m/s checks.'
        }},
        {formula:{tex:'v\\,[\\text{m/s}] = v\\,[\\text{km/h}] \\div 3.6', name:'Quick speed conversion', vars:[['v','speed']], note:'Because 1 km/h = 1000/3600 m/s = 1/3.6 m/s exactly.'}},
        {mistakes:[
          'Writing a number without its unit ("the answer is 20" — 20 what?).',
          'Adding quantities in different units (5 m + 30 cm needs converting first).',
          'Confusing mass (kg) with weight (N). Weight is a force: W = mg.'
        ]},
        {revise:['Every measurement = number + unit.','Seven SI base units; everything else derives from them.','Convert by multiplying by fractions equal to 1.','km/h → m/s: divide by 3.6.']}
      ]}
    ]
  },
  /* ---------------- Scientific Notation ---------------- */
  {
    id:'l1.notation', title:'Scientific Notation', icon:'🔢', tagline:'Handling numbers from atoms to galaxies.', mins:14,
    lessons:[
      { id:'l1.notation.main', title:'Powers of Ten & Orders of Magnitude', mins:14, content:[
        {why:{q:'How many times does your heart beat in a lifetime?', p:'Roughly $7\\times10^8$ times. Physics constantly deals with huge and tiny numbers — the mass of an electron ($9.1\\times10^{-31}$ kg) versus the Sun ($2\\times10^{30}$ kg). Scientific notation makes them writable, comparable and calculable.'}},
        {formula:{tex:'a \\times 10^{n}', name:'Scientific notation form', vars:[['a','a number from 1 up to (but not including) 10'],['n','an integer exponent']], note:'Examples: $3{,}000 = 3\\times10^{3}$; $0.0042 = 4.2\\times10^{-3}$.'}},
        {h:'Rules of powers of ten'},
        {ul:[
          'Multiplying powers: add exponents — $(10^3)(10^4)=10^{7}$.',
          'Dividing powers: subtract exponents — $\\frac{10^6}{10^2}=10^{4}$.',
          'Negative exponent = small number: $10^{-3}=0.001$.'
        ]},
        {example:{title:'Compute $(3\\times10^{8}) \\times (2\\times10^{-3})$',
          given:['Two values in scientific notation'],
          concept:'Multiply the front numbers; add the exponents.',
          solution:['Front numbers: $3\\times2=6$', 'Exponents: $10^{8+(-3)}=10^{5}$'],
          answer:'$6\\times10^{5}$ (= 600,000)',
          interp:'This is literally the speed of light times a millisecond-scale time — giving hundreds of kilometres.'
        }},
        {def:[{term:'Order of magnitude', text:'The nearest power of ten of a value. 800 is order $10^{3}$; 0.02 is order $10^{-2}$. Physicists use orders of magnitude for fast sanity checks.'}]},
        {example:{title:'Estimate: heartbeats in 80 years', given:['≈70 beats per minute'], concept:'Order-of-magnitude estimation — chain rough numbers.', solution:['Minutes per year ≈ $60\\times24\\times365 \\approx 5\\times10^{5}$','Beats ≈ $70 \\times 80 \\times 5\\times10^{5} = 2.8\\times10^{9}$'], answer:'≈ 3 billion beats', interp:'Estimation lets you sanity-check any claimed answer within seconds.'}},
        {mistakes:['Forgetting the decimal point must sit after ONE digit in $a$.','Adding exponents when multiplying front numbers too.','Ignoring significant figures: $3.0\\times10^{2}$ implies more precision than $3\\times10^{2}$.']},
        {revise:['$a\\times10^n$ with $1\\le a<10$.','Multiply → add exponents; divide → subtract.','Order of magnitude = nearest power of ten.','Estimate big products by chaining round numbers.']}
      ]}
    ]
  },
  /* ---------------- Scalars & Vectors ---------------- */
  {
    id:'l1.vectors', title:'Scalars & Vectors', icon:'➡️', tagline:'Some quantities need a direction to make sense.', mins:16,
    lessons:[
      { id:'l1.vectors.intro', title:'Scalars, Vectors & Components', mins:16, content:[
        {why:{q:'Two planes fly at 900 km/h — why does only one reach Delhi?', p:'Because speed alone ignores direction. A flight heading north-east arrives somewhere very different from one heading south-east. Quantities with direction — velocity, force, displacement — are vectors, and mishandling their direction causes real navigation errors.'}},
        {def:[
          {term:'Scalar', text:'Fully described by magnitude (size) + unit. Examples: mass, temperature, time, energy, speed, distance.'},
          {term:'Vector', text:'Described by magnitude + unit + direction. Examples: displacement, velocity, acceleration, force, momentum. Written $\\vec{F}$ or bold F; magnitude written $|\\vec{F}|$ or just F.'}
        ]},
        {svg:'<svg viewBox="0 0 420 150" style="width:100%;max-width:520px"><defs><marker id="ah1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#22d3ee"/></marker></defs><line x1="30" y1="75" x2="200" y2="75" stroke="#22d3ee" stroke-width="3" marker-end="url(#ah1)"/><text x="105" y="62" fill="var(--txt)" font-size="14">vector: 40 N east</text><circle cx="330" cy="75" r="26" fill="#6d5df6"/><text x="316" y="80" fill="#fff" font-size="12">50 kg</text><text x="296" y="122" fill="var(--txt2)" font-size="12">scalar: just a size</text></svg>'},
        {h:'Representing vectors'},
        {ul:['An arrow: length ∝ magnitude, arrowhead gives direction.','Same-direction vectors add like plain numbers; opposite directions subtract.','Vectors at angles combine using geometry (next level!).']},
        {h:'Components — breaking a vector into pieces'},
        {p:'Any vector can be split into two perpendicular parts (components): a horizontal piece $v_x$ and vertical piece $v_y$, found with trigonometry:'},
        {formulas:[
          {tex:'v_x = v\\cos\\theta, \\quad v_y = v\\sin\\theta', name:'Vector components', vars:[['v','magnitude of the vector'],['\\theta','angle measured from the horizontal axis']]}
        ]},
        {svg:'<svg viewBox="0 0 320 190" style="width:100%;max-width:340px"><defs><marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#34d399"/></marker></defs><line x1="30" y1="160" x2="300" y2="160" stroke="var(--txt3)" stroke-width="1"/><line x1="30" y1="160" x2="30" y2="15" stroke="var(--txt3)" stroke-width="1"/><line x1="30" y1="160" x2="240" y2="45" stroke="#34d399" stroke-width="3" marker-end="url(#ah2)"/><line x1="30" y1="160" x2="240" y2="160" stroke="#22d3ee" stroke-width="2" stroke-dasharray="5 4"/><line x1="240" y1="160" x2="240" y2="45" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/><path d="M 70 160 A 42 42 0 0 0 63 137" fill="none" stroke="var(--txt)" stroke-width="1"/><text x="76" y="152" fill="var(--txt)" font-size="13">θ</text><text x="120" y="90" fill="#34d399" font-size="14" font-weight="bold">F</text><text x="110" y="180" fill="#22d3ee" font-size="12">Fx = F cosθ</text><text x="252" y="105" fill="#fbbf24" font-size="12">Fy = F sinθ</text></svg>'},
        {example:{title:'Find components of a 50 N force at 37° above horizontal',
          given:['Magnitude $F=50$ N','$\\theta=37°$'],
          concept:'Resolve along perpendicular axes using cosine (adjacent) and sine (opposite).',
          solution:['$F_x = 50\\cos37° = 50(0.8) = 40$ N','$F_y = 50\\sin37° = 50(0.6) = 30$ N'],
          answer:'$F_x = 40$ N, $F_y = 30$ N',
          interp:'37° is special: cos37°≈0.8, sin37°≈0.6 (a 3-4-5 triangle). Spotting these saves exam time.'
        }},
        {p:'Rebuilding a vector from components uses Pythagoras: $|\\vec{v}| = \\sqrt{v_x^2+v_y^2}$.'},
        {mistakes:[
          'Calling speed a vector — speed is scalar; velocity (speed + direction) is the vector.',
          'Mixing up sin/cos when resolving: cos goes with the angle-side (adjacent), sin across.',
          'Adding magnitudes of angled vectors directly — 3 N plus 4 N at right angles gives 5 N, not 7 N.'
        ]},
        {quiz:['q-v1','q-v2','q-v3']},
        {revise:['Scalar = size only; vector = size + direction.','Components: $v_x=v\\cos\\theta$, $v_y=v\\sin\\theta$.','Recombine with Pythagoras.','Perpendicular vectors obey $3^2+4^2=5^2$-style addition.']}
      ]}
    ]
  },
  /* ---------------- Math Toolkit ---------------- */
  {
    id:'l1.math', title:'Physics Maths Toolkit', icon:'🧮', tagline:'Just enough algebra, trigonometry and graph sense.', mins:25,
    lessons:[
      { id:'l1.math.algebra', title:'Algebra & Rearranging Equations', mins:12, content:[
        {why:{q:'You know F = ma but the question asks for acceleration.', p:'Then you must rearrange: $a=F/m$. Rearranging equations is the single most-used mathematical skill in all of physics — every chapter on this site assumes you can do it.'}},
        {p:'An equation is a balanced scale. Whatever you do to one side, do to the other, and balance survives.'},
        {table:{head:['To isolate…','Do this','Example'], rows:[
          ['a in F = ma','divide both sides by m','$a = F/m$'],
          ['v in ρ = m/v','multiply both sides by v, then divide by ρ','$v = m/\\rho$'],
          ['h in PE = mgh','divide both sides by mg','$h = \\frac{PE}{mg}$']
        ]}},
        {example:{title:'From $v = u + at$, find $t$',
          given:['Equation $v=u+at$'],
          concept:'Undo operations in reverse order: first subtract u, then divide by a.',
          solution:['$v-u = at$','$t = \\dfrac{v-u}{a}$'],
          answer:'$t=(v-u)/a$',
          interp:'This rearrangement IS the definition of acceleration: change in velocity per unit time.'
        }},
        {mistakes:['Changing only one side (breaking the balance).','Sign slips when moving terms across "=" — $v - u$, never $v + u$.','Cancelling variables that appear added, not multiplied.']},
        {revise:['Balance both sides.','Undo operations in reverse order.','Substitution = replace symbols with known numbers + units.']}
      ]},
      { id:'l1.math.trig', title:'Trigonometry, Graphs & Proportions', mins:13, content:[
        {why:{q:'A ladder leans against a wall — how high does it reach?', p:'That is pure trigonometry: you know the ladder\'s length (hypotenuse) and its angle. Trig turns angles into side lengths, which is why every vector, ramp and projectile problem leans on it.'}},
        {p:'In a right triangle, relative to angle θ:'},
        {formulas:[
          {tex:'\\sin\\theta = \\dfrac{\\text{opposite}}{\\text{hypotenuse}}', name:'sine', vars:[['θ','angle of interest']]},
          {tex:'\\cos\\theta = \\dfrac{\\text{adjacent}}{\\text{hypotenuse}}', name:'cosine', vars:[['θ','angle of interest']]},
          {tex:'\\tan\\theta = \\dfrac{\\text{opposite}}{\\text{adjacent}}', name:'tangent — remember SOH-CAH-TOA', vars:[['θ','angle of interest']]}
        ]},
        {example:{title:'Ladder problem', given:['Ladder length 5 m (hypotenuse)','Angle with ground 53°'], concept:'Height is the side opposite to θ → use sine.', solution:['$h = 5\\sin53°$','$\\sin53° \\approx 0.8$'], answer:'h ≈ 4 m', interp:'Another 3-4-5 triangle: a 5 m ladder at 53° touches 4 m up. Recognising these triangles speeds everything up.'}},
        {h:'Reading graphs'},
        {ul:['**Slope (gradient)** = how fast the y-value changes per unit of x. In a distance-time graph the slope IS the speed.','**Area under curve** accumulates the product x×y. In a speed-time graph the area IS the distance travelled.','Straight line through origin ⇒ direct proportionality ($y=kx$). Flat line ⇒ y independent of x. Curved ⇒ changing rate.']},
        {svg:'<svg viewBox="0 0 460 170" style="width:100%;max-width:560px"><line x1="35" y1="140" x2="430" y2="140" stroke="var(--txt3)" stroke-width="1.5"/><line x1="35" y1="140" x2="35" y2="15" stroke="var(--txt3)" stroke-width="1.5"/><text x="436" y="145" fill="var(--txt2)" font-size="11">t</text><text x="20" y="14" fill="var(--txt2)" font-size="11">x</text><polyline points="35,140 130,95 260,55 400,25" fill="none" stroke="#22d3ee" stroke-width="3"/><rect x="130" y="95" width="130" height="45" fill="rgba(109,93,246,.15)" stroke="none"/><text x="150" y="128" fill="var(--acc)" font-size="11" font-weight="bold">area = distance</text><text x="255" y="42" fill="#22d3ee" font-size="11" transform="rotate(-17 255 42)">slope = speed</text></svg>'},
        {h:'Proportional thinking'},
        {table:{head:['Relationship','Meaning','Physics example'], rows:[
          ['$y\\propto x$','double x doubles y','KE ∝ v²? NO — see below!'],
          ['$y\\propto x^2$','double x quadruples y','$KE=\\tfrac12 mv^2$: KE ∝ v²'],
          ['$y\\propto 1/x$','double x halves y','$F=G\\frac{m_1m_2}{r^2}$: F ∝ 1/r²'],
          ['$y$ independent of $x$','changing x changes nothing','mass in free-fall time']
        ]}},
        {mistakes:['Reading area when slope is needed (and vice versa).','Thinking doubling speed doubles braking damage — kinetic energy quadruples (∝ v²).','Forgetting inverse-square laws fall very fast: triple the distance → force drops 9×.']},
        {quiz:['q-ma1','q-ma2']},
        {revise:['SOH-CAH-TOA.','Slope = rate; Area = accumulated amount.','∝ x² grows fast; ∝ 1/x² shrinks fast.']}
      ]}
    ]
  }
]});

/* ============================ LEVEL 2 ============================ */
CURRICULUM.push({
  id:'l2', name:'School Foundation', tag:'Level 2', icon:'🏗️', color:'#38bdf8',
  desc:'The classic pillars of physics — motion, forces, energy, heat, waves, electricity, magnetism and light — taught through intuition first.',
  chapters:[
  {
    id:'l2.motion', title:'Describing Motion', icon:'🏃', tagline:'Distance vs displacement, speed vs velocity, and acceleration.', mins:20,
    lessons:[
      { id:'l2.motion.intro', title:'Motion Without Tears', mins:20, content:[
        {why:{q:'Is a car that drove 40 km back to its start "moving"?', p:'It moved 40 km yet its displacement is zero. This paradox is your first taste of why physicists distinguish scalars from vectors even in everyday situations — and why GPS apps track position, not odometers.'}},
        {def:[
          {term:'Position (x)', text:'Where an object is, measured from a chosen reference point (origin) along a chosen axis.'},
          {term:'Distance (d)', text:'Total path length travelled. Scalar, never negative.'},
          {term:'Displacement (Δx)', text:'Change of position: $\\Delta x = x_f - x_i$. Vector: straight line from start to finish, with direction.'}
        ]},
        {svg:'<svg viewBox="0 0 460 120" style="width:100%;max-width:520px"><defs><marker id="ma" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#22d3ee"/></marker><marker id="mb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#f472b6"/></marker></defs><circle cx="60" cy="60" r="7" fill="#34d399"/><text x="46" y="88" fill="var(--txt2)" font-size="11">start</text><circle cx="400" cy="60" r="7" fill="#fbbf24"/><text x="386" y="88" fill="var(--txt2)" font-size="11">finish</text><path d="M 67 57 C 150 10 300 10 393 57" fill="none" stroke="#f472b6" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#mb)"/><line x1="67" y1="66" x2="393" y2="66" stroke="#22d3ee" stroke-width="2.5" marker-end="url(#ma)"/><text x="185" y="26" fill="#f472b6" font-size="11">distance (curvy path)</text><text x="175" y="82" fill="#22d3ee" font-size="11" font-weight="bold">displacement (straight arrow)</text></svg>'},
        {def:[
          {term:'Speed', text:'Rate of covering path length: $\\text{speed} = d/t$. Scalar.'},
          {term:'Velocity', text:'Rate of change of displacement: $v = \\Delta x/\\Delta t$. Vector — includes direction.'},
          {term:'Acceleration', text:'Rate of change of velocity: $a = \\Delta v/\\Delta t$. Vector. Unit: m/s².'}
        ]},
        {formula:{tex:'a = \\frac{v-u}{t}', name:'Average acceleration', vars:[['u','initial velocity (m/s)'],['v','final velocity (m/s)'],['t','time taken (s)']], note:'Positive a = speeding up (along motion); negative a = slowing down or reversing.'}},
        {example:{title:'Bus journey', given:['Bus covers 600 m east in 30 s, stops, returns 200 m west in 20 s.'], concept:'Separate total path from net change of position; compute averages separately.', solution:['Total distance = $600+200=800$ m in $50$ s','Net displacement = $600-200=400$ m east','Average speed = $800/50 = 16$ m/s','Average velocity = $400/50 = 8$ m/s east'], answer:'Speed 16 m/s; velocity 8 m/s east', interp:'The two answers differ because the bus doubled back — distance counts every metre, displacement only cares where you ended.'}},
        {mistakes:['Using "velocity" and "speed" interchangeably — they differ whenever direction changes.','Treating negative acceleration as always "slowing down": it depends on the chosen positive direction.','Averaging speeds over two legs by adding and halving — you must average over TIME, i.e. total distance / total time.']},
        {quiz:['q-k1','q-k2','q-k3']},
        {revise:['Distance scalar; displacement vector.','Speed scalar; velocity vector.','Acceleration = velocity change rate (m/s²).','Average velocity = net displacement ÷ total time.']}
      ]}
    ]
  },
  {
    id:'l2.force', title:"Force & Newton's Laws", icon:'💪', tagline:'Why things start, stop, speed up and push back.', mins:25,
    lessons:[
      { id:'l2.force.newton', title:'Newton\'s Three Laws + Friction', mins:25, content:[
        {why:{q:'Why do you lurch forward when a bus brakes?', p:'Your body obeys Newton\'s First Law: it keeps doing whatever it was doing until something interferes. Seatbelts exist because of a law written in 1687.'}},
        {intuition:[
          {h:'Law I — inertia', p:'Objects resist changes to their motion. A hockey puck on ice glides almost forever; friction is what usually stops things, not some mysterious "running out of force".'},
          {h:'Law II — the workhorse', p:'Push harder → accelerate more. Load heavier → accelerate less. Force equals mass × acceleration.'},
          {h:'Law III — pairs', p:'Forces come in pairs acting on DIFFERENT objects: rocket pushes gas down, gas pushes rocket up. Equal strength, opposite direction, never cancel each other because they act on different bodies.'}
        ]},
        {formulas:[
          {tex:'\\Sigma F = ma', name:"Newton's Second Law (net force form)", vars:[['\\Sigma F','net (total) force — vector sum, in newtons'],['m','mass in kilograms'],['a','acceleration in m/s²']], note:'Use NET force after adding all pushes/pulls with signs.'},
          {tex:'F_{friction} = \\mu N', name:'Friction force', vars:[['\\mu','coefficient of friction (no units, typically 0–1)'],['N','normal force — surface pressing back, = mg on flat ground']], note:'Friction always opposes sliding motion.'}
        ]},
        {example:{title:'Car engine vs road friction',
          given:['Car mass 1000 kg','Engine force 2000 N forward','Friction 500 N backward'],
          concept:'Second Law needs the NET force: subtract opposing forces first.',
          solution:['$\\Sigma F = 2000 - 500 = 1500$ N','$a = \\Sigma F / m = 1500/1000$'],
          answer:'a = 1.5 m/s²',
          interp:'At this acceleration the car reaches highway speed (25 m/s) in about 17 s.'
        }},
        {sim:'newton'},
        {mistakes:[
          'Believing motion needs constant force — it needs force only to CHANGE motion.',
          '"Equal and opposite forces cancel" applied wrongly: action–reaction pairs act on different objects so they never cancel.',
          'Forgetting weight acts downward in free-body diagrams: $W=mg$.',
          'Using mass in grams — convert to kilograms!'
        ]},
        {quiz:['q-f1','q-f2','q-f3','q-f4']},
        {revise:['I: no net force ⇒ velocity unchanged.','II: $\\Sigma F = ma$ — always compute NET force.','III: paired forces act on different bodies.','Friction $= \\mu N$, opposing motion.']}
      ]}
    ]
  },
  {
    id:'l2.work', title:'Work, Energy & Power', icon:'⚡', tagline:'Nature\'s currency and how fast you spend it.', mins:22,
    lessons:[
      { id:'l2.work.energy', title:'Energy: Conserved, Never Created', mins:22, content:[
        {why:{q:'Why can a small pebble crack a windshield at 120 km/h but not at walking pace?', p:'Kinetic energy grows with the SQUARE of speed. Double the speed → four times the destructive energy. Insurance companies live by this formula.'}},
        {def:[
          {term:'Work', text:'Energy transferred when a force moves its point of application: $W = Fd\\cos\\theta$. Joules.'},
          {term:'Energy', text:'Capacity to do work. Kinetic = motion energy; Potential = stored (position/configuration) energy.'},
          {term:'Power', text:'Rate of energy transfer: $P=W/t$. Watts (J/s).'}
        ]},
        {formulas:[
          {tex:'KE = \\tfrac{1}{2}mv^2', name:'Kinetic energy', vars:[['m','mass (kg)'],['v','speed (m/s)']]},
          {tex:'PE = mgh', name:'Gravitational potential energy', vars:[['m','mass'],['g','9.8 m/s²'],['h','height above chosen zero level']]},
          {tex:'W = Fd\\cos\\theta', name:'Work done by constant force', vars:[['F','force'],['d','displacement'],['\\theta','angle between them']], note:'Force perpendicular to motion does ZERO work.'},
          {tex:'P = \\frac{W}{t}', name:'Power', vars:[['W','work/energy (J)'],['t','time (s)']]}
        ]},
        {derive:{title:'Conservation of mechanical energy (falling object)', steps:[
          {do:'Energy cannot be created or destroyed — only transformed (First Law of thermodynamics foundation).', why:'Empirical principle validated in every experiment ever performed.'},
          {do:'While falling: height decreases ⇒ PE decreases by $mg\\Delta h$.', why:'PE = mgh, and h is shrinking.'},
          {do:'Speed increases from u to v ⇒ KE increases by $\\tfrac12 m v^2 - \\tfrac12 m u^2$.', why:'Definition of KE change.'},
          {do:'Loss of PE = Gain of KE: $mg(h_1-h_2) = \\tfrac12 m(v^2-u^2)$.', why:'Total (PE+KE) stays constant when only gravity acts (no air resistance).'}
        ]}},
        {example:{title:'Dropping a 2 kg book from 5 m',
          given:['m = 2 kg','h = 5 m','starts from rest','ignore air resistance'],
          concept:'All PE at top converts to KE just before landing.',
          solution:['Initial PE $= mgh = 2\\times9.8\\times5 = 98$ J','Final KE = 98 J','$98 = \\tfrac12(2)v^2 \\Rightarrow v^2 = 98 \\Rightarrow v = \\sqrt{98}$'],
          answer:'v ≈ 9.9 m/s',
          interp:'Matches free-fall from rest: $v=\\sqrt{2gh}=\\sqrt{98}$ — energy conservation reproduces kinematics.'
        }},
        {sim:'energy'},
        {mistakes:['Doubling speed thinking energy doubles — it QUADRUPLES (v²).','Counting work when force ⊥ motion (zero!) — e.g. carrying a bag horizontally.','Choosing different "height = 0" levels mid-solution — pick one datum and stay consistent.','Confusing energy (J) with power (W).']},
        {quiz:['q-e1','q-e2','q-e3','q-e4']},
        {revise:['$KE=\\tfrac12mv^2$, $PE=mgh$, $W=Fd\\cos\\theta$, $P=W/t$.','Energy transforms but total stays fixed (no losses).','⊥ force ⇒ zero work.','Speed squared in KE — drive slower.']}
      ]}
    ]
  },
  {
    id:'l2.momentum', title:'Momentum & Collisions', icon:'🎱', tagline:'Mass in motion — and why it\'s conserved.', mins:18,
    lessons:[
      { id:'l2.momentum.basics', title:'Momentum, Impulse & Crashes', mins:18, content:[
        {why:{q:'Why do cars have crumple zones and airbags?', p:'During a crash your momentum must reach zero. Impulse = force × time is fixed, so stretching the collision TIME slashes the peak FORCE on you. Same momentum change, survivable force.'}},
        {formulas:[
          {tex:'p = mv', name:'Linear momentum', vars:[['p','momentum (kg·m/s), vector'],['m','mass'],['v','velocity']], note:'Direction matters: +10 and −10 kg·m/s cancel.'},
          {tex:'\\Delta p = F\\Delta t', name:'Impulse–momentum theorem', vars:[['\\Delta p','change in momentum'],['F','average force during contact'],['\\Delta t','contact time']]}
        ]},
        {p:'**Conservation:** in any collision (no external push), total momentum before = total momentum after. This single rule cracks every collision problem.'},
        {example:{title:'Trolley collision',
          given:['2 kg trolley at 3 m/s hits stationary 1 kg trolley','they stick together'],
          concept:'Perfectly inelastic collision — conserve momentum, then divide combined mass.',
          solution:['Before: $p = 2\\times3 + 1\\times0 = 6$ kg·m/s','After: same total, $6 = (2+1)v$','$v = 2$ m/s'],
          answer:'Both move at 2 m/s together',
          interp:'Momentum survived perfectly, but kinetic energy dropped ($\\tfrac12\\cdot2\\cdot9 = 9$ J → 6 J): the missing 3 J went into deformation and heat.'
        }},
        {sim:'collision'},
        {mistakes:['Adding momenta without signs/directions.','Expecting KE conservation in sticking collisions — only MOMENTUM is always conserved.','Forgetting the second object may be initially at rest (v=0 contributes nothing but still adds mass later).']},
        {quiz:['q-p1','q-p2','q-p3']},
        {revise:['$p=mv$ (vector).','Impulse $=F\\Delta t=\\Delta p$ — stretch time to cut force.','Momentum conserved in ALL collisions.','Sticking collisions lose KE, never p.']}
      ]}
    ]
  },
  {
    id:'l2.gravity', title:'Gravitation', icon:'🌍', tagline:'Weight, g, and why astronauts float.', mins:16,
    lessons:[
      { id:'l2.gravity.weight', title:'Weight, Free Fall & Orbits', mins:16, content:[
        {why:{q:'Are astronauts in the ISS "weightless" because there is no gravity?', p:'No! At 400 km altitude gravity is ~89% as strong as on the surface. They float because they are FALLING around Earth continuously — orbiting IS perpetual free fall with sideways speed.'}},
        {formulas:[
          {tex:'W = mg', name:'Weight', vars:[['W','weight force (N)'],['g','gravitational field strength ≈ 9.8 m/s² on Earth'],['m','mass (kg)']], note:'Mass never changes anywhere; weight depends on local g.'},
          {tex:'v_{orbit} = \\sqrt{\\frac{GM}{r}}', name:'Orbital speed preview', vars:[['G','universal gravitation constant'],['M','planet mass'],['r','orbit radius']], note:'Full derivation at Level 3 — see the simulation below for intuition.'}
        ]},
        {example:{title:'Your weight on the Moon',
          given:['Mass 60 kg','Moon g ≈ 1.6 m/s²'],
          concept:'Weight = mg with LOCAL g; mass unchanged.',
          solution:['Earth: $W = 60\\times9.8 = 588$ N','Moon: $W = 60\\times1.6 = 96$ N'],
          answer:'588 N on Earth, 96 N on Moon',
          interp:'You would feel light but your inertia (resistance to pushing) would be identical — mass is the true "amount of stuff".'
        }},
        {sim:'orbit3d'},
        {mistakes:['Using weight (N) where mass (kg) belongs in $F=ma$.','Saying "g = 9.8 kg" — g is acceleration (m/s²), not mass.','Believing zero-g environments mean zero gravity.']},
        {quiz:['q-g1','q-g2']},
        {revise:['Weight $=mg$ varies; mass invariant.','Free fall: all objects accelerate equally at g (no air).','Orbit = continuous free fall + tangential speed.']}
      ]}
    ]
  },
  {
    id:'l2.heat', title:'Heat & Temperature', icon:'🔥', tagline:'They are NOT the same thing.', mins:15,
    lessons:[
      { id:'l2.heat.basics', title:'Heat vs Temperature vs Internal Energy', mins:15, content:[
        {why:{q:'Which holds more thermal energy: a cup of tea at 90°C or a bathtub at 40°C?', p:'The bathtub — far more molecules, each carrying energy. Temperature measures average molecular jiggliness; heat is energy IN TRANSIT. Confusing these ruins cooking, climate arguments and exam answers alike.'}},
        {def:[
          {term:'Temperature', text:'Measures the average kinetic energy of particles. Kelvin (K), °C also used.'},
          {term:'Heat (Q)', text:'Energy transferred because of a temperature difference. Flows hot → cold spontaneously. Joules.'},
          {term:'Internal energy', text:'TOTAL microscopic kinetic + potential energy of all particles in a body.'}
        ]},
        {formula:{tex:'Q = mc\\Delta T', name:'Heating equation', vars:[['Q','heat energy supplied (J)'],['m','mass (kg)'],['c','specific heat capacity (J/kg·K)'],['\\Delta T','temperature rise (K or °C)']], note:'Water\'s c = 4186 J/kg·K — unusually large, hence water cools slowly and moderates climates.'}},
        {example:{title:'Boiling water for tea',
          given:['1.5 kg water','from 20°C to 100°C'],
          concept:'$Q=mc\\Delta T$ with water\'s c.',
          solution:['$\\Delta T = 80$ K','$Q = 1.5\\times4186\\times80 = 502{,}320$ J'],
          answer:'≈ 500 kJ',
          interp:'A 2 kW kettle needs ~4 minutes: $t = Q/P = 502320/2000 ≈ 251$ s. Try timing yours!'
        }},
        {mistakes:['Saying "temperature flows" — HEAT flows; temperature is a state.','Using °C inside gas-law ratios — must use Kelvin ($K = °C+273.15$).','Assuming equal masses at different c absorb heat equally.']},
        {quiz:['q-h1','q-h2']},
        {revise:['Temperature = average particle KE.','Heat = energy in transit, hot→cold.','$Q=mc\\Delta T$; water\'s c is huge.','Kelvin = °C + 273.']}
      ]}
    ]
  },
  {
    id:'l2.waves', title:'Waves & Sound', icon:'🌊', tagline:'Energy that travels without carrying matter.', mins:18,
    lessons:[
      { id:'l2.waves.basics', title:'Anatomy of a Wave & Sound', mins:18, content:[
        {why:{q:'You see lightning before hearing thunder — why?', p:'Light races at $3\\times10^8$ m/s; sound crawls at ~340 m/s. The gap between flash and boom (~3 s per km) is a live physics experiment every storm performs.'}},
        {def:[
          {term:'Wave', text:'A travelling disturbance that transfers ENERGY without permanently transferring matter.'},
          {term:'Transverse wave', text:'Oscillation ⟂ propagation (light, string waves). Has crests/troughs.'},
          {term:'Longitudinal wave', text:'Oscillation ∥ propagation (sound in air). Compressions/rarefactions.'}
        ]},
        {svg:'<svg viewBox="0 0 480 140" style="width:100%;max-width:560px"><line x1="20" y1="70" x2="460" y2="70" stroke="var(--txt3)" stroke-width="1" stroke-dasharray="4 4"/><path d="M 20 70 Q 65 10 110 70 T 200 70 T 290 70 T 380 70 T 470 70" fill="none" stroke="#22d3ee" stroke-width="3"/><line x1="20" y1="18" x2="20" y2="122" stroke="var(--txt3)" stroke-width="1"/><line x1="110" y1="18" x2="110" y2="122" stroke="var(--txt3)" stroke-width="1"/><text x="48" y="135" fill="var(--txt)" font-size="12">λ (wavelength)</text><line x1="110" y1="30" x2="155" y2="30" stroke="#fbbf24" stroke-width="2"/><line x1="155" y1="30" x2="155" y2="70" stroke="#fbbf24" stroke-width="2"/><text x="162" y="45" fill="#fbbf24" font-size="12">amplitude</text></svg>'},
        {formula:{tex:'v = f\\lambda', name:'Wave equation', vars:[['v','wave speed (m/s)'],['f','frequency — cycles per second (Hz)'],['\\lambda','wavelength — distance per cycle (m)']], note:'True for ALL waves. Speed set by the medium; frequency by the source.'}},
        {def:[{term:'Sound', text:'Longitudinal mechanical wave needing a medium — faster in solids, silent in vacuum. Human range ≈ 20 Hz – 20 kHz.'}]},
        {example:{title:'Middle-C wavelength in air',
          given:['Frequency 256 Hz','Speed of sound 340 m/s'],
          concept:'Rearrange $v=f\\lambda$.',
          solution:['$\\lambda = v/f = 340/256$'],
          answer:'λ ≈ 1.33 m',
          interp:'Musical notes are literal wavelengths — a concert hall is shaped around them.'
        }},
        {sim:'wave'},
        {mistakes:['Thinking waves carry MATTER across the sea — a floating duck bobs in place.','Believing sound travels in space (movie explosions are lies).','Swapping f and λ roles in $v=f\\lambda$ when the medium fixes v, not f.']},
        {quiz:['q-w1','q-w2']},
        {revise:['Waves move energy, not matter.','Transverse ⟂; longitudinal ∥.','$v=f\\lambda$ everywhere.','Sound needs a medium; ~340 m/s in air.']}
      ]}
    ]
  },
  {
    id:'l2.elec', title:'Electricity Basics', icon:'🔌', tagline:'Charge, current, voltage — the water analogy.', mins:20,
    lessons:[
      { id:'l2.elec.circuits', title:'Circuits & Ohm\'s Law', mins:20, content:[
        {why:{q:'Why does the label say 6 A, 60 W — and should you care?', p:'Exceed a wire\'s rated current and it heats dangerously (fire risk). Ohm\'s law and power equations are literally safety equipment.'}},
        {def:[
          {term:'Charge (Q)', text:'Fundamental property: protons +, electrons −. Unit coulomb (C); electron charge $e=1.6\\times10^{-19}$ C.'},
          {term:'Current (I)', text:'Rate of charge flow: $I=Q/t$. Ampere. Conventional current points + → − (opposite to electrons).'},
          {term:'Voltage (V)', text:'Electrical "push" — energy per charge: $V=W/Q$. Volt.'},
          {term:'Resistance (R)', text:'Opposition to current: $R=V/I$. Ohm (Ω).'}
        ]},
        {formulas:[
          {tex:'V = IR', name:"Ohm's Law", vars:[['V','potential difference (V)'],['I','current (A)'],['R','resistance (Ω)']]},
          {tex:'P = VI = I^2R', name:'Electrical power', vars:[['P','power (W)']], note:'$I^2R$ explains why thin wires overheat: resistance converts electrical energy to heat.'}
        ]},
        {intuition:[
          {h:'Water analogy', p:'Voltage = water pressure difference; current = flow rate; resistance = narrowness of pipe. A battery is a pump maintaining pressure difference.'}
        ]},
        {example:{title:'Phone charger check',
          given:['Charger outputs 5 V','Phone draws 0.5 A'],
          concept:'Power drawn $P=VI$.',
          solution:['$P = 5\\times0.5 = 2.5$ W','Effective resistance $R=V/I = 5/0.5 = 10$ Ω'],
          answer:'2.5 W at 10 Ω',
          interp:'Fast chargers raise current (25 W ⇒ 5 A) rather than voltage, because heat scales with I².'
        }},
        {sim:'circuit'},
        {mistakes:['Ohming a non-ohmic device (bulb heats → R rises) with constant R assumptions.','Series/parallel confusion: series shares current, parallel shares voltage.','Touching mains "because it\'s only 230 V" — danger depends on CURRENT through the body; never test it.']},
        {quiz:['q-el1','q-el2','q-el3']},
        {revise:['$I=Q/t$; $V=W/Q$; $V=IR$.','$P=VI=I^2R$.','Series: same I; parallel: same V.','Heat in wires: $I^2R$ — respect amp ratings.']}
      ]}
    ]
  },
  {
    id:'l2.mag', title:'Magnetism Basics', icon:'🧲', tagline:'Invisible fields that move the world.', mins:15,
    lessons:[
      { id:'l2.mag.fields', title:'Magnets, Fields & Electromagnets', mins:15, content:[
        {why:{q:'How does a compass needle know where north is?', p:'Earth itself is a giant magnet with a field sweeping through your pocket. Compass needles align with magnetic field lines — the same physics that spins motors in everything from fans to electric cars.'}},
        {def:[
          {term:'Magnetic pole', text:'Region of strongest attraction. Always paired N+S — cutting a magnet yields smaller magnets, never lone poles.'},
          {term:'Magnetic field (B)', text:'Region where magnetic forces act; drawn as lines exiting N, entering S. Unit tesla (T).'},
          {term:'Electromagnet', text:'Coil with current acting as magnet; strength ∝ current × turns; switchable, unlike permanent magnets.'}
        ]},
        {p:'Key rule — moving charges create magnetic fields (Ørsted, 1820), and magnetic fields exert forces on moving charges (Lorentz). Electricity and magnetism are two faces of one phenomenon — electromagnetism.'},
        {sim:'bfield'},
        {mistakes:['Believing field lines physically exist — they are a visualisation of direction/strength.','Assuming a static charge creates a magnetic field — only MOVING charges do.','Monopole hunting: isolated N or S poles don\'t exist classically.']},
        {quiz:['q-mag1','q-mag2']},
        {revise:['Like poles repel; unlike attract.','Field: out of N, into S.','Current ⇒ magnetic field (electromagnets).','Moving charge in B feels force — motor principle.']}
      ]}
    ]
  },
  {
    id:'l2.light', title:'Light Basics', icon:'💡', tagline:'Reflection, refraction and the fastest thing there is.', mins:16,
    lessons:[
      { id:'l2.light.rays', title:'Shadows, Mirrors & Bending Light', mins:16, content:[
        {why:{q:'Why does a straw look broken in a glass of water?', p:'Light bends when crossing from water to air because it changes speed. Your brain assumes light travels straight, so it misjudges positions — the same reason pools look shallower than they are.'}},
        {def:[
          {term:'Light year confusion-buster', text:'Light travels $3\\times10^{8}$ m/s — sunlight takes 8.3 minutes to reach us: you always see the Sun slightly in the past.'},
          {term:'Law of reflection', text:'Angle of incidence = angle of reflection (measured from the normal).'},
          {term:'Refraction', text:'Light bends entering a new medium due to speed change; towards normal entering denser media.'}
        ]},
        {example:{title:'How far is the Sun?',
          given:['Light travel time 500 s','c = 3×10⁸ m/s'],
          concept:'distance = speed × time.',
          solution:['$d = 3\\times10^{8} \\times 500 = 1.5\\times10^{11}$ m'],
          answer:'1.5×10¹¹ m (150 million km)',
          interp:'This distance defines the astronomical unit (AU) — the ruler of our solar system.'
        }},
        {mistakes:['Measuring reflection angles from the mirror surface instead of the normal.','Thinking colour lives IN objects — objects reflect certain wavelengths, absorbing the rest.','Believing we see objects instantaneously — finite light speed always delays vision slightly.']},
        {quiz:['q-li1','q-li2']},
        {revise:['c = 3×10⁸ m/s; Sunlight ≈ 8 min.','i = r at mirrors.','Refraction = speed-change bending.','Colours = reflected wavelengths.']}
      ]}
    ]
  }
]});
