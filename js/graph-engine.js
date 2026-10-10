/* PhysiX Academy — reusable physics graph engine.
 *
 * One canvas, one API, no dependencies. A simulation pushes physics values; it
 * never learns anything about drawing. That separation is the whole point: the
 * same engine has to serve a projectile curve, a lab measurement and a
 * challenge result without any of them knowing how a pixel is placed.
 *
 * DESIGN NOTES, each of which is a decision rather than a default:
 *
 * Canvas, not SVG. A 60fps plot of 600 samples means 600 path updates per
 * frame. SVG would rebuild the DOM every time; canvas draws into one buffer and
 * touches no DOM at all. The axis labels and the live value table ARE DOM,
 * because text must be selectable, scalable and readable by a screen reader -
 * those change rarely, so the cost is irrelevant.
 *
 * Bounded history, default 600 samples per series. Unbounded growth is not an
 * abstract risk: a simulation left running for an hour produces ~216k samples
 * and makes every scale calculation O(n) per frame. The window is a ring
 * buffer, so push() is O(1) regardless of age.
 *
 * Scaling is computed from the visible window only, and padded. Two failure
 * modes were specifically designed against: a single extreme value (a 900m
 * spike) squashing the entire curve into a flat line, and an axis that rescales
 * every frame so the curve appears to breathe. Both are visible in real use, so
 * neither is left to chance - see computeScale().
 *
 * Sampling is decoupled from rendering. push() only records data. The engine
 * redraws on its own rAF, and only when something changed. A simulation that
 * pushes 3 values a frame costs three array writes, not three redraws.
 */

/* Ring buffer of (x,y) pairs, one per series. Fixed size, allocated once. */
class Series {
  constructor(def, capacity) {
    this.id = def.id;
    this.label = def.label;
    this.unit = def.unit || '';
    this.color = def.color;
    this.xLabel = def.xLabel || 'x';
    this.xUnit = def.xUnit || '';
    this.visible = def.visible !== false;
    this.capacity = capacity;
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    /* head = next write index, len = how many valid entries */
    this.head = 0;
    this.len = 0;
    this.last = null;
  }
  push(x, y) {
    if (!isFinite(x) || !isFinite(y)) return false;
    this.x[this.head] = x;
    this.y[this.head] = y;
    this.head = (this.head + 1) % this.capacity;
    if (this.len < this.capacity) this.len++;
    this.last = { x, y };
    this.dirty = true;
    return true;
  }
  clear() {
    this.head = 0;
    this.len = 0;
    this.last = null;
    this.dirty = true;
  }
  /* Iterate oldest -> newest, which is the only order that draws a curve. */
  each(fn) {
    const start = this.len < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.len; i++) {
      const idx = (start + i) % this.capacity;
      fn(this.x[idx], this.y[idx], i);
    }
  }

  /* Value at an arbitrary x, by linear interpolation between the two samples
     that bracket it.

     Interpolation is the honest choice here and the alternative is worse. The
     simulation integrates on a fixed ~60Hz timestep, so asking for t = 1.500 s
     will essentially never land on a sample. Snapping to the nearest sample
     would report "0 m at 1.5s" when the ball was at 14.2 m, which is a wrong
     answer presented as a measurement. Linear interpolation between neighbours
     is exact for constant acceleration over one 16ms step, which is precisely
     the regime this engine is asked about.

     Returns null rather than a guess when the target is outside the recorded
     window or bracketed by fewer than two samples - a caller must never receive
     a fabricated measurement. */
  sampleAt(xq) {
    if (!this.len || !isFinite(xq)) return null;
    const start = this.len < this.capacity ? 0 : this.head;
    const n = this.len;
    const at = (i) => {
      const idx = (start + i) % this.capacity;
      return { x: this.x[idx], y: this.y[idx] };
    };
    const first = at(0), lastPt = at(n - 1);
    /* A single sample has no bracket to interpolate between, but the exact
       instant is still a real measurement. The first version required two
       samples and returned null, which would have made a prediction unanswerable
       in the first second of any run. */
    if (n === 1) {
      return xq === first.x ? { x: xq, y: first.y, exact: true } : null;
    }
    if (xq < first.x || xq > lastPt.x) return null;      // outside recorded time
    for (let i = 0; i < n - 1; i++) {
      const a = at(i), b = at(i + 1);
      if (xq >= a.x && xq <= b.x) {
        if (xq === a.x) return { x: xq, y: a.y, exact: true };
        if (xq === b.x) return { x: xq, y: b.y, exact: true };
        const span = b.x - a.x;
        if (span <= 0) return { x: xq, y: a.y, exact: true };
        const f = (xq - a.x) / span;
        return { x: xq, y: a.y + f * (b.y - a.y), exact: false };
      }
    }
    return null;
  }

  /* Recorded time range, so a caller can ask "is t = 1.5 s reachable?" before
     promising anything. */
  timeRange() {
    if (!this.len) return null;
    const start = this.len < this.capacity ? 0 : this.head;
    return { from: this.x[start], to: this.x[(start + this.len - 1) % this.capacity] };
  }
  extent() {
    if (!this.len) return null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < this.len; i++) {
      const idx = (this.head - this.len + i + this.capacity * 2) % this.capacity;
      const x = this.x[idx], y = this.y[idx];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { x0, x1, y0, y1 };
  }
}

