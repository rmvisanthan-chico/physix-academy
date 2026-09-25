'use strict';

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
