import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import {
  M_MIN, M_MAX, M_DEFAULT, M_STEP,
  K_MIN, K_MAX, K_DEFAULT, K_STEP,
  C_MIN, C_MAX, C_DEFAULT, C_STEP,
  PULL, zeta, periodD,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 430;

const PLATE = { x: -134, y: -66, w: 268, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const SCALE = 200; // bench px per metre of displacement x
const HOOK_Z = 93.5;          // spring top (under the crossbar stem)
const BLOCK = { x: -10, y: -8, w: 20, d: 16, r: 1.2 }; // mass plan, rest 52..67
const BLOCK_Z0 = 52, BLOCK_H = 15;
const DIALC = [58, -40];
const DIAL_R = 17, DIAL_Z = 60, DIAL_H = 6, DIAL_TOP = DIAL_Z + DIAL_H;
const PED_REL = [-108, 40];   // RELEASE pedestal
const PED_MASS = [-64, 44];
const PED_K = [-20, 44];
const PED_C = [26, 44];
const PLUNG_Z = 20;           // plunger disc rest height (inside the dashpot)
const OIL_Z = 34.1;           // oil surface: top of the translucent disc

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-42, 0, 100], [42, 0, 100], [0, 0, 101],
    [DIALC[0], DIALC[1], DIAL_TOP],
    [PED_REL[0], PED_REL[1], 27], [PED_C[0], PED_C[1], 27],
  ],
  WIDTH, HEIGHT, { pad: 24, azimuth: 50 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const dsp = (x) => x * SCALE;

// Vertical helical spring from zTop down to zBot, split into back/front runs.
// Ends: a lead from the hook centre into the first coil, and from the last
// coil into the pin at the mass top. Facing flips break the run, overlapping
// one segment so no seam gap opens.
function springDs(zTop, zBot, r, turns) {
  const n = Math.max(48, Math.round(turns * 18));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * turns * 2 * Math.PI;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, zTop + (zBot - zTop) * t]);
  }
  const fac = pts.map((p) => depthOf([p[0] / r, p[1] / r, 0], P) > 0);
  const all = [[0, 0, zTop + 2.6], [0, 0, zTop], ...pts, [0, 0, zBot]];
  const allFac = [fac[0], fac[0], ...fac, fac[fac.length - 1]];
  let dF = "", dB = "", cur = null;
  for (let i = 0; i < all.length; i++) {
    const f = allFac[i];
    const j = " " + iso(all[i], P).join(" ");
    if (cur === null) {
      if (f) dF += " M" + j; else dB += " M" + j;
    } else if (f === cur) {
      if (f) dF += " L" + j; else dB += " L" + j;
    } else {
      if (cur) { dF += " L" + j; dB += " M" + j; } else { dB += " L" + j; dF += " M" + j; }
    }
    cur = f;
  }
  return { back: dB.trim(), front: dF.trim() };
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -125, y: 58.5, w: 246, d: 6.5, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 1, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.2, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.2, 0.6])], { size: 0.45 }));
  return out.join("");
}

