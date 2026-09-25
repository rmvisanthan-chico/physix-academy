/* ============================================================
   PhysiX Academy — Utilities
   Storage, math rendering, DOM helpers, toasts, theme
   ============================================================ */
'use strict';

/* ---------- tiny DOM helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const _scriptPromises = new Map();
const _stylePromises = new Map();

function loadScriptOnce(src) {
  const url = new URL(src, document.baseURI).href;
  if (_scriptPromises.has(url)) return _scriptPromises.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      _scriptPromises.delete(url);
      reject(new Error('Unable to load ' + url));
    };
    document.head.appendChild(script);
  });
  _scriptPromises.set(url, promise);
  return promise;
}

function loadStyleOnce(href) {
  const url = new URL(href, document.baseURI).href;
  if (_stylePromises.has(url)) return _stylePromises.get(url);
  const promise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = resolve;
    link.onerror = () => {
      _stylePromises.delete(url);
      reject(new Error('Unable to load ' + url));
    };
    document.head.appendChild(link);
  });
  _stylePromises.set(url, promise);
  return promise;
}

const QUIZ_BANK = [];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtNum(n, d = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (typeof n !== 'number') return String(n);
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return n.toExponential(3).replace('e', '×10^');
  return parseFloat(n.toFixed(d)).toString();
}

/* ---------- persistent store ---------- */
const Store = {
  KEY: 'physix.v1',
  defaults() {
    return {
      settings: { theme: 'dark', fontSize: 100, contrast: false, accent: 'sunset' },
      completed: {},            // lessonId -> timestamp
      quiz: { history: [], perTopic: {} }, // history: {id,qid,topic,difficulty,correct,t}; perTopic: topic -> {correct,total}
      solved: 0,
      streakDays: [],           // ISO dates with activity
      timeLog: {},              // date -> seconds
      lastLesson: null,
      notes: {}                 // lessonId -> text
    };
  },
  data: null,
  load() {
    try {
      this.data = Object.assign(this.defaults(), JSON.parse(localStorage.getItem(this.KEY) || '{}'));
      // deep-merge critical sub-objects in case of older versions
      this.data.settings = Object.assign(this.defaults().settings, this.data.settings || {});
      this.data.quiz     = Object.assign(this.defaults().quiz, this.data.quiz || {});
    } catch (e) { this.data = this.defaults(); }
    return this.data;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  /* --- activity / streaks --- */
  touchToday() {
    const d = new Date(); const iso = d.toISOString().slice(0, 10);
    if (!this.data.streakDays.includes(iso)) { this.data.streakDays.push(iso); if (this.data.streakDays.length > 400) this.data.streakDays.shift(); }
    this.save();
  },
  addTime(sec) {
    const iso = new Date().toISOString().slice(0, 10);
    this.data.timeLog[iso] = (this.data.timeLog[iso] || 0) + sec;
    this.save();
  },
  streak() {
    let count = 0; const day = new Date();
    // allow "yesterday only" streak to still be alive today
    if (!this.data.streakDays.includes(day.toISOString().slice(0, 10))) day.setDate(day.getDate() - 1);
    for (;;) {
      const iso = day.toISOString().slice(0, 10);
      if (this.data.streakDays.includes(iso)) { count++; day.setDate(day.getDate() - 1); } else break;
      if (count > 3650) break;
    }
    return count;
  },
  totalTimeMin() {
    let s = 0; for (const k in this.data.timeLog) s += this.data.timeLog[k];
    return Math.round(s / 60);
  },
  completeLesson(id) { this.data.completed[id] = Date.now(); this.touchToday(); this.save(); },
  isComplete(id) { return !!this.data.completed[id]; },
  recordAnswer(q, correct) {
    this.touchToday();
    this.data.solved++;
    this.data.quiz.history.push({ qid: q.id, topic: q.topic, difficulty: q.difficulty, correct, t: Date.now() });
    if (!this.data.quiz.perTopic[q.topic]) this.data.quiz.perTopic[q.topic] = { correct: 0, total: 0 };
    const pt = this.data.quiz.perTopic[q.topic];
    pt.total++; if (correct) pt.correct++;
    if (this.data.quiz.history.length > 1000) this.data.quiz.history.shift();
    this.save();
  },
  topicMastery(topic) {
    const pt = this.data.quiz.perTopic[topic];
    if (!pt || pt.total < 2) return null;
    return Math.round(100 * pt.correct / pt.total);
  }
};

/* ---------- theme / a11y ---------- */
const Theme = {
  ACCENTS: ['sunset', 'emerald', 'nebula', 'blue'],
  NAMES: { sunset: 'Sunset 🌅', emerald: 'Emerald 💚', nebula: 'Nebula 💜', blue: 'Deep Blue 💙' },
  apply() {
    const s = Store.data.settings;
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.dataset.accent = s.accent || 'sunset';
    document.documentElement.style.setProperty('--user-font-scale', (s.fontSize / 100));
    document.documentElement.classList.toggle('hc', !!s.contrast);
  },
  toggle() {
    Store.data.settings.theme = Store.data.settings.theme === 'dark' ? 'light' : 'dark';
    Store.save(); this.apply();
  },
  cycleAccent() {
    const cur = Store.data.settings.accent || 'sunset';
    const nx = this.ACCENTS[(this.ACCENTS.indexOf(cur) + 1) % this.ACCENTS.length];
    Store.data.settings.accent = nx;
    Store.save(); this.apply();
    return nx;
  }
};

const Tex = {
  ready: false,
  loading: null,
  load() {
    if (window.renderMathInElement) { this.ready = true; return Promise.resolve(true); }
    if (this.loading) return this.loading;
    this.loading = loadStyleOnce('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css')
      .then(() => Promise.all([
        loadScriptOnce('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js'),
        loadScriptOnce('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/contrib/auto-render.min.js')
      ]))
      .then(() => {
        this.ready = !!window.renderMathInElement;
        return this.ready;
      })
      .catch(() => {
        this.loading = null;
        return false;
      });
    return this.loading;
  },
  render(root) {
    const host = root || document.body;
    const routeToken = typeof App === 'undefined' ? null : App.routeToken;
    const hasMath = host.textContent.includes('$') || !!host.querySelector('.formula-card, .f-eq, .derivation, .math-block');
    if (!hasMath) return;
    if (window.renderMathInElement) this.paint(host);
    else this.load().then(ready => {
      if (ready && host.isConnected !== false && (routeToken === null || routeToken === App.routeToken)) this.paint(host);
    });
  },
  paint(host) {
    if (!window.renderMathInElement || host.dataset.texRendered === '1') return;
    try {
      window.renderMathInElement(host, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
      });
      host.dataset.texRendered = '1';
    } catch (e) {}
  }
};

