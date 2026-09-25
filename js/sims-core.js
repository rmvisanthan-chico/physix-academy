'use strict';

const SU = {
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
  loop(cv, fn) {
    let last = performance.now(), alive = true;
    function step(t) {
      if (!alive || !cv.isConnected) { alive = false; return; }
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      fn(dt, t / 1000);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return () => { alive = false; };
  },
  slider(parent, label, min, max, step, val, oninput, fmt) {
    fmt = fmt || (v => v);
    const w = SU.el('div', 'ctl', '<label>' + label + '<output></output></label>');
    const out = w.querySelector('output');
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    const upd = () => { out.textContent = fmt(+inp.value); };
    upd();
    inp.addEventListener('input', () => { upd(); oninput(+inp.value); });
    w.appendChild(inp); parent.appendChild(w);
    return { get: () => +inp.value, set(v) { inp.value = v; upd(); } };
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

function pxArrow(g, x, y, dx, dy, col, w) {
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

function pxLabel(g, x, y, t, col) {
  g.fillStyle = col || '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'left';
  g.fillText(t, x, y);
}

const SIMULATION_COUNT = 51;
const THREE_SIM_IDS = new Set(['orbit3d', 'wave3d', 'efield3d', 'cdn-3d-atom']);

const Sims = {
  reg: {},
  register(id, title, desc, icon, run) {
    this.reg[id] = { id, title, desc, icon, run };
  },
  mount(id, host) {
    host.innerHTML = '';
    const def = this.reg[id];
    if (!def) {
      host.innerHTML = '<div class="empty-state"><div class="big">🚧</div><p>Simulation “' + esc(id) + '” is coming soon.</p></div>';
      return;
    }
    const frame = SU.el('div', 'sim-frame');
    frame.innerHTML = '<div class="sim-head"><span class="dot"></span><b>' + esc(def.title) +
      '</b><span class="muted small">' + esc(def.desc) + '</span></div>';
    host.appendChild(frame);
    try { def.run(frame); }
    catch (err) { console.error('Sim error:', id, err); frame.insertAdjacentHTML('beforeend', '<div class="empty-state">This simulation failed to start.</div>'); }
  }
};
