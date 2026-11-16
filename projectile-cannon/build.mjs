import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import { ANGLE_MIN, ANGLE_MAX, ANGLE_DEFAULT, V_MIN, V_MAX, V_DEFAULT, range } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 660, HEIGHT = 430;
const PLATE = { x: -134, y: -66, w: 268, d: 132, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const PIVOT = [-95, 0];
const PIVOT_Z = 28;
const SCALE = 2.5; // bench units per metre
const DIALC = [30, -48];
const DIAL_R = 15, DIAL_Z = 52, DIAL_H = 6, DIAL_TOP = DIAL_Z + DIAL_H;
const PED1 = [-78, 41];   // FIRE
const PED2 = [-114, 45];  // ANGLE
const PED3 = [-40, 45];   // POWER

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-95, 0, 54], [115, 0, 62], [30, -48, 58], [-114, 45, 24]],
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
  for (const [v, a] of [[0, -2.4], [40, 0], [80, 2.4]]) out.push(k.faceTextSvg(k.topMatrix([x + Math.sin(a) * 10, y - Math.cos(a) * 10], DIAL_TOP, P, "x"), String(v), { size: 2.2, tone: "lo", anchor: "middle" }));
  out.push(L(k.ring(x, y, 1.5, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5], DIAL_TOP, P, "x"), "R  m", { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const dir = (deg) => { const t = (deg * Math.PI) / 180; return [Math.cos(t), Math.sin(t)]; };
function barrelAt(deg, recoil) {
  const [ux, uz] = dir(deg);
  const off = (recoil || 0);
  const a = [PIVOT[0] - ux * off, PIVOT[1], PIVOT_Z - uz * off];
  const b = [PIVOT[0] + ux * 18, PIVOT[1], PIVOT_Z + uz * 18];
  return k.segment(a, b, P);
}
function muzzleAt(deg) { const [ux, uz] = dir(deg); return [PIVOT[0] + ux * 18, PIVOT[1], PIVOT_Z + uz * 18]; }
function needleAt(frac) { const a = -2.4 + frac * 4.8; return k.lineOnTop([DIALC[0] - Math.sin(a) * 3, DIALC[1] + Math.cos(a) * 3], [DIALC[0] + Math.sin(a) * 12.8, DIALC[1] - Math.cos(a) * 12.8], DIAL_TOP + 0.4, P); }
function kptrAt(frac, cx, cy) { const a = -2.4 + frac * 4.8; return k.lineOnTop([cx, cy], [cx + Math.sin(a) * 4.2, cy - Math.cos(a) * 4.2], 24.6, P); }

function cannonAsm() {
  const out = [];
  // carriage
  out.push(S(k.slabOf({ x: -112, y: -14, w: 34, d: 28, r: 2 }, PLATE_H, 7, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(PIVOT[0], PIVOT[1], 5, PLATE_H + 7, 10, P, 24), { tone: "mid" }));
  // wheels (discs on y sides)
  for (const wy of [-9, 9]) {
    out.push(S(k.cylinder(PIVOT[0], wy, 5.5, PLATE_H + 1, 2.4, P, 28), { tone: "lo" }));
    out.push(L(k.sideRing([PIVOT[0], wy, PLATE_H + 2.4], 2.4, "y", P, 20), { tone: "mid" }));
  }
  // breech drum + pivot
  out.push(L(k.sideRing([PIVOT[0], PIVOT[1], PIVOT_Z], 6, "y", P, 28), { tone: "hi" }));
  out.push(D([at([PIVOT[0], PIVOT[1], PIVOT_Z])], { size: 0.6, tone: "hi" }));
  // protractor fan
  const arcPts = [];
  for (let a = 0; a <= 90; a += 5) { const t = (a * Math.PI) / 180; arcPts.push([PIVOT[0] + 11 * Math.cos(t), 7, PIVOT_Z + 11 * Math.sin(t)]); }
  out.push(L(arcPts.map((p, i) => (i ? "L" : "M") + at(p).join(" ")).join(" "), { tone: "lo" }));
  const ticks = [];
  for (let a = 0; a <= 90; a += 15) { const t = (a * Math.PI) / 180; ticks.push(k.segment([PIVOT[0] + 11 * Math.cos(t), 7, PIVOT_Z + 11 * Math.sin(t)], [PIVOT[0] + 12.6 * Math.cos(t), 7, PIVOT_Z + 12.6 * Math.sin(t)], P)); }
  out.push(L(ticks.join(""), { tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([-108, 9.4], PIVOT_Z + 10, P, "left"), "CANNON", { size: 2.6, tone: "lo", anchor: "middle" }));
  out.push(D([at([PIVOT[0], 0, 12.5])], { size: 0.45 }));
  return out.join("");
}

function targetAsm() {
  const out = [];
  for (const ly of [-15, 15]) {
    out.push(S(k.cylinder(112, ly, 2.6, PLATE_H, 32, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(112, ly, 3.6, PLATE_H + 32, 2.2, P, 20), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: 103, y: -18, w: 18, d: 36, r: 2 }, 44, 6, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.ring(112, 0, 10, 50, P, 36), { tone: "red" }));
  out.push(L(k.ring(112, 0, 6.4, 50, P, 32), { tone: "red" }));
  out.push(L(k.ring(112, 0, 2.8, 50, P, 20), { tone: "red" }));
  out.push(D([at([112, 0, 50])], { size: 0.6, tone: "hi" }));
  out.push(k.faceTextSvg(k.sideMatrix([112, 19.4], 48, P, "left"), "TARGET", { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function pedestal() {
  const [x, y] = PED1; const out = [];
  out.push(S(k.slabOf({ x: x - 14, y: y - 7, w: 28, d: 14, r: 2 }, 12, 4, P, 5, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.5, 16, 6, P, 20), { tone: "mid" }));
  out.push(`<g data-part="btncap">${S(k.cylinder(x, y, 6.5, 22, 5, P, 36, 0.8), { tone: "hi", crease: "lo", lit: true })}</g>`);
  out.push(L(k.ring(x, y, 8.4, 16, P, 28), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5], 16.3, P, "x"), "FIRE", { size: 2.6, tone: "lo", anchor: "middle" }));
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

const A0 = 45, V0 = 18;
const ballBase = muzzleAt(A0);
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A projectile cannon on a bench: ANGLE and POWER knobs set launch, beads mark the ideal parabola, FIRE sends the lit ball along it. Range, apex and time come from the launch formulas with g = 9.81.",
  body: [
    plate(), dialAsm(), cannonAsm(), targetAsm(),
    `<path data-part="barrel" class="iso-line" data-tone="blue" style="stroke-width:4.5" d="${barrelAt(A0, 0)}"/>`,
    `<path data-part="traj" class="iso-line" data-tone="faint" style="stroke-width:1" d=""/>`,
    `<g data-part="beads"></g>`,
    `<g data-part="tEnds"></g>`,
    `<path data-part="flag" class="iso-line" data-tone="green" d=""/>`,
    `<path data-part="flash" class="iso-line" data-tone="red" opacity="0" d=""/>`,
    `<path data-part="puff" class="iso-line" data-tone="green" opacity="0" d=""/>`,
    `<g data-part="ball">${S(k.cylinder(ballBase[0], ballBase[1], 5.5, ballBase[2] - 2, 4.5, P, 28, 0.5), { tone: "red", crease: "lo" })}${D([at([ballBase[0], ballBase[1], ballBase[2] + 2.4])], { size: 0.6, tone: "mid" })}</g>`,
    `<path data-part="glow" class="iso-line" data-tone="red" d="${k.ring(ballBase[0], ballBase[1], 7.2, ballBase[2] + 2.8, P, 28)}"/>`,
    pedestal(),
    knobAsm(PED2[0], PED2[1], "ANGLE", (A0 - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)),
    knobAsm(PED3[0], PED3[1], "POWER", (V0 - V_MIN) / (V_MAX - V_MIN)),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.1" d="${needleAt(range({ angleDeg: A0, v0: V0 }) / 80)}"/>`,
    k.wireSvg(at([PED1[0], PED1[1], 16.5]), at([PIVOT[0], -10, PIVOT_Z - 4]), { via: [at([-40, 45, 12.7]), at([-60, 38, 12.7]), at([-80, 12, 12.7])], tone: "faint" }),
  ],
});

const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export\s+/gm, "");
const angScreen = at([PED2[0], PED2[1], 24]);
const powScreen = at([PED3[0], PED3[1], 24]);

const live = `
const P = ${JSON.stringify(P)};
const PIVOT = ${JSON.stringify(PIVOT)}, PIVOT_Z = ${PIVOT_Z}, SCALE = ${SCALE}, PLATE_H = ${PLATE_H}, DIALC = ${JSON.stringify(DIALC)}, DIAL_TOP = ${DIAL_TOP}, PED2 = ${JSON.stringify(PED2)}, PED3 = ${JSON.stringify(PED3)};
const ${"barrelAt"} = ${barrelAt.toString().replace(/k\./g, "")};
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
const kptrAt = ${kptrAt.toString().replace(/k\./g, "")};
const dir = (deg) => { const t = (deg * Math.PI) / 180; return [Math.cos(t), Math.sin(t)]; };
const muzzleAt = (deg) => { const u = dir(deg); return [PIVOT[0] + u[0] * 18, PIVOT[1], PIVOT_Z + u[1] * 18]; };
const ballBase = ${JSON.stringify(ballBase)};
${modelSrc}
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readEl = document.querySelector("[data-readout]");
const c = createCannon();
let last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, tourTimer = 0, lastInput = -1e9, drag = null;
let flyT = 0, landed = false, ballX = 0, ballZ = 0, recoil = 0, flash = 0, puff = 0, puffX = 0;
function markInput() { lastInput = performance.now(); }
function doFire() { fire(c); flyT = 0; landed = false; recoil = 3.2; flash = 1.4; }
function act() { doFire(); markInput(); }
function trajPts() {
  const R = range(c); const T = timeOfFlight(c);
  const pts = []; const n = 20;
  for (let i = 0; i <= n; i++) { const t = (T * i) / n; const x = c.v0 * Math.cos((c.angleDeg * Math.PI) / 180) * t; const z = c.v0 * Math.sin((c.angleDeg * Math.PI) / 180) * t - 0.5 * G * t * t; pts.push([PIVOT[0] + x * SCALE, PIVOT[1], PLATE_H + Math.max(0, z) * SCALE]); }
  return pts;
}
function draw() {
  q("barrel").setAttribute("d", barrelAt(c.angleDeg, recoil));
  const pts = trajPts();
  q("traj").setAttribute("d", pts.map((p, i) => (i ? "L" : "M") + iso(p, P).join(" ")).join(" "));
  q("beads").innerHTML = dotsSvg(pts.map((p) => iso(p, P)), { size: 0.55, tone: "blue" });
  const m0 = muzzleAt(c.angleDeg);
  const land = [PIVOT[0] + range(c) * SCALE, PIVOT[1], PLATE_H];
  q("tEnds").innerHTML = dotsSvg([iso(m0, P), iso(land, P)], { size: 0.6, tone: "blue" });
  // range flag ring on the plate at predicted R
  q("flag").setAttribute("d", ring(land[0], land[1], 4.5, PLATE_H + 0.6, P, 24));
  if (flash > 0) { const r = 3 + (1.4 - flash) * 6; q("flash").setAttribute("opacity", Math.min(1, flash).toFixed(2)); q("flash").setAttribute("d", ring(m0[0], m0[1], r, m0[2], P, 24)); }
  else q("flash").setAttribute("opacity", 0);
  if (puff > 0) { const r = 4 + (1.4 - puff) * 7; q("puff").setAttribute("opacity", (puff * 0.6).toFixed(2)); q("puff").setAttribute("d", ring(puffX, 0, r, PLATE_H + 0.8, P, 28)); }
  else q("puff").setAttribute("opacity", 0);
  const m = muzzleAt(c.angleDeg);
  let bx = m[0], bz = m[2];
  if (c.flight || landed) { bx = PIVOT[0] + ballX * SCALE; bz = PLATE_H + ballZ * SCALE; }
  const base = c.flight || landed ? [PIVOT[0], PIVOT[1], PLATE_H] : ballBase;
  q("ball").setAttribute("transform", translateAlong(P, [bx - base[0], PIVOT[1] - base[1], bz - base[2]]));
  q("glow").setAttribute("d", ring(bx, PIVOT[1], 7.2, bz + 2.8, P, 28));
  const R = range(c);
  q("needle").setAttribute("d", needleAt(clamp(R / 80, 0, 1)));
  q("kptr_ANGLE").setAttribute("d", kptrAt((c.angleDeg - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN), PED2[0], PED2[1]));
  q("kptr_POWER").setAttribute("d", kptrAt((c.v0 - V_MIN) / (V_MAX - V_MIN), PED3[0], PED3[1]));
  const text = "θ " + Math.round(c.angleDeg) + "° · v0 " + c.v0 + " m/s · R " + R.toFixed(1) + " m · apex " + apex(c).toFixed(1) + " m · t " + timeOfFlight(c).toFixed(2) + " s";
  if (readEl.textContent !== text) readEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(R)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = clamp((now - last) / 1000 || 1 / 60, 0, 1 / 30);
  last = now; tourClock += dt;
  recoil = Math.max(0, recoil - dt * 6);
  flash = Math.max(0, flash - dt * 2.2);
  puff = Math.max(0, puff - dt * 1.6);
  if (touring && tourClock > 2.0) { tourTimer += dt; if (tourTimer > 3.2) { tourTimer = 0; const A = [30, 55, 45, 65, 20]; const V = [16, 22, 28, 12, 18]; const i = Math.floor(tourClock / 3.2) % 5; setAngle(c, A[i]); setPower(c, V[i]); doFire(); } }
  if (!touring && !still.matches && now - lastInput > 3600) touring = true;
  if (c.flight) { const r = stepFlight(c, dt); if (r) { ballX = r.x; ballZ = r.z; if (r.landed) { landed = true; c.flight = null; puff = 1.4; puffX = PIVOT[0] + ballX * SCALE; } } }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
svgEl.addEventListener("pointerdown", (e) => {
  const rect = svgEl.getBoundingClientRect();
  const sx = ${JSON.stringify(angScreen)}[0] * (rect.width / ${WIDTH}), sy = ${JSON.stringify(angScreen)}[1] * (rect.width / ${WIDTH});
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const wx = ${JSON.stringify(powScreen)}[0] * (rect.width / ${WIDTH}), wy = ${JSON.stringify(powScreen)}[1] * (rect.width / ${WIDTH});
  if (Math.hypot(px - sx, py - sy) < 44) { drag = { y: e.clientY, A: c.angleDeg, kind: "A" }; svgEl.setPointerCapture(e.pointerId); }
  else if (Math.hypot(px - wx, py - wy) < 44) { drag = { y: e.clientY, V: c.v0, kind: "V" }; svgEl.setPointerCapture(e.pointerId); }
  else act();
});
svgEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (drag.kind === "A") setAngle(c, drag.A + ((drag.y - e.clientY) / 50) * 4);
  else setPower(c, drag.V + ((drag.y - e.clientY) / 50) * 4);
  touring = false; markInput();
});
const endDrag = () => { drag = null; };
svgEl.addEventListener("pointerup", endDrag);
svgEl.addEventListener("pointercancel", endDrag);
svgEl.addEventListener("pointerleave", () => { drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setAngle(c, c.angleDeg + ANGLE_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setAngle(c, c.angleDeg - ANGLE_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); setPower(c, c.v0 + V_STEP); touring = false; markInput(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); setPower(c, c.v0 - V_STEP); touring = false; markInput(); }
  else if (e.key === "Home") { e.preventDefault(); setAngle(c, ANGLE_MIN); touring = false; markInput(); }
  else if (e.key === "End") { e.preventDefault(); setAngle(c, ANGLE_MAX); touring = false; markInput(); }
});
draw();
`;

const init = { angleDeg: ANGLE_DEFAULT, v0: V_DEFAULT };
const readout0 = `θ ${Math.round(init.angleDeg)}° · v0 ${init.v0} m/s · R ${range(init).toFixed(1)} m · apex ${((init.v0 * init.v0 * Math.sin((init.angleDeg * Math.PI) / 180) ** 2) / (2 * 9.81)).toFixed(1)} m · t ${((2 * init.v0 * Math.sin((init.angleDeg * Math.PI) / 180)) / 9.81).toFixed(2)} s`;
const body = k.plateHtml({
  fig: "Fig 1", title: "Projectile cannon", hint: "Drag ANGLE / POWER · Space fires",
  readout: readout0,
  keys: [ { mark: "lit", label: "Ball — flies the true parabola (no drag)" }, { mark: "raised", label: "Barrel — thick tube, kicks back on fire" }, { mark: "faint", label: "Beads — ideal trajectory x = v0 cosθ · t, z = v0 sinθ · t − ½gt²" } ],
  caption: "The beaded curve is the ideal projectile path x = v0 cosθ · t, z = v0 sinθ · t − ½gt² with g = 9.81 — the ring on the plate marks predicted range R = v² sin2θ / g. Press FIRE: the barrel recoils, the ball flies, dust marks the landing.",
  body: `<style>
.iso{--anatomy-red:#fb7185;--anatomy-blue:#22d3ee;--anatomy-green:#34d399;--anatomy-hi:#e6f1ff;--anatomy-mid:#7f8db3;--anatomy-lo:#3a4668;--anatomy-page:#070b16;--anatomy-card:#0a1020}
.iso-plate{background:radial-gradient(1200px 600px at 85% -10%,rgba(109,93,246,.14),transparent 55%),radial-gradient(900px 500px at -10% 25%,rgba(34,211,238,.1),transparent 50%),#070b16!important}
.iso[data-theme="light"] .iso-plate{background:radial-gradient(1000px 460px at 28% 18%,#f3e9d2 0%,#fbfbfa 55%)!important}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-dots[data-tone="red"] circle{fill:var(--anatomy-red);opacity:.9}
.iso-dots[data-tone="green"] circle{fill:var(--anatomy-green);opacity:.9}
</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Projectile cannon: arrow keys set angle and power, Space fires" aria-valuemin="0" aria-valuemax="80" aria-valuenow="${Math.round(range(init))}">${svg}</div>`,
});
writeFileSync(join(HERE, theme === "light" ? "projectile-light.html" : "projectile.html"), k.pageHtml({ title: "Projectile cannon", theme, body, script: kitScript() + "\n" + live }));
console.log("wrote", theme === "light" ? "projectile-light.html" : "projectile.html");
