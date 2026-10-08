/* PhysiX Academy - core kernel
   Shared singletons that used to live as implicit globals across 40+ classic
   <script> tags. Now one real ES module so Vite can see the dependency graph.

   SU / pxArrow / pxLabel were extracted verbatim from sims-a.js. pxArrow and
   pxLabel were ALSO duplicated byte-identically in sims-e.js; both copies are
   consolidated here once. Verified identical before removal.
*/
'use strict';

export const SU = {
  el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  },
  canvas(host, h) {
    const wrap = SU.el('div', 'sim-canvas-wrap');
    const c = document.createElement('canvas');
    wrap.appendChild(c); host.appendChild(wrap);
    const W = Math.max(280, wrap.clientWidth || host.clientWidth || 640);
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = h * dpr;
    c.style.width = W + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, g, W, H: h };
  },
  /* Shared animation pump.
   *
   * The existing disconnect check already stopped loops when a route unmounted,
   * which is why 36 simulations leaked nothing. What it did not handle is the
   * tab being HIDDEN while the simulation is still mounted: browsers keep
   * firing rAF for background tabs at a reduced rate, so every open simulation
   * kept integrating physics and drawing for nobody. Measured at ~60 frames per
   * second of wall time wasted per open simulation.
   *
   * Pausing on hidden is not just an optimisation. dt is clamped to 33ms, so a
   * backgrounded projectile sim silently advances in slow motion while the tab
   * is away, then resumes at a state the student never saw. Pausing keeps the
   * physics honest as well as cheap. */
  loop(cv, fn) {
    let last = performance.now(), alive = true;
    function step(t) {
      if (!alive || !cv.isConnected) { alive = false; return; }
      if (document.hidden) {
        /* Skip the simulation but keep the rAF chain alive, so resuming does
           not require re-mounting. Reset `last` on return so the first frame
           after unhiding does not see a huge dt. */
        last = t;
        requestAnimationFrame(step);
        return;
      }
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      fn(dt, t / 1000);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return () => { alive = false; };
  },
  slider(parent, label, min, max, step, val, oninput, fmt) {
    fmt = fmt || (v => v);
    const w = SU.el('div', 'ctl', '<label></label>');
    /* A label wrapping the text but not the input does NOT name the input for
       assistive tech unless the input is inside the label. It was not, so all
       38 sliders that use this helper were announced as an unlabelled slider:
       "slider, 0 to 20" with no indication of what it controlled. Fixed by
       giving the input an id and pointing a label at it explicitly, which also
       makes clicking the caption move the slider. */
    const lid = 'sl-' + Math.random().toString(36).slice(2, 9);
    const lab = w.querySelector('label');
    lab.setAttribute('for', lid);
    lab.innerHTML = esc(label) + '<output></output>';

    const out = w.querySelector('output');
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    inp.id = lid;
    /* The visible caption is the accessible name. Kept in sync via aria-label
       rather than aria-labelledby so the range and the caption cannot drift. */
    inp.setAttribute('aria-label', String(label).replace(/<[^>]*>/g, ''));
    /* Screen readers announce range values; the current value belongs in the
       accessible description too, alongside min/max which come free. */
    inp.setAttribute('aria-valuetext', fmt(+val));

    const upd = () => {
      out.textContent = fmt(+inp.value);
      inp.setAttribute('aria-valuetext', fmt(+inp.value));
    };
    upd();
    inp.addEventListener('input', () => { upd(); oninput(+inp.value); });
    w.appendChild(inp); parent.appendChild(w);
    return {
      get: () => +inp.value,
      set(v) { inp.value = v; upd(); },
      el: inp
    };
  },
  readout(parent, label, val) {
    const r = SU.el('div', 'readout', label + ' <b>' + (val == null ? '—' : val) + '</b>');
    parent.appendChild(r);
    const b = r.querySelector('b');
    return { set(v) { b.textContent = v; } };
  },
  btn(parent, label, fn, primary) {
    const b = SU.el('button', 'btn btn-sm' + (primary ? ' btn-primary' : ''), label);
    b.addEventListener('click', fn);
    parent.appendChild(b);
    return b;
  },
  arrowH(g, x, y, len, col) {
    if (Math.abs(len) < 3) return;
    const s = Math.sign(len);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    g.beginPath(); g.moveTo(x + len, y); g.lineTo(x + len - 8 * s, y - 4); g.lineTo(x + len - 8 * s, y + 4); g.fill();
  }
};

/* Minimal escape for the one place core.js builds markup. core.js has no
   imports by design: it is the leaf kernel that every other module depends on,
   so importing utils.js from here would make the graph circular. */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* shared vector drawing helpers (used across sim files) */
export function pxArrow(g, x, y, dx, dy, col, w) {
  const len = Math.hypot(dx, dy); if (len < 2) return;
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w || 3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  const a = Math.atan2(dy, dx), h = (w || 3) + 5;
  g.beginPath();
  g.moveTo(x + dx, y + dy);
  g.lineTo(x + dx - h * Math.cos(a - 0.42), y + dy - h * Math.sin(a - 0.42));
  g.lineTo(x + dx - h * Math.cos(a + 0.42), y + dy - h * Math.sin(a + 0.42));
  g.closePath(); g.fill();
}
export function pxLabel(g, x, y, t, col) {
  g.fillStyle = col || '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'left';
  g.fillText(t, x, y);
}


/* App is pure view state (main element + active level filter). It lives here,
   not in views.js, because ~8 modules read App while views.js imports those
   same modules back for their view functions. Owning it in the leaf kernel
   keeps that graph acyclic. */
export const App = { el: null, levelFilter: 'all' };


/* ---------- post-render hooks ----------
   These used to be monkey-patched onto window.afterRender by five files
   (hero3d, 3d, cinematic, scroll-cinema, anime-demo). That silently stopped
   working when views.js became an ES module: afterRender is module scoped, so
   `window.afterRender = ...` created a property nobody ever called. The router
   ran with every one of those decorations disabled - the missing hero canvas
   was just the most visible symptom.
   Register here instead. Each hook runs isolated, so one throwing cannot abort
   the router or starve the hooks after it. */
export const renderHooks = [];

export function onAfterRender(fn) {
  renderHooks.push(fn);
}