/* PhysiX Academy — Pages: Practice sessions, Simulations gallery, AI Tutor page */
'use strict';

/* ---------------- Practice ---------------- */
const Session = { qs: [], i: 0, correct: 0, misses: [] };

function viewPractice() {
  const routeToken = App.routeToken;
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
    ensureQuizData().then(() => {
      if (routeToken !== App.routeToken || !$('#p-start')) return;
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
    }).catch(() => toast('Practice questions could not load. Check your connection and try again.', 'bad'));
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
          <a class="btn btn-primary" href="/practice">↻ New session</a>
          <a class="btn" href="/progress">View progress</a>
        </div>
      </div>`;
    toast('Session complete: ' + pct + '%');
  }
}

/* ---------------- Simulations ---------------- */
function viewSimsPage(id) {
  const routeToken = App.routeToken;
  ensureSimulations().then(() => {
    if (routeToken !== App.routeToken || !App.el.isConnected) return;
    renderSimsPage(id);
  }).catch(err => {
    console.error('Simulation gallery load failed', err);
    if (routeToken === App.routeToken && App.el.isConnected) App.el.innerHTML = '<div class="wrap"><div class="empty-state"><h2>Simulations could not load</h2><p>Check your connection and try again.</p></div></div>';
  });
}

function renderSimsPage(id) {
  if (id && Sims.reg[id]) {
    const d = Sims.reg[id];
    const usedIn = flatLessons().filter(e => e.lesson.content.some(b => b.sim === id));
    App.el.innerHTML = `
    <div class="wrap">
      <div class="page-head"><a class="small" href="/simulations">‹ All simulations</a>
        <h1>${d.icon} ${esc(d.title)}</h1><p class="sub">${esc(d.desc)}</p></div>
      <div class="sim-slot-lg"></div>
      ${usedIn.length ? '<p class="small muted">Used in: ' + usedIn.map(e =>
        '<a href="/learn/' + e.lesson.id + '">' + esc(e.chapter.title) + '</a>').join(' · ') + '</p>' : ''}
    </div>`;
    mountSimulation(id, $('.sim-slot-lg', App.el));
    return;
  }
  const items = Object.values(Sims.reg);
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Simulations</h1>
    <p class="sub">Physics you can poke. Every simulation runs live in your browser — drag the sliders and watch the equations respond.</p></div>
    ${items.length ? '<div class="grid g3">' + items.map(d => `
      <div class="card hover topic-card ${d.phet ? 'phet-card' : ''}">
        ${d.phet ? '<div class="phet-thumb"><span>' + d.icon + '</span><em class="phet-badge">🚀 Official PhET</em></div>' : ''}
        <h3>${d.phet ? '' : d.icon + ' '}${esc(d.title)}</h3>
        <p class="muted">${esc(d.desc)}</p>
        <div class="topic-meta"><a class="btn btn-sm btn-primary" href="/simulations/${d.id}">Open ▸</a></div>
      </div>`).join('') + '</div>'
      : '<div class="empty-state"><div class="big">🔧</div><p>No simulations registered yet.</p></div>'}
  </div>`;
}