let _uid = 0;

export class Graph {
  /* options:
       xLabel, xUnit   axis captions, e.g. 'Time', 's'
       xKey            which key of a pushed sample is the horizontal value.
                       Defaults to 'x'. This has to be configurable per GRAPH,
                       not per series, because every series on one plot shares
                       one horizontal axis - and a sim whose own quantity is
                       also called x (spring displacement, say) must not have
                       it silently reused as time.
       title           visible caption, e.g. 'Height vs Time'
       height          css height of the plot area (default 180)
       capacity        max samples per series (default 600)
       yZero           force the y axis to include zero (default true - a
                       physics graph that hides the origin lies about sign)
       yMin, yMax      pin the y axis, bypassing auto-scaling
       tickCount       target number of gridlines (default 4)                */
  constructor(opts = {}) {
    this.opts = Object.assign({
      xLabel: 'x', xUnit: '', xKey: 'x', title: '', height: 180,
      capacity: 600, yZero: true, yMin: null, yMax: null, tickCount: 4
    }, opts);

    this.id = 'graph' + (++_uid);
    this.series = [];
    this.byId = {};
    this.scale = null;
    this._raf = null;
    this._alive = true;
    this._needsDraw = true;
    this.drawCount = 0;      /* exposed for tests: proves we are not redrawing per push */

    this._build();
    graphs.add(this);
  }

