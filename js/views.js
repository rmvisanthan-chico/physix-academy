/* PhysiX Academy — Router + Home/Learn/Lesson/Topics views */
'use strict';

const App = { el: null, levelFilter: 'all' };

function navActive(name) {
  $$('#mainnav a').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
}

function afterRender(root) {
  const host = root || App.el;
  $$('.sim-slot', host).forEach(slot => Sims.mount(slot.dataset.sim, slot));
  $$('.quiz-slot', host).forEach(slot => Quiz.renderList(slot, slot.dataset.quiz.split(',')));
  $$('.acc-head', host).forEach(h =>
    h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
  $$('.reveal', host).forEach(el => io.observe(el));
  Tex.render(host);
}

const io = ('IntersectionObserver' in window)
  ? new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.06 })
  : { observe(el) { el.classList.add('in'); } };

function route() {
  const parts = (location.hash || '#/').slice(1).split('/').filter(Boolean);
  window.scrollTo(0, 0);
  Store.touchToday();
  let nav = 'home';
  if (parts[0] === 'lesson') { viewLesson(decodeURIComponent(parts[1] || '')); nav = 'learn'; }
  else {
    switch (parts[0]) {
      case undefined: viewHome(); break;
      case 'learn': viewLearn(); nav = 'learn'; break;
      case 'topics': viewTopics(); nav = 'topics'; break;
      case 'sims': viewSimsPage(parts[1]); nav = 'sims'; break;
      case 'practice': viewPractice(); nav = 'practice'; break;
      case 'tutor': viewTutorPage(); nav = 'tutor'; break;
      case 'formulas': viewFormulas(parts[1]); nav = 'formulas'; break;
      case 'calculators': viewCalculators(); nav = 'calculators'; break;
      case 'graph': viewGraph(); nav = 'graph'; break;
      case 'scientists': viewScientists(); nav = 'scientists'; break;
      case 'progress': viewProgress(); nav = 'progress'; break;
      case 'support': viewSupport(); nav = ''; break;
      default: viewHome();
    }
  }
  navActive(nav);
}