function dialAsm() {
  const [x, y] = DIALC;
  const out = [];
  out.push(S(k.cylinder(x, y, 3, PLATE_H, 48, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 5, PLATE_H, 2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 10, 5, DIAL_TOP, [1.3, 2.8], P, -2.4, 4.8);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  for (const [v, a] of [[-100, -2.4], [-50, -0.8], [0, 0], [50, 0.8], [100, 2.4]]) {
    out.push(k.faceTextSvg(k.topMatrix([x + Math.sin(a) * 11.4, y - Math.cos(a) * 11.4], DIAL_TOP, P, "x"), String(v), { size: 2.1, tone: "lo", anchor: "middle" }));
  }
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5.5], DIAL_TOP, P, "x"), "x  mm", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function frameAsm() {
  const out = [];
  for (const lx of [-34, 34]) {
    out.push(S(k.cylinder(lx, 0, 4, PLATE_H, 3, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(lx, 0, 2.4, PLATE_H + 3, 78, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(lx, 0, 3.2, 93, 2, P, 20), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -42, y: -6, w: 84, d: 12, r: 2 }, 95, 5, P, 4, 0.4), { tone: "mid" }));
  // hook: stem down from the crossbar face, ring under it, spring leads from the ring
  out.push(L(k.segment([0, 0, 95], [0, 0, 93.5], P), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 2.6, 93.5, P, 24), { tone: "mid" }));
  return out.join("");
}

function dashpotAsm() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 8.4, 3, 1.5, P, 32), { tone: "lo", crease: "none" })); // base pad
  // Tube wall as a C-shell: the front 80° is cut away (a section cut), so the
  // plunger, rod and oil stay visible at every height. The extrude's top face
  // is the rim annulus; the ring ends read as the two cut faces.
  let front = 0, best = -Infinity;
  for (let a = 0; a < 2 * Math.PI; a += Math.PI / 90) {
    const dpth = k.depthOf([Math.cos(a), Math.sin(a), 0], P);
    if (dpth > best) { best = dpth; front = a; }
  }
  const OPEN = (80 * Math.PI) / 180;
  const a1 = front + OPEN / 2, sweep = 2 * Math.PI - OPEN, N = 56;
  const ring = [];
  for (let i = 0; i <= N; i++) {
    const a = a1 + (sweep * i) / N;
    ring.push([9 * Math.cos(a), 9 * Math.sin(a)]);
  }
  for (let i = N; i >= 0; i--) {
    const a = a1 + (sweep * i) / N;
    ring.push([7.7 * Math.cos(a), 7.7 * Math.sin(a)]);
  }
  out.push(S(k.extrude(ring, 4.5, 33.5, P), { tone: "mid", crease: "lo" }));
  out.push(L(k.sideArc(0, 0, 7.7, 38, P, 40), { tone: "faint" })); // inner far wall
  return out.join("");
}

function massAsm() {
  const out = [];
  out.push(`<g data-part="mass">`);
  out.push(S(k.slabOf(BLOCK, BLOCK_Z0, BLOCK_H, P, 1.2, 0.5), { tone: "red", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BLOCK, 2.2), BLOCK_Z0 + BLOCK_H, P), { tone: "lo" }));
  const dots = k.corners(BLOCK, 3);
  out.push(D(dots.map(([x, y]) => at([x, y, BLOCK_Z0 + BLOCK_H])), { size: 0.45, tone: "lo" }));
  out.push(D([at([0, 0, BLOCK_Z0 + BLOCK_H + 0.2])], { size: 0.55, tone: "mid" })); // spring pin
  out.push(D([at([0, 0, BLOCK_Z0])], { size: 0.8, tone: "mid" })); // rod terminal dot (block bottom)
  out.push(`<path data-part="glow" class="iso-line" data-tone="red" d="${k.ring(0, 0, 12.5, BLOCK_Z0 + BLOCK_H / 2, P, 36)}"/>`);
  out.push(`</g>`);
  return out.join("");
}

function needleAt(frac) {
  const a = -2.4 + frac * 4.8;
  return k.lineOnTop([DIALC[0] - Math.sin(a) * 3, DIALC[1] + Math.cos(a) * 3], [DIALC[0] + Math.sin(a) * 14.8, DIALC[1] - Math.cos(a) * 14.8], DIAL_TOP + 0.4, P);
}
function kptrAt(frac, cx, cy) {
  const a = -2.4 + frac * 4.8;
  return k.lineOnTop([cx, cy], [cx + Math.sin(a) * 4.2, cy - Math.cos(a) * 4.2], 24.6, P);
}