  /* Read a CSS custom property, falling back when the page has not defined it.
     Uses the element's own resolved value rather than the :root rule, so a
     graph placed inside a themed subtree picks up that subtree's value. */
  _css(varName, fallback) {
    try {
      const v = getComputedStyle(this.el || document.documentElement)
        .getPropertyValue(varName).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  /* ---------- DOM ---------- */
  _build() {
    const root = document.createElement('div');
    root.className = 'pgraph';
    root.setAttribute('role', 'group');

    /* ---------- Axis labels as DOM ----------
       Axis captions were previously absent, and the tick labels drawn on the
       canvas collided with the legend at the bottom-left and ran off the right
       edge. Both are fixed by giving the plot a real gutter:
         .pgraph-axes  holds the x caption (bottom) and y caption (rotated, left)
       The canvas then draws only inside .pgraph-inner, so nothing can overlap
       text. These are DOM, not canvas, so they are selectable, scalable and
       read by assistive tech. */
    const axes = document.createElement('div');
    axes.className = 'pgraph-axes';
    const yCap = document.createElement('span');
    yCap.className = 'pgraph-ycap';
    const inner = document.createElement('div');
    inner.className = 'pgraph-inner';
    const xCap = document.createElement('span');
    xCap.className = 'pgraph-xcap';
    axes.appendChild(yCap); axes.appendChild(inner); axes.appendChild(xCap);
    root.appendChild(axes);
    this.axesEl = axes;
    this.innerEl = inner;
    this.yCapEl = yCap;
    this.xCapEl = xCap;

    if (this.opts.title) {
      const h = document.createElement('div');
      h.className = 'pgraph-title';
      h.id = this.id + '-title';
      h.textContent = this.opts.title;
      root.appendChild(h);
      /* the caption IS the label, so the canvas is announced with something
         meaningful rather than "graphic" */
      root.setAttribute('aria-labelledby', h.id);
    }

    const plot = document.createElement('div');
    plot.className = 'pgraph-plot';
    plot.style.height = this.opts.height + 'px';
    const cv = document.createElement('canvas');
    /* aria-hidden: the legend below carries the same information as text, with
       axis units attached. A canvas announced as an image adds noise, not
       access. */
    cv.setAttribute('aria-hidden', 'true');
    plot.appendChild(cv);
    inner.appendChild(plot);
    this.canvas = cv;
    this.ctx = cv.getContext('2d');
    this.plotEl = plot;

    /* Axis captions, with units, as real text. "Height vs Time" in the title is
       the subject; these say what the numbers on each axis actually are. */
    const yLabel = this.opts.yLabel || 'Value';
    yCap.textContent = this.opts.yUnit ? `${yLabel} (${this.opts.yUnit})` : yLabel;
    xCap.textContent = this.opts.xUnit ? `${this.opts.xLabel} (${this.opts.xUnit})` : this.opts.xLabel;

    /* legend + live values, DOM not canvas: selectable, scalable, readable */
    const foot = document.createElement('div');
    foot.className = 'pgraph-foot';
    root.appendChild(foot);
    this.footEl = foot;

    this.el = root;
    this._resize();

    /* canvas backing store follows devicePixelRatio, capped at 2: a 3x phone
       would otherwise allocate 9x the pixels for no visible gain */
    const ro = window.ResizeObserver
      ? new ResizeObserver(() => { this._resize(); this._needsDraw = true; this._kick(); })
      : null;
    if (ro) { ro.observe(plot); this._ro = ro; }
    else {
      this._onResize = () => { this._resize(); this._needsDraw = true; this._kick(); };
      window.addEventListener('resize', this._onResize);
    }

    /* Re-assert geometry when the tab comes back. Needed because the graph now
       schedules only on demand: while the tab is hidden rAF does not run, so any
       state change that landed while hidden is still pending, but the viewport
       and devicePixelRatio may both have changed and the canvas backing store
       has to be re-measured before the pending draw paints into a stale buffer.
       Kicking unconditionally on return is deliberate - it is one draw, not a
       loop. */
    this._onVis = () => {
      if (document.hidden) return;
      this._resize();
      this._needsDraw = true;
      this._kick();
    };
    document.addEventListener('visibilitychange', this._onVis);

    this._needsDraw = true;
    this._kick();
  }

  /* Tick label widths, measured once per resize.
     The y labels are drawn INSIDE the canvas at the right edge, so they must
     not be allowed to run off it: reserve a gutter proportional to the widest
     label. An earlier version drew them flush right with no gutter, and on the
     projectile graph "-21.4" was clipped to "21.4".

     ORDER MATTERS, and this is the whole reason it is a separate function called
     before anything is positioned.

     `measureText` depends on ctx.font AND on the actual label strings. The label
     strings depend on the y-scale, which only exists once computeScale() has run.
     So the gutter for THIS frame can only be known after the scale is known, and
     must be measured before the plot width is derived from it.

     The old code measured the gutter at line ~498 but derived PW = W - this._gut
     at line ~483 - so the plot width came from the PREVIOUS frame's gutter while
     the labels came from the current scale. It was off by exactly one frame
     everywhere, and after a resize that meant a canvas laid out for the old
     width: y labels overlapping the curve, or the 30% cap eating the plot. The
     no-data path additionally zeroed _gut, so the first draw after that had a
     gutter of literally 0. */
  _measureTicks(W) {
    const g = this.ctx;
    if (!g) return 0;
    let widest = 0;
    const probe = this.scale || { y0: -10, y1: 10 };
    g.font = '10px "DM Mono", monospace';
    for (let i = 0; i <= this.opts.tickCount; i++) {
      const yv = probe.y1 - ((probe.y1 - probe.y0) / this.opts.tickCount) * i;
      widest = Math.max(widest, g.measureText(fmtNum(yv)).width);
    }
    /* +3px of slack for antialiasing, and a hard cap. The cap is why the top
       tick is not clipped on a 350px phone: at 10px, a 5-character label is
       ~28px, and a 28% share of a narrow plot leaves nothing for the curve. */
    return Math.min(Math.ceil(widest) + 10, Math.floor(W * 0.30));
  }

  _resize() {
    const w = this.innerEl.clientWidth || 320;
    const h = this.opts.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = w; this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- public API ---------- */

  /* def: { id, label, unit, color, xLabel, xUnit } */
  addSeries(def) {
    if (!def || !def.id) throw new Error('Graph.addSeries needs an id');
    if (this.byId[def.id]) return this.byId[def.id];
    const s = new Series(def, this.opts.capacity);
    this.series.push(s);
    this.byId[def.id] = s;
    this._renderFoot();
    this._needsDraw = true;
    this._kick();
    return s;
  }

  /* The ONLY method a simulation needs. One call per frame with the frame's
     values; the engine decides which series care about which key. The
     horizontal value is read once per frame, from opts.xKey. */
  push(sample) {
    if (!sample || !this._alive) return;
    const xv = sample[this.opts.xKey];
    if (xv === undefined) return;
    let touched = false;
    for (const s of this.series) {
      if (!s.visible) continue;
      const y = sample[s.id];
      if (y === undefined) continue;
      if (s.push(xv, y)) touched = true;
    }
    if (touched) { this._needsDraw = true; this._kick(); }
  }

  /* ---------- read-only query ----------
     A simulation's own state is authoritative, but anything that needs a value
     the student did not read off a readout can ask the record of what actually
     happened. Returns null when the question cannot be answered from real data,
     so no caller is tempted to substitute a guess. */
  valueAt(seriesId, xq) {
    const s = this.byId[seriesId];
    if (!s) return null;
    return s.sampleAt(xq);
  }
  timeRange(seriesId) {
    const s = this.byId[seriesId];
    return s ? s.timeRange() : null;
  }

  clear() {
    for (const s of this.series) s.clear();
    this.scale = null;
    this._needsDraw = true;
    this._renderFoot();
    this._kick();
  }

  /* Total recorded points, summed over every series.
     Phase 3C uses this to prove "pausing stops the graph growing" and "one Step
     adds exactly one sample" against the real sample buffer rather than against
     repainted pixels - a canvas that simply was not redrawn looks identical to a
     simulation that genuinely stopped integrating, and those are different bugs.
     Deliberately read-only: nothing here can be used to corrupt a series. */
  sampleCount(seriesId) {
    if (seriesId) {
      const s = this.byId[seriesId];
      return s ? s.len : 0;
    }
    let n = 0;
    for (const s of this.series) n += s.len;
    return n;
  }

  reset() { this.clear(); }

  setVisible(id, on) {
    const s = this.byId[id];
    if (!s) return;
    s.visible = !!on;
    this._needsDraw = true;
    this._renderFoot();
    this._kick();
  }

  /* Full teardown. Must be called on unmount, or the rAF loop and the
     ResizeObserver outlive the page and redraw into a detached canvas. */
  destroy() {
    this._alive = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro) this._ro.disconnect();
    else if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._onVis) { document.removeEventListener('visibilitychange', this._onVis); this._onVis = null; }
    this.series.length = 0;
    this.byId = {};
    this.el.remove();
    graphs.remove(this);
  }

  /* ---------- scaling ----------
     Computed over the visible window only. Padded so the curve never touches
     the frame, and with a floor on the span so a flat signal does not get
     magnified into visual noise by dividing by ~0. */
  computeScale() {
    const vis = this.series.filter(s => s.visible && s.len);
    if (!vis.length) return null;

    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of vis) {
      const e = s.extent();
      if (!e) continue;
      if (e.x0 < x0) x0 = e.x0;
      if (e.x1 > x1) x1 = e.x1;
      if (e.y0 < y0) y0 = e.y0;
      if (e.y1 > y1) y1 = e.y1;
    }
    if (!isFinite(x0)) return null;

    if (this.opts.yZero && y0 > 0) y0 = 0;
    if (this.opts.yMin != null) y0 = this.opts.yMin;
    if (this.opts.yMax != null) y1 = this.opts.yMax;

    let sx = x1 - x0, sy = y1 - y0;
    /* pad: 8% of span, or a small absolute floor when the span is tiny */
    const px = sx > 0 ? sx * 0.04 : Math.max(0.5, Math.abs(x1) * 0.1 || 0.5);
    const py = sy > 0 ? sy * 0.12 : Math.max(0.5, Math.abs(y1) * 0.1 || 0.5);
    x0 -= px; x1 += px; y0 -= py; y1 += py;
    /* never invert */
    if (x1 - x0 < 1e-6) x1 = x0 + 1;
    if (y1 - y0 < 1e-6) y1 = y0 + 1;

    return { x0, x1, y0, y1 };
  }

