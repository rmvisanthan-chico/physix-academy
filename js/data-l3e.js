/* PhysiX Academy — Level 3 Part E: Optics + Modern Physics */
'use strict';

(function(){
const lv = CURRICULUM.find(l => l.id === 'l3');

lv.chapters.push(
  /* ---------------- OPTICS ---------------- */
  {
    id:'l3.ray', title:'Ray Optics', icon:'🔭', tagline:'Mirrors, lenses, images.', mins:30,
    lessons:[
      { id:'l3.ray.main', title:'Reflection, Refraction & Lenses', mins:30, content:[
        {why:{q:'How can a lens focus sunlight enough to burn paper?', p:'Curved surfaces redirect light rays precisely, converging them to a point. Two formulas below own cameras, telescopes and spectacles.'}},
        {formulas:[
          {tex:'n_1\\sin i = n_2\\sin r', name:'Snell\u2019s law', vars:[['n','refractive index = c/v']], note:'Bends toward normal entering denser media; beyond the critical angle → total internal reflection (fibre optics).'},
          {tex:'\\frac{1}{v}-\\frac{1}{u} = \\frac{1}{f}', name:'Lens equation', vars:[['u','object distance (negative)'],['v','image distance'],['f','focal length (positive for converging)']]},
          {tex:'m = \\frac{v}{u} = \\frac{h_i}{h_o}', name:'Magnification', note:'Negative m means inverted.'},
          {tex:'P = \\frac{1}{f\\,[\\text{m}]}', name:'Power in dioptres'}
        ]},
        {example:{title:'Converging lens image',
          given:['u = −30 cm','f = +10 cm'],
          concept:'Lens equation with consistent signs.',
          solution:['$1/v = 1/f + 1/u = 1/10 − 1/30 = 2/30$','$v = +15$ cm'],
          answer:'v=+15 cm; m = v/u = 15/(−30) = −0.5',
          interp:'Real, inverted, half-size image behind the lens — projector geometry.'}
        },
        {sim:'lens'},
        {mistakes:['Sign-convention chaos — pick ONE and annotate every diagram.','Measuring angles from surfaces instead of normals.','Trying to catch virtual images on screens.']},
        {quiz:['q-ro1','q-ro2']},
        {revise:['Snell governs bending.','TIR enables fibres.','1/v − 1/u = 1/f.','Sign of m gives orientation.']}
      ]}
    ]
  },
  {
    id:'l3.wavopt', title:'Wave Optics', icon:'🌈', tagline:'Interference proves light waves.', mins:24,
    lessons:[
      { id:'l3.wavopt.main', title:'Young\u2019s Experiment & Beyond', mins:24, content:[
        {why:{q:'Why do soap bubbles swirl with colours?', p:'Reflections from the film\u2019s two surfaces interfere; which colour survives depends on thickness. Rays cannot explain bubbles — waves can.'}},
        {formula:{tex:'\\beta = \\frac{\\lambda D}{d}', name:'Double-slit fringe width', vars:[['β','bright-fringe spacing'],['D','slit–screen distance'],['d','slit separation']], note:'β ∝ λ lets you MEASURE wavelength with a ruler.'}},
        {ul:['Bright where path difference = nλ; dark at odd half-wavelengths.','Diffraction caps resolution — bigger telescopes see finer detail.','Single slit: central band twice as wide as the side ones.']},
        {sim:'wave'},
        {mistakes:['Swapping d and D in β=λD/d.','Expecting interference between independent bulbs (no stable phase relation).']},
        {quiz:['q-wo1','q-wo2']},
        {revise:['Δpath = nλ ⇒ bright.','β = λD/d.','Thin films colour bubbles/oil.','Aperture sets resolution.']}
      ]}
    ]
  },

  /* ---------------- MODERN ---------------- */
  {
    id:'l3.dual', title:'Dual Nature of Radiation & Matter', icon:'🔆', tagline:'Photoelectric effect: light as particles.', mins:22,
    lessons:[
      { id:'l3.dual.main', title:'Photons & Photoelectric Effect', mins:22, content:[
        {why:{q:'Why do solar panels care about colour?', p:'Each photon carries E = hf regardless of brightness. Red photons below threshold eject NOTHING however intense — Einstein\u2019s Nobel insight that light comes in quanta.'}},
        {formulas:[
          {tex:'E = hf = \\frac{hc}{\\lambda}', name:'Photon energy', vars:[['h = 6.63×10⁻³⁴ J·s','Planck constant']], note:'Shortcut: E(eV) ≈ 1240 / λ(nm).'},
          {tex:'K_{max} = hf - \\phi', name:'Einstein\u2019s photoelectric equation', vars:[['φ','work function']]}
        ]},
        {example:{title:'Violet vs work function',
          given:['λ = 400 nm','φ = 2 eV'],
          concept:'Compare photon energy to escape cost.',
          solution:['$E = 1240/400 = 3.1$ eV','$K_{max}=3.1−2.0$'],
          answer:'K_max = 1.1 eV — ejected',
          interp:'Intensity adds electrons; frequency alone raises their energy.'}
        },
        {mistakes:['Thinking brighter light increases electron KE.','Unit slips with the 1240 shortcut (needs nm!).','Forgetting stopping potential V₀ = K_max/e.']},
        {quiz:['q-dn1','q-dn2']},
        {revise:['E=hf; threshold when hf=φ.','Brightness→count, colour→energy.','Light shows both wave and particle faces.']}
      ]}
    ]
  },
  {
    id:'l3.atoms', title:'Atoms', icon:'⚛️', tagline:'Bohr model & spectral barcodes.', mins:22,
    lessons:[
      { id:'l3.atoms.main', title:'Atomic Structure & Spectra', mins:22, content:[
        {why:{q:'How do we know what stars are made of?', p:'Elements emit unique line spectra. Hydrogen\u2019s visible fingerprint matches lab data exactly — astronomy is chemistry-by-mail.'}},
        {formulas:[
          {tex:'E_n = -\\frac{13.6\\ \\text{eV}}{n^2}', name:'Bohr levels (hydrogen)', note:'Negative = bound; ionisation needs 13.6 eV.'},
          {tex:'h\\nu = E_i - E_f', name:'Transition photon'},
          {tex:'r_n = n^2 a_0,\\quad a_0 = 0.529\\ \\text{Å}', name:'Orbit radii', note:'From quantised angular momentum mvr = nh/2π.'}
        ]},
        {example:{title:'H-alpha red line',
          given:['n = 3 → n = 2 transition'],
          concept:'Energy gap.',
          solution:['$E_3=-1.51$, $E_2=-3.40$ eV','$ΔE=1.89$ eV'],
          answer:'λ ≈ 656 nm',
          interp:'That red glow paints emission nebulae in every astrophoto.'}
        },
        {mistakes:['Forgetting level energies are negative.','Applying Bohr beyond hydrogen-like atoms.','Mixing eV with joules mid-calculation.']},
        {quiz:['q-at1','q-at2']},
        {revise:['E_n ∝ 1/n².','Photon = gap energy.','Spectra identify elements.','Bohr: angular momentum quantised.']}
      ]}
    ]
  },
  {
    id:'l3.nuclei', title:'Nuclei', icon:'☢️', tagline:'Binding energy, decay, half-life.', mins:24,
    lessons:[
      { id:'l3.nuclei.main', title:'Nuclear Physics Essentials', mins:24, content:[
        {why:{q:'Why is nuclear fuel millions of times more energetic than coal?', p:'Binding energies are MeV-scale versus chemical eV-scale. E = mc² converts tiny mass defects into vast energy.'}},
        {formulas:[
          {tex:'BE = \\Delta m c^2, \\quad \\Delta m = Zm_p+Nm_n-M_{nuc}', name:'Mass defect → binding energy', note:'1 u missing ⇔ 931.5 MeV released.'},
          {tex:'N(t)=N_0 e^{-\\lambda t}, \\quad t_{1/2}=\\frac{\\ln 2}{\\lambda}', name:'Decay law', note:'Half-life describes populations, never individual nuclei.'}
        ]},
        {example:{title:'Carbon dating',
          given:['C-14 half-life 5730 y','sample has 25% C-14 left'],
          concept:'Count halvings.',
          solution:['100%→50%→25%: two half-lives'],
          answer:'≈ 11,460 years',
          interp:'Archaeology runs on exponential arithmetic.'}
        },
        {mistakes:['Predicting exact decay moments for single atoms.','Forgetting α changes A AND Z; β only Z.']},
        {quiz:['q-nu1','q-nu2']},
        {revise:['Δm c² ↔ binding energy.','Exponential decay, fixed t½.','α/β/γ penetration rises in that order.','Fission splits heavy; fusion joins light.']}
      ]}
    ]
  },
  {
    id:'l3.semi', title:'Semiconductor Electronics', icon:'💾', tagline:'Diodes, transistors, logic gates.', mins:22,
    lessons:[
      { id:'l3.semi.main', title:'Silicon to Logic Gates', mins:22, content:[
        {why:{q:'How does doped silicon run the digital world?', p:'Doping engineers silicon\u2019s conductivity atom-by-atom. Junctions of n- and p-regions make diodes and transistors — billions per chip.'}},
        {def:[
          {term:'Intrinsic Si', text:'Pure crystal; few thermal carriers.'},
          {term:'Doping', text:'Pentavalent → n-type (electrons); trivalent → p-type (holes).'},
          {term:'p–n diode', text:'Forward bias conducts (~0.7 V for Si); reverse blocks — one-way valve for current.'}
        ]},
        {ul:['Transistor = electrically-controlled switch + amplifier; logic gates are wired transistors.','LEDs are forward-biased junctions emitting photons; solar cells run backwards.']},

        {mistakes:['Reversing diode orientation then wondering why nothing conducts.','Assuming semiconductors conduct better WHEN COLD (thermal carriers shrink).']},
        {quiz:['q-se1','q-se2']},
        {revise:['n-type: electrons; p-type: holes.','Diode conducts one way.','Transistor = switch/amplifier.','Gates build all computation.']}
      ]}
    ]
  }
);
})();