function pedestal() {
  const [x, y] = PED_REL;
  const out = [];
  out.push(S(k.slabOf({ x: x - 14, y: y - 7, w: 28, d: 14, r: 2 }, 12, 4, P, 5, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.5, 16, 6, P, 20), { tone: "mid" }));
  const cap = S(k.cylinder(x, y, 6, 22, 4.5, P, 36, 0.8), { tone: "hi", crease: "lo", lit: true });
  out.push(`<g data-part="btncap">${cap}</g>`);
  out.push(L(k.ring(x, y, 8.4, 16, P, 28), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5], 16.3, P, "x"), "RELEASE", { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function knobAsm(cx, cy, label, frac) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 15, y: cy - 7, w: 30, d: 14, r: 2 }, 12, 4, P, 5, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 7, 16, 3, P, 36, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 5.5, 19, 5, P, 36, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(cx, cy, 5.5, 19, 24, 36, P, 0.3), { tone: "lo" }));
  out.push(D([at([cx, cy, 24])], { size: 0.5, tone: "hi" }));
  out.push(`<path data-part="kptr_${label}" class="iso-line" data-tone="hi" data-free="end" d="${kptrAt(frac, cx, cy)}"/>`);
  out.push(k.faceTextSvg(k.topMatrix([cx, cy + 5], 16.3, P, "x"), label, { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A mass on a spring with an oil dashpot in parallel: the MASS, STIFFNESS and DAMPING knobs rebuild the system, RELEASE pulls the mass down and lets go, and the dial reads the live displacement while zeta and the damped period update in the readout.",
  body: [
    plate(),
    dialAsm(),
    frameAsm(),
    dashpotAsm(),
    `<path data-part="sprB" class="iso-line" data-tone="lo" style="stroke-width:2" d=""/>`,
    `<path data-part="rod" class="iso-line" data-tone="blue" style="stroke-width:1.8" d="${k.segment([0, 0, BLOCK_Z0], [0, 0, PLUNG_Z], P)}"/>`,
    `<g data-part="plung"><path class="iso-line" data-tone="mid" style="stroke-width:1.6" d="${k.ring(0, 0, 5.2, PLUNG_Z, P, 32)}"/>${D([at([0, 0, PLUNG_Z])], { size: 0.7, tone: "mid" })}</g>`,
    S(k.cylinder(0, 0, 7.7, OIL_Z - 0.9, 0.9, P, 40), { tone: "blue", crease: "none", className: "oil" }), // oil, translucent
    massAsm(),
    `<path data-part="sprF" class="iso-line" data-tone="mid" style="stroke-width:2.2" d=""/>`,
    pedestal(),
    knobAsm(PED_MASS[0], PED_MASS[1], "MASS", (M_DEFAULT - M_MIN) / (M_MAX - M_MIN)),
    knobAsm(PED_K[0], PED_K[1], "STIFFNESS", (K_DEFAULT - K_MIN) / (K_MAX - K_MIN)),
    knobAsm(PED_C[0], PED_C[1], "DAMPING", (C_DEFAULT - C_MIN) / (C_MAX - C_MIN)),
    `<path data-part="needle" class="iso-line" data-tone="red" data-free="start" style="stroke-width:1.1" d="${needleAt((PULL * 1000 + 100) / 200)}"/>`,
    k.wireSvg(at([PED_REL[0], PED_REL[1], 16.5]), at([-42, 0, 93]), { via: [at([-100, -14, 12.7]), at([-60, -22, 12.7]), at([-48, -6, 50]), at([-45, 0, 78])], tone: "faint" }),
  ],
});

const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export\s+/gm, "");
const massScreen = at([PED_MASS[0], PED_MASS[1], 24]);
const stiffScreen = at([PED_K[0], PED_K[1], 24]);
const dampScreen = at([PED_C[0], PED_C[1], 24]);

