import { $ } from './utils.js';
/* LaTeX -> spoken English, for the lesson "Listen" button.
The previous behaviour stripped only the $ delimiters, so speech
   synthesis read "\frac{G m_1 m_2}{r^2}" aloud as "backslash frac brace G
   m one m two close brace r squared". Worse, the formula blocks were never
   passed to the utterance at all, so a lesson on Newton's law was heard with
   no law in it.

   Scope is deliberately what this curriculum actually uses: 254 formulas,
   59 distinct commands, no environments and no \begin{aligned}. */

const TEX_SYMBOLS = {
  // relations and operators
  'times': 'times', 'cdot': 'times', 'div': 'divided by',
  'pm': 'plus or minus', 'mp': 'minus or plus',
  'approx': 'is approximately', 'simeq': 'is approximately',
  'equiv': 'is equivalent to', 'propto': 'is proportional to',
  'le': 'is less than or equal to', 'leq': 'is less than or equal to',
  'ge': 'is greater than or equal to', 'geq': 'is greater than or equal to',
  'neq': 'is not equal to', 'ne': 'is not equal to',
  'Rightarrow': 'implies', 'rightarrow': 'approaches', 'to': 'approaches',
  'leftarrow': 'is approached from', 'mapsto': 'maps to',
  'infty': 'infinity', 'partial': 'partial', 'nabla': 'nabla',
  'circ': 'degrees', 'degree': 'degrees',
  'ldots': 'dot dot dot', 'cdots': 'dot dot dot', 'dots': 'dot dot dot',
  // functions
  'sin': 'sine', 'cos': 'cosine', 'tan': 'tangent', 'sec': 'secant',
  'csc': 'cosecant', 'cot': 'cotangent', 'sinh': 'hyperbolic sine',
  'ln': 'natural log', 'log': 'log', 'exp': 'exponential',
  'lim': 'the limit', 'max': 'maximum', 'min': 'minimum',
  // greek (spoken as words: they never take an implicit "times")
  'alpha': 'alpha', 'beta': 'beta', 'gamma': 'gamma', 'delta': 'delta',
  'Delta': 'capital delta', 'epsilon': 'epsilon', 'varepsilon': 'epsilon',
  'zeta': 'zeta', 'eta': 'eta', 'theta': 'theta', 'Theta': 'capital theta',
  'iota': 'iota', 'kappa': 'kappa', 'lambda': 'lambda', 'Lambda': 'capital lambda',
  'mu': 'mu', 'nu': 'nu', 'xi': 'xi', 'pi': 'pi', 'Pi': 'capital pi',
  'rho': 'rho', 'sigma': 'sigma', 'Sigma': 'the sum of', 'tau': 'tau',
  'phi': 'phi', 'Phi': 'capital phi', 'chi': 'chi', 'psi': 'psi',
  'Psi': 'capital psi', 'omega': 'omega', 'Omega': 'capital omega',
  'Gamma': 'capital gamma', 'hbar': 'h bar', 'ell': 'L',
  // big operators
  'sum': 'the sum of', 'prod': 'the product of', 'int': 'the integral of',
  'oint': 'the closed line integral of', 'iint': 'the double integral of',
  // accents, applied as a word in front of their argument
  'vec': 'vector', 'hat': 'hat', 'bar': 'bar', 'overline': 'over',
  'dot': 'dot', 'ddot': 'double dot', 'tilde': 'tilde', 'widehat': 'hat',
  // brackets
  'langle': 'angle bracket', 'rangle': 'angle bracket',
  'lceil': 'ceiling', 'rceil': 'ceiling', 'lfloor': 'floor', 'rfloor': 'floor',
  'quad': ' ', 'qquad': ' ', ',': ' ', ';': ' ', ':': ' ',
  '!': '', ' ': ' ', ', ': ' '
};

// wrappers that mean "say what is inside, literally"
const TEX_LITERAL = /^(?:text|mathrm|mathbf|mathit|textbf|textit|mathsf|mathtt|operatorname|textrm|textbf|mbox|textbf)$/;
const TEX_SIZING = /^(?:left|right|displaystyle|scriptstyle|scriptscriptstyle|limits|nolimits|big|Big|bigg|Bigg|mathstrut|strut|phantom|displaystyle)$/;
const TEX_FRAC = /^(?:[dtc]?frac)$/;

