/* PhysiX Academy — Hall of Physicists */
'use strict';

const SCIENTISTS = [
  { img: 'galileo.jpg', name: 'Galileo Galilei', years: '1564–1642', from: 'Italy',
    known: 'Dropped the idea that heavy things fall faster. Turned physics into an experiment-first science.',
    ch: 'l2.motion' },
  { img: 'kepler.jpg', name: 'Johannes Kepler', years: '1571–1630', from: 'Germany',
    known: 'Cracked the shape of planetary orbits: ellipses, not circles — by pure stubborn calculation.',
    ch: 'l3.grav' },
  { img: 'newton.jpg', name: 'Isaac Newton', years: '1643–1727', from: 'England',
    known: 'Laws of motion, universal gravitation, calculus. Wrote the rulebook physics still uses.',
    ch: 'l3.laws' },
  { img: 'faraday.jpg', name: 'Michael Faraday', years: '1791–1867', from: 'England',
    known: 'School-dropout bookbinder who invented the electric motor, generator and field-line pictures.',
    ch: 'l3.emi' },
  { img: 'maxwell.jpg', name: 'James Clerk Maxwell', years: '1831–1879', from: 'Scotland',
    known: 'United electricity, magnetism and light into four equations — and predicted radio.',
    ch: 'l3.moving' },
  { img: 'curie.jpg', name: 'Marie Curie', years: '1867–1934', from: 'Poland · France',
    known: 'Discovered polonium & radium, coined "radioactivity", won Nobel Prizes in TWO sciences.',
    ch: 'l3.nuclei' },
  { img: 'jcbose.jpg', name: 'Jagadish Chandra Bose', years: '1858–1937', from: 'India 🇮🇳',
    known: 'Pioneered radio waves & millimetre optics before Marconi; proved plants respond to stimuli.',
    ch: 'l2.waves' },
  { img: 'planck.jpg', name: 'Max Planck', years: '1858–1947', from: 'Germany',
    known: 'Reluctantly chopped light into quanta in 1900 — accidentally started quantum physics.',
    ch: 'l3.dual' },
  { img: 'snbose.jpg', name: 'Satyendra Nath Bose', years: '1894–1974', from: 'India 🇮🇳',
    known: 'His letter to Einstein founded quantum statistics; bosons and Bose–Einstein condensates carry his name.',
    ch: 'l4.stat' },
  { img: 'raman.jpg', name: 'C.V. Raman', years: '1888–1970', from: 'India 🇮🇳',
    known: 'The Raman effect — how light changes colour scattering off molecules. India\u2019s first science Nobel (1930).',
    ch: 'l3.wavopt' },
  { img: 'saha.jpg', name: 'Meghnad Saha', years: '1893–1956', from: 'India 🇮🇳',
    known: 'Saha equation links stellar spectra to temperature — the key that decoded the stars.',
    ch: 'l4.astro' },
  { img: 'einstein.jpg', name: 'Albert Einstein', years: '1879–1955', from: 'Germany',
    known: 'Relativity, E = mc², and the photoelectric explanation that won him the Nobel — not relativity!',
    ch: 'l4.rel' },
  { img: 'bhabha.jpg', name: 'Homi J. Bhabha', years: '1909–1966', from: 'India 🇮🇳',
    known: 'Father of India\u2019s nuclear programme; built TIFR and the atomic energy establishment from scratch.',
    ch: 'l3.nuclei' },
  { img: 'bohr.jpg', name: 'Niels Bohr', years: '1885–1962', from: 'Denmark',
    known: 'Planetary model of the atom with quantum jumps — explained why neon signs glow their colour.',
    ch: 'l3.atoms' },
  { img: 'debroglie.jpg', name: 'Louis de Broglie', years: '1892–1987', from: 'France',
    known: 'One PhD line changed everything: matter is also a wave. λ = h/p.',
    ch: 'l3.dual' },
  { img: 'schrodinger.jpg', name: 'Erwin Schrödinger', years: '1887–1961', from: 'Austria',
    known: 'The wave equation of quantum mechanics — plus a famous half-alive cat.',
    ch: 'l4.quantum' },
  { img: 'heisenberg.jpg', name: 'Werner Heisenberg', years: '1901–1976', from: 'Germany',
    known: 'You cannot know position AND momentum exactly. The universe enforces this blur.',
    ch: 'l4.quantum' },
  { img: 'dirac.jpg', name: 'Paul Dirac', years: '1902–1984', from: 'England',
    known: 'Predicted antimatter on paper before anyone saw it. Equations so beautiful they had to be true.',
    ch: 'l4.quantum' },
  { img: 'chandrasekhar.jpg', name: 'S. Chandrasekhar', years: '1910–1995', from: 'India 🇮🇳 · USA',
    known: 'Found the mass limit for white dwarfs at age 19 — the doorway to black holes. Nobel, 1983.',
    ch: 'l4.astro' },
  { img: 'hubble.jpg', name: 'Edwin Hubble', years: '1889–1953', from: 'USA',
    known: 'Proved other galaxies exist and that space itself is expanding. A telescope now carries his name.',
    ch: 'l4.astro' },
  { img: 'hawking.jpg', name: 'Stephen Hawking', years: '1942–2018', from: 'England',
    known: 'Black holes evaporate! Hawking radiation welds gravity to quantum theory.',
    ch: 'l4.astro' }
];

function chFirstLesson(chId) {
  for (const l of CURRICULUM) {
    const c = l.chapters.find(x => x.id === chId);
    if (c && c.lessons.length) return '#/lesson/' + c.lessons[0].id;
  }
  return '#/learn';
}

function viewScientists() {
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>🏛️ Hall of Physicists</h1>
      <p class="sub">Every equation in this app was written by a human being. Meet the people behind the physics.</p></div>
    <div class="grid g4">
      ${SCIENTISTS.map(s => `
      <div class="card hover sci-card">
        <img class="sci-img" src="assets/scientists/${s.img}" alt="${esc(s.name)}" loading="lazy">
        <h3>${esc(s.name)}</h3>
        <p class="small muted mb0">${esc(s.years)} · ${esc(s.from)}</p>
        <p class="small">${esc(s.known)}</p>
        <a class="btn btn-sm btn-primary" href="${chFirstLesson(s.ch)}">Their physics →</a>
      </div>`).join('')}
    </div>
  </div>`;
}
