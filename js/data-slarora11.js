/* PhysiX Academy — SL Arora Class 11 Guide (inspired, original explanations) */
'use strict';
CURRICULUM.push({
  id:'slarora11', name:'SL Arora Class 11 — Guide', tag:'SL Arora 11', icon:'📖', color:'#f97316',
  desc:'SL Arora-style Class 11 — same 14 NCERT chapters but with emphasis on derivations, solved examples and exercise-type numericals. Original explanations, not verbatim book copy.',
  chapters:[
    {id:'slarora11.units',title:'Physical World & Measurement',icon:'📏',tagline:'Dimensions, errors, significant figures',mins:20,lessons:[
      {id:'slarora11.units.main',title:'Dimensions & Errors — SL Arora Style',mins:20,content:[
        {why:{q:'Why does SL Arora start with checking equations dimensionally?',p:'Because a wrong formula fails dimension test in 5 seconds — before any calculation. That is the SL Arora habit: verify, then solve.'}},
        {def:[
          {term:'Significant figures',text:'All reliable digits + first uncertain. SL Arora rule: final answer to least precise input.'},
          {term:'Error propagation',text:'In addition: add absolute errors; in product: add relative errors. Derivations in SL Arora Ch 2.'}
        ]},
        {formula:{tex:'[E]=[ML^{2}T^{-2}]',name:'Dimensional check',vars:[]}},
        {example:{title:'SL Arora-style: Check s = ut + ½at²',given:['s [L], ut [LT⁻¹·T]=[L], ½at² [LT⁻²·T²]=[L]'],concept:'All terms same [L] → dimensionally homogeneous.',solution:['Each term [L]'],answer:'Passes',interp:'Necessary, not sufficient — ½ needs experiment.'}},
        {revise:['Dimension homogeneity first','Significant figures = precision of answer','Errors add by rule']}
      ]}
    ]},
    {id:'slarora11.kin1',title:'Motion in a Straight Line',icon:'➡️',tagline:'s–t, v–t, 3 equations',mins:22,lessons:[
      {id:'slarora11.kin1.main',title:'Straight-line Kinematics — Solved Examples',mins:22,content:[
        {formulas:[{tex:'v=u+at,\\; s=ut+½at²,\\; v²=u²+2as',name:'Uniform a',vars:[]}]},
        {example:{title:'SL Arora Ex: Braking 20 m/s with a=−4 m/s²',given:['u=20, v=0, a=−4'],concept:'Use v²=u²+2as',solution:['0=400−8s → s=50 m'],answer:'50 m',interp:'SL Arora stresses unit conversion before formula.'}},
        {sim:'kin1d'},{revise:['Graphs: slope/area rules','Only for uniform a']}
      ]}
    ]},
    {id:'slarora11.kin2',title:'Motion in a Plane',icon:'↗️',tagline:'Vectors, projectile, circular',mins:24,lessons:[
      {id:'slarora11.kin2.main',title:'Projectile — SL Arora Derivations',mins:24,content:[
        {formulas:[{tex:'R=u²sin2θ/g,\\; H=u²sin²θ/2g',name:'Projectile',vars:[]}]},
        {example:{title:'SL Arora: 30° vs 60° same range',given:['u same'],concept:'sin2θ = sin(180−2θ)',solution:['sin60=sin120'],answer:'Same R',interp:'Complementary angles trick.'}},
        {sim:'projectile'},{revise:['Separate x/y','R max at 45°']}
      ]}
    ]},
    {id:'slarora11.laws',title:'Laws of Motion',icon:'💪',tagline:'Friction, banking, NLM',mins:26,lessons:[
      {id:'slarora11.laws.main',title:'Friction & Banking — Numerical Focus',mins:26,content:[
        {formulas:[{tex:'f_s≤μ_sN,\\; tanθ=v²/rg',name:'Friction & banking',vars:[]}]},
        {example:{title:'SL Arora: Block on 37° incline, μ=0.3',given:['m=5, θ=37°, μ=0.3'],concept:'Down component vs max friction',solution:['mg sin37=30 N, f_max=μ mg cos37=12 N → slides'],answer:'Slides'},interp:'Angle of repose tan⁻¹μ.'},
        {sim:'incline'},{revise:['F_net=ma','Banking reduces friction need']}
      ]}
    ]},
    {id:'slarora11.wep',title:'Work, Energy and Power',icon:'⚡',tagline:'Work-energy theorem, springs',mins:22,lessons:[
      {id:'slarora11.wep.main',title:'Work–Energy & Springs',mins:22,content:[
        {formulas:[{tex:'W=Fs cosθ,\\; W_net=ΔKE,\\; U=½kx²',name:'Work-energy',vars:[]}]},
        {example:{title:'SL Arora: Spring k=200, x=0.1',given:['k=200, x=0.1'],concept:'U=½kx²',solution:['U=1 J'],answer:'1 J'}},
        {sim:'energy'},{revise:['Work sign by cosθ','Energy conserved without friction']}
      ]}
    ]},
    {id:'slarora11.rotation',title:'System of Particles & Rotation',icon:'🌀',tagline:'COM, torque, MI',mins:24,lessons:[
      {id:'slarora11.rotation.main',title:'Rotational Dynamics — SL Arora',mins:24,content:[
        {formulas:[{tex:'τ=Iα,\\; L=Iω,\\; I=Σmr²',name:'Rotation',vars:[]}]},
        {example:{title:'SL Arora: Which rolls faster?',given:['Sphere vs ring'],concept:'a=g sinθ/(1+I/MR²)',solution:['Sphere wins (smaller I)'],answer:'Sphere'}},
        {revise:['I depends on axis','L conserved if τ=0']}
      ]}
    ]},
    {id:'slarora11.gravitation',title:'Gravitation',icon:'🌌',tagline:'Kepler, escape, variation of g',mins:20,lessons:[
      {id:'slarora11.gravitation.main',title:'Gravitation — Derivations',mins:20,content:[
        {formulas:[{tex:'g=GM/R²,\\; v_e=√2gR,\\; T²∝r³',name:'Gravitation',vars:[]}]},
        {example:{title:'SL Arora: g at height h=R/2',given:['h=R/2'],concept:'g∝1/r²',solution:['g′=g·(R/(R+h))²= g·(4/9)'],answer:'4g/9'}},
        {revise:['Kepler III','Escape 11.2 km/s']}
      ]}
    ]},
    {id:'slarora11.solids',title:'Mechanical Properties of Solids',icon:'🧱',tagline:'Stress, strain, Y',mins:16,lessons:[
      {id:'slarora11.solids.main',title:'Elasticity — Hooke',mins:16,content:[
        {formulas:[{tex:'Y=stress/strain,\\; ΔL=FL/AY',name:"Young's",vars:[]}]},
        {example:{title:'SL Arora: ΔL of steel wire',given:['F=200N, L=2m, A=1mm², Y=2e11'],concept:'ΔL',solution:['ΔL=2mm'],answer:'2 mm'}},
        {revise:['Hooke within elastic limit']}
      ]}
    ]},
    {id:'slarora11.fluids',title:'Mechanical Properties of Fluids',icon:'💧',tagline:'Bernoulli, Stokes',mins:20,lessons:[
      {id:'slarora11.fluids.main',title:'Fluids — Bernoulli & Viscosity',mins:20,content:[
        {formulas:[{tex:'P+½ρv²+ρgh=const',name:'Bernoulli',vars:[]}]},
        {example:{title:'SL Arora: Venturi P drop',given:['v1=2, v2=4, ρ=1000'],concept:'ΔP=½ρ(v2²−v1²)',solution:['ΔP=6 kPa'],answer:'6 kPa'}},
        {sim:'buoyancy'},{revise:['Continuity A1v1=A2v2']}
      ]}
    ]},
    {id:'slarora11.thermal',title:'Thermal Properties of Matter',icon:'🌡️',tagline:'Expansion, calorimetry',mins:18,lessons:[
      {id:'slarora11.thermal.main',title:'Heat & Calorimetry',mins:18,content:[
        {formulas:[{tex:'Q=mcΔT,\\; ΔL=αLΔT',name:'Calorimetry',vars:[]}]},
        {example:{title:'SL Arora: Mix 0.2kg 80°C + 0.3kg 20°C',given:['c=4186'],concept:'Heat lost=gained',solution:['T=44°C'],answer:'44°C'}},
        {revise:['α, β=2α, γ=3α']}
      ]}
    ]},
    {id:'slarora11.thermo',title:'Thermodynamics',icon:'🔥',tagline:'First law, Carnot',mins:22,lessons:[
      {id:'slarora11.thermo.main',title:'First & Second Law',mins:22,content:[
        {formulas:[{tex:'ΔU=Q−W,\\; η=1−Tc/Th',name:'Thermo',vars:[]}]},
        {example:{title:'SL Arora: Carnot 500K/300K',given:['Th=500,Tc=300'],concept:'η',solution:['η=40%'],answer:'40%'}},
        {revise:['Work = P–V area','Carnot ceiling']}
      ]}
    ]},
    {id:'slarora11.ktg',title:'Kinetic Theory',icon:'💨',tagline:'Ideal gas, rms',mins:16,lessons:[
      {id:'slarora11.ktg.main',title:'Kinetic Theory — SL Arora',mins:16,content:[
        {formulas:[{tex:'PV=nRT,\\; c_rms=√(3RT/M)',name:'KTG',vars:[]}]},
        {example:{title:'SL Arora: c_rms O₂ at 300K',given:['M=0.032'],concept:'√(3RT/M)',solution:['483 m/s'],answer:'~480 m/s'}},
        {revise:['⟨E⟩=3/2 kT']}
      ]}
    ]},
    {id:'slarora11.osc',title:'Oscillations',icon:'〰️',tagline:'SHM',mins:18,lessons:[
      {id:'slarora11.osc.main',title:'SHM — Spring & Pendulum',mins:18,content:[
        {formulas:[{tex:'T=2π√(m/k),\\; T=2π√(L/g)',name:'SHM',vars:[]}]},
        {example:{title:'SL Arora: 1m pendulum',given:['L=1'],concept:'T',solution:['2.01 s'],answer:'~2 s'}},
        {sim:'shm'},{revise:['SHM: d²x/dt²+ω²x=0']}
      ]}
    ]},
    {id:'slarora11.waves',title:'Waves',icon:'🌊',tagline:'Standing, beats',mins:20,lessons:[
      {id:'slarora11.waves.main',title:'Waves — String & Sound',mins:20,content:[
        {formulas:[{tex:'v=√(T/μ),\\; f_n=nv/2L',name:'Waves',vars:[]}]},
        {example:{title:'SL Arora: Open pipe 1m',given:['L=1, v=340'],concept:'f=v/2L',solution:['170 Hz'],answer:'170 Hz'}},
        {sim:'wave'},{revise:['Standing: n·v/2L']}
      ]}
    ]}
  ]
});
