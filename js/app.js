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
  return (_searchIndex = ix);
}

function doSearch(qs) {
  const words = qs.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  const hits = [];
  searchIndex().forEach(item => {
    let score = 0;
    words.forEach(w => {
      if (item.title.toLowerCase().includes(w)) score += 3;
      if (item.hay.includes(w)) score += 1;
    });
    if (score > 0) hits.push([score, item]);
  });
  hits.sort((a, b) => b[0] - a[0]);
  return hits.slice(0, 14).map(h => h[1]);
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
    '<button class="btn btn-primary" id="drawer-tutor" style="margin-top:auto">Ask the tutor</button>';
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

  setTimeout(() => toast("Everything you do here saves itself in this browser. No account, nothing to log into."), 900);
})();