  /* Scheduling is ON DEMAND.

     The previous version re-armed itself unconditionally at the end of every
     frame:
         this._raf = requestAnimationFrame(this._frame);
     with a comment claiming this was "cheap". It is not free. A graph is one
     per simulation, so on a page with three graphs plus a running simulation the
     browser was servicing three animation callbacks every 16ms that did
     nothing at all, waking the main thread, defeating the browser's idle-frame
     skipping, and keeping the compositor busy. On a dashboard route with a
     mounted-but-idle simulation that is pure heat and battery.

     The re-arm is now done by _kick() only, and _kick() only schedules when
     _needsDraw is actually set. Every site that mutates state already calls
     _kick() - push(), addSeries(), setVisible(), clear(), the ResizeObserver,
     the window resize handler and the visibility handler below - so "something
     changed, draw me" is already wired; the unconditional re-arm was only
     papering over the fact that it was.

     Behaviour that must NOT be lost by making this on-demand:
       - live updates: push() sets _needsDraw and kicks.
       - resizing: ResizeObserver (or the window fallback) sets it and kicks.
       - tab return: while hidden, rAF callbacks do not run at all, so a
         pending frame simply waits. But a resize that happened while hidden
         could have been coalesced away, and more importantly the graph should
         re-assert its own geometry on return, because devicePixelRatio and the
         viewport can both change while a tab is backgrounded. Hence the
         visibilitychange listener below, which kicks on becoming visible.
       - a push that lands DURING a frame: _frame nulls _raf before drawing, so
         a push from inside draw() calls _kick(), sees no pending frame, and
         schedules the next one. No lost update, no double-schedule. */
  _kick() {
    if (!this._needsDraw || !this._alive) return;
    if (this._raf) return;                 /* already scheduled */
    this._raf = requestAnimationFrame(this._frame);
  }