/* ---------- toasts ---------- */
function toast(msg, kind = 'ok', ms = 3200) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.innerHTML = msg;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}

/* ---------- misc ---------- */
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/* difficulty metadata */
const DIFFS = {
  beginner:     { label: 'Beginner',     dot: '🟢', cls: 'd-beginner' },
  intermediate: { label: 'Intermediate', dot: '🟡', cls: 'd-intermediate' },
  advanced:     { label: 'Advanced',     dot: '🟠', cls: 'd-advanced' },
  expert:       { label: 'Expert',       dot: '🔴', cls: 'd-expert' }
};

let _threeLoading = null;
let _simsLoading = null;
let _quizLoading = null;

function ensureThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!_threeLoading) {
    _threeLoading = loadScriptOnce('js/vendor/three.min.js').then(() => window.THREE).catch(err => {
      _threeLoading = null;
      throw err;
    });
  }
  return _threeLoading;
}

function ensureSimulations() {
  if (Object.keys(Sims.reg).length >= SIMULATION_COUNT) return Promise.resolve(Sims.reg);
  if (_simsLoading) return _simsLoading;
  const sources = [
    'js/sims-a.js', 'js/sims-b.js', 'js/sims-c.js', 'js/sims-d.js', 'js/sims-e.js',
    'js/sims-ncert.js',
    'js/sims-more.js', 'js/sims-realism.js', 'js/sims-phet.js', 'js/sims3d-a.js', 'js/sims3d-b.js'
  ].map(src => loadScriptOnce(src));
  _simsLoading = Promise.all(sources).then(() => Sims.reg).catch(err => {
    _simsLoading = null;
    throw err;
  });
  return _simsLoading;
}

function mountSimulation(id, host) {
  const ready = THREE_SIM_IDS.has(id) ? ensureThree() : Promise.resolve();
  return ready.then(() => {
    if (host.isConnected !== false) Sims.mount(id, host);
  });
}

function ensureQuizData() {
  if (_quizLoading) return _quizLoading;
  _quizLoading = Promise.all([
    loadScriptOnce('js/data-quiz-a.js'),
    loadScriptOnce('js/data-quiz-b.js'),
    loadScriptOnce('js/data-quiz-c.js'),
    loadScriptOnce('js/data-quiz-jee.js')
  ]).then(() => {
    if (typeof Quiz !== 'undefined' && typeof Quiz.init === 'function') Quiz.init();
    return QUIZ_BANK;
  }).catch(err => {
    _quizLoading = null;
    throw err;
  });
  return _quizLoading;
}

/* load immediately */
Store.load();
Theme.apply();