/* Multi-letter runs that are names, not products. Everything else is split
   into single-letter atoms so implicit multiplication can speak it:
   "mgh" -> "m times g times h". */
const TEX_WORD_ID = new Set(['max', 'min', 'net', 'avg', 'eff', 'tot', 'rms',
  'ref', 'th', 'init', 'ideal', 'real', 'mean', 'fric', 'drag', 'coeff', 'term',
  'prop', 'denom', 'numer', 'const', 'eq', 'no', 'yes']);
const TEX_ACCENT = /^(?:vec|hat|bar|overline|dot|ddot|tilde|widehat|bar|underline|overline)$/;

/* Atom markers. A Latin variable or a number is an atom, and two atoms side
   by side are implicit multiplication ("G m_1 m_2" -> "G times m times m").
   Greek and function names are words and must NOT collect a "times". */
const A0 = '\u0000', A1 = '\u0001';
const atom = s => A0 + s + A1;

/* Read one LaTeX argument at index i: either a {...} group (balanced, so
   nesting works) or a single token. Returns the raw text and where to carry on. */
function readArg(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] === '{') {
    let depth = 1, j = i + 1;
    while (j < s.length && depth) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === '{') depth++;
      else if (s[j] === '}') depth--;
      j++;
    }
    return { text: s.slice(i + 1, j - 1), next: j };
  }
  if (s[i] === '\\') {
    let j = i + 1;
    while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
    return { text: s.slice(i, j), next: j };
  }
  return { text: s[i] || '', next: i + 1 };
}

/* Exponents get natural phrasing where there is one, because "to the power of
   2" is a lot to listen to when "squared" will do. */
const POW_WORD = { '2': 'squared', '3': 'cubed', '0': 'to the power zero', '1': '' };