/* ---------------- Home ---------------- */
function viewHome() {
  const simsN = Object.keys(Sims.reg).length;
  const studies = [
    { id: '01', title: 'Field / Lines', type: 'Electric fields, drawn in space', mins: '18 MIN LESSON', cls: 'art-a', img: 'assets/studies/field.jpg', ch: 'l3.charges' },
    { id: '02', title: 'Gravity / Well', type: 'Orbits you can tilt and warp', mins: '12 MIN LESSON', cls: 'art-b', img: 'assets/studies/gravity.jpg', ch: 'l2.gravity' },
    { id: '03', title: 'Light / Matter', type: 'Where waves become particles', mins: '16 MIN LESSON', cls: 'art-c', img: 'assets/studies/light.jpg', ch: 'l3.dual' }
  ];
  App.el.innerHTML = `
  <div id="home-cine">
  <section class="hero cine-hero">
    <div class="hero-mesh" aria-hidden="true"></div>
    <div class="hero-grid" aria-hidden="true"></div>
    <span class="hero-kicker"><i class="pulse-dot"></i> Interactive physics academy · MMXXVI</span>
    <h1 class="display">Understand<br><em>physics.</em><br><span class="dim">Don't memorize it.</span></h1>
    <p class="lede">Every lesson starts with a real question, builds intuition, proves the formulas, and hands you the simulation. Progress saves itself right here in your browser.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#/learn">Start learning<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="btn btn-ghost" href="#/sims">Explore simulations<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/></svg></a>
    </div>
  </section>

  <section class="statement">
    <p class="eyebrow">Our point of view</p>
    <p class="statement-copy">A formula is not decoration.<br><span>It is motion, written down.</span></p>
  </section>

  <div class="wrap">
    <div class="stat-grid">
      <div class="card stat"><div class="sv" data-count="${CURRICULUM.length}">${CURRICULUM.length}</div><div class="sl">Levels</div></div>
      <div class="card stat"><div class="sv" data-count="${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)}">${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)}</div><div class="sl">Chapters</div></div>
      <div class="card stat"><div class="sv" data-count="${flatLessons().length}">${flatLessons().length}</div><div class="sl">Lessons</div></div>
      <div class="card stat"><div class="sv" data-count="${simsN}">${simsN}</div><div class="sl">Simulations</div></div>
    </div>

    <!-- TRIAL: Physics-Lab-inspired Topics (local only, not pushed) -->
    <section class="sec px-topics">
      <div class="sec-title"><h2>Physics Topics</h2><a class="more" href="#/sims">All sims →</a></div>
      <p class="muted" style="margin:-.6rem 0 1.2rem">Choose your area of exploration — NCERT 9/10/11 mapped</p>
      <div class="px-topic-grid">
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">8 sims</span><h3>Classical Mechanics</h3><p>Motion, forces, energy and momentum</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">2 sims</span><h3>Fluid Dynamics</h3><p>Pressure, viscosity and flow behaviour</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">5 sims</span><h3>Wave Physics</h3><p>Oscillations, interference and propagation</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">2 sims</span><h3>Thermodynamics</h3><p>Heat transfer & ideal gas behaviour</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">6 sims</span><h3>Electricity & Magnetism</h3><p>Fields, circuits and electromagnetic effects</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">4 sims</span><h3>Optics</h3><p>Light, mirrors, lenses & instruments</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
      </div>
    </section>

    <section class="sec px-featured">
      <div class="sec-title"><h2>Featured Simulations</h2><a class="more" href="#/sims">All sims →</a></div>
      <p class="muted" style="margin:-.6rem 0 1.2rem">Popular concepts to get you started</p>
      <div class="px-featured-grid">
        <article class="px-featured-card" data-href="#/sims"><h3>Pendulum Motion</h3><p>Explore SHM with an interactive pendulum</p><span class="px-link">Open →</span></article>
        <article class="px-featured-card" data-href="#/sims"><h3>Projectile Motion</h3><p>Path under gravity — predict the flight</p><span class="px-link">Open →</span></article>
        <article class="px-featured-card" data-href="#/sims"><h3>Flow Rate Simulator</h3><p>Pipe width vs velocity — Bernoulli in action</p><span class="px-link">Open →</span></article>
      </div>
    </section>

    <section class="sec px-stats">
      <div class="px-stat"><span class="px-stat-num">${simsN}</span><span class="px-stat-label">Simulations</span></div>
      <div class="px-stat"><span class="px-stat-num">6</span><span class="px-stat-label">Topics</span></div>
      <div class="px-stat"><span class="px-stat-num">${CURRICULUM.length}</span><span class="px-stat-label">Levels</span></div>
      <div class="px-stat"><span class="px-stat-num">∞</span><span class="px-stat-label">Possibilities</span></div>
      <div class="px-stat"><span class="px-stat-num">100%</span><span class="px-stat-label">Offline</span></div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Selected studies</h2><a class="more" href="#/topics">All topics →</a></div>
      <div class="st-grid">
        ${studies.map(s => `
        <article class="study" data-href="${chFirstLesson(s.ch)}">
          <div class="study-art ${s.cls}">
            <img class="study-img" src="${s.img}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="art-shape"></span>
            <span class="study-num">${s.id}</span>
            <span class="study-go">↗</span>
          </div>
          <div class="study-meta">
            <div><h3>${esc(s.title)}</h3><p>${esc(s.type)}</p></div>
            <time>${s.mins}</time>
          </div>
        </article>`).join('')}
      </div>
    </section>

    <section class="sec" id="home-path">
      <div class="sec-title"><h2>Your path</h2><a class="more" href="#/learn">Full curriculum →</a></div>
      <div class="grid g2">
        ${CURRICULUM.map(l => `
        <a class="card hover level-card ${l.id}" href="#/learn">
          <div class="lv-num">${esc(l.tag)}</div>
          <h3>${l.icon} ${esc(l.name)}</h3>
          <p class="muted">${esc(l.desc)}</p>
          <div class="topic-meta"><span class="chip plain">${levelTotalCount(l)} lessons</span>
          <span class="chip ${levelPct(l) ? 'cyan' : 'plain'}">${levelPct(l)}% done</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${levelPct(l)}%"></div></div>
        </a>`).join('')}
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>The method</h2></div>
      <div class="method-row">
        <div class="step"><span>01</span><h3>Find the question</h3><p>Every lesson starts underneath the formula — with the <b>why</b> that made someone ask.</p></div>
        <div class="step"><span>02</span><h3>Build the world</h3><p>Drag sliders, tilt orbits, trace fields across ${simsN} simulations. Intuition is engineered, not assumed.</p></div>
        <div class="step"><span>03</span><h3>Prove it</h3><p>Derivations close the loop, then ${QUIZ_BANK.length} quiz questions make sure the idea survives an exam.</p></div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Meet the minds</h2><a class="more" href="#/scientists">All ${SCIENTISTS.length} physicists →</a></div>
      <div class="sci-strip">
        ${['einstein','curie','raman','newton','snbose','hawking'].map(k =>
          '<a class="sci-mini" href="#/scientists" title="Open the Hall of Physicists"><img loading="lazy" src="assets/scientists/' +
          (SCIENTISTS.find(s => s.img === k + '.jpg') || {}).img + '" alt=""></a>').join('')}
        <a class="sci-mini sci-more" href="#/scientists">+${SCIENTISTS.length - 6} more →</a>
      </div>
    </section>

    <section class="sec">
      <div class="card rec-card" style="border-left-color:var(--warn)">
        <h3>Start here, not anywhere else</h3>
        <p class="muted">“Motion in a Straight Line” is the lesson we show people first: question → intuition → simulation → derivation → worked examples → quiz. If our method works for you, you'll know within twenty minutes.</p>
        <a class="btn btn-primary btn-sm" href="#/lesson/l3.kin1d.motion">Open the flagship lesson</a>
      </div>
    </section>
  </div>
  </div>`;

  $$('.study', App.el).forEach(card =>
    card.addEventListener('click', () => location.hash = card.dataset.href));
  $$('.px-topic-card, .px-featured-card', App.el).forEach(c =>
    c.addEventListener('click', () => location.hash = c.dataset.href));
  afterRender();
}

