// Pure thin-lens model — single source of truth for the figure.
// 1/f = 1/do + 1/di,  m = -di/do.  di < 0 means a virtual image.
export const F_MIN = 10;
export const F_MAX = 30;
export const F_STEP = 1;
export const F_DEFAULT = 15;
export const DO_MIN = 8;
export const DO_MAX = 50;
export const DO_STEP = 1;
export const DO_DEFAULT = 30;

export function createLens(do_ = DO_DEFAULT, f = F_DEFAULT) {
  const L = { do: clamp(do_, DO_MIN, DO_MAX), f: clamp(f, F_MIN, F_MAX) };
  solve(L);
  return L;
}

export function solve(L) {
  const inv = 1 / L.f - 1 / L.do;
  L.di = inv === 0 ? 0 : 1 / inv;
  L.m = -L.di / L.do;
  L.real = L.di > 0;
  L.inverted = L.m < 0;
  return L;
}

export function setDistance(L, do_) { L.do = clamp(do_, DO_MIN, DO_MAX); solve(L); }
export function setFocal(L, f) { L.f = clamp(f, F_MIN, F_MAX); solve(L); }

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
