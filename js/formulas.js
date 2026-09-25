/* PhysiX Academy — Formula Library */
'use strict';

function formulaIndex() {
  const out = [];
  CURRICULUM.forEach(level => level.chapters.forEach(ch => ch.lessons.forEach(ls => {
    ls.content.forEach(b => {
      const push = f => {
        if (f && f.tex && !out.some(x => x.tex === f.tex))
          out.push(Object.assign({}, f, { href: '#/lesson/' + ls.id }));
      };
      if (b.formula) push(b.formula);
      if (b.formulas) b.formulas.forEach(push);
    });
  })));
  return out;
}
let _fIndex = null;
const getFormulaIndex = () => _fIndex || (_fIndex = formulaIndex());

function renderFormulaGrid() {
  const q = (App.fq || '').toLowerCase();
  const lvl = App.flvl || 'all';
  const list = getFormulaIndex().filter(f => {
    if (lvl !== 'all' && f.href.indexOf('#/lesson/' + lvl + '.') !== 0) return false;
    if (!q) return true;
    return ((f.name || '') + ' ' + (f.note || '')).toLowerCase().includes(q);
  });
  const grid = $('#f-grid');
  if (!grid) return;
  grid.innerHTML = list.length ? list.map((f, i) => `
    <div class="card hover formula-item" data-fi="${i}">
      <h3 class="mb0">${esc(f.name || 'Formula')}</h3>
      <div class="f-eq">$$${esc(f.tex)}$$</div>
      ${f.note ? '<p class="small muted">' + esc(f.note) + '</p>' : ''}
    </div>`).join('')
    : '<div class="empty-state"><div class="big">🔍</div><p>No formulas match “' + esc(App.fq) + '”.</p></div>';
  $$('.formula-item', grid).forEach(card =>
    card.addEventListener('click', () => openFormulaModal(list[+card.dataset.fi])));
  Tex.render(grid);
}

function openFormulaModal(f) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'formula-modal';
  ov.id = 'fm';
  ov.innerHTML = `
    <div class="fm-panel">
      <button class="fm-close" aria-label="Close">✕</button>
      <h2>${esc(f.name || 'Formula')}</h2>
      <div class="formula-card"><div class="f-eq">$$${esc(f.tex)}$$</div></div>
      ${f.vars ? '<h4 class="mt0" style="margin-top:1rem">Symbols</h4><ul class="f-vars">' +
        f.vars.map(v => '<li>' + mdInline(v) + '</li>').join('') + '</ul>' : ''}
      ${f.note ? '<p>' + mdInline(f.note) + '</p>' : ''}
      <a class="btn btn-primary btn-sm" href="${f.href}">Open the lesson →</a>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
  $('.fm-close', ov).addEventListener('click', closeModal);
  Tex.render(ov);
}

function closeModal() {
  const m = $('#fm');
  if (m) m.remove();
}

function viewFormulas(q) {
  App.fq = q ? decodeURIComponent(q) : '';
  App.flvl = 'all';
  const idx = getFormulaIndex();
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>∑ Formula Library</h1>
      <p class="sub">${idx.length} essential equations. Every card opens the lesson where it's derived — click any formula.</p></div>
    <input id="f-q" type="search" placeholder="Search formulas… e.g. momentum" value="${esc(App.fq)}">
    <div class="pills" style="margin:.8rem 0">
      ${['all'].concat(CURRICULUM.map(l => l.id)).map(p => {
        const l = CURRICULUM.find(x => x.id === p);
        return '<button class="pill' + (p === 'all' ? ' active' : '') + '" data-lvl="' + p + '">' +
          (l ? l.icon + ' ' + esc(l.tag) : 'All levels') + '</button>';
      }).join('')}
    </div>
    <div class="grid g3" id="f-grid"></div>
  </div>`;
  renderFormulaGrid();
  $('#f-q').addEventListener('input', debounce(e => {
    App.fq = e.target.value; renderFormulaGrid();
  }, 200));
  $$('.pill[data-lvl]', App.el).forEach(p => p.addEventListener('click', () => {
    $$('.pill[data-lvl]', App.el).forEach(x => x.classList.remove('active'));
    p.classList.add('active'); App.flvl = p.dataset.lvl; renderFormulaGrid();
  }));
}
