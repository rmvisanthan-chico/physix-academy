/* ============================================================
   PhysiX Academy — NCERT Class 10 Physics (Science)
   4 core chapters: Light, Human Eye, Electricity, Magnetic Effects
   Rendered by blocks.js — same schema as CURRICULUM
   ============================================================ */
'use strict';

CURRICULUM.push({
  id:'ncert10', name:'NCERT Class 10 — Physics', tag:'NCERT 10', icon:'📘', color:'#0ea5e9',
  desc:'Complete Class 10 Physics from the NCERT Science textbook — exam-ready intuition, derivations, ray diagrams, numericals and PYQ-style practice. Straight from the textbook, explained like a teacher.',
  chapters:[

  /* ---------------- Chapter 1: Light — Reflection and Refraction ---------------- */
  {
    id:'ncert10.light', title:'Light — Reflection and Refraction', icon:'🔦', tagline:'Mirrors, lenses and why a straw looks bent.', mins:55,
    lessons:[
      { id:'ncert10.light.mirrors', title:'Reflection by Spherical Mirrors', mins:28, content:[
        {why:{q:'Why does your image in a spoon look upside-down?', p:'A spoon is a curved mirror — concave on one side, convex on the other. NCERT starts with exactly this: plane mirrors vs spherical mirrors (concave/convex), pole, centre of curvature (C), radius (R), principal axis and focus (F). The spoon experiment is the whole chapter in your kitchen.'}},
        {def:[
          {term:'Pole (P)', text:'Mid-point of the reflecting surface of a spherical mirror.'},
          {term:'Centre of curvature (C)', text:'Centre of the sphere of which the mirror is a part; R = distance PC.'},
          {term:'Principal focus (F)', text:'Point where rays parallel to principal axis meet (concave) or appear to come from (convex) after reflection. F is mid-way between P and C: f = R/2.'},
          {term:'Focal length (f)', text:'Distance PF. Sign convention (New Cartesian): distances in front of mirror (real side) negative if you follow NCERT strictly — we keep light travelling left→right, so we state signs explicitly in every formula.'}
        ]},
        {table:{head:['Sign convention (NCERT — New Cartesian)','Rule'], rows:[
          ['Incident light taken left → right','—'],
          ['Distances measured from pole (P)','—'],
          ['In front of mirror (real side)','negative'],
          ['Behind the mirror (virtual side)','positive'],
          ['Height above principal axis','positive'],
          ['Height below principal axis','negative']
        ]}},
        {h:'Ray diagrams — NCERT 4 rules'},
        {ul:[
          'Ray parallel to principal axis → after reflection passes through F (concave) or appears to come from F (convex).',
          'Ray through C (via centre) → reflects back on itself (normal incidence).',
          'Ray through F → after reflection goes parallel to principal axis (reversibility).',
          'Ray striking pole → reflects with i = r (symmetry about principal axis).'
        ]},
        {svg:'<svg viewBox="0 0 460 160" style="width:100%;max-width:560px"><line x1="20" y1="80" x2="440" y2="80" stroke="var(--txt3)" stroke-width="1"/><path d="M 80 20 A 110 110 0 0 0 80 140" fill="none" stroke="#38bdf8" stroke-width="3"/><circle cx="80" cy="80" r="3" fill="#f8fafc"/><text x="74" y="98" fill="var(--txt2)" font-size="11">P</text><circle cx="140" cy="80" r="3" fill="#fbbf24"/><text x="134" y="98" fill="var(--txt2)" font-size="11">F</text><circle cx="200" cy="80" r="3" fill="#22d3ee"/><text x="194" y="98" fill="var(--txt2)" font-size="11">C</text><line x1="140" y1="25" x2="80" y2="80" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/><text x="88" y="28" fill="var(--txt2)" font-size="10">f = R/2</text><text x="30" y="22" fill="#38bdf8" font-size="11">concave</text></svg>'},
        {formula:{tex:'\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}', name:'Mirror equation', vars:[['f','focal length (m)'],['u','object distance from P (sign!)'],['v','image distance from P (sign!)']], note:'Concave f negative, convex f positive under NCERT signs. Magnification m = h′/h = −v/u.'}},
        {example:{title:'NCERT Ex 10.1 — concave mirror, object at 25 cm, f = −15 cm',
          given:['Concave mirror: f = −15 cm','Object distance u = −25 cm'],
          concept:'Mirror equation → v, then m.',
          solution:['$1/v = 1/f − 1/u = −1/15 + 1/25 = (−5+3)/75 = −2/75$','$v = −37.5$ cm (in front → real, inverted)','$m = −v/u = −(−37.5)/(−25) = −1.5$'],
          answer:'Image 37.5 cm in front, inverted, enlarged 1.5×',
          interp:'Between F and C gives enlarged real image — exactly what makes shaving mirrors work.'
        }},
        {mistakes:['Forgetting sign of f: concave is NEGATIVE in NCERT.','Measuring u, v from C instead of P.','Thinking convex mirrors can make real images (they cannot with real objects).']},
        {revise:['F is mid-way: f = R/2.','Concave f < 0, convex f > 0.','1/f = 1/v + 1/u; m = −v/u.','Convex always: virtual, erect, diminished (wide view → rear-view mirror).']}
      ]},
      { id:'ncert10.light.refraction', title:'Refraction, Snell and Lenses', mins:27, content:[
        {why:{q:'Why does a lens make your textbook look bigger?', p:'A convex lens bends light towards its focus — refraction. NCERT defines refractive index n = c/v, states Snell’s law, then does lens ray diagrams and the lens formula with the same sign convention as mirrors (but with two foci).'}},
        {formula:{tex:'n = \\frac{c}{v}', name:'Refractive index', vars:[['c','speed of light in vacuum 3×10⁸ m/s'],['v','speed of light in medium']], note:'Diamond n≈2.42 > glass 1.52 > water 1.33 > air 1.00.'}},
        {formula:{tex:'n_{21} = \\frac{n_2}{n_1} = \\frac{\\sin i}{\\sin r}', name:"Snell's law", vars:[['i','angle of incidence (from normal)'],['r','angle of refraction']], note:'Light bends towards normal when entering denser medium (n₂ > n₁).'}},
        {h:'Lenses — NCERT sign tweak'},
        {table:{head:['Lens','f sign (NCERT)','Image nature by object position'], rows:[
          ['Convex (converging)','f positive','Beyond 2F → diminished real; at F → at infinity; inside F → virtual erect magnified'],
          ['Concave (diverging)','f negative','Always virtual, erect, diminished (like door peephole)']
        ]}},
        {formula:{tex:'\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}', name:'Lens formula', vars:[['f','focal length'],['u','object distance (negative if on incident side)'],['v','image distance (+ if opposite side, real)']], note:'Power P = 1/f (metres) in dioptres (D). Convex P > 0, concave P < 0. 1 D = 1 m⁻¹.'}},
        {example:{title:'Power of combination — NCERT Q',
          given:['Convex lens f₁ = +20 cm (P₁=+5 D)','Concave lens f₂ = −25 cm (P₂=−4 D) in contact'],
          concept:'Powers add in contact: P = P₁+P₂; then f = 1/P.',
          solution:['$P = 5 + (−4) = +1$ D','$f = 1/P = 1$ m = 100 cm convex'],
          answer:'+1 D, 100 cm focal length (still converging but weaker)',
          interp:'This is how opticians stack trial lenses to get any power.'
        }},
        {sim:'lens'},
        {mistakes:['Using mirror sign inside lens formula — lens v sign is OPPOSITE side positive.','Forgetting P sign: concave power negative.','Applying n = sin i/sin r when i, r not measured from normal.']},
        {quiz:['q-nc-light1','q-nc-light2']},
        {revise:['n = c/v; Snell: n₂/n₁ = sin i/sin r.','Lens: 1/f = 1/v − 1/u; P = 1/f (D).','Convex f > 0, concave f < 0; powers add in contact.']}
      ]}
    ]
  },

  /* ---------------- Chapter 2: Human Eye and Colourful World ---------------- */
  {
    id:'ncert10.eye', title:'The Human Eye and the Colourful World', icon:'👁️', tagline:'Why you see, why sky is blue, why stars twinkle.', mins:40,
    lessons:[
      { id:'ncert10.eye.defects', title:'Eye, Defects and Corrections', mins:20, content:[
        {why:{q:'Why do your grandparents hold the newspaper far away?', p:'Their near point receded — presbyopia/hypermetropia. NCERT builds the eye model (cornea → iris → pupil → lens → retina), least distance of distinct vision (25 cm), and the three defects with lens corrections.'}},
        {def:[
          {term:'Accommodation', text:'Ciliary muscles change eye-lens curvature to focus near/far; far point at infinity, near point ≈25 cm (adult).'},
          {term:'Myopia (near-sightedness)', text:'Eye too long / lens too converging — distant image forms BEFORE retina. Correction: concave (diverging) lens, P negative.'},
          {term:'Hypermetropia (far-sightedness)', text:'Eye too short / lens too weak — near image forms BEHIND retina. Correction: convex (converging) lens, P positive.'},
          {term:'Presbyopia', text:'Age-related loss of accommodation — bifocal needed (upper concave for myopia + lower convex for near).'}
        ]},
        {svg:'<svg viewBox="0 0 520 130" style="width:100%;max-width:620px"><text x="10" y="18" fill="var(--txt)" font-size="12">Myopia</text><path d="M 30 45 L 190 45" stroke="#38bdf8" stroke-width="2"/><path d="M 30 55 L 190 55" stroke="#38bdf8" stroke-width="2"/><line x1="190" y1="38" x2="190" y2="62" stroke="var(--txt3)"/><text x="175" y="78" fill="var(--txt2)" font-size="10">retina</text><circle cx="150" cy="50" r="4" fill="#f472b6"/><text x="122" y="28" fill="#f472b6" font-size="10">image before retina</text><text x="280" y="18" fill="var(--txt)" font-size="12">Hypermetropia</text><path d="M 300 45 L 460 45" stroke="#fbbf24" stroke-width="2"/><path d="M 300 55 L 460 55" stroke="#fbbf24" stroke-width="2"/><line x1="460" y1="38" x2="460" y2="62" stroke="var(--txt3)"/><circle cx="480" cy="50" r="4" fill="#f472b6"/><text x="430" y="28" fill="#f472b6" font-size="10">image behind retina</text></svg>'},
        {formula:{tex:'P = \\frac{1}{f\\,(\\text{m})}\\;\\text{dioptres}', name:'Lens power for spectacles', vars:[['P','power in D']], note:'Myopia: P example −2.0 D (f = −0.5 m); hypermetropia: +2.5 D (f = +0.40 m).'}},
        {example:{title:'NCERT — far point 80 cm, find power',
          given:['Myopic far point at 80 cm (wants infinity focused at retina with glasses)','Need virtual image at 80 cm for distant object at infinity'],
          concept:'Lens must make u = ∞ appear at v = −80 cm (same side, virtual) under lens signs (incident side negative? NCERT: u = −∞, v = −80 cm, f negative).',
          solution:['Lens formula: $1/f = 1/v − 1/u = −1/0.8 − 0 = −1.25$ D','$P = −1.25$ D'],
          answer:'Concave lens, −1.25 D',
          interp:'Stronger myopia → larger |P| (closer far point → more diverging needed).'
        }},
        {mistakes:['Mixing myopia/hypermetropia corrections (concave vs convex).','Forgetting presbyopia needs bifocal, not single power.','Using f in cm inside P = 1/f — convert to metres first.']},
        {revise:['Myopia: concave (−); hypermetropia: convex (+).','P = 1/f(m) D; check sign.','Least distance 25 cm; far point ∞ for normal eye.']}
      ]},
      { id:'ncert10.eye.atmosphere', title:'Atmosphere: Scattering, Tyndall, Sunset, Twinkling', mins:20, content:[
        {why:{q:'Why is the sky blue and the sunset red?', p:'Scattering ∝ 1/λ⁴ (Rayleigh). Short blue wavelengths scatter ~16× more than red. At noon you see scattered blue; at sunset light cuts sideways through more air, blue is scattered away and red survives to your eyes.'}},
        {def:[
          {term:'Tyndall effect', text:'Colloidal particles scatter light making the beam visible (forest light rays, torch in fog).'},
          {term:'Atmospheric refraction', text:'Gradual bending of starlight in Earth’s atmosphere → apparent shift; causes twinkling (stellar point source) vs steady planets (extended source).'},
          {term:'Dispersion', text:'Prism splits white light into VIBGYOR because n depends on λ — violet bends most.'}
        ]},
        {ul:[
          'Why sky blue: Rayleigh scattering of air molecules.',
          'Why clouds white: Mie scattering by large water droplets (scatters all λ equally).',
          'Why sun oval at horizon, stars twinkle, planets do not — all atmospheric refraction.'
        ]},
        {formula:{tex:'I_{scattered} \\propto \\frac{1}{\\lambda^{4}}', name:'Rayleigh scattering intensity', vars:[['\\lambda','wavelength']], note:'λ_blue≈450 nm, λ_red≈650 nm → (650/450)⁴≈4.3 in amplitude ratio; intensity ratio even stronger with eye sensitivity.'}},
        {example:{title:'Order the scattering strength',
          given:['Violet 400 nm, blue 450 nm, red 650 nm'],
          concept:'Shorter λ → far more scattering.',
          solution:['$I_{violet}/I_{red} = (650/400)^4 ≈ 7.0$','$I_{blue}/I_{red} ≈ 4.3$'],
          answer:'Violet > blue >> red',
          interp:'Eyes are less sensitive to violet, so dominant scattered colour we perceive is blue.'
        }},
        {mistakes:['Saying dust causes blue sky — it is air molecules (Rayleigh), not dust.','Confusing scattering (random direction) with refraction (directional bending).','Thinking dispersion only happens in prisms — rainbow is natural dispersion + TIR in droplets.']},
        {quiz:['q-nc-eye1']},
        {revise:['Scattering ∝ 1/λ⁴ → blue >> red.','Tyndall = visible beam in colloid.','Twinkling = atmospheric refraction; planets steady (extended disc).','Sunset red: long path → blue scattered out.']}
      ]}
    ]
  },

  /* ---------------- Chapter 3: Electricity ---------------- */
  {
    id:'ncert10.elec', title:'Electricity', icon:'⚡', tagline:"Ohm, Joule, and why your bill is in kilowatt-hours.", mins:55,
    lessons:[
      { id:'ncert10.elec.ohm', title:"Ohm's Law, Resistance and Factors", mins:28, content:[
        {why:{q:'Why does a longer wire glow dimmer on the same battery?', p:'Resistance R ∝ length / area. Double length (more collisions) → double R → half the current (I = V/R). Thicker wire → less R → more current. This single proportionality runs heaters, fuses and house wiring.'}},
        {def:[
          {term:'Electric current (I)', text:'Charge flow per second: I = Q/t. Ampere (A). Direction = flow of positive charge.'},
          {term:'Potential difference (V)', text:'Work per charge between two points: V = W/Q. Volt (V = J/C).'},
          {term:'Resistance (R)', text:'Opposition to current. Ohm (Ω). Ohm’s law: at constant temperature, V ∝ I.'}
        ]},
        {formulas:[
          {tex:'V = IR', name:"Ohm's law", vars:[['V','voltage (V)'],['I','current (A)'],['R','resistance (Ω)']]},
          {tex:'R = \\rho\\frac{l}{A}', name:'Resistance geometry', vars:[['\\rho','resistivity (Ω·m) — material property'],['l','length of conductor'],['A','cross-sectional area']], note:'ρ: copper 1.68×10⁻⁸, nichrome 110×10⁻⁸ (heater material → high ρ).'},
          {tex:'R_s = R_1+R_2+\\cdots,\\;\\; \\frac{1}{R_p}=\\frac{1}{R_1}+\\frac{1}{R_2}+\\cdots', name:'Series / parallel', vars:[], note:'Series: same I, voltages add. Parallel: same V, currents add.'}
        ]},
        {example:{title:'NCERT — wire doubled in length, then halved in area',
          given:['Original R = 10 Ω'],
          concept:'R ∝ l/A — treat scaling stepwise.',
          solution:['Double length: $R_1 = 20$ Ω','Then halve area (A→A/2): $R_2 = R_1 × 2 = 40$ Ω'],
          answer:'40 Ω (4× original)',
          interp:'Stretching a wire (constant volume) also thins it → R ∝ l²: double length → 4× R. UPSC loves this trap.'
        }},
        {sim:'circuit'},
        {mistakes:['Writing V = IR without checking temperature constant (ohmic only for constant T).','Parallel formula upside-down: 1/Rp not Rp.','Using l in cm while ρ in Ω·m — convert consistently to metres.']},
        {revise:['I = Q/t; V = W/Q; V = IR.','R = ρl/A; series adds, parallel reciprocals add.','High-ρ materials (nichrome, manganin) for heaters/resistors.']}
      ]},
      { id:'ncert10.elec.heat', title:'Heating, Power and the Electricity Bill', mins:27, content:[
        {why:{q:'Why does your electricity bill count kilowatt-hours, not joules?', p:'Joules are too small for a city. 1 kWh = 3.6×10⁶ J — a 100 W bulb for 10 hours. That unit directly converts to rupees.'}},
        {formulas:[
          {tex:'H = I^{2}Rt = VIt = \\frac{V^{2}}{R}t', name:'Joule heating', vars:[['H','heat produced (J)'],['t','time (s)']], note:'P = I²R for fixed I; P = V²/R for fixed V — choose form that matches what is constant.'},
          {tex:'P = VI = I^{2}R = V^{2}/R', name:'Electric power', vars:[['P','power in watts (J/s)']]},
          {tex:'E = Pt,\\;\\; 1\\,\\text{kWh}=3.6\\times10^{6}\\,\\text{J}', name:'Commercial energy', vars:[], note:'Bill: units = kWh; cost = units × rate (₹/kWh).'}
        ]},
        {example:{title:'NCERT — 2 kW heater on 220 V',
          given:['Heater 2 kW, 220 V','Used 3 h daily'],
          concept:'Find I, R, daily and monthly bill.',
          solution:['$I = P/V = 2000/220 ≈ 9.1$ A','$R = V/I ≈ 24$ Ω','Daily $E = 2\\,\\text{kW}×3\\,\\text{h}=6$ kWh','Monthly (30 d) = 180 kWh; at ₹7/kWh → ₹1260'],
          answer:'≈9 A, 24 Ω, 6 kWh/day, 180 kWh/month',
          interp:'Fuse rating must exceed 9 A — a 5 A fuse would blow instantly.'
        }},
        {h:'House wiring — NCERT essentials'},
        {ul:[
          'Live (red/brown), neutral (black/blue), earth (green) → earth pin thicker & longer, connected to metal body of appliances.',
          'Short circuit (R→0) → huge I²R; overloading (too many appliances) → same; fuse/MCB breaks circuit.',
          'Power rating on devices: e.g. 220 V, 60 W bulb → R = V²/P = 807 Ω; at 110 V (US) it glows dimmer: P = V²/R = 15 W.'
        ]},
        {mistakes:['Choosing wrong power form (I²R vs V²/R) when V, not I, is fixed — household V is fixed.','Forgetting to convert hours→seconds for joules, but keeping hours for kWh.','Earth wire optional — it is the life-saver for metal appliances.']},
        {quiz:['q-nc-elec1','q-nc-elec2']},
        {revise:['H = I²Rt; P = VI.','Fixed V → use V²/R; fixed I → use I²R.','1 kWh = 3.6 MJ; units × rate = bill.','Live/neutral/earth; fuse protects from short/overload.']}
      ]}
    ]
  },

  /* ---------------- Chapter 4: Magnetic Effects of Electric Current ---------------- */
  {
    id:'ncert10.mag', title:'Magnetic Effects of Electric Current', icon:'🧲', tagline:'Oersted to motors to induced curiosity.', mins:55,
    lessons:[
      { id:'ncert10.mag.field', title:'Magnetic Field, Oersted & Field Lines', mins:18, content:[
        {why:{q:'Why does a compass needle flick when you switch on a current nearby?', p:"Oersted (1820): a current-carrying wire creates a magnetic field around it — electricity and magnetism are one. NCERT starts with field lines (NCERT Figs 13.1–13.3), right-hand thumb rule, and field due to straight wire, loop and solenoid."}},
        {def:[
          {term:'Magnetic field (B)', text:'Region where magnetic force acts; direction = direction N pole of compass points; unit tesla (T).'},
          {term:'Field lines', text:'Closed curves: emerge at N, enter at S of magnet; inside magnet S→N. Closer lines = stronger B. Two lines never intersect.'},
          {term:'Right-hand thumb rule', text:'Thumb = current, curled fingers = field circles. Grasp wire with right hand.'}
        ]},
        {h:'Field patterns — NCERT must-knows'},
        {table:{head:['Source','Field pattern','Strength rule'], rows:[
          ['Straight wire','Concentric circles around wire','B ∝ I / r (closer & larger I → stronger)'],
          ['Circular loop','Field lines crowd at centre (loop acts as magnet: one face N, one S)','B ∝ I / radius at centre'],
          ['Solenoid (many loops)','Uniform parallel lines inside (like bar magnet); field outside weak','B ∝ nI (n = turns per metre) inside']
        ]}},
        {p:'Solenoid with soft iron core = electromagnet (temporary, switchable) vs bar magnet (permanent).'},
        {sim:'bfield'},
        {mistakes:['Drawing field lines crossing — they cannot (that would mean two directions at one point).','Left-hand vs right-hand mix-up: right hand = field direction; left hand = force on conductor (Fleming).','Forgetting current direction reverses all arrows.']},
        {revise:['Field lines N→S outside, S→N inside; never cross.','Right thumb = current → fingers = B circles.','B ∝ I/r (wire), ∝ I/r at loop centre, ∝ nI in solenoid.']}
      ]},
      { id:'ncert10.mag.force', title:'Force on a Conductor — Motor', mins:19, content:[
        {why:{q:'How does a fan start spinning at the flick of a switch?', p:'A current in a magnetic field feels a force (Ampère–Lorentz). Two sides of a rectangular coil feel opposite forces → couple → rotation. Add a split-ring commutator to keep it spinning one way — that is the electric motor.'}},
        {formula:{tex:'F = BIl\\sin\\theta', name:'Force on current-carrying conductor', vars:[['B','magnetic field (T)'],['I','current (A)'],['l','length in field (m)'],['\\theta','angle between current and B']], note:'Maximum when I ⟂ B (θ=90°). Direction by Fleming’s LEFT-hand rule.'}},
        {def:[
          {term:"Fleming's left hand", text:'Stretch thumb (force/motion), forefinger (field B, N→S), middle finger (current I) mutually ⊥. Thumb shows force; useful for motor.'},
          {term:'Electric motor principle', text:'Current loop in B experiences torque → rotation. Commutator swaps current every half-turn to keep torque same sense.'}
        ]},
        {svg:'<svg viewBox="0 0 420 120" style="width:100%;max-width:520px"><rect x="30" y="25" width="170" height="80" fill="none" stroke="#22d3ee" stroke-width="2"/><line x1="115" y1="25" x2="115" y2="105" stroke="#fbbf24" stroke-width="3"/><circle cx="70" cy="65" r="8" fill="#f472b6"/><text x="62" y="70" fill="#fff" font-size="16">•</text><circle cx="160" cy="65" r="8" fill="#38bdf8"/><text x="153" y="70" fill="#fff" font-size="16">×</text><text x="40" y="92" fill="var(--txt2)" font-size="11">Front wire: force up</text><text x="130" y="92" fill="var(--txt2)" font-size="11">Back wire: force down</text><text x="210" y="30" fill="var(--txt)" font-size="12">→ rotation (motor)</text></svg>'},
        {formula:{tex:'\\tau = NBI A \\sin\\theta', name:'Torque on coil (extension)', vars:[['N','number of turns'],['A','area of coil']], note:'Maximum when coil plane ∥ B; NCERT qualitative: force couple → rotation.'}},
        {mistakes:['Left vs right hand swap: LEFT = motor (force), RIGHT = generator (induced current).','Forgetting split ring: without it coil oscillates, not rotates continuously.','Thinking B alone causes rotation — you need CURRENT in B.']},
        {revise:['F = BIl sinθ; max at ⊥.','Left hand: Force (thumb), Field (forefinger), Current (middle).','Motor = current in B → torque; commutator maintains direction.']}
      ]},
      { id:'ncert10.mag.induction', title:'Induction, Generator & Domestic Wiring', mins:18, content:[
        {why:{q:'How does a bicycle dynamo light up without a battery?', p:'Moving a magnet through a coil (or coil through magnet) induces current — electromagnetic induction (Faraday). NCERT demo: galvanometer flicks when magnet moves near coil. That principle reversed gives the generator: mechanical rotation → electricity.'}},
        {def:[
          {term:'Electromagnetic induction', text:'Changing magnetic flux through a coil induces EMF/current. Faster change → larger induced current.'},
          {term:"Fleming's right hand (generator)", text:'Thumb = motion, forefinger = B, middle = induced current. Use for generator/dynamo.'},
          {term:'AC vs DC', text:'AC reverses direction periodically (house supply, 50 Hz in India); DC flows one way (cells, batteries). AC advantage: easy voltage transformation via transformers.'}
        ]},
        {h:'Electric generator — NCERT construction (Fig 13.19)'},
        {ul:[
          'Rectangular coil (armature) rotated in magnetic field between poles.',
          'Two slip rings (AC) or split rings (DC) + brushes tap current out.',
          'Fleming’s right hand gives instantaneous current direction as coil cuts field.'
        ]},
        {h:'Domestic circuit — NCERT wiring'},
        {table:{head:['Wire','Colour (new)','Function'], rows:[
          ['Live (L)','Brown/Red','Brings current from supply; 220 V wrt neutral; switch always on live'],
          ['Neutral (N)','Light blue/Black','Return path to supply; near 0 V'],
          ['Earth (E)','Green/Yellow','Safety: connects metal body to ground; prevents shock if live leaks to body']
        ]}},
        {p:'Short circuit: live touches neutral → R≈0 → huge current; overloading: too many appliances → aggregate current exceeds rating → both trip MCB/fuse (Joule heating melts fuse wire).'},
        {sim:'induction'},
        {mistakes:['Right vs left hand again: RIGHT = generator (induced current).','Calling earth wire optional — it is mandatory for metal appliances.','Thinking AC and DC are distinguishable by magnitude alone — difference is DIRECTION reversal over time.']},
        {quiz:['q-nc-mag1','q-nc-mag2']},
        {revise:['Induction: changing flux → EMF.','Generator = mechanical → electrical (right hand).','Live/neutral/earth; fuse on live; AC 50 Hz; slip vs split rings.']}
      ]}
    ]
  }

]});
