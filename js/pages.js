/* PhysiX Academy — Pages: Practice sessions, Simulations gallery, AI Tutor page */
'use strict';

/* ---------------- Practice ---------------- */
const Session = { qs: [], i: 0, correct: 0, misses: [] };

function viewPractice() {
  const diffs = ['any', ...Object.keys(DIFFS)];
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Practice</h1>
      <p class="sub">Every question explains itself after you answer. Wrong answers teach more than right ones — we wrote extra explanations for them.</p></div>
    <div class="card" style="max-width:640px">
      <h3>Build a session</h3>
      <div class="pills" id="p-lvl">${['all', ...CURRICULUM.map(l => l.id)].map((p, i) => {
        const l = CURRICULUM.find(x => x.id === p);
        return '<button class="pill' + (i === 0 ? ' active' : '') + '" data-v="' + p + '">' + (l ? l.icon + ' ' + esc(l.name) : 'Any level') + '</button>';
      }).join('')}</div>
      <div class="pills" style="margin-top:.5rem" id="p-diff">${diffs.map((d, i) =>
        '<button class="pill' + (i === 0 ? ' active' : '') + '" data-v="' + d + '">' +
        (d === 'any' ? 'Any difficulty' : DIFFS[d].dot + ' ' + DIFFS[d].label) + '</button>').join('')}</div>
      <div class="btn-row" style="margin-top:1rem">
        <label class="muted small">Questions:
          <select id="p-count" style="background:var(--panel2);border:1px solid var(--card-brd);color:var(--txt);border-radius:8px;padding:.4rem .6rem;margin-left:.4rem">
            <option>5</option><option selected>10</option><option>15</option><option>20</option>
          </select></label>
        <button class="btn btn-primary" id="p-start">Start session →</button>
      </div>
      ${Store.data.quiz.history.length ? '<hr class="divider"><p class="small muted mb0">So far: <b>' + Store.data.solved + '</b> answers · accuracy <b>' +
        Math.round(100 * Store.data.quiz.history.filter(h => h.correct).length / Store.data.quiz.history.length) + '%</b></p>' : ''}
    </div>
    <div id="session-zone"></div>
  </div>`;

  const pick = zone => {
    $$('.pill', zone).forEach(p => p.addEventListener('click', () => {
      $$('.pill', zone).forEach(x => x.classList.remove('active'));
      p.classList.add('active');
    }));
  };
  pick($('#p-lvl')); pick($('#p-diff'));
  const activeVal = zone => { const a = $('.pill.active', zone); return a ? a.dataset.v : 'all'; };

  $('#p-start').addEventListener('click', () => {
    const lvl = activeVal($('#p-lvl')), diff = activeVal($('#p-diff'));
    let pool = QUIZ_BANK.slice();
    if (lvl !== 'all') {
      const level = CURRICULUM.find(l => l.id === lvl);
      const ids = new Set(level.chapters.flatMap(c => c.lessons.flatMap(ls =>
        ls.content.filter(b => b.quiz).flatMap(b => b.quiz))));
      pool = pool.filter(q => ids.has(q.id));
    }
    if (diff !== 'any') pool = pool.filter(q => q.difficulty === diff);
    if (!pool.length) { toast('No questions match that filter — widen it a little.', 'bad'); return; }
    Session.qs = pool.sort(() => Math.random() - 0.5).slice(0, +$('#p-count').value);
    Session.i = 0; Session.correct = 0; Session.misses = [];
    renderQ();
    $('#session-zone').scrollIntoView({ behavior: 'smooth' });
  });

  function renderQ() {
    const zone = $('#session-zone');
    if (Session.i >= Session.qs.length) return finish(zone);
    const q = Session.qs[Session.i];
    zone.innerHTML = `
      <div class="session-bar">
        <b>Question ${Session.i + 1}/${Session.qs.length}</b>
        <span class="sb-score">Score ${Session.correct}</span>
      </div><div id="q-here"></div>`;
    Quiz.renderOne($('#q-here'), q, ok => {
      if (!ok) Session.misses.push(q.topic); else Session.correct++;
      $('.sb-score', zone).textContent = 'Score ' + Session.correct;
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-primary btn-sm';
      nextBtn.style.margin = '.8rem 0';
      nextBtn.textContent = Session.i + 1 >= Session.qs.length ? 'See results' : 'Next question →';
      nextBtn.addEventListener('click', () => { Session.i++; renderQ(); });
      $('#q-here').appendChild(nextBtn);
      Tex.render($('#q-here'));
    });
    Tex.render(zone);
  }

  function finish(zone) {
    const pct = Math.round(100 * Session.correct / Session.qs.length);
    const worst = Session.misses.sort((a, b) =>
      Session.misses.filter(x => x === b).length - Session.misses.filter(x => x === a).length)[0];
    zone.innerHTML = `
      <div class="card center">
        <h2>${pct >= 80 ? 'Excellent.' : pct >= 50 ? 'Solid.' : 'Not yet — go again.'}</h2>
        <div class="ring" style="--p:${pct};margin:1rem auto"><span class="rv">${pct}%</span></div>
        <p>${Session.correct} of ${Session.qs.length} correct.</p>
        ${worst ? '<p class="small muted">Weakest topic this round: <span class="chip amber">' + esc(worst) + '</span> — try its lesson again?</p>' : '<p class="small muted">Flawless round. It gets harder from here.</p>'}
        <div class="btn-row" style="justify-content:center;margin-top:1rem">
          <a class="btn btn-primary" href="#/practice">↻ New session</a>
          <a class="btn" href="#/progress">View progress</a>
        </div>
      </div>`;
    toast('Session complete: ' + pct + '%');
  }
}

/* ---------------- Simulations ---------------- */
function viewSimsPage(id) {
  if (id && Sims.reg[id]) {
    const d = Sims.reg[id];
    const usedIn = flatLessons().filter(e => e.lesson.content.some(b => b.sim === id));
    App.el.innerHTML = `
    <div class="wrap">
      <div class="page-head"><a class="small" href="#/sims">‹ All simulations</a>
        <h1>${d.icon} ${esc(d.title)}</h1><p class="sub">${esc(d.desc)}</p></div>
      <div class="sim-slot-lg"></div>
      ${usedIn.length ? '<p class="small muted">Used in: ' + usedIn.map(e =>
        '<a href="#/lesson/' + e.lesson.id + '">' + esc(e.chapter.title) + '</a>').join(' · ') + '</p>' : ''}
    </div>`;
    Sims.mount(id, $('.sim-slot-lg', App.el));
    return;
  }
  const items = Object.values(Sims.reg);
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Simulations</h1>
    <p class="sub">Physics you can poke. Every simulation runs live in your browser — drag the sliders and watch the equations respond.</p></div>
    ${items.length ? '<div class="grid g3">' + items.map(d => `
      <div class="card hover topic-card">
        <h3>${d.icon} ${esc(d.title)}</h3>
        <p class="muted">${esc(d.desc)}</p>
        <div class="topic-meta"><a class="btn btn-sm btn-primary" href="#/sims/${d.id}">Open ▸</a></div>
      </div>`).join('') + '</div>'
      : '<div class="empty-state"><div class="big">🔧</div><p>No simulations registered yet.</p></div>'}
  </div>`;
}

