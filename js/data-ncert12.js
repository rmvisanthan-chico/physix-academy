/* PhysiX Academy — NCERT Class 12 Physics (14 chapters) */
'use strict';
CURRICULUM.push({
  id:'ncert12', name:'NCERT Class 12 — Physics', tag:'NCERT 12', icon:'🎓', color:'#ec4899',
  desc:'Complete Class 12 Physics — 14 chapters from Electrostatics to Electronic Devices. Board + JEE/NEET bridge with derivations, graphs and previous-year focus.',
  chapters:[
  {id:'ncert12.electro',title:'Electric Charges and Fields',icon:'⚡',tagline:'Unit I — Electrostatics',mins:28,lessons:[
    {id:'ncert12.electro.coulomb',title:'Coulomb, Field & Gauss',mins:28,content:[
      {why:{q:'Why does a charged balloon stick to a wall?',p:'Induction + Coulomb. NCERT starts with quantization q=±ne, conservation, then Coulomb → field E=F/q₀ → Gauss.'}},
      {formulas:[
        {tex:'F=\\frac{1}{4\\pi\\epsilon_0}\\frac{q_1q_2}{r^{2}}',name:"Coulomb's law",vars:[['\\epsilon_0','8.85×10⁻¹²']]},
        {tex:'\\vec E = \\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r^{2}}\\hat r',name:'Field of point charge',vars:[]},
        {tex:'\\oint \\vec E\\cdot d\\vec A = Q_{enc}/\\epsilon_0',name:'Gauss law',vars:[]}
      ]},
      {example:{title:'Two 1 µC at 30 cm',given:['q=1e-6, r=0.3'],concept:'Coulomb.',solution:['F=9e9·1e-12/0.09=0.1 N'],answer:'0.1 N',interp:'Air vs medium: divide by εr.'}},
      {sim:'efield'},{revise:['q quantized','E=F/q','Gauss flux=Q/ε0']}
    ]}
  ]},
  {id:'ncert12.potential',title:'Electrostatic Potential and Capacitance',icon:'🔋',tagline:'Potential, capacitors, dielectrics',mins:24,lessons:[
    {id:'ncert12.potential.cap',title:'V, C and Dielectrics',mins:24,content:[
      {formulas:[
        {tex:'V=\\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r},\\; W=q\\Delta V',name:'Potential & work',vars:[]},
        {tex:'C=Q/V,\\; C_{||}=C_1+C_2,\\; 1/C_s=1/C_1+1/C_2',name:'Capacitance combos',vars:[]},
        {tex:'U=\\tfrac12 CV^{2},\\; K=\\epsilon/\\epsilon_0',name:'Energy & dielectric',vars:[]}
      ]},
      {example:{title:'C=6 µF at 10 V',given:['C=6e-6, V=10'],concept:'Energy.',solution:['U=0.5·6e-6·100=3e-4 J'],answer:'0.3 mJ'}},
      {revise:['V scalar','Series C less than smallest','Dielectric ↑C by K']}
    ]}
  ]},
  {id:'ncert12.current',title:'Current Electricity',icon:'🔌',tagline:'Ohm, Kirchhoff, Wheatstone',mins:26,lessons:[
    {id:'ncert12.current.ohm',title:"Ohm, Kirchhoff & Meter Bridge",mins:26,content:[
      {formulas:[
        {tex:'j=\\sigma E,\\; R=\\rho l/A,\\; P=VI',name:'Microscopic Ohm',vars:[]},
        {tex:'\\Sigma I=0\\; (junction),\\; \\Sigma IR=\\Sigma EMF',name:'Kirchhoff',vars:[]},
        {tex:'R_x = R \\frac{l}{100-l}',name:'Meter bridge',vars:[]}
      ]},
      {example:{title:'Wheatstone balanced',given:['P/Q=R/S'],concept:'Bridge.',solution:['If P=2,Q=3,R=4 → S=6 Ω'],answer:'6 Ω'}},
      {sim:'circuit'},{revise:['Drift velocity','Kirchhoff 1 & 2','Potentiometer null']}
    ]}
  ]},
  {id:'ncert12.moving',title:'Moving Charges and Magnetism',icon:'🧲',tagline:'Biot-Savart, Ampere, Lorentz',mins:28,lessons:[
    {id:'ncert12.moving.biot',title:'Biot-Savart to Cyclotron',mins:28,content:[
      {formulas:[
        {tex:'d\\vec B = \\frac{\\mu_0}{4\\pi}\\frac{Id\\vec l\\times\\hat r}{r^{2}},\\; B_{loop}=\\frac{\\mu_0 I}{2R}',name:'Biot-Savart',vars:[]},
        {tex:'\\oint \\vec B\\cdot d\\vec l = \\mu_0 I_{enc}',name:'Ampere',vars:[]},
        {tex:'\\vec F = q(\\vec v\\times\\vec B),\\; r=\\frac{mv}{qB},\\; T=\\frac{2\\pi m}{qB}',name:'Cyclotron',vars:[]}
      ]},
      {sim:'bfield'},{revise:['Right-hand rules','Solenoid B=μ0nI','Cyclotron frequency independent of v']}
    ]}
  ]},
  {id:'ncert12.magnetism',title:'Magnetism and Matter',icon:'🧭',tagline:'Bar magnet, H, B, hysteresis',mins:18,lessons:[
    {id:'ncert12.magnetism.matter',title:'Magnetic Materials',mins:18,content:[
      {formulas:[
        {tex:'\\vec m,\\; B=\\mu_0(H+M),\\; \\chi = M/H',name:'Magnetization',vars:[]},
        {tex:'\\mu_r = 1+\\chi',name:'Permeability',vars:[]}
      ]},
      {table:{head:['Type','χ','μr'],rows:[['Dia','negative <0','<1'],['Para','small +','>1'],['Ferro','large +','>>1']]}},
      {revise:['Hysteresis loop area = loss','Curie temp kills ferromagnetism']}
    ]}
  ]},
  {id:'ncert12.emi',title:'Electromagnetic Induction',icon:'🌀',tagline:'Faraday, Lenz, eddy currents',mins:22,lessons:[
    {id:'ncert12.emi.faraday',title:'Flux, EMF & Applications',mins:22,content:[
      {formulas:[
        {tex:'\\Phi_B = \\vec B\\cdot\\vec A,\\; \\epsilon = -d\\Phi_B/dt',name:'Faraday-Lenz',vars:[]},
        {tex:'\\epsilon = Blv,\\; U=\\tfrac12 LI^{2}',name:'Motional & inductor',vars:[]}
      ]},
      {sim:'induction'},{revise:['Lenz opposes change','Eddy currents damped in laminations']}
    ]}
  ]},
  {id:'ncert12.ac',title:'Alternating Current',icon:'〰️',tagline:'Phasors, resonance, transformer',mins:24,lessons:[
    {id:'ncert12.ac.phasor',title:'AC, Resonance & Transformer',mins:24,content:[
      {formulas:[
        {tex:'I=I_0\\sin(\\omega t),\\; V=V_0\\sin(\\omega t+\\phi)',name:'AC',vars:[]},
        {tex:'Z=\\sqrt{R^{2}+(X_L-X_C)^{2}},\\; \\phi=\\tan^{-1}((X_L-X_C)/R)',name:'Impedance',vars:[['X_L','ωL'],['X_C','1/ωC']]},
        {tex:'P_{av}=V_{rms}I_{rms}\\cos\\phi,\\; f_0=\\frac{1}{2\\pi\\sqrt{LC}}',name:'Power & resonance',vars:[]},
        {tex:'\\frac{V_s}{V_p}=\\frac{N_s}{N_p}=\\frac{I_p}{I_s}',name:'Ideal transformer',vars:[]}
      ]},
      {revise:['Resonance: current max, φ=0','Transformer: step up V, step down I']}
    ]}
  ]},
  {id:'ncert12.emw',title:'Electromagnetic Waves',icon:'📡',tagline:'Displacement current, spectrum',mins:14,lessons:[
    {id:'ncert12.emw.spectrum',title:'Maxwell & Spectrum',mins:14,content:[
      {formulas:[
        {tex:'I_D=\\epsilon_0 d\\Phi_E/dt,\\; c=1/\\sqrt{\\mu_0\\epsilon_0}',name:'Displacement & c',vars:[]},
        {tex:'\\text{γ—X—UV—Vis—IR—micro—radio}',name:'Spectrum order',vars:[]}
      ]},
      {revise:['EM waves transverse, E⊥B⊥k','Speed c in vacuum']}
    ]}
  ]},
  {id:'ncert12.ray',title:'Ray Optics and Optical Instruments',icon:'🔦',tagline:'Mirrors, lenses, microscope, telescope',mins:30,lessons:[
    {id:'ncert12.ray.mirrors',title:'Mirrors, Lenses & Instruments',mins:30,content:[
      {formulas:[
        {tex:'1/f=1/v+1/u,\\; m=-v/u',name:'Mirror',vars:[]},
        {tex:'1/f=1/v-1/u,\\; P=1/f',name:'Lens',vars:[]},
        {tex:'m=1+D/f\\; (microscope),\\; M=f_o/f_e\\; (telescope)',name:'Magnification',vars:[['D','25 cm']]}
      ]},
      {sim:'lens'},{revise:['TIR: n1 sinθc = n2','Microscope vs telescope f ratios']}
    ]}
  ]},
  {id:'ncert12.waveopt',title:'Wave Optics',icon:'🌈',tagline:'Interference, diffraction, polarisation',mins:26,lessons:[
    {id:'ncert12.waveopt.interference',title:'Young, Diffraction & Polarisation',mins:26,content:[
      {formulas:[
        {tex:'y_n = n\\lambda D/d\\; (bright),\\; \\beta=\\lambda D/d',name:"Young's",vars:[]},
        {tex:'a\\sin\\theta = n\\lambda\\; (min)',name:'Single-slit',vars:[]},
        {tex:'I=I_0\\cos^{2}\\theta',name:'Malus',vars:[]}
      ]},
      {sim:'interference'},{revise:['Coherent sources needed','Diffraction broadens with smaller slit']}
    ]}
  ]},
  {id:'ncert12.dual',title:'Dual Nature of Radiation and Matter',icon:'✨',tagline:'Photoelectric, de Broglie',mins:20,lessons:[
    {id:'ncert12.dual.photo',title:'Photoelectric & de Broglie',mins:20,content:[
      {formulas:[
        {tex:'h\\nu = \\phi_0 + K_{max},\\; K_{max}=eV_0',name:'Photoelectric',vars:[['\\phi_0','work function']]},
        {tex:'\\lambda = h/p = h/\\sqrt{2mK}',name:'de Broglie',vars:[]}
      ]},
      {revise:['Threshold ν₀ = φ/h','Matter waves verified by Davisson-Germer']}
    ]}
  ]},
  {id:'ncert12.atoms',title:'Atoms',icon:'⚛️',tagline:'Bohr, spectra',mins:16,lessons:[
    {id:'ncert12.atoms.bohr',title:'Bohr Model',mins:16,content:[
      {formulas:[
        {tex:'mvr=n\\hbar,\\; r_n=n^{2}a_0,\\; E_n=-13.6/n^{2}\\,eV',name:'Bohr',vars:[['a_0','0.53 Å']]},
        {tex:'1/\\lambda = R(1/n_1^{2}-1/n_2^{2})',name:'Rydberg',vars:[]}
      ]},
      {revise:['Lyman UV, Balmer visible']}
    ]}
  ]},
  {id:'ncert12.nuclei',title:'Nuclei',icon:'☢️',tagline:'Size, binding, decay',mins:18,lessons:[
    {id:'ncert12.nuclei.binding',title:'Nucleus & Radioactivity',mins:18,content:[
      {formulas:[
        {tex:'R=R_0 A^{1/3},\\; BE = \\Delta m c^{2}',name:'Size & binding',vars:[]},
        {tex:'N=N_0 e^{-\\lambda t},\\; T_{1/2}=\\ln2/\\lambda',name:'Decay',vars:[]}
      ]},
      {revise:['BE per nucleon peaks at Fe-56','α (He), β (e), γ (photon)']}
    ]}
  ]},
  {id:'ncert12.electronic',title:'Electronic Devices',icon:'💻',tagline:'Semiconductors, diodes, transistors',mins:20,lessons:[
    {id:'ncert12.electronic.semi',title:'Semiconductors & Logic',mins:20,content:[
      {formulas:[
        {tex:'n_e n_h = n_i^{2}',name:'Intrinsic',vars:[]},
        {tex:'I=I_0(e^{eV/kT}-1)',name:'Diode',vars:[]}
      ]},
      {table:{head:['Gate','Symbol','Truth'],rows:[['AND','·','1 only if all 1'],['OR','+','1 if any 1'],['NOT','—','flips'],['NAND','∓','NOT AND'],['NOR','∓','NOT OR']]}},
      {revise:['n-type: e⁻ majority, p-type: h⁺','Transistor as switch/amplifier']}
    ]}
  ]}
]});
