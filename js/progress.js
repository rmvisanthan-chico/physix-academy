/* PhysiX Academy — Progress Dashboard */
'use strict';

/* Survives the re-render that follows a successful import. Setting the
   message straight onto the element was pointless because viewProgress()
   replaces the whole view, so the confirmation was wiped before it could be
   read. */
let _backupMsg = '';

function viewProgress() {
  const flat = flatLessons();
  const doneN = Object.keys(Store.data.completed).length;
  const pct = overallPct();
  const hist = Store.data.quiz.history;
  const acc = hist.length ? Math.round(100 * hist.filter(h => h.correct).length / hist.length) : null;

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const mins = Math.round((Store.data.timeLog[iso] || 0) / 60);
    week.push({ iso, label: 'SMTWTFS'[d.getDay()], mins });
  }
  const maxMin = Math.max(30, ...week.map(w => w.mins));

  const heat = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0,10);
    heat.push({ iso, mins: Math.round((Store.data.timeLog[iso]||0)/60) });
  }

  const perLevel = CURRICULUM.map(l => `
    <div class="bar-row">
      <span class="bar-label">${l.icon} ${esc(l.name)}</span>
      <div class="mini-bar"><div class="progress-fill" style="width:${levelPct(l)}%;background:${l.color}"></div></div>
      <span class="small muted">${levelDoneCount(l)}/${levelTotalCount(l)}</span>
    </div>`).join('');

  const topics = Object.entries(Store.data.quiz.perTopic)
    .filter(([, v]) => v.total >= 3)
    .map(([t, v]) => [t, Math.round(100 * v.correct / v.total), v.total])
    .sort((a, b) => a[1] - b[1]);
  const weak = topics.slice(0, 5);

  const recents = hist.slice(-8).reverse();
  const qById = {};
  QUIZ_BANK.forEach(q => qById[q.id] = q);

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>📈 Your Progress</h1>
      <p class="sub">Everything is stored locally in this browser — your data never leaves your machine.</p></div>

    <div class="grid g2" style="align-items:center">
      <div class="card center" style="text-align:center">
        <div class="ring" style="--p:${pct}"><span class="rv">${pct}%</span></div>
        <h3 style="margin-top:.8rem">Curriculum complete</h3>
        <p class="muted">${doneN} of ${flat.length} lessons finished</p>
        ${doneN ? '<a class="btn btn-sm" href="#/lesson/' + Store.data.lastLesson + '">↩ Resume last lesson</a>' : ''}
      </div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr">
        <div class="card stat"><div class="sv">${Store.streak()}</div><div class="sl">Day streak</div></div>
        <div class="card stat"><div class="sv">${Store.data.solved}</div><div class="sl">Answers given</div></div>
        <div class="card stat"><div class="sv">${acc === null ? '—' : acc + '%'}</div><div class="sl">Quiz accuracy</div></div>
        <div class="card stat"><div class="sv">${Store.totalTimeMin()}</div><div class="sl">Minutes studied</div></div>
      </div>
    </div>

    <section class="sec">
      <div class="sec-title"><h2>This week's study time</h2><span class="chip plain">minutes per day</span></div>
      <div class="card week-heat">
        ${week.map(w => `
        <div class="wh-col" title="${w.iso}: ${w.mins} min">
          <div class="wh-bar-track"><div class="wh-bar" style="height:${Math.max(3, Math.round(100 * w.mins / maxMin))}%"></div></div>
          <span>${w.label}</span>
        </div>`).join('')}
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Study heatmap</h2><span class="chip plain">last 35 days — Mobbin style</span></div>
      <div class="card heat-card">
        <div class="heat-grid">
          ${heat.map(h => {
            const lvl = h.mins===0?0 : h.mins<12?1 : h.mins<25?2 : h.mins<45?3 :4;
            return `<div class="heat-cell l${lvl}" title="${h.iso}: ${h.mins} min"></div>`;
          }).join('')}
        </div>
        <div class="heat-legend"><span>Less</span><div class="heat-cell l0"></div><div class="heat-cell l1"></div><div class="heat-cell l2"></div><div class="heat-cell l3"></div><div class="heat-cell l4"></div><span>More</span></div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Levels</h2><a class="more" href="#/learn">Open curriculum →</a></div>
      <div class="card bar-list">${perLevel}</div>
    </section>

    ${weak.length ? `
    <section class="sec">
      <div class="sec-title"><h2>Focus areas</h2><a class="more" href="#/practice">Practice these →</a></div>
      <div class="card bar-list">
        ${weak.map(([t, a, n]) => `
        <div class="bar-row">
          <span class="bar-label">${esc(t)}</span>
          <div class="mini-bar"><div class="progress-fill${a < 50 ? ' low' : ''}" style="width:${a}%"></div></div>
          <span class="small muted">${a}% · ${n} tries</span>
        </div>`).join('')}
      </div>
    </section>` : ''}

    <section class="sec">
      <div class="sec-title"><h2>Recent answers</h2></div>
      ${recents.length ? '<div class="card bar-list">' + recents.map(h => {
        const q = qById[h.qid] || { topic: h.topic, difficulty: h.difficulty };
        return `<div class="bar-row">
          <span class="bar-label">${esc(q.topic)}</span>
          <span class="chip plain small">${DIFFS[q.difficulty] ? DIFFS[q.difficulty].label : esc(q.difficulty || '')}</span>
          <span class="chip ${h.correct ? 'green' : 'red'}">${h.correct ? '✓ correct' : '✗ missed'}</span>
        </div>`;
      }).join('') + '</div>'
      : '<div class="empty-state"><h2>Nothing to show yet</h2><p>Answer a few practice questions and this page starts keeping honest records — including the ones you get wrong.</p><a class="btn btn-primary btn-sm" href="#/practice">Try practice →</a></div>'}
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Backup &amp; transfer</h2></div>
      <p class="small muted">Your progress lives in this browser only (<span id="store-mode">${Store.storageMode()}</span>).
      Clearing site data or switching device loses it, so download a copy.</p>
      <div class="btn-row">
        <button class="btn btn-sm" id="btn-export">⬇ Export backup (.json)</button>
        <button class="btn btn-sm" id="btn-import">⬆ Import backup</button>
        <input type="file" id="file-import" accept="application/json,.json" hidden>
      </div>
      <p class="small muted" id="backup-msg">${_backupMsg}</p>
    </section>

    <section class="sec">
      <details class="danger-zone">
        <summary>⚠️ Danger zone</summary>
        <p class="small muted">Erase all progress, notes and quiz history from this browser. Cannot be undone.</p>
        <button class="btn btn-sm" id="btn-reset" style="border-color:var(--bad);color:var(--bad)">Delete all my data</button>
      </details>
    </section>
  </div>`;

  $('#btn-export')?.addEventListener('click', async () => {
    const msg = $('#backup-msg');
    try {
      await Store.flush();
      const payload = JSON.stringify(Store.exportBackup(), null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `physix-academy-progress-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (msg) {
        const c = Store.exportBackup().counts;
        _backupMsg = `Saved <b>${c.lessons}</b> lessons, <b>${c.questions}</b> answers and <b>${c.notes}</b> notes.`;
        msg.innerHTML = _backupMsg;
      }
    } catch (e) {
      if (msg) msg.textContent = 'Could not create the backup file.';
    }
  });

  $('#btn-import')?.addEventListener('click', () => $('#file-import')?.click());
  $('#file-import')?.addEventListener('change', async ev => {
    const f = ev.target.files && ev.target.files[0];
    const msg = $('#backup-msg');
    if (!f) return;
    try {
      const text = await f.text();
      const res = Store.importBackup(text);
      if (msg) {
        if (!res.ok) {
          _backupMsg = `<span style="color:var(--bad)">${res.error}</span>`;
          msg.innerHTML = _backupMsg;
        } else {
          _backupMsg = `Restored <b>${res.lessons}</b> lessons, <b>${res.questions}</b> answers, <b>${res.notes}</b> notes.`;
          msg.innerHTML = _backupMsg;
          toast('Backup restored.');
          viewProgress();
        }
      }
    } catch (e) {
      if (msg) msg.innerHTML = '<span style="color:var(--bad)">Could not read that file.</span>';
    } finally {
      ev.target.value = '';
    }
  });

  $('#btn-reset')?.addEventListener('click', async () => {
    if (confirm('Really erase ALL local progress? This cannot be undone.')) {
      try { localStorage.removeItem(Store.KEY); } catch (e) {}
      await Store.clearAll();
      toast('All local data erased.');
      viewProgress();
    }
  });
}
