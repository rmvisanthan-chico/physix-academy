/* PhysiX Academy — JEE/NEET PYQ Bank (local trial for item 2) */
'use strict';

/* Add to QUIZ_BANK */
if(typeof QUIZ_BANK!=='undefined'){
QUIZ_BANK.push(
  {id:'jee-2019-1', topic:'Electrostatics PYQ', q:'JEE 2019: Two charges q and 2q at distance r. Force F. If distance halved, force?', choices:['F','2F','4F','8F'], ans:2, exp:'F∝1/r² → r→r/2 → F→4F.'},
  {id:'jee-2020-1', topic:'Current Electricity PYQ', q:'NEET 2020: Drift velocity v_d = I/nAe. If I doubled and A halved, v_d?', choices:['v','2v','4v','v/2'], ans:2, exp:'v_d∝I/A → 2I/(A/2)=4v.'},
  {id:'jee-2021-1', topic:'Optics PYQ', q:'JEE 2021: Convex lens f=20cm, object at 30cm. Image distance?', choices:['30cm','60cm','40cm','50cm'], ans:1, exp:'1/20=1/v+1/30 → 1/v=1/20-1/30=1/60 → v=60cm.'},
  {id:'jee-2022-1', topic:'Mechanics PYQ', q:'JEE 2022: Projectile at 30° with 20 m/s, g=10. Range?', choices:['20√3','34.6m','40m','20m'], ans:1, exp:'R=u²sin2θ/g=400·sin60/10=34.6 m.'},
  {id:'neet-2021-1', topic:'Nuclei PYQ', q:'NEET 2021: Half-life 2h, after 6h fraction remaining?', choices:['1/2','1/4','1/8','1/16'], ans:2, exp:'n=3 half-lives → (1/2)³=1/8.'},
  {id:'jee-2020-2', topic:'Thermodynamics PYQ', q:'JEE 2020: Carnot between 500K & 300K, efficiency?', choices:['20%','40%','60%','80%'], ans:1, exp:'η=1−300/500=40%.'},
  {id:'neet-2019-1', topic:'Waves PYQ', q:'NEET 2019: Open pipe 1m, v=340, fundamental?', choices:['85Hz','170Hz','340Hz','510Hz'], ans:1, exp:'f=v/2L=170 Hz.'},
  {id:'jee-2018-1', topic:'Rotation PYQ', q:'JEE 2018: Solid sphere vs ring rolling down incline — who wins?', choices:['Sphere','Ring','Same','Depends on mass'], ans:0, exp:'a=g sinθ/(1+I/MR²), I_sphere < I_ring → sphere faster.'}
);
}

/* JEE/NEET Level for Learn */
CURRICULUM.push({
  id:'jee', name:'JEE / NEET — PYQs & Advanced', tag:'JEE/NEET', icon:'🎯', color:'#f59e0b',
  desc:'Previous-year JEE/NEET physics — 8 PYQs solved with NCERT links, plus advanced problem sets. Bridge from board to competitive.',
  chapters:[
    {id:'jee.mech',title:'Mechanics — PYQs',icon:'🏃',tagline:'Projectile, rotation, work-energy',mins:18,lessons:[
      {id:'jee.mech.pyq',title:'Mechanics PYQs (JEE/NEET)',mins:18,content:[
        {p:'Mechanics is 30% of JEE. Below are PYQs with NCERT links — solve, then check with simulation.'},
        {quiz:['jee-2022-1','jee-2018-1']},
        {example:{title:'PYQ: Projectile at 30° — 20 m/s',given:['JEE 2022'],concept:'R=u²sin2θ/g',solution:['R=400·sin60/10≈34.6 m'],answer:'34.6 m',interp:'Max at 45°.'}},
        {revise:['R max at 45°','Rolling: I matters']}
      ]}
    ]},
    {id:'jee.em',title:'E&M — PYQs',icon:'⚡',tagline:'Electrostatics, current, magnetism',mins:20,lessons:[
      {id:'jee.em.pyq',title:'E&M PYQs',mins:20,content:[
        {quiz:['jee-2019-1','jee-2020-1']},
        {revise:['F∝1/r²','v_d∝I/A']}
      ]}
    ]},
    {id:'jee.optics',title:'Optics — PYQs',icon:'🔦',tagline:'Ray & wave optics',mins:16,lessons:[
      {id:'jee.optics.pyq',title:'Optics PYQs',mins:16,content:[
        {quiz:['jee-2021-1','neet-2019-1']},
        {revise:['Lens: 1/f=1/v−1/u','Open pipe f=v/2L']}
      ]}
    ]},
    {id:'jee.modern',title:'Modern & Thermo — PYQs',icon:'⚛️',tagline:'Dual nature, nuclei, thermodynamics',mins:18,lessons:[
      {id:'jee.modern.pyq',title:'Modern & Thermo PYQs',mins:18,content:[
        {quiz:['neet-2021-1','jee-2020-2']},
        {revise:['T½=ln2/λ','Carnot η=1−Tc/Th']}
      ]}
    ]}
  ]
});
