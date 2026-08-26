/* PhysiX Academy — Local AI Tutor (offline heuristic engine, v2: long-question aware) */
'use strict';

const Tutor = {
  docs: null,
  STOP: null,

  build() {
    // stopwords — killed during tokenize so long questions don't drown the signal
    this.STOP = new Set(('the a an is are was were do does did what why how when where who which of in on for to with and or if it its this that these those can could would will shall should i you your me my we our am be been being have has had not no yes very just about into over under again then once here there all any both each few more most other some such only own same so than too'.split(' ')));
    this.docs = [];
    CURRICULUM.forEach(level => level.chapters.forEach(ch => ch.lessons.forEach(ls => {
      const href = '#/lesson/' + ls.id;
      const where = level.name + ' › ' + ch.title;
      ls.content.forEach(b => {
        if (!b) return;
        if (b.why) {
          this.docs.push({
            q: 'Q: ' + b.why.q, text: b.why.q + ' ' + b.why.p,
            html: '<p><b>' + mdInline(b.why.q) + '</b></p><p>' + mdInline(b.why.p) + '</p>',
            href, where, kind: 'insight'
          });
        }
        if (b.formula && b.formula.tex) this.addFormula(b.formula, href, where);
        if (b.formulas) b.formulas.forEach(f => this.addFormula(f, href, where));
      });
      (ls.content.filter(b => b.revise).flatMap(b => b.revise)).forEach(r => {
        this.docs.push({
          q: r, text: r,
          html: '<p>📌 ' + mdInline(r) + '</p>',
          href, where, kind: 'revision'
        });
      });
      // index the lesson title itself so "explain projectile motion" lands on the lesson
      this.docs.push({
        q: ls.title, text: ls.title + ' ' + ch.title + ' ' + (ch.tagline || ''),
        html: '<p><b>' + mdInline(ls.title) + '</b></p><p>' + mdInline(ch.tagline || ch.title) + '</p><p><a href="' + href + '">Open the full lesson →</a></p>',
        href, where, kind: 'lesson'
      });
    })));
  },

  addFormula(f, href, where) {
    if (!f || !f.tex) return;
    const name = f.name || 'Formula';
    this.docs.push({
      q: name, text: name + ' ' + (f.note || ''),
      html: '<p><b>' + mdInline(name) + '</b></p><p>$$' + f.tex + '$$</p>' +
        (f.note ? '<p class="small muted">' + mdInline(f.note) + '</p>' : '') +
        '<p><a href="' + href + '">Open the lesson →</a></p>',
      href, where, kind: 'formula'
    });
  },

  tokenize(s) {
    if (!this.STOP) this.build();
    return String(s).toLowerCase().replace(/[^a-z0-9\u00c0-\uffff\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !this.STOP.has(w));
  },

  // light stemming variants so "thrown/surfaces/depends" still find "throw/surface/depend"
  // stems must stay >= 4 chars — 'lens'→'len' would substring-match 'length' and wreck results
  variants(w) {
    const out = [w];
    const push = s => { if (s.length >= 4 && !out.includes(s)) out.push(s); };
    if (w.endsWith('ies')) push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) push(w.slice(0, -2));
    if (w.endsWith('s')) push(w.slice(0, -1));
    if (w.endsWith('ing')) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
    if (w.endsWith('ed')) { push(w.slice(0, -2)); push(w.slice(0, -1)); }
    return out;
  },

  // everyday word → physics-word the notes actually use
  SYN: { high: 'height', far: 'distance', fast: 'speed', quick: 'speed', slow: 'speed', toss: 'throw', falls: 'fall', weighty: 'weight', bright: 'light', spin: 'rotation', spinning: 'rotation', roll: 'rotation', circuit: 'current', wire: 'current', magnet: 'magnetic', lens: 'lenses', mirror: 'mirrors' },

  search(query, limit = 4) {
    if (!this.docs) this.build();
    const words = this.tokenize(query);
    if (!words.length) return [];
    // "how high / how far / calculate" → formulas answer these best
    const calcIntent = /how (high|far|long|fast|much|many)|calculate|find|compute|speed of|time taken/.test(String(query).toLowerCase());
    // document frequency → rare topic words (friction, lens) outrank common ones (surfaces, energy)
    const df = new Map();
    const variantsOf = new Map();
    words.forEach(w0 => {
      let vs = this.variants(w0);
      const s = this.SYN[w0];
      if (s) vs = vs.concat(this.variants(s));
      variantsOf.set(w0, vs);
      vs.forEach(v => {
        const key = v;
        if (!df.has(key)) {
          let n = 0;
          const needle = key;
          this.docs.forEach(d => { if ((d.q + ' ' + d.text).toLowerCase().includes(needle)) n++; });
          df.set(key, n);
        }
      });
    });
    const idf = key => { const n = df.get(key) || 0; return n <= 6 ? 1.6 : (n <= 15 ? 1.2 : 1.0); };

    const scored = [];
    this.docs.forEach(d => {
      const t = (d.q + ' ' + d.text).toLowerCase();
      const tq = d.q.toLowerCase();
      let score = 0, matchedTokens = 0, titleHits = 0, strongHit = false, bestTitleDf = 999;
      words.forEach(w0 => {
        let hit = false, inTitle = false, bestLen = 0, titleDf = 999;
        for (const w of variantsOf.get(w0)) {
          if (t.includes(w)) {
            hit = true;
            if (w.length > bestLen) bestLen = w.length;
            if (tq.includes(w)) {
              inTitle = true;
              const n = df.get(w) || 0;
              if (n < titleDf) titleDf = n;
            }
          }
        }
        if (!hit) return;
        matchedTokens++;
        score += (w0.length > 5 ? 3 : 2) * idf(w0);
        if (inTitle) { score += 3; titleHits++; if (titleDf < bestTitleDf) bestTitleDf = titleDf; }
        if (bestLen >= 5 || inTitle) strongHit = true;
      });
      if (!matchedTokens || !strongHit) return;
      const coverage = matchedTokens / words.length;
      let combined = score * (0.5 + coverage);
      // topic anchor: a df-2..20 topic word sitting in THIS doc's title = "the" doc
      if (bestTitleDf >= 2 && bestTitleDf <= 20) combined *= 2.3;
      else if (titleHits >= 2) combined *= 1.4;
      if (d.kind === 'formula' && calcIntent) combined *= 1.6;
      // doc-type trust: curated lessons/formulas beat stray revision bullets on ties
      combined *= (d.kind === 'lesson' ? 1.2 : d.kind === 'formula' ? 1.05 : d.kind === 'insight' ? 1.0 : 0.9);
      scored.push([combined, matchedTokens, d]);
    });
    if (!scored.length) return [];
    scored.sort((a, b) => b[0] - a[0]);
    const top = scored[0];
    // honest "I don't know" beats a confident wrong lesson:
    // weak score overall, or a single-word match too thin to trust
    if (top[0] < 2.4 || (top[1] === 1 && top[0] < 5)) return [];
    return scored.slice(0, limit).map(x => x[2]);
  },

  answer(input) {
    if (!this.docs) this.build();
    const q = String(input || '').trim();
    const low = q.toLowerCase();
    const words = this.tokenize(q);

    if (/^(hi|hello|hey|namaste|hola)\b/.test(low)) {
      return {
        html: '<p>Hello. I\'m the tutor built into this site — I was written alongside the curriculum, so I know where everything lives.</p>' +
          '<ul><li>Ask <i>why</i> questions: “Why does friction happen?”</li>' +
          '<li>Ask for formulas: “What is the lens equation?”</li>' +
          '<li>Say <b>quiz me</b> to head to Practice.</li></ul>',
        href: null
      };
    }
    if (/(who|what) are you|your name/.test(low)) {
      return {
        html: '<p>I\'m PhysiX Academy\'s built-in tutor. I read every lesson on this site so I can point you to exactly the right explanation — no internet required.</p>',
        href: null
      };
    }
    if (/(quiz|test me|practice|questions)/.test(low)) {
      return {
        html: '<p>Head to <a href="#/practice">Practice</a> — pick a level and difficulty. It keeps score and explains every answer, including the ones you get wrong.</p>',
        href: '#/practice'
      };
    }
    if (/^(thanks|thank you|thx)/.test(low)) {
      return { html: '<p>Any time. Keep asking “why” — that habit is worth more than any formula on this site.</p>', href: null };
    }
    if (!words.length) {
      return {
        html: '<p>Type a physics question — even a rough one — and I\'ll dig through the lessons for you.</p>',
        href: null
      };
    }

    const hits = this.search(q, 4);
    if (!hits.length) {
      const longHint = words.length > 6
        ? '<p class="small muted">Your question has a lot in it — try splitting it: ask the main thing first (<i>“why does X happen?”</i>), then the follow-up.</p>'
        : '<p class="small muted">Try rephrasing around a concept — e.g. <i>“Why does a rocket work?”</i>, <i>“momentum conservation”</i>, <i>“Ohm&#39;s law”</i> — or browse the <a href="#/learn">Learn</a> page.</p>';
      return {
        html: '<p>I couldn\'t find that one in my notes yet.</p>' + longHint,
        href: null
      };
    }

    const best = hits[0];
    const wantsFormula = /formula|equation|calculate|derive|relation/.test(low);
    const isLong = words.length > 3;

    // compose a fuller answer: main hit + same-lesson formula + quick revision
    let html = best.html;
    const sameLesson = this.docs.filter(d => d.where === best.where && d !== best);
    const fDoc = sameLesson.find(d => d.kind === 'formula');
    const rDoc = sameLesson.find(d => d.kind === 'revision');
    if (fDoc && (wantsFormula || isLong)) {
      html += '<details open style="margin:.6rem 0"><summary style="cursor:pointer;font-family:\'DM Mono\',monospace;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;opacity:.85">Key formula</summary><div style="padding:.5rem .2rem 0">' + fDoc.html + '</div></details>';
    }
    if (rDoc && isLong) {
      html += '<details style="margin:.4rem 0 .2rem"><summary style="cursor:pointer;font-family:\'DM Mono\',monospace;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;opacity:.85">Revise in 10 seconds</summary><div style="padding:.5rem .2rem 0">' + rDoc.html + '</div></details>';
    }
    html += '<p class="small muted">📖 From ' + esc(best.where) + ' · <a href="' + best.href + '">open lesson</a></p>';

    const related = hits.slice(1).filter(h => h.kind !== 'revision').slice(0, 3);
    if (related.length) {
      html += '<p class="small"><b>Related:</b></p><ul>' +
        related.map(h => '<li><a href="' + h.href + '">' + esc(h.q.replace(/^Q: /, '').slice(0, 80)) + '</a></li>').join('') +
        '</ul>';
    }
    return { html, href: best.href };
  },

  suggestions(n = 5) {
    if (!this.docs) this.build();
    const pool = this.docs.filter(d => d.kind === 'insight');
    const out = [];
    const used = new Set();
    while (out.length < n && used.size < pool.length) {
      const d = pool[Math.floor(Math.random() * pool.length)];
      const key = d.where;
      if (used.has(key)) continue;
      used.add(key);
      out.push(d.q.replace(/^Q: /, ''));
    }
    return out;
  }
};
