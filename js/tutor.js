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

    if(this.isProblem(q)){
      const solved=this.trySolve(q);
      if(solved) return {html: solved, href: null};
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
  },

  // Problem solver — detects numericals and solves step-by-step
  isProblem(q){
    const hasNum=/\d+\.?\d*/.test(q);
    const hasIntent=/\b(find|calculate|compute|determine|what is|how|solve|value)\b/.test(q.toLowerCase());
    return hasNum && hasIntent;
  },
  extractNums(q){
    const m=[...String(q).matchAll(/(-?\d+\.?\d*)\s*(km\/h|m\/s|km|m|cm|mm|s|ms|kg|g|N|V|A|Ω|ohm|D|dioptre|cm|eV|J|W|Hz)?/gi)];
    return m.map(x=>[parseFloat(x[1]), (x[2]||'').toLowerCase()]);
  },
  trySolve(q){
    const low=q.toLowerCase();
    const nums=this.extractNums(q).map(x=>x[0]);
    if(!nums.length) return null;
    // 1) Ohm's law: V=IR
    if(/voltage|potential|volt|current|ampere|resistance|ohm|power/.test(low) && nums.length>=2){
      if(/power.*voltage|p\s*=\s*vi/.test(low) && nums.length>=2){
        const V=nums[0], I=nums[1], P=V*I;
        return `<p><b>Problem solver — P=VI</b></p><p>Given: V=${V} V, I=${I} A</p><p>Solution: P = V·I = ${V}×${I} = <b>${P} W</b></p><p>Also: R=V/I=${(V/I).toFixed(2)} Ω</p><p class="small muted">From Electricity — V=IR, P=VI. <a href="#/lesson/ncert10.elec.ohm">Open lesson →</a></p>`;
      }
      if(/resistance|ohm/.test(low)){
        const V=nums[0], I=nums[1]||nums[0];
        if(/v\s*=\s*\d/.test(low) || nums.length>=2){
          const R=(V/I).toFixed(2);
          return `<p><b>Problem solver — Ohm: V=IR</b></p><p>Given: V=${V}, I=${I}</p><p>R = V/I = ${V}/${I} = <b>${R} Ω</b></p><p class="small muted"><a href="#/lesson/ncert10.elec.ohm">Open lesson →</a></p>`;
        }
      }
    }
    // 2) Mirror: 1/f=1/v+1/u
    if(/mirror|focal|concave|convex/.test(low) && nums.length>=2){
      const f=nums[0], u=nums[1]; // assume f then u
      const v=1/(1/f - 1/u);
      if(isFinite(v)){
        const m=(-v/u).toFixed(2);
        return `<p><b>Problem solver — Mirror: 1/f=1/v+1/u</b></p><p>Given: f=${f} cm, u=${u} cm</p><p>1/v = 1/f − 1/u = 1/${f} − 1/${u} → v = <b>${v.toFixed(1)} cm</b></p><p>m = −v/u = <b>${m}</b> (${v<0?'real, inverted':'virtual, erect'})</p><p class="small muted"><a href="#/lesson/ncert10.light.mirrors">Open lesson →</a></p>`;
      }
    }
    // 3) Lens: 1/f=1/v−1/u
    if(/lens|power|dioptre/.test(low) && nums.length>=1){
      if(/power|dioptre|D/.test(low) && nums.length>=1){
        const P=nums[0], f=100/P;
        return `<p><b>Problem solver — Power P=1/f(m)</b></p><p>Given: P=${P} D → f = 100/P = <b>${f.toFixed(1)} cm</b></p><p class="small muted"><a href="#/lesson/ncert10.light.refraction">Open lesson →</a></p>`;
      }
    }
    // 4) Kinematics: v=u+at etc.
    if(/speed|velocity|acceleration|distance|time|km\/h|m\/s/.test(low) && nums.length>=2){
      // try v=u+at if u, a, t present
      if(/accelerat/.test(low) && nums.length>=3){
        const u=nums[0], a=nums[1], t=nums[2], v=u+a*t;
        return `<p><b>Problem solver — v=u+at</b></p><p>Given: u=${u}, a=${a}, t=${t}</p><p>v = ${u}+${a}×${t} = <b>${v}</b></p><p class="small muted"><a href="#/lesson/ncert9.motion.equations">Open lesson →</a></p>`;
      }
      if(/km\/h/.test(low) && nums.length>=1){
        const kmh=nums[0]; const ms=(kmh/3.6).toFixed(2);
        return `<p><b>Problem solver — km/h → m/s ÷3.6</b></p><p>${kmh} km/h = ${kmh}/3.6 = <b>${ms} m/s</b></p><p class="small muted">Water analogy. <a href="#/lesson/ncert10.light.mirrors">Open lesson →</a></p>`;
      }
    }
    // 5) Work/Energy: KE, PE
    if(/kinetic|work|energy|power/.test(low) && nums.length>=2){
      if(/kinetic/.test(low)){
        const m=nums[0], v=nums[1], ke=0.5*m*v*v;
        return `<p><b>Problem solver — KE=½mv²</b></p><p>m=${m} kg, v=${v} m/s → KE=0.5×${m}×${v}² = <b>${ke} J</b></p><p class="small muted"><a href="#/lesson/ncert9.work.energy">Open lesson →</a></p>`;
      }
    }
    // 6) Echo: d=vt/2
    if(/echo|sonar|distance/.test(low) && nums.length>=2){
      const v=nums[0], t=nums[1], d=v*t/2;
      return `<p><b>Problem solver — Echo d=vt/2</b></p><p>v=${v} m/s, t=${t} s → d=${v}×${t}/2 = <b>${d} m</b></p><p>Heard as ${t>=0.1?'distinct echo':'reverberation'}</p><p class="small muted"><a href="#/lesson/ncert9.sound.waves">Open lesson →</a></p>`;
    }
    return null;
  }
};
