/* ============================================================
   PhysiX Academy — Utilities
   Storage, math rendering, DOM helpers, toasts, theme
   ============================================================ */
'use strict';

/* ---------- tiny DOM helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

/* ---------- IndexedDB layer ----------
   Kept deliberately small and dependency-free, like the search and speech
   code, so the app still runs from file:// with no network and no build step.

   The Store API below stays fully synchronous: all ten call sites read
   Store.data directly, and making those await would have been a large,
   risky refactor for no user-visible gain. Instead the in-memory object is
   the source of truth for reads, and writes are mirrored to IndexedDB, which
   removes the 5 MB localStorage ceiling and keeps large writes off the
   main thread. localStorage is kept as a synchronous mirror so a crash
   mid-write cannot lose everything, and so older data still opens. */

function physixIdb() {
  let p = null;
  return function open() {
    if (p) return p;
    p = new Promise(resolve => {
      let idb;
      try { idb = window.indexedDB; } catch (e) { return resolve(null); }
      if (!idb) return resolve(null);
      let req;
      try { req = idb.open('physix-academy', 1); }
      catch (e) { return resolve(null); }
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore('kv'); } catch (e) { /* already there */ }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
      setTimeout(() => resolve(null), 2500);   // never hang the boot on a stuck DB
    });
    return p;
  };
}

const IDB = physixIdb();

function idbGet(key) {
  return IDB().then(db => {
    if (!db) return undefined;
    return new Promise(resolve => {
      let r;
      try { r = db.transaction('kv', 'readonly').objectStore('kv').get(key); }
      catch (e) { return resolve(undefined); }
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    });
  });
}

function idbSet(key, value) {
  return IDB().then(db => {
    if (!db) return false;
    try {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
    } catch (e) { return false; }
    return true;
  });
}

function idbDel(key) {
  return IDB().then(db => {
    if (!db) return false;
    try { db.transaction('kv', 'readwrite').objectStore('kv').delete(key); } catch (e) { return false; }
    return true;
  });
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
    /* Synchronous first paint from the localStorage mirror, so nothing that
       reads Store.data during boot has to wait on IndexedDB. ready() then
       reconciles against IndexedDB, which wins if it holds newer data. */
    try {
      this.data = Object.assign(this.defaults(), JSON.parse(localStorage.getItem(this.KEY) || '{}'));
      this.data.settings = Object.assign(this.defaults().settings, this.data.settings || {});
      this.data.quiz     = Object.assign(this.defaults().quiz, this.data.quiz || {});
    } catch (e) { this.data = this.defaults(); }
    return this.data;
  },
  /* Resolves once IndexedDB has been consulted. Anything rendering persisted
     state should await this (see ready() in app.js). */
  ready() {
    if (this._ready) return this._ready;
    this._ready = idbGet(this.KEY).then(rec => {
      if (rec && rec.data) {
        const d = Object.assign(this.defaults(), rec.data);
        d.settings = Object.assign(this.defaults().settings, d.settings || {});
        d.quiz     = Object.assign(this.defaults().quiz, d.quiz || {});
        this.data = d;
      } else if (rec === undefined) {
        // nothing in IndexedDB yet: seed it from what localStorage had
        return idbSet(this.KEY, { v: 1, savedAt: Date.now(), data: this.data }).then(() => false);
      }
      return true;
    }).catch(() => false);
    return this._ready;
  },
  save() {
    // localStorage mirror first (cheap, keeps crash-safety and older versions
    // working), then IndexedDB as the real store
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* quota or unavailable */ }
    idbSet(this.KEY, { v: 1, savedAt: Date.now(), data: this.data });
  },
  /* Wait for any in-flight IndexedDB write. Used before export and unload. */
  flush() { return idbSet(this.KEY, { v: 1, savedAt: Date.now(), data: this.data }); },
  storageMode() { return (typeof indexedDB !== 'undefined') ? 'IndexedDB + localStorage mirror' : 'localStorage only'; },

  /* ---------- backup / restore ---------- */
  exportBackup() {
    return {
      app: 'PhysiX Academy',
      kind: 'progress-backup',
      v: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        lessons: Object.keys(this.data.completed || {}).length,
        questions: (this.data.quiz && this.data.quiz.history || []).length,
        notes: Object.keys(this.data.notes || {}).length,
        streakDays: (this.data.streakDays || []).length
      },
      data: this.data
    };
  },
  /* Accepts either a full export envelope or a bare data object. Returns a
     short report so the UI can tell the student what actually changed. */
  importBackup(text) {
    let payload;
    try { payload = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'That file is not valid JSON.' }; }
    const incoming = (payload && payload.kind === 'progress-backup') ? payload.data : payload;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return { ok: false, error: 'No progress data found in that file.' };
    }
    const d = Object.assign(this.defaults(), incoming);
    d.settings = Object.assign(this.defaults().settings, d.settings || {});
    d.quiz     = Object.assign(this.defaults().quiz, d.quiz || {});
    if (!d.completed || typeof d.completed !== 'object') d.completed = {};
    if (!d.notes || typeof d.notes !== 'object') d.notes = {};
    if (!Array.isArray(d.streakDays)) d.streakDays = [];
    if (!d.timeLog || typeof d.timeLog !== 'object') d.timeLog = {};
    this.data = d;
    this.save();
    return {
      ok: true,
      lessons: Object.keys(d.completed).length,
      questions: (d.quiz.history || []).length,
      notes: Object.keys(d.notes).length
    };
  },
  async clearAll() {
    this.data = this.defaults();
    this.save();
    await idbDel(this.KEY);
  },
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

/* ---------- KaTeX rendering ---------- */
const Tex = {
  ready: false,
  init() {
    const tryInit = () => {
      if (window.renderMathInElement) { this.ready = true; return true; }
      return false;
    };
    tryInit();
    window.addEventListener('load', () => tryInit());
  },
  render(root) {
    if (!window.renderMathInElement) return;
    try {
      renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        strict: 'ignore'
      });
    } catch (e) { /* silent */ }
  }
};
Tex.init();

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

/* load immediately, then reconcile with IndexedDB in the background.
   Store.data is populated synchronously from the localStorage mirror so the
   first render never waits; anything that shows persisted state (the progress
   page, the streak chip) awaits Store.ready() first. */
Store.load();
Store.ready().then(() => {
  // let anything already on screen pick up hydrated values
  try { document.dispatchEvent(new CustomEvent('physix:store-ready')); } catch (e) { /* older browsers */ }
});
Theme.apply();
