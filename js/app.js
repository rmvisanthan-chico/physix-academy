/* PhysiX Academy — App shell: search, wiring, bootstrap */
'use strict';

/* ---------------- Search index ---------------- */
let _searchIndex = null;
function searchIndex() {
  if (_searchIndex) return _searchIndex;
  const ix = [];
  CURRICULUM.forEach(level => level.chapters.forEach(ch => ch.lessons.forEach(ls => {
    let hay = ls.title + ' ' + ch.title;
    ls.content.forEach(b => {
      if (!b) return;
      if (b.why) hay += ' ' + b.why.q + ' ' + b.why.p;
      if (b.formula && b.formula.tex) hay += ' ' + (b.formula.name || '');
      if (b.revise) hay += ' ' + b.revise.join(' ');
    });
      ix.push({
        type: 'Lesson', icon: '📖', title: ls.title,
        sub: level.name + ' › ' + ch.title, href: '#/lesson/' + ls.id,
        hay: hay.toLowerCase()
      });
    })));
    getFormulaIndex().forEach(f => {
      ix.push({
        type: 'Formula', icon: '∑', title: f.name || f.tex.slice(0, 40),
        sub: (f.note || '').slice(0, 70), href: f.href,
        hay: ((f.name || '') + ' ' + (f.note || '')).toLowerCase()
      });
    });
    QUIZ_BANK.forEach(q => {
      ix.push({
        type: 'Question', icon: '❓', title: q.q.replace(/<[^>]+>/g, '').slice(0, 80),
        sub: q.topic, href: '#/practice',
        hay: (q.q + ' ' + q.topic + ' ' + q.choices.join(' ')).toLowerCase().replace(/<[^>]+>/g, '')
      });
    });
    /* Tokenise once here rather than on every keystroke. Title tokens drive
       the weighted matches; hay tokens catch a typo inside body text. */
    ix.forEach(it => {
      it.toks = tokensOf(it.title);
      it.hayToks = tokensOf(it.hay);
    });
    return (_searchIndex = ix);
  }

  /* --- typo-tolerant matching (Phase 4) ---
     Written by hand rather than pulling in Fuse.js: that would have to be
     fetched or bundled, and this app has to keep working opened straight
     from disk over file:// with no network. */

  /* Damerau-Levenshtein with an early exit, so a transposition counts as one
     edit: "accleration" is 1 edit from "acceleration", not 2. */
  function editDist(a, b, cap) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > cap) return cap + 1;
    let prev2 = null;
    let prev = new Array(lb + 1), cur = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      let best = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < best) best = v;
      }
      if (best > cap) return cap + 1;
      const spare = new Array(lb + 1);
      prev2 = prev; prev = cur; cur = spare;
    }
    return prev[lb];
  }

  const editCap = w => (w.length <= 4 ? 1 : w.length <= 8 ? 2 : 3);

  /* Tokens of a searchable string, kept once at index build time so that
     typing does not re-tokenise every record on each keystroke. */
  const tokensOf = s => s.toLowerCase().split(/[^a-z0-9+\-/^°]+/).filter(t => t.length > 1);

  /* Best (lowest) edit distance from w to any token. */
  function nearest(w, toks, cap) {
    let best = cap + 1;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t === w) return 0;
      if (Math.abs(t.length - w.length) > cap) continue;
      const d = editDist(w, t, cap);
      if (d < best) { best = d; if (best === 1) break; }
    }
    return best;
  }

  /* Score one query word against one record. Returns 0 for no match, so the
     caller can require every word to hit something. */
  function scoreWord(w, item, cap) {
    const title = item.title.toLowerCase();
    if (title.indexOf(w) >= 0) {
      // a whole-word hit at the start of the title is the best possible signal
      return title.indexOf(w) === 0 || title.startsWith(w + ' ') ? 100 : 90;
    }
    if (item.hay.indexOf(w) >= 0) return 40;

    const dT = nearest(w, item.toks, cap);
    if (dT <= cap) return dT === 1 ? 30 : 14;
    const dH = nearest(w, item.hayToks, cap);
    if (dH <= cap) return dH === 1 ? 20 : 8;
    return 0;
  }

  function doSearch(qs) {
    const words = qs.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];
    const ix = searchIndex();

    // Fast path: exact substring matches, which is what a correctly spelled
    // query produces. Only fall back to the (much costlier) fuzzy pass when
    // that comes up short, so typing stays instant.
    const exact = [];
    ix.forEach(item => {
      let s = 0;
      for (const w of words) {
        if (item.title.toLowerCase().indexOf(w) >= 0) s += 3;
        else if (item.hay.indexOf(w) >= 0) s += 1;
        else { s = 0; break; }
      }
      if (s > 0) exact.push([s, item]);
    });
    if (exact.length >= 8) {
      exact.sort((a, b) => b[0] - a[0]);
      return exact.slice(0, 14).map(h => h[1]);
    }

    // Fuzzy pass. Prefer records matching EVERY word, so "accleration prism"
    // does not return loose hits on one word alone.
    const hits = [];
    ix.forEach(item => {
      let total = 0;
      for (const w of words) {
        const s = scoreWord(w, item, editCap(w));
        if (!s) { total = 0; break; }
        total += s;
      }
      if (total > 0) hits.push([total, item]);
    });
    if (hits.length) {
      hits.sort((a, b) => b[0] - a[0]);
      return hits.slice(0, 14).map(h => h[1]);
    }

    // Nothing matched all of them. Falling back to OR beats returning an
    // empty box: show the best records for any word, most-matched first.
    const any = [];
    ix.forEach(item => {
      let total = 0, matched = 0;
      for (const w of words) {
        const s = scoreWord(w, item, editCap(w));
        if (s) { matched++; total += s; }
      }
      if (matched) any.push([matched * 1000 + total, item]);
    });
    any.sort((a, b) => b[0] - a[0]);
    return any.slice(0, 14).map(h => h[1]);
  }