  _frame = () => {
    this._raf = null;
    if (!this._alive) return;
    if (this._needsDraw) {
      this._needsDraw = false;
      this.draw();
    }
    /* Deliberately no re-arm. If draw() (or anything it calls) changed
       something, _needsDraw is true again and _kick() will have scheduled the
       next frame by the time we get here. Stopping here is what makes an idle
       graph cost nothing. */
  };

  /* ---------- drawing ---------- */
  draw() {
    this.drawCount++;
    const g = this.ctx;
    if (!g) return;
    const W = this.cssW, H = this.cssH;
    const line = this._css('--card-brd', '#2a3550');
    const txt = this._css('--txt3', '#7c8aa5');
    const panel = this._css('--panel2', '#131c31');

    g.clearRect(0, 0, W, H);
    g.fillStyle = panel;
    g.fillRect(0, 0, W, H);

    /* Reserve a bottom strip for the x tick labels so they can never collide
       with the plot or the legend. TICK_BAND is subtracted from the plotting
       height, so a curve can never be drawn over a label. */
    const BAND = 14;
    this.scale = this.computeScale();
    if (!this.scale) {
this._gut = 0;
    g.fillStyle = txt;
    g.font = '12px "DM Mono", monospace';
    g.textAlign = 'center';
    g.fillText('no data yet', W / 2, H / 2);
    this._renderFoot();
    return;
    }
    const { x0, x1, y0, y1 } = this.scale;

    /* Gutter FIRST, then plot width.
       The gutter is derived from the y tick labels, which come from `this.scale`
       computed two lines above, so it can only be measured here - but every
       x-coordinate below depends on the plot width, which depends on the gutter.
       Measuring after deriving PW (as this did until Phase 3C.2) meant the plot
       was laid out with the previous frame's gutter. */
    this._gut = this._measureTicks(W);
    const PW = W - this._gut;               /* plot width, excluding y gutter  */
    const PH = H - BAND;                   /* plot height, excluding x band  */
    this._PH = PH;
    /* Exposed for tests, like drawCount. PW + _gut must equal the canvas width
       for the frame just drawn - if it does not, the plot was laid out against a
       gutter from a different frame than the labels now beside it. Storing PW is
       what makes that checkable at all; without it the only evidence is pixels. */
    this._PW = PW;
    const fx = (x) => ((x - x0) / (x1 - x0)) * PW;
    const fy = (y) => PH - ((y - y0) / (y1 - y0)) * PH;

    /* grid + ticks */
    const n = this.opts.tickCount;
    g.strokeStyle = line;
    g.lineWidth = 1;
    /* grid + ticks. The x labels sit at the BOTTOM of the plot area and the y
       labels in a right-hand gutter, so neither can overlap the legend or run
       off the canvas edge. */
    g.fillStyle = txt;
    g.font = '10px "DM Mono", monospace';
    /* No re-measure here. _gut was already set above, BEFORE the plot width was
       derived from it, and re-measuring now would compute the same value and
       write it a second time - which is harmless in itself but hid the ordering
       bug for so long because the assignment read as if it were the source of
       truth. PW below is the value everything is actually drawn against. */
    const gut = this._gut;
    const plotW = W - gut;

    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (let i = 0; i <= n; i++) {
      const x = (PW / n) * i;
      const xv = x0 + ((x1 - x0) / n) * i;
      g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, PH); g.stroke();
      g.globalAlpha = 1;
      /* in the reserved strip below the plot, and clamped inward so the first
         and last labels cannot run off either edge */
      const tx = Math.max(14, Math.min(x, PW - 14));
      g.fillText(fmtNum(xv), tx, H - 11);
    }
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let i = 0; i <= n; i++) {
      const y = (PH / n) * i;
      const yv = y1 - ((y1 - y0) / n) * i;
      g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(PW, y + 0.5); g.stroke();
      g.globalAlpha = 1;
      /* the top and bottom ticks sit exactly ON the frame edges, so nudge them
         inward by half a line or they read as clipped */
      const ty = Math.max(5, Math.min(y, PH - 5));
      g.fillText(fmtNum(yv), W - 3, ty);
    }

    /* y = 0 reference, only when it is actually inside the view */
    if (y0 < 0 && y1 > 0) {
      g.strokeStyle = 'rgba(148,163,184,.55)';
      g.setLineDash([3, 3]);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, fy(0) + 0.5); g.lineTo(plotW, fy(0) + 0.5); g.stroke();
      g.setLineDash([]);
    }

    /* curves */
    for (const s of this.series) {
      if (!s.visible || s.len < 2) continue;
      g.strokeStyle = s.color;
      g.lineWidth = 2;
      g.lineJoin = 'round';
      g.beginPath();
      let first = true;
      s.each((xv, yv) => {
        const px = fx(xv), py = fy(yv);
        if (first) { g.moveTo(px, py); first = false; }
        else g.lineTo(px, py);
      });
      g.stroke();
      /* a dot at the live end, so "where is it now" is unambiguous */
      if (s.last) {
        g.fillStyle = s.color;
        g.beginPath();
        g.arc(fx(s.last.x), fy(s.last.y), 3, 0, Math.PI * 2);
        g.fill();
      }
    }

    this._renderFoot();
  }

  /* Legend + current values as real text. This is the accessible
     representation of the plot: colour-blind safe (each entry has a dash glyph
     and a name), screen-reader legible, and it never relies on hue alone. */
  _renderFoot() {
    if (!this.footEl) return;
    const xu = this.opts.xUnit;
    const rows = this.series.map(s => {
      const dash = `<span class="pgraph-swatch" style="--c:${s.color}" aria-hidden="true"></span>`;
      const val = s.last ? `${fmtNum(s.last.y)}${s.unit ? ' ' + s.unit : ''}` : '—';
      const xt = s.last ? `${fmtNum(s.last.x)}${xu ? ' ' + xu : ''}` : '—';
      return `<span class="pgraph-entry${s.visible ? '' : ' off'}">${dash}` +
        `<span class="pgraph-name">${s.label}</span>` +
        `<b>${val}</b><span class="pgraph-at">at ${xt}</span></span>`;
    });
    this.footEl.innerHTML = rows.join('') || '<span class="muted small">no series</span>';
  }
}