export function texToSpeech(tex) {
  if (tex == null) return '';
  const s = String(tex);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (ch === '\\') {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      let name = s.slice(i + 1, j);
      i = j;

      if (!name) {                       // escaped punctuation: \\ \, \; \! \{ \}
        const c = s[i];
        if (c === '\\') { out += ' '; i++; }
        else if (c === ',' || c === ';' || c === ':') { out += ' '; i++; }
        else if (c === '!' || c === ' ') { i++; }
        else if (c === '{' || c === '}' || c === '%' || c === '$' || c === '&' || c === '#') { out += ' '; i++; }
        else if (c === '%') { while (i < s.length && s[i] !== '\n') i++; }
        else { out += ' '; i++; }
        continue;
      }

      if (TEX_SIZING.test(name)) continue;                       // \left \right \big ...
      if (name in TEX_SYMBOLS && !TEX_FRAC.test(name)) {
        // an accent takes an argument; other symbols do not
        if (TEX_ACCENT.test(name)) {
          const a = readArg(s, i);
          i = a.next;
          out += (TEX_SYMBOLS[name] || name) + ' ' + texToSpeech(a.text);
        } else {
          out += ' ' + TEX_SYMBOLS[name] + ' ';
        }
        continue;
      }
      if (TEX_LITERAL.test(name)) {
        const a = readArg(s, i);
        i = a.next;
        out += ' ' + a.text.replace(/[_^]\{?\\?[a-zA-Z0-9]+\}?/g, ' ').replace(/[\\{}]/g, ' ') + ' ';
        continue;
      }
      if (TEX_FRAC.test(name)) {
        const n = readArg(s, i); i = n.next;
        const d = readArg(s, i); i = d.next;
        const top = texToSpeech(n.text).trim(), bot = texToSpeech(d.text).trim();
        // a bare 1 over n reads far better as "one nth"
        const numWord = { '1': 'one', '2': 'two', '3': 'three' }[top];
        if (numWord && /^-?\d+$/.test(bot)) {
          const b = Math.abs(parseInt(bot, 10));
          // "one half", not "one halves"; but "two thirds" does take the plural
          const sing = { 2: 'half', 3: 'third', 4: 'quarter' }[b] || b + 'th';
          const plur = { 3: 'thirds' }[b] || b + 'ths';
          out += ' ' + numWord + ' ' + (numWord === 'one' ? sing : plur) + ' ';
        } else {
          out += ' ' + top + ' divided by ' + bot + ' ';
        }
        continue;
      }
      if (name === 'sqrt') {
        let root = null;
        if (s[i] === '[') { const e = s.indexOf(']', i); root = s.slice(i + 1, e); i = e + 1; }
        const a = readArg(s, i); i = a.next;
        out += root
          ? ' the ' + texToSpeech(root).trim() + ' root of ' + texToSpeech(a.text).trim() + ' '
          : ' the square root of ' + texToSpeech(a.text).trim() + ' ';
        continue;
      }
      if (name === 'mathcal' || name === 'mathbb' || name === 'mathscr') {
        const a = readArg(s, i); i = a.next;
        out += ' ' + a.text + ' ';
        continue;
      }
      // unknown command: say its name rather than leaking "\foo" to the voice
      out += ' ' + name + ' ';
      continue;
    }

    // ^ exponent or _ subscript
    if (ch === '^' || ch === '_') {
      const a = readArg(s, i + 1);
      i = a.next;
      const body = a.text;
      const sup = ch === '^';
      if (sup) {
        if (POW_WORD[body] !== undefined) out += ' ' + POW_WORD[body] + ' ';
        else if (/^-?\d+$/.test(body)) out += ' to the power of ' + spellNum(parseInt(body, 10)) + ' ';
        else out += ' to the power of ' + atom(texToSpeech(body).trim()) + ' ';
      } else {
        const b = /^[a-zA-Z]{2,}$/.test(body) ? body : texToSpeech(body).trim();
        out += b ? ' subscript ' + (/^-?\d+$/.test(body) ? spellNum(parseInt(body, 10)) : b) + ' ' : ' ';
      }
      continue;
    }

    if (ch === '{' || ch === '}') { out += ' '; i++; continue; }
    if (/\s/.test(ch)) { out += ' '; i++; continue; }

    if (/[0-9]/.test(ch)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      out += atom(s.slice(i, j)); i = j; continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i; while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const run = s.slice(i, j);
      if (TEX_WORD_ID.has(run.toLowerCase())) out += ' ' + run + ' ';
      else for (const L of run) out += atom(L);
      i = j; continue;
    }

    const OPS = { '=': ' equals ', '<': ' is less than ', '>': ' is greater than ',
      '+': ' plus ', '-': ' minus ', '±': ' plus or minus ', '×': ' times ',
      '÷': ' divided by ', '·': ' times ', '−': ' minus ', '→': ' approaches ',
      '≈': ' is approximately ', '≤': ' is less than or equal to ',
      '≥': ' is greater than or equal to ', '≠': ' is not equal to ',
      '(': ' ', ')': ' ', '[': ' ', ']': ' ', ',': ' ', '.': '. ',
      '%': ' percent ', '!': ' ', '"': ' ', "'": ' ' };
    out += (OPS[ch] !== undefined ? OPS[ch] : ' ') + ' ';
    i++;
  }

  // implicit multiplication between neighbouring atoms
  let t = out;
  for (let guard = 0; guard < 4; guard++) {
    const before = t;
    t = t.replace(new RegExp(A0 + '(.*?)' + A1 + '(\\s*)' + A0, 'g'), (m, a, sp) =>
      A0 + a + A1 + sp + ' times ' + A0);
    t = t.replace(new RegExp(A0 + '(.*?)' + A1 + '(\\s*)=', 'g'), (m, a, sp) =>
      A0 + a + A1 + sp + ' equals ');
    if (t === before) break;
  }
  return t.replace(new RegExp(A0 + '|' + A1, 'g'), '')
    .replace(/\s*([=+\-<>])\s*/g, ' $1 ')
    .replace(/\btimes equals\b/g, 'equals')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .trim();
}

/* Lesson prose carries inline $...$ math as well as display equations. This
   converts those inline spans and then scrubs anything still LaTeX-shaped, so
   no "\mu" or stray "$" is ever handed to the voice. */
export function speechifyText(s) {
  let t = String(s == null ? '' : s);
  if (typeof texToSpeech === 'function') {
    // Must contain real LaTeX markup to count as math, must not cross a line
    // break, and is capped so a stray $ cannot swallow surrounding prose.
    t = t.replace(/\$([^$\n]{0,120}?[\\^_][^$\n]{0,120}?)\$/g, (m, tex) => texToSpeech(tex));
  }
  return t
    .replace(/\$/g, ' ')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}^_]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function spellNum(n) {
  const w = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  if (n >= 0 && n <= 10) return w[n];
  if (n < 0) return 'minus ' + spellNum(-n);
  return String(n);
}