const live = `
const P = ${JSON.stringify(P)};
const SCALE = ${SCALE}, HOOK_Z = ${HOOK_Z}, BLOCK_Z0 = ${BLOCK_Z0}, BLOCK_H = ${BLOCK_H}, DIALC = ${JSON.stringify(DIALC)}, DIAL_TOP = ${DIAL_TOP};
const dsp = (x) => x * SCALE;
const PLUNG_Z = ${PLUNG_Z};
const KM = ${JSON.stringify(PED_MASS)}, KC = ${JSON.stringify(PED_K)}, KD = ${JSON.stringify(PED_C)};
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
const kptrAt = ${kptrAt.toString().replace(/k\./g, "")};
const springDs = ${springDs.toString().replace(/k\./g, "")};
${modelSrc}
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readEl = document.querySelector("[data-readout]");
const rig = createMass();
let last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, tourTimer = 0, lastInput = -1e9;
let drag = null;
function markInput() { lastInput = performance.now(); }
function act() { release(rig); markInput(); }
function draw() {
  const d = dsp(rig.x);
  const s = springDs(HOOK_Z, BLOCK_Z0 + BLOCK_H - d, 7, 6.5);
  q("sprB").setAttribute("d", s.back);
  q("sprF").setAttribute("d", s.front);
  q("rod").setAttribute("d", segment([0, 0, BLOCK_Z0 - d], [0, 0, PLUNG_Z - d], P));
  q("plung").setAttribute("transform", translateAlong(P, [0, 0, -d]));
  q("mass").setAttribute("transform", translateAlong(P, [0, 0, -d]));
  const xmm = Math.round(rig.x * 1000);
  q("needle").setAttribute("d", needleAt(clamp((xmm + 100) / 200, 0, 1)));
  q("kptr_MASS").setAttribute("d", kptrAt((rig.m - M_MIN) / (M_MAX - M_MIN), KM[0], KM[1]));
  q("kptr_STIFFNESS").setAttribute("d", kptrAt((rig.k - K_MIN) / (K_MAX - K_MIN), KC[0], KC[1]));
  q("kptr_DAMPING").setAttribute("d", kptrAt((rig.c - C_MIN) / (C_MAX - C_MIN), KD[0], KD[1]));
  const z = zeta(rig), Td = periodD(rig);
  const text = "m " + rig.m.toFixed(2) + " kg · k " + Math.round(rig.k) + " N/m · ζ " + z.toFixed(2) + " · Td " + (Td > 0 ? Td.toFixed(2) + " s" : "—") + " · x " + (xmm >= 0 ? "+" : "-") + Math.abs(xmm) + " mm";
  if (readEl.textContent !== text) readEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(xmm));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = clamp((now - last) / 1000 || 1 / 60, 0, 1 / 30);
  last = now;
  tourClock += dt;
  if (touring && tourClock > 1.6) {
    tourTimer += dt;
    if (tourTimer > 2.4) {
      tourTimer = 0;
      const preset = [[0.5, 40, 0.5], [0.5, 80, 0.5], [0.2, 100, 0.5], [0.5, 40, 2], [0.2, 20, 4]][Math.floor(tourClock / 2.4) % 5];
      setMass(rig, preset[0]); setStiffness(rig, preset[1]); setDamping(rig, preset[2]);
      release(rig);
    }
  }
  if (!touring && !still.matches && now - lastInput > 3600) touring = true;
  step(rig, dt);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
const KNOBS = [
  { s: ${JSON.stringify(massScreen)}, kind: "M" },
  { s: ${JSON.stringify(stiffScreen)}, kind: "K" },
  { s: ${JSON.stringify(dampScreen)}, kind: "C" },
];
svgEl.addEventListener("pointerdown", (e) => {
  const rect = svgEl.getBoundingClientRect();
  const kx = rect.width / ${WIDTH};
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  for (const kn of KNOBS) {
    if (Math.hypot(px - kn.s[0] * kx, py - kn.s[1] * kx) < 44) {
      drag = { y: e.clientY, base: kn.kind === "M" ? rig.m : kn.kind === "K" ? rig.k : rig.c, kind: kn.kind };
      svgEl.setPointerCapture(e.pointerId);
      return;
    }
  }
  act();
});
svgEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const d = ((drag.y - e.clientY) / 50) * 4;
  if (drag.kind === "M") setMass(rig, drag.base + d * ${M_STEP});
  else if (drag.kind === "K") setStiffness(rig, drag.base + d * ${K_STEP});
  else setDamping(rig, drag.base + d * ${C_STEP});
  touring = false; markInput();
});
const endDrag = () => { drag = null; };
svgEl.addEventListener("pointerup", endDrag);
svgEl.addEventListener("pointercancel", endDrag);
svgEl.addEventListener("pointerleave", () => { drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setStiffness(rig, rig.k + ${K_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setStiffness(rig, rig.k - ${K_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); setDamping(rig, rig.c + ${C_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); setDamping(rig, rig.c - ${C_STEP}); touring = false; markInput(); }
  else if (e.key === "Home") { e.preventDefault(); setDamping(rig, ${C_MIN}); touring = false; markInput(); }
  else if (e.key === "End") { e.preventDefault(); setDamping(rig, ${C_MAX}); touring = false; markInput(); }
});
draw();
`;