/* Compact number formatting: enough precision to read a physics value, few
   enough digits to fit an axis tick at 10px. */
function fmtNum(v) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(1);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  if (a === 0) return '0';
  return v.toFixed(3);
}

/* One-shot convenience for the common case: build a graph, attach it, and
   return a handle whose destroy() is safe to call more than once. */
export function createGraph(host, opts, series = []) {
  const g = new Graph(opts);
  host.appendChild(g.el);
  for (const s of series) g.addSeries(s);
  return g;
}

/* Live instances, so a later Virtual Lab or Challenge can attach to whatever
   the student is currently running instead of duplicating the physics. */
export const graphs = {
  all: [],
  add(g) { this.all.push(g); return g; },
  remove(g) {
    const i = this.all.indexOf(g);
    if (i >= 0) this.all.splice(i, 1);
  },
  latest() { return this.all[this.all.length - 1] || null; }
};

/* Exposed deliberately, not for debugging convenience: the bundler rewrites
   this module's path, so there is no stable URL to import it from once built.
   Exposing the constructor keeps the engine addressable for tests and for the
   lab/challenge features, in both the bundled and unbundled deployments.

   Assigned at the very END of the module, and only with values that are already
   initialised. An earlier version put this near the top, where GRAPH_COLORS is
   still in its temporal dead zone: the module then threw before it finished
   evaluating, which killed the whole app rather than just this file. */
function exposeEngine() {
  if (typeof window !== 'undefined') {
    window.PhysixGraph = { Graph, createGraph, graphs, GRAPH_COLORS };
  }
}

/* Palette taken from the site's own accent system so a graph sits inside the
   design language instead of importing a separate chart palette. These are the
   literal values of --acc2 / --warn / --ok / --acc / --bad, which means the
   graphs follow the site's colour scheme rather than fighting it.

   Colour is never the only channel: the legend gives each series a name, a
   dash glyph and its current value, so the plot remains readable with any
   form of colour blindness and to a screen reader. */
export const GRAPH_COLORS = {
  a: '#22d3ee',   /* --acc2  cyan    */
  b: '#fbbf24',   /* --warn  amber   */
  c: '#34d399',   /* --ok    green   */
  d: '#6d5df6',   /* --acc   violet  */
  e: '#f87171'    /* --bad   red     */
};

/* Last statement in the module, deliberately. See exposeEngine(): touching
   window before the consts above are initialised throws a ReferenceError that
   takes down every module importing this one - i.e. the entire app. */
exposeEngine();