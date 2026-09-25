'use strict';

QUIZ_BANK.push(
  { id: 'jee-2019-1', topic: 'Electrostatics PYQ', difficulty: 'intermediate', q: 'JEE 2019: Two charges q and 2q at distance r. Force F. If distance halved, force?', choices: ['F', '2F', '4F', '8F'], answer: 2, why: 'F∝1/r² → r→r/2 → F→4F.' },
  { id: 'jee-2020-1', topic: 'Current Electricity PYQ', difficulty: 'intermediate', q: 'NEET 2020: Drift velocity v_d = I/nAe. If I doubled and A halved, v_d?', choices: ['v', '2v', '4v', 'v/2'], answer: 2, why: 'v_d∝I/A → 2I/(A/2)=4v.' },
  { id: 'jee-2021-1', topic: 'Optics PYQ', difficulty: 'intermediate', q: 'JEE 2021: Convex lens f=20cm, object at 30cm. Image distance?', choices: ['30cm', '60cm', '40cm', '50cm'], answer: 1, why: '1/20=1/v+1/30 → 1/v=1/20-1/30=1/60 → v=60cm.' },
  { id: 'jee-2022-1', topic: 'Mechanics PYQ', difficulty: 'intermediate', q: 'JEE 2022: Projectile at 30° with 20 m/s, g=10. Range?', choices: ['20√3', '34.6m', '40m', '20m'], answer: 1, why: 'R=u²sin2θ/g=400·sin60/10=34.6 m.' },
  { id: 'neet-2021-1', topic: 'Nuclei PYQ', difficulty: 'intermediate', q: 'NEET 2021: Half-life 2h, after 6h fraction remaining?', choices: ['1/2', '1/4', '1/8', '1/16'], answer: 2, why: 'n=3 half-lives → (1/2)³=1/8.' },
  { id: 'jee-2020-2', topic: 'Thermodynamics PYQ', difficulty: 'intermediate', q: 'JEE 2020: Carnot between 500K & 300K, efficiency?', choices: ['20%', '40%', '60%', '80%'], answer: 1, why: 'η=1−300/500=40%.' },
  { id: 'neet-2019-1', topic: 'Waves PYQ', difficulty: 'intermediate', q: 'NEET 2019: Open pipe 1m, v=340, fundamental?', choices: ['85Hz', '170Hz', '340Hz', '510Hz'], answer: 1, why: 'f=v/2L=170 Hz.' },
  { id: 'jee-2018-1', topic: 'Rotation PYQ', difficulty: 'intermediate', q: 'JEE 2018: Solid sphere vs ring rolling down incline — who wins?', choices: ['Sphere', 'Ring', 'Same', 'Depends on mass'], answer: 0, why: 'a=g sinθ/(1+I/MR²), I_sphere < I_ring → sphere faster.' }
);