const readout0 = `m ${M_DEFAULT.toFixed(2)} kg · k ${K_DEFAULT} N/m · ζ ${zeta({ c: C_DEFAULT, k: K_DEFAULT, m: M_DEFAULT }).toFixed(2)} · Td ${periodD({ c: C_DEFAULT, k: K_DEFAULT, m: M_DEFAULT }).toFixed(2)} s · x +${Math.round(PULL * 1000)} mm`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Spring-damper bench",
  hint: "Drag the knobs · Space releases",
  readout: readout0,
  keys: [
    { mark: "lit", label: "Mass block — the one lit part; it rides on the spring" },
    { mark: "raised", label: "Spring, rod and plunger — they follow the displacement x" },
    { mark: "faint", label: "Cable — RELEASE button to the frame" },
  ],
  caption: "The spring and the oil dashpot act in parallel. The spring alone would swing forever at Td = 2π√(m/k); the plunger dragging through oil bleeds energy at the rate set by ζ = c / 2√(km). Raise DAMPING until ζ reaches 1 and the overshoot disappears — the mass creeps back to rest without crossing it. The dial reads the live displacement x in millimetres, measured downward from equilibrium.",
  body: `<style>
.iso{--anatomy-red:#fb7185;--anatomy-blue:#22d3ee;--anatomy-green:#34d399;--anatomy-hi:#e6f1ff;--anatomy-mid:#7f8db3;--anatomy-lo:#3a4668;--anatomy-page:#070b16;--anatomy-card:#0a1020}
.iso-plate{background:radial-gradient(1200px 600px at 85% -10%,rgba(109,93,246,.14),transparent 55%),radial-gradient(900px 500px at -10% 25%,rgba(34,211,238,.1),transparent 50%),#070b16!important}
.iso[data-theme="light"] .iso-plate{background:radial-gradient(1000px 460px at 28% 18%,#f3e9d2 0%,#fbfbfa 55%)!important}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-dots[data-tone="red"] circle{fill:var(--anatomy-red);opacity:.9}
.iso-dots[data-tone="green"] circle{fill:var(--anatomy-green);opacity:.9}
.iso-solid.oil .iso-top{fill:var(--anatomy-blue);opacity:.55}
.iso-solid.oil .iso-fill{opacity:.4}
.iso-solid.oil .iso-shade{opacity:.4}
</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Spring-damper bench: arrow keys set stiffness and damping, Space releases" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="${Math.round(PULL * 1000)}">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "bench-light.html" : "bench.html"), k.pageHtml({ title: "Spring-damper bench", theme, body, script: kitScript() + "\n" + live }));
console.log("wrote", theme === "light" ? "bench-light.html" : "bench.html");
