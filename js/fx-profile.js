/* PhysiX Academy — profile page effects.
 *
 * Ports the look of a few React Bits components to plain ES modules, because
 * this site ships no framework and has no build step: adding React for one page
 * would break both the static deploy and the file:// guarantee the standalone
 * simulations rely on.
 *
 * Ported, in the spirit of the originals:
 *   Shiny Text      -> .p-shiny        (pure CSS gradient sweep)
 *   Blur Text       -> splitWords()    (staggered blur-in, by word)
 *   Spotlight Card  -> attachSpotlight (pointer-following radial highlight)
 *   Click Spark     -> attachSparks    (radial particle burst on click)
 *   Specular Button -> .p-specular     (shine that tracks the pointer)
 *
 * Everything here is progressive enhancement. If this module fails to parse or
 * the browser lacks something, the page is still a working form: the base
 * classes in style.css are never overridden by anything in here.
 *
 * Motion is opt-out. `prefers-reduced-motion: reduce` disables every effect,
 * which matters because this page asks for a first name from what may well be a
 * student with a vestibular sensitivity, and because the site already ships
 * Atkinson Hyperlegible and screen-reader support. */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const noMotion = () => reduced.matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Blur Text: wrap words so each can fade up in turn ---------- */
export function splitWords(el) {
  if (!el || el.dataset.split === 'done') return;
  const text = el.textContent.trim();
  if (!text) return;
  el.dataset.split = 'done';
  el.setAttribute('aria-label', text);   // screen readers get the plain sentence
  el.setAttribute('aria-hidden', 'true'); // ...while the spans are decorative
  el.textContent = '';
  text.split(/(\s+)/).forEach(part => {
    if (/^\s+$/.test(part)) { el.append(' '); return; }
    const w = document.createElement('span');
    w.className = 'p-word';
    w.textContent = part;
    el.append(w);
  });
}

/* ---------- Spotlight Card: highlight that follows the pointer ---------- */
function attachSpotlight(card) {
  if (!card || !finePointer() || noMotion()) return;
  const move = (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '0%');
  });
}

/* ---------- Click Spark: burst of particles from the click point ---------- */
function attachSparks(canvas, host) {
  if (!canvas || noMotion()) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;                       // no 2d context, just skip the effect
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bits = [];
  const ACCENT = [109, 93, 246];

  const resize = () => {
    const r = host.getBoundingClientRect();
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const onClick = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const sp = 1.6 + Math.random() * 3.4;
      bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
  };
  host.addEventListener('pointerdown', onClick);

  let raf = null;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.12;            // gravity, so sparks arc rather than fly straight
      b.vx *= 0.97;
      b.life -= 0.022;
      if (b.life <= 0) { bits.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(b.life, 0);
      ctx.fillStyle = `rgb(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]})`;
      ctx.fillRect(b.x, b.y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    raf = bits.length ? requestAnimationFrame(tick) : null;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  /* Wrap the original handler rather than replacing it: the form must still
     submit exactly as it did before the decoration was added. */
  const btn = host.querySelector('#p-save');
  if (btn) btn.addEventListener('click', kick, { passive: true });
}

/* Called once from login.html after the DOM exists. */
export function initProfileFx({ card, heading, wordmark, sparkHost }) {
  if (wordmark) wordmark.classList.add('p-shiny');
  splitWords(heading);
  if (card) {
    card.classList.add('p-spotlight');
    attachSpotlight(card);
  }
  attachSparks(sparkHost && sparkHost.querySelector('canvas'), sparkHost);

  /* Honour a mid-session change to the OS motion setting. */
  const onChange = () => { if (noMotion()) document.body.classList.add('p-still'); };
  reduced.addEventListener?.('change', onChange);
  onChange();
}
