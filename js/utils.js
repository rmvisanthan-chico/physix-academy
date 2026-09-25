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

/* load immediately */
Store.load();
Theme.apply();
