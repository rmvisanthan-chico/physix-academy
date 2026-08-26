/* PhysiX Academy — Scroll cinema: scrub-linked hero, staggered sweeps, count-ups */
'use strict';

const Cine = {
  bar: null,
  io: null,

  init() {
    /* thin progress bar */
    this.bar = document.createElement('div');
    this.bar.id = 'scrollbar-top';
    document.body.appendChild(this.bar);

    let tick = false;
    window.addEventListener('scroll', () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => { this.onScroll(); tick = false; });
    }, { passive: true });

    this.io = ('IntersectionObserver' in window)
      ? new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          this.countUp(e.target);
          this.io.unobserve(e.target);
        }), { threshold: 0.06, rootMargin: '0px 0px 18% 0px' })
      : { /* very old browser: skip animations, keep everything visible */
          observe(el) { el.classList.add('in'); Cine.countUp(el); },
          unobserve() {}, disconnect() {}
        };
  },

  onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    this.bar.style.width = (p * 100).toFixed(2) + '%';
    /* publish scroll position for the 3D hero — Theatre.js style keyframed progress */
    const hero = $('.hero');
    if (hero) {
      if (scrollY < hero.offsetHeight * 1.6) window.__heroScroll = scrollY;
      // CSS theatre var lives on hero for cinematic.css to consume
      hero.style.setProperty('--p', Math.min(scrollY / 600, 1).toFixed(3));
    }
  },

  /* called after every route render */
  rescan(root) {
    const host = root || document;
    const isHome = !!$('.hero', host);
    let zones;
    if (isHome) {
      zones = $$('.sec', host);
      $('.hero-kicker', host) && this.io.observe($('.hero-kicker', host));
    } else {
      zones = [$('.page-head', host)].filter(Boolean);
    }
    zones.forEach((zone, zi) => {
      zone.classList.add('cine');
      zone.style.setProperty('--d', (zi * 0.08) + 's');
      /* stagger the cards inside each zone */
      $$('.card, .acc, .formula-item, .calc-card', zone).forEach((c, i) => {
        c.style.setProperty('--d', (zi * 0.08 + Math.min(i * 0.07, 0.5)) + 's');
        c.classList.add('cine');
        this.io && this.io.observe(c);
      });
      this.io && this.io.observe(zone);
    });
    /* standalone count-up targets outside zones */
    $$('[data-count]', host).forEach(el => this.io && this.io.observe(el.closest('.stat') || el));
  },

  countUp(scope) {
    const targets = [];
    if (scope.hasAttribute && scope.hasAttribute('data-count')) targets.push(scope);
    $$('[data-count]', scope).forEach(t => targets.push(t));
    targets.forEach(el => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const end = parseInt(el.dataset.count, 10) || 0;
      if (!end || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = end; return; }
      const t0 = performance.now(), dur = 900;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
};

Cine.init();

/* join the post-render hook chain */
(function hookCine() {
  if (typeof afterRender !== 'function') return;
  const orig = afterRender;
  window.afterRender = function (root) {
    orig(root);
    Cine.rescan(root);
  };
})();
