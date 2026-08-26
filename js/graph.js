/* PhysiX Academy — Knowledge Graph */
'use strict';

const KG_EDGES = [
  ['l1.what', 'l1.units'], ['l1.units', 'l1.notation'], ['l1.notation', 'l1.vectors'],
  ['l1.vectors', 'l1.math'], ['l1.units', 'l3.unitsdim'],
  ['l1.vectors', 'l2.motion'], ['l2.motion', 'l2.force'], ['l2.force', 'l2.work'],
  ['l2.force', 'l2.momentum'], ['l2.force', 'l2.gravity'], ['l2.heat', 'l2.waves'],
  ['l2.elec', 'l2.mag'], ['l1.math', 'l2.elec'], ['l2.light', 'l2.waves'],
  ['l2.motion', 'l3.kin1d'], ['l3.kin1d', 'l3.kin2d'], ['l3.kin2d', 'l4.rel'],
  ['l2.force', 'l3.laws'], ['l3.laws', 'l3.work'], ['l3.work', 'l3.systems'],
  ['l3.systems', 'l3.rot'], ['l3.rot', 'l4.advmech'], ['l3.grav', 'l4.advmech'],
  ['l3.laws', 'l3.solids'], ['l3.solids', 'l3.fluids'], ['l2.heat', 'l3.thermal'],
  ['l3.thermal', 'l3.thermo'], ['l3.thermo', 'l3.kt'], ['l3.kt', 'l4.stat'],
  ['l3.work', 'l3.shm'], ['l3.shm', 'l3.waves'], ['l3.waves', 'l3.sound'],
  ['l2.elec', 'l3.charges'], ['l3.charges', 'l3.potcap'], ['l3.potcap', 'l3.current'],
  ['l3.current', 'l3.moving'], ['l3.moving', 'l3.matter'], ['l3.moving', 'l3.emi'],
  ['l3.emi', 'l3.ac'], ['l3.ac', 'l4.advem'], ['l2.light', 'l3.ray'],
  ['l3.ray', 'l3.wavopt'], ['l3.wavopt', 'l3.dual'], ['l3.dual', 'l3.atoms'],
  ['l3.atoms', 'l3.nuclei'], ['l3.nuclei', 'l4.nucpart'], ['l3.atoms', 'l3.semi'],
  ['l3.semi', 'l4.condensed'], ['l4.quantum', 'l4.condensed'], ['l3.dual', 'l4.quantum'],
  ['l4.rel', 'l4.quantum'], ['l4.nucpart', 'l4.astro'], ['l4.rel', 'l4.astro']
];

function viewGraph() {
  const rowH = 40, colW = 210, nodeW = 176, nodeH = 30, pad = 16;
  const cols = CURRICULUM;
  const maxRows = Math.max(...cols.map(l => l.chapters.length));
  const W = cols.length * colW + pad * 2, H = maxRows * rowH + pad * 2 + 8;
  const pos = {};
  cols.forEach((l, li) => l.chapters.forEach((ch, ci) => {
    pos[ch.id] = { x: pad + li * colW, y: pad + ci * rowH };
  }));

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>🕸️ Physics Knowledge Graph</h1>
      <p class="sub">Each chapter is a node; arrows show what should be learned first. Click a node to inspect it.</p></div>
    <div class="pills" style="margin-bottom:.6rem">
      ${cols.map(l => `<span class="chip plain" style="color:${l.color};border-color:${l.color}66">${l.icon} ${esc(l.tag)}</span>`).join('')}
      <span class="chip plain">→ arrow = prerequisite</span>
    </div>
    <div class="kg-wrap">
      <div class="kg-svg-box">
        <svg id="kg-svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
          ${KG_EDGES.map(([a, b], i) => {
            const A = pos[a], B = pos[b];
            if (!A || !B) return '';
            const x1 = A.x + nodeW, y1 = A.y + nodeH / 2;
            const x2 = B.x, y2 = B.y + nodeH / 2;
            const mx = (x1 + x2) / 2;
            return `<path class="kg-edge" data-e="${a}|${b}" data-i="${i}"
              d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" />`;
          }).join('')}
          ${Object.keys(pos).map(id => {
            const p = pos[id];
            const ch = findChapter(id);
            return `<g class="kg-node" data-id="${id}" transform="translate(${p.x},${p.y})">
              <rect width="${nodeW}" height="${nodeH}" rx="9"></rect>
              <text x="10" y="20">${ch.icon} ${esc(ch.title.replace(' ⭐', '').slice(0, 24))}</text>
            </g>`;
          }).join('')}
        </svg>
      </div>
      <aside class="card kg-panel" id="kg-panel">
        <h3>Click any node</h3>
        <p class="muted small">You'll see the chapter's lessons, your progress there, and a jump link.</p>
      </aside>
    </div>
  </div>`;

  function findChapter(id) {
    for (const l of CURRICULUM) {
      const ch = l.chapters.find(c => c.id === id);
      if (ch) return { level: l, ch };
    }
    return null;
  }

  $$('.kg-node', App.el).forEach(n => n.addEventListener('click', () => {
    $$('.kg-node.sel', App.el).forEach(x => x.classList.remove('sel'));
    $$('.kg-edge.hl', App.el).forEach(x => x.classList.remove('hl'));
    n.classList.add('sel');
    const found = findChapter(n.dataset.id);
    if (!found) return;
    const { level, ch } = found;
    KG_EDGES.forEach((e, i) => { if (e.includes(n.dataset.id)) $(`.kg-edge[data-i="${i}"]`, App.el)?.classList.add('hl'); });
    const done = ch.lessons.filter(ls => Store.isComplete(ls.id)).length;
    $('#kg-panel').innerHTML = `
      <h3>${ch.icon} ${esc(ch.title)}</h3>
      <p class="small muted">${level.icon} ${esc(level.name)}</p>
      <p class="small">${esc(ch.tagline)}</p>
      <div class="topic-meta"><span class="chip ${done ? 'green' : 'plain'}">${done}/${ch.lessons.length} done</span></div>
      <ul style="margin:.6rem 0;padding-left:1.1rem">
        ${ch.lessons.map(ls => `<li><a href="#/lesson/${ls.id}">${esc(ls.title)}</a>${Store.isComplete(ls.id) ? ' ✓' : ''}</li>`).join('')}
      </ul>`;
    Tex.render($('#kg-panel'));
  }));
}