/* ---------------- Tutor page ---------------- */
function viewTutorPage() {
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>PhysiX Tutor</h1>
      <p class="sub">Ask anything about the lessons — it searches the whole curriculum for you. Works fully offline.</p></div>
    <div class="tutor-layout">
      <div class="chat-panel">
        <div class="chat-head"><span class="ai-avatar" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><ellipse cx="32" cy="32" rx="26" ry="9.5" transform="rotate(-30 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="9.5" transform="rotate(60 32 32)"/><circle cx="32" cy="32" r="7" fill="currentColor" stroke="none"/></svg></span>
          <div><b>PhysiX Tutor</b><br><span class="small muted">built from all ${flatLessons().length} lessons on this site</span></div>
        </div>
        <div class="chat-log" id="chat-log"></div>
        <div class="chat-input">
          <input id="chat-in" type="text" placeholder="e.g. Why does a rocket work in space?" aria-label="Ask the tutor">
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
      </div>
      <aside class="tutor-side">
        <div class="side-card"><h4>Try asking</h4><div class="tutor-btns" id="tutor-sugs"></div></div>
        <div class="side-card"><h4>I can find</h4>
          <p class="small muted mb0">“Why…” explanations · formulas with notes · quick-revision bullets · lesson links</p>
        </div>
      </aside>
    </div>
  </div>`;

  const log = $('#chat-log');
  const push = (cls, html, tag) => {
    const m = document.createElement('div');
    m.className = 'msg ' + cls;
    m.innerHTML = (tag ? '<span class="msg-tag">' + tag + '</span>' : '') + html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    Tex.render(m);
    return m;
  };

  push('ai', '<p>Ask me <i>why</i> something happens, or name a formula and I\'ll take it apart. For example:</p>' +
    '<ul><li>Why do astronauts float?</li><li>What is the photoelectric effect?</li><li>Give me the SHM period formula</li></ul>');

  const ask = text => {
    if (!text.trim()) return;
    push('user', mdInline(text));
    const typing = document.createElement('div');
    typing.className = 'msg ai';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    setTimeout(() => {
      typing.remove();
      const ans = Tutor.answer(text);
      push('ai', ans.html, 'PhysiX Tutor');
    }, 450 + Math.random() * 400);
  };

  $('#chat-send').addEventListener('click', () => {
    const inp = $('#chat-in');
    ask(inp.value); inp.value = '';
  });
  $('#chat-in').addEventListener('keydown', e => {
    if (e.key === 'Enter') { ask($('#chat-in').value); $('#chat-in').value = ''; }
  });

  const sugs = $('#tutor-sugs');
  Tutor.suggestions(5).forEach(s => {
    const b = document.createElement('button');
    b.className = 'tb'; b.textContent = s;
    b.addEventListener('click', () => ask(s));
    sugs.appendChild(b);
  });
}
