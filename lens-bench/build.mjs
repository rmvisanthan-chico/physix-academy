import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import { DO_MIN, DO_MAX, DO_DEFAULT, F_MIN, F_MAX, F_DEFAULT, createLens } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 660, HEIGHT = 430;
const PLATE = { x: -134, y: -66, w: 268, d: 132, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const RAIL_Z = 22; // optical axis height
const SCALE = 2.4; // bench units per cm
const LENS_X = 0;
const OBJ_H = 24; // object arrow height
const DIALC = [30, -48];
const DIAL_R = 15, DIAL_Z = 52, DIAL_H = 6, DIAL_TOP = DIAL_Z + DIAL_H;
const PED2 = [-114, 45];  // DIST knob
const PED3 = [-40, 45];   // F knob

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 48], [-120, 0, 40], [110, 0, 40], [30, -48, 58], [-114, 45, 24]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 50 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

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
  // optical rail along x at y=-6
  out.push(S(k.slabOf({ x: -118, y: -9.5, w: 236, d: 3.5, r: 1 }, PLATE_H, 5, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.topTicks(-114, 114, 5, 5, -8, PLATE_H + 5, [1.4, 2.4], P).major, { tone: "lo" }));
  return out.join("");
}

function dialAsm() {
  const [x, y] = DIALC; const out = [];
  out.push(S(k.cylinder(x, y, 3, PLATE_H, 40, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 5, PLATE_H, 2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 10, 5, DIAL_TOP, [1.3, 2.8], P, -2.4, 4.8);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  for (const [v, a] of [[0.5, -2.4], [1, 0], [2, 2.4]]) out.push(k.faceTextSvg(k.topMatrix([x + Math.sin(a) * 10, y - Math.cos(a) * 10], DIAL_TOP, P, "x"), String(v), { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(L(k.ring(x, y, 1.5, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5], DIAL_TOP, P, "x"), "m", { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function needleAt(frac) { const a = -2.4 + frac * 4.8; return k.lineOnTop([DIALC[0] - Math.sin(a) * 3, DIALC[1] + Math.cos(a) * 3], [DIALC[0] + Math.sin(a) * 12.8, DIALC[1] - Math.cos(a) * 12.8], DIAL_TOP + 0.4, P); }
function kptrAt(frac, cx, cy) { const a = -2.4 + frac * 4.8; return k.lineOnTop([cx, cy], [cx + Math.sin(a) * 4.2, cy - Math.cos(a) * 4.2], 24.6, P); }

function stand(x, height, label, lblZ) {
  const out = [];
  out.push(S(k.cylinder(x, -6, 3.4, PLATE_H + 5, 3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, -6, 2, PLATE_H + 8, height - 8, P, 20), { tone: "mid" }));
  if (label) out.push(k.faceTextSvg(k.sideMatrix([x, -3.4], lblZ, P, "left"), label, { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function lensAsm(Lm) {
  const out = [];
  out.push(stand(LENS_X, 30));
  // glass disc: circle in x-z plane at y=-6
  out.push(L(k.sideRing([LENS_X, -6, RAIL_Z], 13, "y", P, 40), { tone: "blue", width: 2 }));
  out.push(L(k.sideRing([LENS_X, -6, RAIL_Z], 10.6, "y", P, 40), { tone: "faint" }));
  // shine arc (upper half)
  out.push(k.fadeLineSvg([at([LENS_X - 8.5, -6, RAIL_Z + 8.5]), at([LENS_X + 8.5, -6, RAIL_Z + 8.5])], { fade: [8, 8], tone: "faint" }));
  // focal dots on rail at +-f
  const f = Lm.f * SCALE;
  out.push(D([at([LENS_X - f, -6, PLATE_H + 5.4]), at([LENS_X + f, -6, PLATE_H + 5.4])], { size: 0.55, tone: "hi" }));
  out.push(k.faceTextSvg(k.sideMatrix([LENS_X, -3.4], RAIL_Z + 15.5, P, "left"), "LENS", { size: 2.6, tone: "lo", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([LENS_X - f, -2], PLATE_H + 5.8, P, "x"), "F", { size: 2, tone: "lo", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([LENS_X + f, -2], PLATE_H + 5.8, P, "x"), "F", { size: 2, tone: "lo", anchor: "middle" }));
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

const Lm0 = createLens();
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A lens bench: the DIST knob slides the object arrow along the rail, the F knob regrinds the lens, and three principal rays draw the image — real and inverted on the screen, or virtual and upright when the object sits inside the focal length.",
  body: [
    plate(), dialAsm(), lensAsm(Lm0),
    stand(-72, 26, "OBJECT", RAIL_Z + 13),
    stand(72, 26, "SCREEN", RAIL_Z + 13),
    // object arrow (static base, lives at default do; live moves it)
    `<path data-part="objArrow" class="iso-line" data-tone="red" style="stroke-width:3" data-free="end" d=""/>`,
    `<path data-part="imgArrow" class="iso-line" data-tone="green" style="stroke-width:2.4" data-free="end" d=""/>`,
    `<path data-part="ray1" class="iso-line" data-tone="blue" style="stroke-width:2" data-free="end" d=""/>`,
    `<path data-part="ray2" class="iso-line" data-tone="green" style="stroke-width:2" data-free="end" d=""/>`,
    `<path data-part="ray3" class="iso-line" data-tone="red" style="stroke-width:2" data-free="end" d=""/>`,
    `<g data-part="rayEnds"></g>`,
    `<path data-part="srcGlow" class="iso-line" data-tone="red" d=""/>`,
    `<path data-part="imgGlow" class="iso-line" data-tone="green" opacity="0" d=""/>`,
    knobAsm(PED2[0], PED2[1], "DIST", (Lm0.do - DO_MIN) / (DO_MAX - DO_MIN)),
    knobAsm(PED3[0], PED3[1], "F", (Lm0.f - F_MIN) / (F_MAX - F_MIN)),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.1" d="${needleAt(0.5)}"/>`,
  ],
});

const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export\s+/gm, "");
const distScreen = at([PED2[0], PED2[1], 24]);
const fScreen = at([PED3[0], PED3[1], 24]);

const live = `
const P = ${JSON.stringify(P)};
const RAIL_Z = ${RAIL_Z}, SCALE = ${SCALE}, OBJ_H = ${OBJ_H}, DIALC = ${JSON.stringify(DIALC)}, DIAL_TOP = ${DIAL_TOP}, PED2 = ${JSON.stringify(PED2)}, PED3 = ${JSON.stringify(PED3)};
const ${"needleAt"} = ${needleAt.toString().replace(/k\./g, "")};
const kptrAt = ${kptrAt.toString().replace(/k\./g, "")};
${modelSrc}
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readEl = document.querySelector("[data-readout]");
const Lm = createLens();
let last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, tourTimer = 0, lastInput = -1e9, drag = null;
// smoothed object position (cm) so the arrow glides when the knob turns
let doSmooth = Lm.do;
function markInput() { lastInput = performance.now(); }
function arrowShape(x, h, inverted) {
  // shaft + head, base on rail at RAIL_Z, tip at RAIL_Z + h (or -h if inverted)
  const base = [x, -6, RAIL_Z];
  const tip = [x, -6, RAIL_Z + (inverted ? -h : h)];
  const parts = [];
  parts.push(segment(base, tip, P));
  // head: two short lines from tip at +-25 deg
  const a = inverted ? -1 : 1;
  const d = 4.2;
  parts.push(segment(tip, [x - d * 0.7, -6, tip[2] - a * d], P));
  parts.push(segment(tip, [x + d * 0.7, -6, tip[2] - a * d], P));
  return joinPaths(parts);
}
function draw() {
  const ox = -Lm.do * SCALE;
  const ix = Lm.di * SCALE;
  const tip = [ox, -6, RAIL_Z + OBJ_H];
  const ih = Math.max(4, Math.min(30, OBJ_H * Math.abs(Lm.m)));
  const imgTip = [ix, -6, RAIL_Z + (Lm.inverted ? -ih : ih)];
  q("objArrow").setAttribute("d", arrowShape(ox, OBJ_H, false));
  q("imgArrow").setAttribute("d", arrowShape(ix, ih, Lm.inverted));
  // ray 1: parallel to axis at tip height -> through far focal
  // ray 2: through optical centre straight
  // ray 3: through near focal -> parallel after lens
  const lensZ = RAIL_Z;
  const p1 = [segment(tip, [0, -6, RAIL_Z + OBJ_H], P), segment([0, -6, RAIL_Z + OBJ_H], imgTip, P)];
  const p2 = [segment(tip, imgTip, P)];
  // ray 3: through the near focal point (-f on the axis), then parallel at the lens-plane height
  const f = Lm.f * SCALE;
  const zL = RAIL_Z + (OBJ_H * Lm.f) / (Lm.do + Lm.f);
  const p3 = [segment(tip, [-f, -6, RAIL_Z], P), segment([-f, -6, RAIL_Z], [0, -6, zL], P), segment([0, -6, zL], [ix, -6, zL], P)];
  // tip->lens->imgTip variants that stay on strokes
  q("ray1").setAttribute("d", joinPaths(p1));
  q("ray2").setAttribute("d", joinPaths(p2));
  q("ray3").setAttribute("d", joinPaths(p3));
  q("rayEnds").innerHTML = dotsSvg([iso([ix, -6, zL], P)], { size: 0.6, tone: "hi" });
  q("srcGlow").setAttribute("d", ring(tip[0], tip[1], 3.2, tip[2], P, 20));
  if (Lm.real) { q("imgGlow").setAttribute("opacity", 1); q("imgGlow").setAttribute("d", ring(imgTip[0], imgTip[1], 3.2, imgTip[2], P, 20)); }
  else q("imgGlow").setAttribute("opacity", 0);
  q("needle").setAttribute("d", needleAt(clamp((Math.abs(Lm.m) - 0.5) / 1.5, 0, 1)));
  q("kptr_DIST").setAttribute("d", kptrAt((Lm.do - DO_MIN) / (DO_MAX - DO_MIN), PED2[0], PED2[1]));
  q("kptr_F").setAttribute("d", kptrAt((Lm.f - F_MIN) / (F_MAX - F_MIN), PED3[0], PED3[1]));
  const text = "do " + Lm.do + " cm · di " + (Lm.di > 0 ? "+" : "") + Lm.di.toFixed(1) + " cm · m " + Lm.m.toFixed(2) + " · " + (Lm.real ? "real, " : "virtual, ") + (Lm.inverted ? "inverted" : "upright");
  if (readEl.textContent !== text) readEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Lm.do));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = clamp((now - last) / 1000 || 1 / 60, 0, 1 / 30);
  last = now; tourClock += dt;
  if (touring && tourClock > 2.0) { tourTimer += dt; if (tourTimer > 3.0) { tourTimer = 0; const D = [20, 40, 12, 50, 30]; const F = [15, 15, 20, 15, 12]; const i = Math.floor(tourClock / 3.0) % 5; setDistance(Lm, D[i]); setFocal(Lm, F[i]); } }
  if (!touring && !still.matches && now - lastInput > 3600) touring = true;
  doSmooth += (Lm.do - doSmooth) * (1 - Math.exp(-dt / 0.25));
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
svgEl.addEventListener("pointerdown", (e) => {
  const rect = svgEl.getBoundingClientRect();
  const sx = ${JSON.stringify(distScreen)}[0] * (rect.width / ${WIDTH}), sy = ${JSON.stringify(distScreen)}[1] * (rect.width / ${WIDTH});
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const wx = ${JSON.stringify(fScreen)}[0] * (rect.width / ${WIDTH}), wy = ${JSON.stringify(fScreen)}[1] * (rect.width / ${WIDTH});
  if (Math.hypot(px - sx, py - sy) < 44) { drag = { y: e.clientY, D: Lm.do, kind: "D" }; svgEl.setPointerCapture(e.pointerId); }
  else if (Math.hypot(px - wx, py - wy) < 44) { drag = { y: e.clientY, F: Lm.f, kind: "F" }; svgEl.setPointerCapture(e.pointerId); }
});
svgEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (drag.kind === "D") setDistance(Lm, drag.D + ((drag.y - e.clientY) / 50) * 4);
  else setFocal(Lm, drag.F + ((drag.y - e.clientY) / 50) * 2);
  touring = false; markInput();
});
const endDrag = () => { drag = null; };
svgEl.addEventListener("pointerup", endDrag);
svgEl.addEventListener("pointercancel", endDrag);
svgEl.addEventListener("pointerleave", () => { drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); setDistance(Lm, Lm.do + DO_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); setDistance(Lm, Lm.do - DO_STEP); touring = false; markInput(); }
  else if (e.key === "Home") { e.preventDefault(); setDistance(Lm, DO_MIN); touring = false; markInput(); }
  else if (e.key === "End") { e.preventDefault(); setDistance(Lm, DO_MAX); touring = false; markInput(); }
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1", title: "Lens bench", hint: "Drag DIST / F · arrows move the object",
  readout: `do ${Lm0.do} cm · di +${Lm0.di.toFixed(1)} cm · m ${Lm0.m.toFixed(2)} · real, inverted`,
  keys: [ { mark: "lit", label: "Object arrow — the lit light source" }, { mark: "raised", label: "Image arrow — inverted + scaled by |m|" }, { mark: "faint", label: "Rays — parallel, centre, focal" } ],
  caption: "Three principal rays from the arrow tip draw the image: parallel → through the far focal point, straight through the centre, and through the near focal point → parallel. The lens equation 1/f = 1/do + 1/di gives di and m = −di/do — inside the focal length the image turns virtual and upright.",
  body: `<style>
.iso{--anatomy-red:#fb7185;--anatomy-blue:#22d3ee;--anatomy-green:#34d399;--anatomy-hi:#e6f1ff;--anatomy-mid:#7f8db3;--anatomy-lo:#3a4668;--anatomy-page:#070b16;--anatomy-card:#0a1020}
.iso-plate{background:radial-gradient(1200px 600px at 85% -10%,rgba(109,93,246,.14),transparent 55%),radial-gradient(900px 500px at -10% 25%,rgba(34,211,238,.1),transparent 50%),#070b16!important}
.iso[data-theme="light"] .iso-plate{background:radial-gradient(1000px 460px at 28% 18%,#f3e9d2 0%,#fbfbfa 55%)!important}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-dots[data-tone="red"] circle{fill:var(--anatomy-red);opacity:.9}
.iso-dots[data-tone="green"] circle{fill:var(--anatomy-green);opacity:.9}
</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Lens bench: arrow keys move the object, Home and End jump" aria-valuemin="${DO_MIN}" aria-valuemax="${DO_MAX}" aria-valuenow="${Lm0.do}">${svg}</div>`,
});
writeFileSync(join(HERE, theme === "light" ? "lens-light.html" : "lens.html"), k.pageHtml({ title: "Lens bench", theme, body, script: kitScript() + "\n" + live }));
console.log("wrote", theme === "light" ? "lens-light.html" : "lens.html");
