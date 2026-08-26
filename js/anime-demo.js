/* PhysiX — anime.js demo: stagger for cards + progress ring */
'use strict';
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function run(root){
    const host = root || document;
    if (!window.anime) return;
    // level cards stagger on home
    const levels = host.querySelectorAll('#home-path .level-card');
    if (levels.length){
      window.anime({
        targets: levels,
        opacity: [0, 1],
        translateY: [16, 0],
        scale: [0.98, 1],
        delay: window.anime.stagger(90, {start: 120}),
        duration: 560,
        easing: 'easeOutCubic'
      });
    }
    // study cards stagger
    const studies = host.querySelectorAll('.st-grid .study');
    if (studies.length){
      window.anime({
        targets: studies,
        opacity: [0, 1],
        translateY: [18, 0],
        rotate: [-0.6, 0],
        delay: window.anime.stagger(110, {start: 180}),
        duration: 620,
        easing: 'easeOutCubic'
      });
    }
    // lesson rows
    const rows = host.querySelectorAll('.lesson-row');
    if (rows.length){
      window.anime({
        targets: rows,
        opacity: [0, 1],
        translateX: [-8, 0],
        delay: window.anime.stagger(28, {start: 80}),
        duration: 420,
        easing: 'easeOutQuad'
      });
    }
    // progress ring draw (if present)
    const ring = host.querySelector('.ring');
    if (ring && window.anime){
      const p = parseInt(ring.style.getPropertyValue('--p')) || 0;
      ring.style.setProperty('--p', 0);
      window.anime({
        targets: ring,
        duration: 900,
        easing: 'easeOutCubic',
        update: function(anim){
          const v = Math.round(anim.progress * p / 100);
          ring.style.setProperty('--p', v);
          const rv = ring.querySelector('.rv');
          if (rv) rv.textContent = v + '%';
        }
      });
    }
  }
  document.addEventListener('DOMContentLoaded', ()=> run());
  const ar = window.afterRender;
  window.afterRender = function(root){ if (typeof ar==='function') ar(root); run(root); };
})();
