/* PhysiX Academy — Cinematic interaction: spotlight + magnetic buttons + Skiper spotlight cards */
'use strict';

/* — kinetic text split (AnimMasterLib) — */
function kineticSplit() {
  const h = document.querySelector('.display');
  if (!h || h.dataset.kdone) return;
  h.dataset.kdone = '1';
  // keep original HTML structure but split text nodes into spans
  const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
  const texts = []; let n;
  while (n = walker.nextNode()) if (n.nodeValue.trim()) texts.push(n);
  let globalI = 0;
  texts.forEach(tn => {
    const parent = tn.parentNode;
    const isEm = parent.tagName === 'EM';
    const isDim = parent.classList.contains('dim');
    const str = tn.nodeValue;
    const frag = document.createDocumentFragment();
    // group by word to keep overflow clipping per word
    const words = str.split(/(\s+)/);
    words.forEach(w => {
      if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
      const wSpan = document.createElement('span'); wSpan.className = 'k-word';
      [...w].forEach(ch => {
        const c = document.createElement('span');
        c.className = 'k-char'; c.textContent = ch;
        c.style.setProperty('--i', globalI++);
        wSpan.appendChild(c);
      });
      frag.appendChild(wSpan);
    });
    parent.replaceChild(frag, tn);
  });
  // trigger
  requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('in')));
}
function kineticScan(root){
  const host = root || document;
  if (host.querySelector && host.querySelector('.display')) kineticSplit();
}

(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) { // still run kinetic on touch
    document.addEventListener('DOMContentLoaded', kineticSplit);
    const _origAR = window.afterRender;
    if (typeof _origAR === 'function') window.afterRender = function(r){ _origAR(r); kineticScan(r); };
    else window.afterRender = kineticScan;
    return;
  }

  // spotlight (Skiper inspiration)
  const spot = document.createElement('div');
  spot.className = 'spotlight';
  document.body.appendChild(spot);
  let spotOn = false;
  window.addEventListener('pointermove', (e) => {
    spot.style.left = e.clientX + 'px';
    spot.style.top = e.clientY + 'px';
    if (!spotOn) { spot.classList.add('on'); spotOn = true; }
    // update card spotlight vars
    const card = e.target.closest('.card.hover, .level-card, .stat');
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100).toFixed(1)+'%');
      card.style.setProperty('--my', ((e.clientY - r.top)/r.height*100).toFixed(1)+'%');
    }
    // button magnetic vars
    const btn = e.target.closest('.btn');
    if (btn) {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--bx', ((e.clientX - r.left)/r.width*100).toFixed(1)+'%');
      btn.style.setProperty('--by', ((e.clientY - r.top)/r.height*100).toFixed(1)+'%');
      // subtle magnet pull (Vengence)
      const dx = (e.clientX - (r.left + r.width/2)) * 0.12;
      const dy = (e.clientY - (r.top + r.height/2)) * 0.18;
      btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    }
  }, {passive:true});
  window.addEventListener('pointerleave', () => { spot.classList.remove('on'); spotOn = false; });
  document.addEventListener('pointerout', (e) => {
    const btn = e.target.closest && e.target.closest('.btn');
    if (btn && !btn.contains(e.relatedTarget)) btn.style.transform = '';
  }, {passive:true});

  // hook kinetic + liquid + motion page transitions (motion.dev)
  function motionPageIn(){
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const main = document.getElementById('main');
    if (!main) return;
    if (window.Motion && window.Motion.animate) {
      try { window.Motion.animate(main, { opacity:[0,1], y:[14,0] }, { duration:0.52, easing:[0.16,1,0.3,1] }); } catch(_){}
    } else {
      main.classList.remove('page-in'); void main.offsetWidth; main.classList.add('page-in');
    }
  }
  document.addEventListener('DOMContentLoaded', () => { kineticSplit(); motionPageIn(); });
  const _origAR2 = window.afterRender;
  if (typeof _origAR2 === 'function') {
    window.afterRender = function(r){
      _origAR2(r);
      kineticScan(r);
      motionPageIn();
      // liquid class for cards (Skiper warp)
      $$('.card.hover, .study', r || document).forEach(c => c.classList.add('liquid'));
    };
  } else {
    window.afterRender = function(r){ kineticScan(r); motionPageIn(); $$('.card.hover, .study', r || document).forEach(c => c.classList.add('liquid')); };
  }
  // initial liquid tagging
  setTimeout(()=> $$('.card.hover, .study').forEach(c=>c.classList.add('liquid')), 600);
})();
