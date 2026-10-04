/* PhysiX Academy - screen-reader bridge for the simulations.
   A <canvas> is opaque to assistive tech: it looks like an empty box, so a
   blind user gets no idea what a simulation is showing or whether dragging a
   slider did anything. This module mirrors the visible state into a polite
   live region so every change is spoken, and gives the canvas itself a role,
   a label and keyboard focus.

   Deliberately dependency-free and self-contained: the simulations must keep
   working offline from file:// with no build step.

   Typical use - most simulations need nothing beyond this:
     <script src="lib/a11y.js"></script>
   and then just let it observe the readout elements. For events that are not
   visible anywhere in the DOM (a collision, an emitted photon), call
     PhysixA11y.announce('The blocks collided and bounced apart.');

   Announcements are debounced, because a slider drag fires dozens of updates
   a second and speaking each one would be unusable. */
(function (global) {
  'use strict';

  const POLITELY = 'polite';
  const SETTLE_MS = 700;      // wait for the value to stop changing
  const MAX = 240;            // guard against a runaway region

  let region = null;
  let queue = [];
  let timer = 0;
  let lastSpoken = '';

  function ensureRegion() {
    if (region && region.isConnected) return region;
    region = document.getElementById('a11y-live');
    if (region) return region;
    region = document.createElement('div');
    region.id = 'a11y-live';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', POLITELY);
    region.setAttribute('aria-atomic', 'true');
    // visually hidden but not display:none, which would silence it
    region.style.cssText =
      'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
      'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0';
    document.body.appendChild(region);
    return region;
  }

  function flush() {
    timer = 0;
    if (!queue.length) return;
    const text = queue.join('. ');
    queue = [];
    if (!text || text === lastSpoken) return;
    lastSpoken = text;
    const r = ensureRegion();
    // a same-text update is not re-announced by most readers, so nudge it
    r.textContent = text.slice(0, MAX);
  }

  function announce(text, opts) {
    if (!text) return;
    const o = opts || {};
    queue = o.replace ? [] : queue;
    queue.push(String(text).replace(/\s+/g, ' ').trim());
    if (queue.join('. ').length > MAX) queue = [queue.join('. ').slice(0, MAX)];
    clearTimeout(timer);
    timer = setTimeout(flush, o.now ? 0 : SETTLE_MS);
  }

  /* Build a spoken sentence out of the readouts a simulation already shows.
     This is what gives every simulation coverage without touching its code. */
  function readouts() {
    const out = [];
    const cells = document.querySelectorAll(
      '.ro, .chip, [data-a11y], .brow'
    );
    for (const c of cells) {
      if (c.closest('[aria-hidden="true"]')) continue;
      const label = c.querySelector('span, .rl, label');
      const value = c.querySelector('b, .rv, output');
      if (!label || !value) continue;
      const k = (label.textContent || '').trim().replace(/[;:]\s*$/, '');
      let v = (value.textContent || '').trim();
      if (!k || !v || v === '-' || v === '—') continue;
      out.push(k + ' ' + speakify(v));
    }
    return out;
  }

/* "2.37 m/s^2" reads badly, so units are spelled out. Only applied where a
     unit actually follows a number: an earlier version rewrote symbols inside
     labels too, which turned "Period T" into "Period tesla" and the shell
     radius "476 pm" into "476 beats per minute". */
  const UNITS = [
    [/(?<=\d\s?)m\/s\^?2/gi, 'metres per second squared'],
    [/(?<=\d\s?)m\/s/gi, 'metres per second'],
    [/(?<=\d\s?)MPa/gi, 'megapascals'],
    [/(?<=\d\s?)ms/gi, 'milliseconds'],
    [/(?<=\d\s?)mm/g, 'millimetres'],
    [/(?<=\d\s?)cm/g, 'centimetres'],
    [/(?<=\d\s?)km/g, 'kilometres'],
    [/(?<=\d\s?)pm/g, 'picometres'],
    [/(?<=\d\s?)kg/g, 'kilograms'],
    [/(?<=\d\s?)kJ/g, 'kilojoules'],
    [/(?<=\d\s?)kN/g, 'kilonewtons'],
    [/(?<=\d\s?)kPa/g, 'kilopascals'],
    [/(?<=\d\s?)kW/g, 'kilowatts'],
    [/(?<=\d\s?)ns/g, 'nanoseconds'],
    [/(?<=\d\s?)eV/g, 'electron volts'],
    [/(?<=\d\s?)nm/g, 'nanometres'],
    [/(?<=\d\s?)mm\^?3/g, 'cubic millimetres'],
    [/(?<=\d\s?)m\^?3/g, 'cubic metres'],
    [/(?<=\d\s?)cm\^?3/g, 'cubic centimetres'],
    [/(?<=\d\s?)(mm|m|kg|g|N|J|W|Pa|V|A|Hz|K|T|Wb|C|F|H|mol|Ω|s)\b/g, '$1'],
    [/(?<=\d\s?)Ω/g, 'ohms'],
    [/(?<=\d\s?)°C/g, 'degrees Celsius'],
    [/(?<=\d\s?)Wb/g, 'weber'],
    [/(?<=\d\s?)L\/s/g, 'litres per second']
  ];
  /* Map the single-letter ones by hand, since a lookbehind cannot rename. */
  const WORD = { m: 'metres', kg: 'kilograms', g: 'grams', N: 'newtons', J: 'joules',
    W: 'watts', Pa: 'pascals', V: 'volts', A: 'amps', Hz: 'hertz', K: 'kelvin',
    T: 'tesla', Wb: 'weber', C: 'coulombs', F: 'farads', H: 'henries', s: 'seconds', L: 'litres' };

  function speakify(v) {
    let s = String(v);
    // protect the label-free value, then expand only number-adjacent units
    for (const [re, word] of UNITS) {
      if (word === '$1') continue;
      s = s.replace(re, ' ' + word + ' ');
    }
    s = s.replace(/(?<=\d\s?)(mm|m|kg|g|N|J|W|Pa|V|A|Hz|K|T|Wb|C|F|H|s|Ω|L)\b/gi,
      (m0, u) => ' ' + (WORD[u] || WORD[u.toLowerCase()] || m0) + ' ');
    return s.replace(/\s+/g, ' ').replace(/[\s,]+([.,)])/g, '$1').replace(/^[\s,]+|[\s,]+$/g, '');
  }

  function announceState(prefix) {
    const bits = readouts();
    if (bits.length) {
      announce((prefix ? prefix + '. ' : '') + bits.join(', '));
      return;
    }
    /* A few simulations show no numeric cells at all and put their whole
       result in the plain-language verdict. That is better than silence. */
    const v = document.getElementById('v');
    const c = document.getElementById('chk');
    const say = [v, c].map(e => e && (e.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(s => s && s !== '—' && s.length > 3);
    if (say.length) announce((prefix ? prefix + '. ' : '') + speakify(say.join('. ')));
  }

  /* Give the canvas an accessible identity and a keyboard target. */
  function dressCanvas(cv, label) {
    if (!cv) return;
    if (!cv.hasAttribute('tabindex')) cv.setAttribute('tabindex', '0');
    if (!cv.hasAttribute('role')) cv.setAttribute('role', 'img');
    if (!cv.getAttribute('aria-label')) {
      cv.setAttribute('aria-label', label || (document.title + ' — interactive 3D simulation'));
    }
    const r = ensureRegion();
    if (!cv.getAttribute('aria-describedby')) {
      cv.setAttribute('aria-describedby', 'a11y-live');
    }
    cv.addEventListener('focus', function () {
      announce((cv.getAttribute('aria-label') || 'Simulation') +
        '. Interactive 3D view. Use the labelled sliders and buttons to change the situation.');
    }, { once: false });
    void r;
  }

  let installed = false;
  function install(opts) {
    const o = opts || {};
    installed = true;
    ensureRegion();
    if (o.canvas) dressCanvas(o.canvas, o.label);
    // first paint is worth speaking: a blind user should not have to drag
    // something to learn the starting state
    if (o.immediate !== false) setTimeout(() => announceState(o.prefix), 1200);
  }

  /* Fallback for the older Canvas 2D simulations, which never call
     Physix3D.stage() and so would otherwise get no announcements at all. */
  function autoInstall() {
    if (installed) return;
    const cv = document.querySelector('canvas');
    if (!cv) return;
    install({ canvas: cv });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInstall, { once: true });
  } else {
    setTimeout(autoInstall, 0);
  }

  global.PhysixA11y = {
    announce, announceState, readouts, speakify, dressCanvas, ensureRegion,
    install,
    get region() { return ensureRegion(); }
  };
})(window);