/* ---------------- Learn ---------------- */
function viewLearn() {
  const pills = ['all', ...CURRICULUM.map(l => l.id)];
  const chosen = App.levelFilter;
  const levels = chosen === 'all' ? CURRICULUM : CURRICULUM.filter(l => l.id === chosen);

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Learn</h1>
    <p class="sub">Four levels, ${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)} chapters. Open any chapter below — ticked lessons are ones you've completed.</p></div>
    <div class="pills">${pills.map(p => {
      const l = CURRICULUM.find(x => x.id === p);
      return '<button class="pill' + (chosen === p ? ' active' : '') + '" data-lvl="' + p + '">' +
        (l ? l.icon + ' ' + esc(l.name) : 'All levels') + '</button>';
    }).join('')}</div>
    ${levels.map(l => `
      <section class="sec">
        <div class="sec-title"><h2>${l.icon} ${esc(l.name)}</h2>
        <span class="chip ${levelDoneCount(l) ? 'green' : 'plain'}">${levelDoneCount(l)}/${levelTotalCount(l)} done</span></div>
        ${l.chapters.map(ch => {
          const done = ch.lessons.filter(ls => Store.isComplete(ls.id)).length;
          return `
          <div class="acc">
            <button class="acc-head"><span style="font-size:1.3rem">${ch.icon}</span>
              <span><span class="t">${esc(ch.title)}</span><span class="s">${esc(ch.tagline)}</span></span>
              <span class="chip ${done === ch.lessons.length ? 'green' : 'plain'}">${done}/${ch.lessons.length}</span>
              <span class="acc-caret">▾</span>
            </button>
            <div class="acc-body">
              ${ch.lessons.map(ls => `
                <a class="lesson-row${Store.isComplete(ls.id) ? ' done' : ''}" href="#/lesson/${ls.id}">
                  <span class="ln">${Store.isComplete(ls.id) ? '✓' : ch.lessons.indexOf(ls) + 1}</span>
                  <span class="lt">${esc(ls.title)}</span>
                  <span class="lm">${ls.mins} min</span>
                </a>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </section>`).join('')}
  </div>`;

  $$('.pill[data-lvl]', App.el).forEach(p => p.addEventListener('click', () => {
    App.levelFilter = p.dataset.lvl; viewLearn();
  }));
  afterRender();
}

/* ---------------- Lesson ---------------- */
function viewLesson(id) {
  const entry = findLesson(id);
  if (!entry) {
    App.el.innerHTML = '<div class="wrap"><div class="empty-state"><div class="big" style="font-family:var(--ff-head)">404<sup>physics</sup></div><h2>This lesson doesn\'t exist — yet</h2><p>Either the link is wrong, or this lesson hasn\'t been written. It\'s not you.</p><p><a href="#/learn">Back to the curriculum</a></p></div></div>';
    return;
  }
  const { level, chapter, lesson } = entry;
  Store.data.lastLesson = id;
  Store.save();
  const flat = flatLessons();
  const idx = flat.indexOf(entry);
  const prev = flat[idx - 1], next = flat[idx + 1];
  const formulas = [];
  lesson.content.forEach(b => {
    if (!b) return;
    if (b.formula && b.formula.tex) formulas.push(b.formula);
    if (b.formulas) b.formulas.forEach(f => { if (f.tex) formulas.push(f); });
  });
  const posInChapter = chapter.lessons.indexOf(lesson) + 1;

  App.el.innerHTML = `
  <div class="lesson-shell">
    <nav class="lesson-nav" aria-label="Curriculum">
      <a class="btn btn-sm btn-ghost" href="#/learn">‹ All levels</a>
      ${level.chapters.map(ch => `
        <div class="acc${ch.id === chapter.id ? ' open' : ''}">
          <button class="acc-head"><span>${ch.icon}</span><span class="t" style="font-size:.86rem">${esc(ch.title.replace(' ⭐', ''))}</span><span class="acc-caret">▾</span></button>
          <div class="acc-body">
            ${ch.lessons.map(ls => `
              <a class="lesson-row${Store.isComplete(ls.id) ? ' done' : ''}${ls.id === id ? '' : ''}" href="#/lesson/${ls.id}" ${ls.id === id ? 'style="background:var(--acc-soft)"' : ''}>
                <span class="ln">${Store.isComplete(ls.id) ? '✓' : ch.lessons.indexOf(ls) + 1}</span>
                <span class="lt" style="font-size:.84rem">${esc(ls.title)}</span>
              </a>`).join('')}
          </div>
        </div>`).join('')}
    </nav>

    <article class="lesson-content">
      <div class="lesson-crumb">${level.icon} ${esc(level.name)} › ${chapter.icon} ${esc(chapter.title)}</div>
      <h1>${esc(lesson.title)}</h1>
      <div class="topic-meta" style="margin-bottom:1rem">
        <span class="chip plain">${lesson.mins} min read</span>
        <span class="chip cyan">Lesson ${posInChapter} of ${chapter.lessons.length}</span>
        <span class="chip amber" id="ls-status"></span>
      </div>
      ${renderBlocks(lesson.content)}
      <div class="errata">Something off in this lesson — a sign, a number, a sentence? <a href="#/tutor">Tell the tutor</a> starting your message with <code>fix:</code> — corrections go live fast, and get credited on this page.</div>
      <div class="lesson-foot">
        ${prev ? '<a class="btn btn-sm" href="#/lesson/' + prev.lesson.id + '">‹ ' + esc(prev.lesson.title.slice(0, 30)) + (prev.lesson.title.length > 30 ? '…' : '') + '</a>' : '<span></span>'}
        <button class="btn btn-sm btn-primary" id="btn-done"></button>
        ${next ? '<a class="btn btn-sm" href="#/lesson/' + next.lesson.id + '">' + esc(next.lesson.title.slice(0, 30)) + (next.lesson.title.length > 30 ? '…' : '') + ' ›</a>' : '<span></span>'}
      </div>
    </article>

    <aside class="lesson-aside">
      <div class="side-card"><h4>Key formulas</h4>
        ${formulas.length ? formulas.map(f => '<div class="kf">' + esc(f.name || '') + '</div>').join('') : '<p class="muted small mb0">This lesson focuses on concepts — no new formulas.</p>'}
      </div>
      <div class="side-card"><h4>Quick revision</h4>
        ${(lesson.content.filter(b => b.revise).flatMap(b => b.revise) || []).map(r => '<div class="kf small">• ' + mdInline(r) + '</div>').join('') || '<p class="muted small">—</p>'}
      </div>
      <div class="side-card"><h4>My notes</h4>
        <textarea class="notes-area" id="ls-notes" placeholder="Write your own summary…">${esc(Store.data.notes[id] || '')}</textarea>
        <p class="small muted mt0" style="margin-bottom:0">Saved automatically ✓</p>
      </div>
    </aside>
  </div>`;

  const refreshDone = () => {
    const done = Store.isComplete(id);
    const st = $('#ls-status');
    st.textContent = done ? '✓ Completed' : '○ Not completed yet';
    st.className = 'chip ' + (done ? 'green' : 'amber');
    const bd = $('#btn-done');
    bd.textContent = done ? '↩ Mark as not done' : '✓ Mark lesson complete';
  };
  $('#btn-done').addEventListener('click', () => {
    if (Store.isComplete(id)) { delete Store.data.completed[id]; Store.save(); toast('Lesson marked incomplete.'); }
    else { Store.completeLesson(id); toast('Lesson complete. ' + Store.streak() + '-day streak and counting.'); }
    refreshDone();
  });
  const notesEl = $('#ls-notes');
  notesEl.addEventListener('input', debounce(() => {
    Store.data.notes[id] = notesEl.value; Store.save();
  }, 400));

  refreshDone();
  afterRender();
}

/* ---------------- Topics ---------------- */
function viewTopics() {
  const cards = CURRICULUM.flatMap(l => l.chapters.map(ch => {
    const done = ch.lessons.filter(ls => Store.isComplete(ls.id)).length;
    const pct = Math.round(100 * done / ch.lessons.length);
    const target = ch.lessons.find(ls => !Store.isComplete(ls.id)) || ch.lessons[0];
    return `
    <div class="card hover topic-card">
      <h3>${ch.icon} ${esc(ch.title)}</h3>
      <p class="muted">${esc(ch.tagline)}</p>
      <div class="topic-meta">
        <span class="chip plain" style="--lv:${l.color};color:${l.color};border-color:${l.color}55">${esc(l.tag)}</span>
        <span class="chip plain">${ch.lessons.length} lessons</span>
        <span class="chip ${done ? 'green' : 'plain'}">${pct}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="topic-meta"><a class="btn btn-sm ${done ? '' : 'btn-primary'}" href="#/lesson/${target.id}">${done ? '↻ Review' : '▶ Start'}</a></div>
    </div>`;
  })).join('');
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Topics</h1>
    <p class="sub">All ${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)} chapters at a glance. Jump straight into whatever you need.</p></div>
    <div class="grid g3">${cards}</div>
  </div>`;
  afterRender();
}

/* ---------------- Support ---------------- */
const UPI_ID = '9489627927@fam';
const UPI_URI = 'upi://pay?pa=' + UPI_ID + '&pn=PhysiX%20Academy&cu=INR';

function viewSupport() {
  App.el.innerHTML = `
  <div class="wrap wrap-narrow">
    <div class="page-head"><h1>Support this project</h1>
      <p class="sub">Everything here is free, shows no ads, and works offline. It stays that way. If it helped you understand something you'd given up on, you can send a little thanks below — any amount, straight to my UPI, no middleman.</p></div>

    <div class="card upi-card center">
      <div id="upi-qr" class="upi-qr" aria-label="UPI QR code"></div>
      <p class="small muted" style="margin:.6rem 0 0">Scan with GPay · PhonePe · Paytm · FamPay</p>

      <div class="upi-id-row">
        <code class="upi-id">${UPI_ID}</code>
        <button class="btn btn-sm btn-primary" id="btn-copy-upi">Copy UPI ID</button>
      </div>

      <a class="btn upi-open" href="${UPI_URI}">Open in a UPI app<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
      <p class="small muted" style="margin:.8rem 0 0">The app button works on phones. On a computer, scan the code or copy the ID.</p>
    </div>

    <div class="card" style="margin-top:1.2rem">
      <h3>Where the money goes</h3>
      <ul class="muted" style="margin:.4rem 0 0;padding-left:1.2rem">
        <li>Keeping everything free and ad-free — forever</li>
        <li>More simulations and lessons (there's a list)</li>
        <li>Server-less means almost zero costs — so even small support goes a long way</li>
      </ul>
    </div>
  </div>`;

  /* offline QR via vendored qrcode-generator */
  try {
    const qr = window.qrcode ? window.qrcode(0, 'M') : null;
    if (qr) {
      qr.addData(UPI_URI); qr.make();
      $('#upi-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    }
  } catch (e) { console.warn('QR failed', e); }

  $('#btn-copy-upi').addEventListener('click', () => {
    const done = () => toast('UPI ID copied: ' + UPI_ID);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(UPI_ID).then(done).catch(() => fallbackCopy(done));
    } else fallbackCopy(done);
  });
}

function fallbackCopy(done) {
  const ta = document.createElement('textarea');
  ta.value = UPI_ID; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — the ID is ' + UPI_ID); }
  ta.remove();
}
