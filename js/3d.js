/* PhysiX Academy — 3D interaction engine: tilt cards + parallax */
'use strict';

const D3 = {
  enabled: true,
  fine: false,

  init() {
    this.fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.enabled = this.fine && !reduce;
    if (!this.enabled) return;

    document.addEventListener('pointermove', e => this.onMove(e), { passive: true });
    document.addEventListener('pointerout', e => {
      const card = e.target.closest && e.target.closest('.tiltable');
      if (card && !card.contains(e.relatedTarget)) this.reset(card);
    }, { passive: true });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { this.parallax(); ticking = false; });
    }, { passive: true });
  },

  /* upgrade all current cards — call after each render */
  scan(root) {
    if (!this.enabled) return;
    $$('.card.hover, .level-card, .stat', root || document).forEach(c => {
      if (c.classList.contains('tiltable')) return;
      c.classList.add('tiltable');
      c.classList.add('pop');
      const shine = document.createElement('div');
      shine.className = 'tilt-shine';
      c.appendChild(shine);
    });
  },

  onMove(e) {
    const card = e.target.closest && e.target.closest('.tiltable');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * 10;
    const ry = (px - 0.5) * 12;
    card.style.transform =
      'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)' +
      ' translateZ(6px)';
    card.style.setProperty('--shx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--shy', (py * 100).toFixed(1) + '%');
  },

  reset(card) {
    card.style.transform = '';
  },

  parallax() {
    const y = window.scrollY;
    const hero = $('.hero');
    if (!hero || y > hero.offsetHeight) return;
    const orb = $('.orbit-wrap');
    if (orb) orb.style.marginTop = (y * 0.12).toFixed(1) + 'px';
    $$('.hero .hero-cta').forEach(el => {
      el.style.transform = 'translateY(' + (y * 0.06).toFixed(1) + 'px)';
    });
  }
};

/* hook into the router's post-render step */
(function hookAfterRender() {
  if (typeof afterRender !== 'function') return;
  const orig = afterRender;
  window.afterRender = function (root) {
    orig(root);
    D3.scan(root);
    if (App.el) {
      App.el.classList.remove('page-in');
      void App.el.offsetWidth;
      App.el.classList.add('page-in');
    }
  };
})();

D3.init();
