/* PhysiX Academy — optional learner profile.
 *
 * The only consumer of this was a login gate in index.html that has been
 * disabled (and commented out) since it was added, so this data was written by
 * nothing and read by nothing. It is kept because it is genuinely useful for
 * greeting the learner on the progress page, but it stays strictly optional:
 * the site is fully usable signed out and progress is keyed off the browser,
 * not off a profile.
 *
 * The persisted shape is { name, class, since } to match the gate's original
 * contract (`u.name` and `u.class`). `class` is a reserved word but has been a
 * legal property name since ES5, so `u.class` parses fine. It is mapped to
 * `cls` on the way out purely so calling code reads naturally. */

const KEY = 'physix-user';
const NAME_MAX = 40;

/* Returns { name, cls, since } or null when signed out or storage is
   unavailable/corrupt. Never throws: a private-mode browser with localStorage
   disabled must degrade to "no profile", not to a broken page. */
export function readUser() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    if (!u || typeof u.name !== 'string') return null;
    const name = u.name.trim().slice(0, NAME_MAX);
    if (!name) return null;
    return { name, cls: typeof u.class === 'string' ? u.class : '', since: u.since || null };
  } catch (e) {
    return null;
  }
}

/* Persists the profile. Returns what was stored, or null if it could not be
   saved (quota exceeded, storage blocked) — the caller should still let the
   learner through, since the gate should never be able to trap anyone. */
export function writeUser(name, cls) {
  const clean = String(name == null ? '' : name).trim().slice(0, NAME_MAX);
  if (!clean) return null;
  const u = { name: clean, class: String(cls || ''), since: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(u));
  } catch (e) {
    return null;
  }
  return { name: u.name, cls: u.class, since: u.since };
}

export function clearUser() {
  try { localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
}

/* Short label for the greeting, e.g. "Aarav · Class 11". */
export function userLabel() {
  const u = readUser();
  if (!u) return '';
  return u.cls ? `${u.name} · ${u.cls}` : u.name;
}