/* ---------------- Tutor page ---------------- */
function viewTutorPage() {
  // Load conversation history
  Tutor.loadHistory();
  
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>PhysiX Tutor</h1>
      <p class="sub">Ask anything about the lessons — it searches the whole curriculum for you. Responses use the local browser-based tutor and curriculum data.</p></div>
    <div class="tutor-layout">
      <div class="chat-panel">
        <div class="chat-head">
          <span class="ai-avatar" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><ellipse cx="32" cy="32" rx="26" ry="9.5" transform="rotate(-30 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="9.5" transform="rotate(60 32 32)"/><circle cx="32" cy="32" r="7" fill="currentColor" stroke="none"/></svg></span>
          <div><b>PhysiX Tutor</b><br><span class="small muted">built from all ${flatLessons().length} lessons on this site</span></div>
          <div class="chat-controls">
            <button class="icon-btn" id="export-chat" title="Export conversation" aria-label="Export conversation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </button>
            <button class="icon-btn" id="clear-chat" title="Clear conversation" aria-label="Clear conversation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
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
          <p class="small muted mb0">"Why…" explanations · formulas with notes · quick-revision bullets · lesson links</p>
        </div>
      </aside>
    </div>
  </div>`;

  const log = $('#chat-log');
  const push = (cls, html, tag, addActions = false) => {
    const m = document.createElement('div');
    m.className = 'msg ' + cls;
    let content = (tag ? '<span class="msg-tag">' + tag + '</span>' : '') + html;
    
    // Add action buttons to AI messages
    if (addActions && cls === 'ai') {
      content += `<div class="msg-actions">
        <button class="msg-action-btn" data-action="copy" title="Copy response">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="msg-action-btn" data-action="regenerate" title="Regenerate response">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>`;
    }
    
    m.innerHTML = content;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    Tex.render(m);
    
    // Attach event listeners to action buttons
    if (addActions && cls === 'ai') {
      const copyBtn = m.querySelector('[data-action="copy"]');
      const regenBtn = m.querySelector('[data-action="regenerate"]');
      
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const textContent = m.innerText.replace(/Copy response.*Regenerate response/s, '').trim();
          navigator.clipboard.writeText(textContent).then(() => {
            Toast.show('Response copied to clipboard');
          }).catch(() => {
            Toast.show('Failed to copy');
          });
        });
      }
      
      if (regenBtn) {
        regenBtn.addEventListener('click', () => {
          // Find the last user message before this AI message
          const msgs = Array.from(log.querySelectorAll('.msg'));
          const idx = msgs.indexOf(m);
          if (idx > 0 && msgs[idx - 1].classList.contains('user')) {
            const lastQuestion = msgs[idx - 1].innerText;
            ask(lastQuestion, true);
          }
        });
      }
    }
    
    return m;
  };

  push('ai', '<p>Ask me <i>why</i> something happens, or name a formula and I\'ll take it apart. For example:</p>' +
    '<ul><li>Why do astronauts float?</li><li>What is the photoelectric effect?</li><li>Give me the SHM period formula</li></ul>', null, false);

  const ask = (text, isRegenerate = false) => {
    if (!text.trim()) return;
    
    // Only push user message if not regenerating
    if (!isRegenerate) {
      push('user', mdInline(text), null, false);
    }
    
    const typing = document.createElement('div');
    typing.className = 'msg ai typing-indicator';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span><span class="typing-text">Thinking...</span>';
    log.appendChild(typing); 
    log.scrollTop = log.scrollHeight;
    
    setTimeout(() => {
      typing.remove();
      const ans = Tutor.answer(text);
      push('ai', ans.html, 'PhysiX Tutor', true);
    }, 450 + Math.random() * 400);
  };

  $('#chat-send').addEventListener('click', () => {
    const inp = $('#chat-in');
    ask(inp.value); inp.value = '';
  });
  $('#chat-in').addEventListener('keydown', e => {
    if (e.key === 'Enter') { ask($('#chat-in').value); $('#chat-in').value = ''; }
  });

  // Export conversation
  $('#export-chat').addEventListener('click', () => {
    const exported = Tutor.exportHistory();
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physix-tutor-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Conversation exported');
  });

  // Clear conversation
  $('#clear-chat').addEventListener('click', () => {
    if (confirm('Clear all conversation history? This cannot be undone.')) {
      Tutor.clearHistory();
      log.innerHTML = '';
      push('ai', '<p>Ask me <i>why</i> something happens, or name a formula and I\'ll take it apart. For example:</p>' +
        '<ul><li>Why do astronauts float?</li><li>What is the photoelectric effect?</li><li>Give me the SHM period formula</li></ul>', null, false);
      Toast.show('Conversation cleared');
    }
  });

  const sugs = $('#tutor-sugs');
  Tutor.suggestions(5).forEach(s => {
    const b = document.createElement('button');
    b.className = 'tb'; b.textContent = s;
    b.addEventListener('click', () => ask(s));
    sugs.appendChild(b);
  });
}
