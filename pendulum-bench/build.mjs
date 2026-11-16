import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import { L_MIN, L_MAX, L_DEFAULT, A_MIN, A_MAX, A_DEFAULT, period } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 430;

const PLATE = { x: -134, y: -66, w: 268, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const PIVOT = [0, 0, 70];
const SCALE = 42; // bench units per metre
const DIALC = [64, -44];
const DIAL_R = 17, DIAL_Z = 60, DIAL_H = 6, DIAL_TOP = DIAL_Z + DIAL_H;
const PED1 = [-78, 41];   // RELEASE pedestal
const PED2 = [-114, 45];  // LENGTH knob
const PED3 = [-40, 45];   // ANGLE knob

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 78], [-45, 0, 70], [45, 0, 70], [64, -44, 66], [-114, 45, 24]],
  WIDTH, HEIGHT, { pad: 26, azimuth: 50 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const Lw = (Lm) => Lm * SCALE;
const bobPos = (L, th) => [PIVOT[0] + Lw(L) * Math.sin(th), PIVOT[1], PIVOT[2] - Lw(L) * Math.cos(th)];

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
  for (const [v, a] of [[1, -2.4], [1.5, -0.8], [2, 0.8], [2.5, 2.4]]) {
    out.push(k.faceTextSvg(k.topMatrix([x + Math.sin(a) * 11.4, y - Math.cos(a) * 11.4], DIAL_TOP, P, "x"), String(v), { size: 2.4, tone: "lo", anchor: "middle" }));
  }
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5.5], DIAL_TOP, P, "x"), "T  s", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function standAsm() {
  const out = [];
  // two A-feet pads + posts + top crossbar along y
  for (const ly of [-16, 16]) {
    out.push(S(k.cylinder(0, ly, 4, PLATE_H, 3, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(0, ly, 2.4, PLATE_H + 3, 55, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(0, ly, 3.2, PLATE_H + 58, 2.5, P, 20), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -8, y: -20, w: 16, d: 40, r: 2 }, 68, 5, P, 4, 0.4), { tone: "mid" }));
  // pivot housing + axle (ring faces +y at the rod's plane, rod lands on it)
  out.push(L(k.sideRing([0, 0, 70], 5.5, "y", P, 28), { tone: "mid" }));
  out.push(D([at([0, 0, 70])], { size: 0.55, tone: "mid" }));
  out.push(S(k.cylinder(0, -19, 3, 68, 4, P, 20), { tone: "mid" }));
  // protractor fan: arc polyline at r=6.2 + ticks from the arc line to r=7.4 (both ends on stroke)
  const arcPts = [];
  for (let a = -80; a <= 80; a += 5) {
    const t = (a * Math.PI) / 180;
    arcPts.push([PIVOT[0] + 6.2 * Math.sin(t), 8, PIVOT[2] - 6.2 * Math.cos(t)]);
  }
  const arcPath = arcPts.map((p, i) => (i ? "L" : "M") + at(p).join(" ")).join(" ");
  out.push(L(arcPath, { tone: "lo" }));
  const ticks = [];
  for (let a = -80; a <= 80; a += 10) {
    const t = (a * Math.PI) / 180;
    ticks.push(k.segment([PIVOT[0] + 6.2 * Math.sin(t), 8, PIVOT[2] - 6.2 * Math.cos(t)], [PIVOT[0] + 7.4 * Math.sin(t), 8, PIVOT[2] - 7.4 * Math.cos(t)], P));
  }
  out.push(L(ticks.join(""), { tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([14, 9.4], 61, P, "left"), "A-FRAME", { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function rodAt(L, th) {
  const b = bobPos(L, th);
  return k.segment(PIVOT, [b[0], b[1], b[2] + 3.5], P);
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
  const [x, y] = PED1;
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
  out.push(S(k.slabOf({ x: cx - 10, y: cy - 7, w: 20, d: 14, r: 2 }, 12, 4, P, 5, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 7, 16, 3, P, 36, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 5.5, 19, 5, P, 36, 0.6), { tone: "mid" }));
  out.push(L(k.knurl(cx, cy, 5.5, 19, 24, 36, P, 0.3), { tone: "lo" }));
  out.push(D([at([cx, cy, 24])], { size: 0.5, tone: "hi" }));
  out.push(`<path data-part="kptr_${label}" class="iso-line" data-tone="hi" data-free="end" d="${kptrAt(frac, cx, cy)}"/>`);
  out.push(k.faceTextSvg(k.topMatrix([cx, cy + 5], 16.3, P, "x"), label, { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const L0 = 0.7, A0 = 45;
const th0 = (A0 * Math.PI) / 180;
const bob0 = bobPos(L0, th0);
const bobBase = [0, 0, PIVOT[2] - Lw(L0)];

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A pendulum on an A-frame stand: the LENGTH knob rebuilds the rod, the ANGLE knob (or a click) re-releases it, and the dial reads the true period T = 2 pi sqrt(l / g).",
  body: [
    plate(),
    dialAsm(),
    standAsm(),
    `<path data-part="rod" class="iso-line" data-tone="blue" style="stroke-width:1.8" d="${rodAt(L0, th0)}"/>`,
    `<g data-part="bob">${S(k.cylinder(bobBase[0], bobBase[1], 7.5, bobBase[2] - 1.5, 5, P, 36, 0.5), { tone: "red", crease: "lo" })}${D([at([bobBase[0], bobBase[1], bobBase[2] + 3.5])], { size: 0.55, tone: "mid" })}</g>`,
    `<path data-part="glow" class="iso-line" data-tone="red" d="${k.ring(bob0[0], bob0[1], 9.1, bob0[2] + 3.9, P, 36)}"/>`,
    pedestal(),
    knobAsm(PED2[0], PED2[1], "LENGTH", (L0 - L_MIN) / (L_MAX - L_MIN)),
    knobAsm(PED3[0], PED3[1], "ANGLE", (A0 - A_MIN) / (A_MAX - A_MIN)),
    `<path data-part="needle" class="iso-line" data-tone="red" data-free="start" style="stroke-width:1.1" d="${needleAt((period({ L: L0 }) - 0.5) / 2)}"/>`,
    k.wireSvg(at([PED1[0], PED1[1], 16.5]), at([0, -19, 66]), { via: [at([-40, 45, 12.7]), at([10, 44, 12.7]), at([4, 30, 12.7]), at([0, -5, 30])], tone: "faint" }),
  ],
});

const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export\s+/gm, "");
const lenScreen = at([PED2[0], PED2[1], 24]);
const angScreen = at([PED3[0], PED3[1], 24]);

const live = `
const P = ${JSON.stringify(P)};
const PIVOT = ${JSON.stringify(PIVOT)}, SCALE = ${SCALE}, DIALC = ${JSON.stringify(DIALC)}, DIAL_TOP = ${DIAL_TOP}, PED2 = ${JSON.stringify(PED2)}, PED3 = ${JSON.stringify(PED3)};
const ${"rodAt"} = ${rodAt.toString().replace(/k\./g, "")};
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
const kptrAt = ${kptrAt.toString().replace(/k\./g, "")};
const bobPos = (L, th) => [PIVOT[0] + L * SCALE * Math.sin(th), PIVOT[1], PIVOT[2] - L * SCALE * Math.cos(th)];
const bobBase = ${JSON.stringify(bobBase)};
${modelSrc}
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readEl = document.querySelector("[data-readout]");
const pend = createPendulum();
let last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, tourTimer = 0, lastInput = -1e9;
let drag = null, lastReadout = "";
function markInput() { lastInput = performance.now(); }
function releaseNow() { release(pend, pend.angleDeg); }
function act() { releaseNow(); markInput(); }
function draw() {
  const b = bobPos(pend.L, pend.theta);
  q("rod").setAttribute("d", rodAt(pend.L, pend.theta));
  q("bob").setAttribute("transform", translateAlong(P, [b[0] - bobBase[0], b[1] - bobBase[1], b[2] - bobBase[2]]));
  q("glow").setAttribute("d", ring(b[0], b[1], 9.1, b[2] + 3.9, P, 36));
  const T = period(pend);
  q("needle").setAttribute("d", needleAt(clamp((T - 0.5) / 2, 0, 1)));
  q("kptr_LENGTH").setAttribute("d", kptrAt((pend.L - L_MIN) / (L_MAX - L_MIN), PED2[0], PED2[1]));
  q("kptr_ANGLE").setAttribute("d", kptrAt((pend.angleDeg - A_MIN) / (A_MAX - A_MIN), PED3[0], PED3[1]));
  const text = "L " + pend.L.toFixed(2) + " m · T " + T.toFixed(2) + " s · release " + Math.round(pend.angleDeg) + "° · E " + Math.round(energyFraction(pend) * 100) + "%";
  if (readEl.textContent !== text) readEl.textContent = text;
  lastReadout = text;
  stage.setAttribute("aria-valuenow", String(Math.round(pend.L * 100)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = clamp((now - last) / 1000 || 1 / 60, 0, 1 / 30);
  last = now;
  tourClock += dt;
  if (touring && tourClock > 1.6) {
    tourTimer += dt;
    if (tourTimer > 2.2) { tourTimer = 0; const Ls = [0.4, 0.7, 1.0, 0.55, 0.85]; const As = [25, 60, 45, 75, 35]; const i = Math.floor(tourClock / 2.2) % 5; setLength(pend, Ls[i]); release(pend, As[i]); }
  }
  if (!touring && !still.matches && now - lastInput > 3600) touring = true;
  if (still.matches) { pend.theta = (pend.angleDeg * Math.PI) / 180; }
  else { step(pend, dt); }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
svgEl.addEventListener("pointerdown", (e) => {
  const rect = svgEl.getBoundingClientRect();
  const sx = ${JSON.stringify(lenScreen)}[0] * (rect.width / ${WIDTH}), sy = ${JSON.stringify(lenScreen)}[1] * (rect.width / ${WIDTH});
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const ax = ${JSON.stringify(angScreen)}[0] * (rect.width / ${WIDTH}), ay = ${JSON.stringify(angScreen)}[1] * (rect.width / ${WIDTH});
  if (Math.hypot(px - sx, py - sy) < 44) { drag = { y: e.clientY, L: pend.L, kind: "L" }; svgEl.setPointerCapture(e.pointerId); }
  else if (Math.hypot(px - ax, py - ay) < 44) { drag = { y: e.clientY, A: pend.angleDeg, kind: "A" }; svgEl.setPointerCapture(e.pointerId); }
  else act();
});
svgEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (drag.kind === "L") setLength(pend, drag.L + ((drag.y - e.clientY) / 50) * L_STEP * 4);
  else { pend.angleDeg = clamp(drag.A + ((drag.y - e.clientY) / 50) * A_STEP * 4, A_MIN, A_MAX); }
  touring = false; markInput();
});
const endDrag = () => { drag = null; };
svgEl.addEventListener("pointerup", endDrag);
svgEl.addEventListener("pointercancel", endDrag);
svgEl.addEventListener("pointerleave", () => { drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setLength(pend, pend.L + L_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setLength(pend, pend.L - L_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); pend.angleDeg = clamp(pend.angleDeg + A_STEP, A_MIN, A_MAX); touring = false; markInput(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); pend.angleDeg = clamp(pend.angleDeg - A_STEP, A_MIN, A_MAX); touring = false; markInput(); }
  else if (e.key === "Home") { e.preventDefault(); setLength(pend, L_MIN); touring = false; markInput(); }
  else if (e.key === "End") { e.preventDefault(); setLength(pend, L_MAX); touring = false; markInput(); }
});
draw();
`;

const init = { L: L_DEFAULT, angleDeg: A_DEFAULT };
const readout0 = `L ${init.L.toFixed(2)} m · T ${period(init).toFixed(2)} s · release ${Math.round(init.angleDeg)}° · E 100%`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Pendulum bench",
  hint: "Drag LENGTH / ANGLE · Space releases",
  readout: readout0,
  keys: [
    { mark: "lit", label: "Bob — the swinging weight (one lit part)" },
    { mark: "raised", label: "Rod — length follows the LENGTH knob" },
    { mark: "faint", label: "Cable — RELEASE button to the pivot" },
  ],
  caption: "The dial reads T = 2π√(l/g) from the formula with g = 9.81 — change the length and the period follows, but the release angle does not change it. Click anywhere to release from the angle knob's mark.",
  body: `<style>
.iso{--anatomy-red:#fb7185;--anatomy-blue:#22d3ee;--anatomy-green:#34d399;--anatomy-hi:#e6f1ff;--anatomy-mid:#7f8db3;--anatomy-lo:#3a4668;--anatomy-page:#070b16;--anatomy-card:#0a1020}
.iso-plate{background:radial-gradient(1200px 600px at 85% -10%,rgba(109,93,246,.14),transparent 55%),radial-gradient(900px 500px at -10% 25%,rgba(34,211,238,.1),transparent 50%),#070b16!important}
.iso[data-theme="light"] .iso-plate{background:radial-gradient(1000px 460px at 28% 18%,#f3e9d2 0%,#fbfbfa 55%)!important}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-dots[data-tone="red"] circle{fill:var(--anatomy-red);opacity:.9}
.iso-dots[data-tone="green"] circle{fill:var(--anatomy-green);opacity:.9}
</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Pendulum bench: arrow keys set length and release angle, Space releases" aria-valuemin="${Math.round(L_MIN * 100)}" aria-valuemax="${Math.round(L_MAX * 100)}" aria-valuenow="${Math.round(L_DEFAULT * 100)}">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "pendulum-light.html" : "pendulum.html"), k.pageHtml({ title: "Pendulum bench", theme, body, script: kitScript() + "\n" + live }));
console.log("wrote", theme === "light" ? "pendulum-light.html" : "pendulum.html");