let _srActive = -1, _srItems = [];

function renderSearchResults(qs) {
  const box = $('#search-results'), hints = $('#search-hints');
  if (!qs.trim()) {
    box.innerHTML = '';
    hints.style.display = '';
    _srItems = []; _srActive = -1;
    return;
  }
  hints.style.display = 'none';
  _srItems = doSearch(qs);
  if (!_srItems.length) {
    box.innerHTML = '<div class="search-empty">No matches for “' + esc(qs) + '”. Try a shorter keyword.</div>';
    return;
  }
  let lastType = '', html = '';
  _srItems.forEach((it, i) => {
    if (it.type !== lastType) { html += '<div class="sr-group">' + it.type + 's</div>'; lastType = it.type; }
    html += `<a class="sr-item" data-i="${i}" href="${it.href}">
      <span class="sr-icon">${it.icon}</span>
      <span><b>${esc(it.title)}</b><br><span class="small muted">${esc(it.sub)}</span></span></a>`;
  });
  box.innerHTML = html;
  _srActive = -1;
  $$('.sr-item', box).forEach(a => a.addEventListener('click', closeSearch));
}

function moveActive(dir) {
  if (!_srItems.length) return;
  _srActive = (_srActive + dir + _srItems.length) % _srItems.length;
  $$('.sr-item').forEach(a => a.classList.toggle('active', +a.dataset.i === _srActive));
  $('.sr-item.active')?.scrollIntoView({ block: 'nearest' });
}

function openSearch() {
  $('#search-overlay').classList.add('open');
  const inp = $('#search-input');
  inp.value = ''; renderSearchResults('');
  setTimeout(() => inp.focus(), 30);
}
function closeSearch() {
  $('#search-overlay').classList.remove('open');
}

/* ---------------- Mobile drawer ---------------- */
function buildDrawer() {
  const d = $('#drawer');
  d.innerHTML = '<a class="brand" href="#/" style="margin-bottom:.6rem">' +
    $('.topbar .brand').innerHTML + '</a>' + $('#mainnav').innerHTML +
    '<div style="margin-top:auto;border-top:1px solid var(--card-brd);padding-top:.8rem;display:flex;flex-direction:column;gap:.3rem">' +
    '<a href="privacy.html" style="font-size:.82rem;color:var(--txt3)">Privacy Policy</a>' +
    '<a href="terms.html" style="font-size:.82rem;color:var(--txt3)">Terms and Conditions</a>' +
    '</div>' +
    '<button class="btn btn-primary" id="drawer-tutor" style="margin-top:.8rem">Ask the tutor</button>';
  $$('a', d).forEach(a => a.addEventListener('click', closeDrawer));
  $('#drawer-tutor').addEventListener('click', () => { closeDrawer(); location.hash = '#/tutor'; });
}
const openDrawer = () => {
  $('#drawer').classList.add('open'); $('#scrim').classList.add('show');
  $('#btn-menu').setAttribute('aria-expanded', 'true');
};
function closeDrawer() {
  $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show');
  $('#btn-menu').setAttribute('aria-expanded', 'false');
}

/* ---------------- Nav tooltips ---------------- */
const TP = {
  learn: 'Browse the NCERT-aligned curriculum — lessons, Class 9 to 12.',
  topics: 'Physics by subject area — mechanics, waves, electricity, optics.',
  sims: '26+ live simulations you can drag, poke and break.',
  games: 'Learn by playing — physics-based mini games.',
  practice: 'Timed quiz sessions that explain every answer, right or wrong.',
  tutor: 'Ask anything — the offline AI tutor solves problems step by step.',
  formulas: 'Every formula with its derivation and notes, searchable.',
  calculators: 'Quick physics calculators for common problems.',
  people: 'The physicists behind the ideas.',
  progress: 'Your saved progress, stats and weakest topics.',
  support: 'Keep this project free — donate what you can.'
};

/* ---------------- Bootstrap ---------------- */
(function initApp() {
  App.el = $('#main');

  Quiz.init();
  if (!Tutor.docs) Tutor.build();
  buildDrawer();

  $('#btn-search').addEventListener('click', openSearch);
  $('#search-overlay').addEventListener('click', e => {
    if (e.target.id === 'search-overlay') closeSearch();
  });
  $('#search-input').addEventListener('input', e => renderSearchResults(e.target.value));
  $('#search-input').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter' && _srItems.length) {
      location.hash = _srItems[Math.max(0, _srActive)].href;
      closeSearch();
    }
  });
  $$('#search-hints button').forEach(b =>
    b.addEventListener('click', () => {
      $('#search-input').value = b.dataset.q;
      renderSearchResults(b.dataset.q);
      $('#search-input').focus();
    }));

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#search-overlay').classList.contains('open') ? closeSearch() : openSearch();
    } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault(); openSearch();
    } else if (e.key === 'Escape') {
      closeSearch(); closeModal(); closeDrawer();
    }
  });

  $('#btn-theme').addEventListener('click', () => Theme.toggle());
  $('#btn-accent').addEventListener('click', () =>
    toast('Theme: ' + Theme.NAMES[Theme.cycleAccent()]));
  $('#btn-menu').addEventListener('click', () =>
    $('#drawer').classList.contains('open') ? closeDrawer() : openDrawer());
  $('#scrim').addEventListener('click', closeDrawer);
  $('#fab-tutor').addEventListener('click', () => { location.hash = '#/tutor'; });

  /* Brand Studio Modal wiring */
  const bs = $('#brand-studio');
  const openBS = () => bs?.classList.add('open');
  const closeBS = () => bs?.classList.remove('open');

  $('#brand-trigger')?.addEventListener('click', openBS);
  $('#bs-backdrop')?.addEventListener('click', closeBS);
  $('#bs-close')?.addEventListener('click', closeBS);
  $('#bs-home')?.addEventListener('click', () => { closeBS(); location.hash = '#/'; });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeBS();
  });

  window.addEventListener('hashchange', route);
  route();

  initConsent();
  initTooltips();

  setTimeout(() => toast("Everything you do here saves itself in this browser. No account, nothing to log into."), 900);
})();

function initConsent() {
  if (typeof PHYSIX_CONSENT === 'undefined') return;
  const banner = $('#cookie-consent');
  if (PHYSIX_CONSENT.hasDecision()) { PHYSIX_CONSENT.apply(); return; }
  if (!banner) return;
  setTimeout(() => { banner.hidden = false; }, 1500);
  $('#cookie-accept').addEventListener('click', () => {
    banner.hidden = true; PHYSIX_CONSENT.decide(true);
    toast('Thanks! Analytics enabled.');
  });
  $('#cookie-decline').addEventListener('click', () => {
    banner.hidden = true; PHYSIX_CONSENT.decide(false);
    toast('No cookies, no analytics — your lessons still work.');
  });
}

/* ---- rich tooltips on nav links ---- */
function initTooltips() {
  const tip = document.createElement('div');
  tip.className = 'nav-tip'; tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  $$('#mainnav a[data-nav]').forEach(a => {
    if (!TP[a.dataset.nav]) return;
    a.addEventListener('mouseenter', e => {
      tip.textContent = TP[a.dataset.nav];
      const r = a.getBoundingClientRect();
      tip.hidden = false;
      tip.style.top = (r.bottom + 8) + 'px';
      tip.style.left = Math.max(10, Math.min(r.left + r.width / 2 - tip.offsetWidth / 2, window.innerWidth - 10 - tip.offsetWidth)) + 'px';
    });
    a.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}
