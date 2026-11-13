import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import * as lathe from "file:///C:/Users/acer/.agents/skills/anatomy/kit/lathe.mjs";
import {
  V_MIN, V_MAX, V_DEFAULT, V_STEP,
  R_MIN, R_MAX, R_DEFAULT, R_STEP,
  R_LAMP, I_MAX, current, lampVolts, lampPower, brightness,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 660;
const HEIGHT = 430;

const PLATE = { x: -160, y: -80, w: 320, d: 150, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// Component anchors on the plate
const BAT = [-112, 15];   // battery (slab + two posts)
const SW = [-52, 42];     // knife switch
const RHEO = [30, 48];    // slide rheostat (helix x 12..48 at y 48)
const LAMP = [95, 10];    // lamp (socket + bulb)
const AMM = [135, -45];   // ammeter (in series)
const KNOB_V = [-95, -60];
const KNOB_R = [-45, -60];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [LAMP[0], LAMP[1], 41], [-52, 42, 36], [AMM[0], AMM[1], 34],
    [RHEO[0], RHEO[1], 27], [-95, -60, 25],
  ],
  WIDTH, HEIGHT, { pad: 24, azimuth: 50 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// exact terminal coordinates (wire endpoints must land ON these dots)
const BAT_P = [BAT[0] + 6, BAT[1]];   // + post
const BAT_N = [BAT[0] - 6, BAT[1]];   // - post
const BAT_P_TOP = [...BAT_P, 30.4];
const BAT_N_TOP = [...BAT_N, 30.4];
const SW_L = [SW[0] - 10, SW[1]];     // pivot clip
const SW_R = [SW[0] + 10, SW[1]];     // far clip
const SW_L_TOP = [...SW_L, 18.5];
const SW_R_TOP = [...SW_R, 19.2];     // closed lever tip rests here
const LEVER_OPEN_TIP = [SW[0], SW[1], 35.8];
const RH_X0 = RHEO[0] - 18, RH_X1 = RHEO[0] + 18; // helix span 12..48
const RH_CZ = 19, RH_R = 2.2, RH_TURNS = 13;
const RH_ENDS = [[RH_X0, RHEO[1] + RH_R, RH_CZ], [RH_X1, RHEO[1] + RH_R, RH_CZ]];
const LAMP_L = [LAMP[0] - 11, LAMP[1]];
const LAMP_R = [LAMP[0] + 11, LAMP[1]];
const LAMP_L_T = [...LAMP_L, 18.4];
const LAMP_R_T = [...LAMP_R, 18.4];
const AMM_A = [AMM[0] - 8, AMM[1] + 6];
const AMM_B = [AMM[0] + 8, AMM[1] - 6];
const AMM_A_T = [...AMM_A, 18.4];
const AMM_B_T = [...AMM_B, 18.4];
const VM = [85, 44]; // voltmeter front-left of the lamp, leads short and low
const VM_A = [VM[0] + 8, VM[1] - 6];
const VM_B = [VM[0] - 8, VM[1] + 6];
const VM_A_T = [...VM_A, 18.4];
const VM_B_T = [...VM_B, 18.4];

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
  const strip = { x: -150, y: 58.5, w: 296, d: 6.5, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 1, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.2, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.2, 0.6])], { size: 0.45 }));
  return out.join("");
}

function batteryAsm() {
  const out = [];
  const slab = { x: BAT[0] - 15, y: BAT[1] - 11, w: 30, d: 22, r: 2 };
  out.push(S(k.slabOf(slab, PLATE_H, 14, P, 2, 0.5), { tone: "mid", crease: "lo" }));
  for (const [px, sign] of [[BAT_N[0], -1], [BAT_P[0], 1]]) {
    out.push(S(k.cylinder(px, BAT[1], 2.6, 26, 4, P, 24), { tone: "mid" }));
    out.push(D([at([px, BAT[1], 30.4])], { size: 0.55, tone: "mid" }));
    out.push(k.faceTextSvg(k.topMatrix([px + sign * 4.5, BAT[1] + 8], 26.2, P, "x"), sign > 0 ? "+" : "\u2212", { size: 3.6, tone: "hi", anchor: "middle" }));
  }
  return out.join("");
}

function switchAsm() {
  const out = [];
  out.push(S(k.slabOf({ x: SW[0] - 14, y: SW[1] - 7, w: 28, d: 14, r: 1.5 }, PLATE_H, 3, P, 1.5, 0.4), { tone: "mid" }));
  for (const [px] of [SW_L, SW_R]) {
    out.push(S(k.cylinder(px, SW[1], 2.2, 15, 3.5, P, 20), { tone: "mid" }));
    out.push(D([at([px, SW[1], 18.5])], { size: 0.55, tone: "mid" }));
  }
  out.push(`<g data-part="swlev"><path class="iso-line" data-tone="hi" style="stroke-width:2.6" d="${k.segment([...SW_L, 18.5], SW_R_TOP, P)}"/></g>`);
  out.push(`<circle data-part="swtip" r="1.5" cx="${at(SW_R_TOP)[0]}" cy="${at(SW_R_TOP)[1]}" style="fill:var(--anatomy-hi)"/>`);
  return out.join("");
}

// Wire-wound track: horizontal helix, back/front runs split on facing.
function rheoCoilDs(x0, x1, cy, cz, r, turns) {
  const n = Math.max(48, turns * 14);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * 2 * Math.PI;
    pts.push([x0 + (x1 - x0) * t, cy + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  const fac = pts.map((p) => k.depthOf([0, (p[1] - cy) / r, (p[2] - cz) / r], P) > 0);
  let dF = "", dB = "", cur = null;
  for (let i = 0; i < pts.length; i++) {
    const f = fac[i];
    const j = " " + at(pts[i]).join(" ");
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

function rheoAsm() {
  const out = [];
  out.push(S(k.slabOf({ x: RH_X0 - 4, y: RHEO[1] - 8, w: (RH_X1 - RH_X0) + 8, d: 16, r: 2 }, PLATE_H, 3, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(RHEO[0], RHEO[1], 1.6, 15, 2.2, P, 20), { tone: "lo" })); // ceramic core stub
  const coil = rheoCoilDs(RH_X0, RH_X1, RHEO[1], RH_CZ, RH_R, RH_TURNS);
  out.push(`<path class="iso-line" data-tone="lo" style="stroke-width:1.7" d="${coil.back}"/>`);
  out.push(`<path class="iso-line" data-tone="mid" style="stroke-width:1.7" d="${coil.front}"/>`);
  out.push(D([at(RH_ENDS[0]), at(RH_ENDS[1])], { size: 0.6, tone: "mid" }));
  // carriage knob (rides the winding; drawn at r = R_DEFAULT, translated live)
  const cx0 = RH_X0 + ((R_DEFAULT - R_MIN) / (R_MAX - R_MIN)) * (RH_X1 - RH_X0);
  out.push(`<g data-part="carr">`);
  out.push(S(k.cylinder(cx0, RHEO[1], 3.2, RH_CZ + RH_R, 4, P, 24, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx0, RHEO[1], 3.2, RH_CZ + RH_R + 2, RH_CZ + RH_R + 4, 24, P, 0.3), { tone: "lo" }));
  out.push(D([at([cx0, RHEO[1], RH_CZ + RH_R + 4.2])], { size: 0.5, tone: "hi" }));
  out.push(`</g>`);
  return out.join("");
}

function lampAsm() {
  const out = [];
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 10, PLATE_H, 1, P, 40), { tone: "mid", crease: "none" })); // base disc
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 9, 13, 7, P, 40), { tone: "mid" }));                        // socket
  out.push(L(k.knurl(LAMP[0], LAMP[1], 9, 17, 20, 40, P, 0.3), { tone: "lo" }));                      // brass ring
  for (const [px] of [LAMP_L, LAMP_R]) {
    out.push(S(k.cylinder(px, LAMP[1], 1.8, 14, 4, P, 20), { tone: "mid" }));
    out.push(D([at([px, LAMP[1], 18.4])], { size: 0.55, tone: "mid" }));
  }
  out.push(S(lathe.sphereOf([LAMP[0], LAMP[1], 30], 10, P), { tone: "hi", crease: "lo" })); // bulb
  const gc = at([LAMP[0], LAMP[1], 30]);
  out.push(`<g data-part="glow" opacity="0.22">`);
  out.push(`<ellipse class="iso-halo" cx="${gc[0].toFixed(1)}" cy="${gc[1].toFixed(1)}" rx="26" ry="26" style="fill:#ffd9a0"/>`);
  out.push(`<path class="iso-line" data-tone="red" d="${k.ring(LAMP[0], LAMP[1], 3.5, 30, P, 20)}"/>`);
  out.push(`</g>`);
  return out.join("");
}

function meterAsm(cx, cy, R, Z, H, labels, unit, postR) {
  const out = [];
  out.push(S(k.cylinder(cx, cy, postR, PLATE_H, Z - PLATE_H, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, R, Z, H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, R, Z + H - 3.4, Z + H, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(cx, cy, R, Z + H - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(cx, cy, R - 2, Z + H, P, 64), { tone: "lo" }));
  const top = Z + H;
  const ticks = k.radialTicks(cx, cy, R - 3, 9, 3, top, [1.2, 2.6], P, -2.4, 4.8);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const n = labels.length - 1;
  labels.forEach((v, i) => {
    const a = -2.4 + (i / n) * 4.8;
    out.push(k.faceTextSvg(k.topMatrix([cx + Math.sin(a) * (R - 5), cy - Math.cos(a) * (R - 5)], top, P, "x"), String(v), { size: 2, tone: "lo", anchor: "middle" }));
  });
  out.push(L(k.ring(cx, cy, 1.5, top, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([cx, cy + 5.5], top, P, "x"), unit, { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function meterTerminals(cx, cy, pts) {
  const out = [];
  for (const [px, py] of pts) {
    out.push(S(k.cylinder(px, py, 1.8, 15, 3, P, 20), { tone: "mid" }));
    out.push(D([at([px, py, 18.4])], { size: 0.55, tone: "mid" }));
  }
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

function needleAt(cx, cy, R, Z, frac) {
  const a = -2.4 + frac * 4.8;
  return k.lineOnTop([cx - Math.sin(a) * 2.6, cy + Math.cos(a) * 2.6], [cx + Math.sin(a) * (R - 2.4), cy - Math.cos(a) * (R - 2.4)], Z + 0.4, P);
}
function kptrAt(frac, cx, cy) {
  const a = -2.4 + frac * 4.8;
  return k.lineOnTop([cx, cy], [cx + Math.sin(a) * 4.2, cy - Math.cos(a) * 4.2], 24.6, P);
}

const I0 = V_DEFAULT / (R_LAMP + R_DEFAULT);
const AMM_TOP = 33, VM_TOP = 30;

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A DC circuit bench: a battery feeds a series loop through a knife switch, a slide rheostat, the lamp and an ammeter, while a voltmeter reads across the lamp; the VOLTAGE and RESISTANCE knobs rebuild the loop, the switch (or Space) closes and opens it, and the meters plus readout follow Ohm's law live.",
  body: [
    plate(),
    batteryAsm(),
    switchAsm(),
    rheoAsm(),
    lampAsm(),
    // return wire drawn BEFORE the meters: it passes behind the ammeter dial,
    // so the dial must paint over it (true depth), while its terminal nub,
    // drawn later with the meter, stays visible.
    k.wireSvg(at(AMM_B_T), at(BAT_N_TOP), { via: [at([90, -74, 12.7]), at([-20, -74, 12.7]), at([-150, -76, 12.7]), at([-118, -6, 30.5])], tone: "blue" }),
    meterAsm(AMM[0], AMM[1], 15, 28, 5, [0, 0.3, 0.6, 0.9], "A", 2.5),
    meterAsm(VM[0], VM[1], 13, 25, 5, [0, 3, 6, 9], "V", 2.2),
    meterTerminals(AMM[0], AMM[1], [AMM_A, AMM_B]),
    meterTerminals(VM[0], VM[1], [VM_A, VM_B]),
    // series loop: + battery -> switch -> rheostat -> lamp -> ammeter -> - battery
    k.wireSvg(at(BAT_P_TOP), at(SW_L_TOP), { via: [at([-80, 40, 12.7])], tone: "red" }),
    k.wireSvg(at(SW_R_TOP), at(RH_ENDS[0]), { via: [at([-12, 58, 12.7])], tone: "red" }),
    k.wireSvg(at(RH_ENDS[1]), at(LAMP_L_T), { via: [at([74, 32, 12.7])], tone: "red" }),
    k.wireSvg(at(LAMP_R_T), at(AMM_A_T), { via: [at([112, -16, 12.7])], tone: "red" }),
    // voltmeter probe leads: short, low, outside the socket wall
    k.wireSvg(at(VM_A_T), at(LAMP_R_T), { tone: "faint" }),
    k.wireSvg(at(VM_B_T), at(LAMP_L_T), { tone: "faint" }),
    `<path data-part="amN" class="iso-line" data-tone="red" data-free="start" style="stroke-width:1.1" d="${needleAt(AMM[0], AMM[1], 15, AMM_TOP, I0 / I_MAX)}"/>`,
    `<path data-part="vmN" class="iso-line" data-tone="red" data-free="start" style="stroke-width:1.1" d="${needleAt(VM[0], VM[1], 13, VM_TOP, (I0 * R_LAMP) / 9)}"/>`,
    knobAsm(KNOB_V[0], KNOB_V[1], "VOLTAGE", (V_DEFAULT - V_MIN) / (V_MAX - V_MIN)),
    knobAsm(KNOB_R[0], KNOB_R[1], "RESIST", (R_DEFAULT - R_MIN) / (R_MAX - R_MIN)),
  ],
});

const modelSrc = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export\s+/gm, "");
const swScreen = at([SW[0], SW[1], 18.5]);
const vScreen = at([KNOB_V[0], KNOB_V[1], 24]);
const rScreen = at([KNOB_R[0], KNOB_R[1], 24]);

const live = `
const P = ${JSON.stringify(P)};
const SWC = ${JSON.stringify(SW_R_TOP)}, SWO = ${JSON.stringify(LEVER_OPEN_TIP)}, SWP = ${JSON.stringify([...SW_L, 18.5])};
const KV = ${JSON.stringify(KNOB_V)}, KR = ${JSON.stringify(KNOB_R)};
const RHX0 = ${RH_X0}, RHX1 = ${RH_X1}, CARR0 = ${RH_X0 + ((R_DEFAULT - R_MIN) / (R_MAX - R_MIN)) * (RH_X1 - RH_X0)};
const AMMC = ${JSON.stringify(AMM)}, VM = ${JSON.stringify(VM)}, AMM_TOP = ${AMM_TOP}, VM_TOP = ${VM_TOP}, AMMR = 15, VMR = 13;
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
const kptrAt = ${kptrAt.toString().replace(/k\./g, "")};
${modelSrc}
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const q = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readEl = document.querySelector("[data-readout]");
const rig = createCircuit();
let last = 0, frame = 0, visible = false, touring = !still.matches, tourClock = 0, tourTimer = 0, lastInput = -1e9;
let drag = null, fA = 0, fV = 0, fS = 0, fG = 0, fCar = 0;
fA = ${I0 / I_MAX}; fV = ${(I0 * R_LAMP) / 9}; fS = 1; fG = ${I0 / I_MAX}; fCar = 0;
function markInput() { lastInput = performance.now(); }
function act() { toggle(rig); touring = false; markInput(); }
function lerp3(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
function draw() {
  const i = current(rig), vl = lampVolts(rig), pw = lampPower(rig), br = brightness(rig);
  const tip = lerp3(SWC, SWO, 1 - fS);
  q("swlev").setAttribute("d", segment(SWP, tip, P));
  const t = iso(tip, P);
  const dot = q("swtip");
  dot.setAttribute("cx", t[0].toFixed(2)); dot.setAttribute("cy", t[1].toFixed(2));
  q("amN").setAttribute("d", needleAt(AMMC[0], AMMC[1], AMMR, AMM_TOP, fA));
  q("vmN").setAttribute("d", needleAt(VM[0], VM[1], VMR, VM_TOP, fV));
  q("carr").setAttribute("transform", translateAlong(P, [fCar * (RHX1 - RHX0), 0, 0]));
  q("glow").setAttribute("opacity", fG.toFixed(3));
  q("kptr_VOLTAGE").setAttribute("d", kptrAt((rig.v - V_MIN) / (V_MAX - V_MIN), KV[0], KV[1]));
  q("kptr_RESIST").setAttribute("d", kptrAt((rig.r - R_MIN) / (R_MAX - R_MIN), KR[0], KR[1]));
  const text = "V " + rig.v.toFixed(1) + " V \\u00b7 R " + Math.round(rig.r) + " \\u03a9 \\u00b7 I " + i.toFixed(2) + " A \\u00b7 P " + pw.toFixed(2) + " W";
  if (readEl.textContent !== text) readEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(i * 1000)));
  stage.setAttribute("aria-valuetext", text);
}
function follow(dt) {
  const i = current(rig);
  const kA = Math.min(1, dt * 9), kS = Math.min(1, dt * 7), kG = Math.min(1, dt * 6);
  fA += (i / I_MAX - fA) * kA;
  fV += ((i * R_LAMP) / 9 - fV) * kA;
  fS += ((rig.closed ? 1 : 0) - fS) * kS;
  fG += (brightness(rig) - fG) * kG;
  fCar += ((rig.r - R_DEFAULT) / (R_MAX - R_MIN) - fCar) * kA;
}
function tick(now) {
  const dt = clamp((now - last) / 1000 || 1 / 60, 0, 1 / 30);
  last = now;
  tourClock += dt;
  if (touring && tourClock > 1.6) {
    tourTimer += dt;
    if (tourTimer > 2.4) {
      tourTimer = 0;
      const preset = [[6, 20, 1], [9, 0, 1], [4.5, 40, 1], [3, 80, 1], [6, 20, 0]][Math.floor(tourClock / 2.4) % 5];
      setVoltage(rig, preset[0]); setResistance(rig, preset[1]);
      if (rig.closed !== !!preset[2]) toggle(rig);
    }
  }
  if (!touring && !still.matches && now - lastInput > 3600) touring = true;
  follow(dt);
  rig.time += dt;
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
const HIT = [
  { s: ${JSON.stringify(swScreen)}, r: 34, kind: "SW" },
  { s: ${JSON.stringify(vScreen)}, r: 44, kind: "V" },
  { s: ${JSON.stringify(rScreen)}, r: 44, kind: "R" },
];
svgEl.addEventListener("pointerdown", (e) => {
  const rect = svgEl.getBoundingClientRect();
  const kx = rect.width / ${WIDTH};
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  for (const h of HIT) {
    if (Math.hypot(px - h.s[0] * kx, py - h.s[1] * kx) < h.r) {
      if (h.kind === "SW") { act(); return; }
      drag = { y: e.clientY, base: h.kind === "V" ? rig.v : rig.r, kind: h.kind };
      svgEl.setPointerCapture(e.pointerId);
      return;
    }
  }
  act();
});
svgEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const d = ((drag.y - e.clientY) / 50) * 4;
  if (drag.kind === "V") setVoltage(rig, drag.base + d * ${V_STEP});
  else setResistance(rig, drag.base + d * ${R_STEP});
  touring = false; markInput();
});
const endDrag = () => { drag = null; };
svgEl.addEventListener("pointerup", endDrag);
svgEl.addEventListener("pointercancel", endDrag);
svgEl.addEventListener("pointerleave", () => { drag = null; });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setVoltage(rig, rig.v + ${V_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); setVoltage(rig, rig.v - ${V_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); setResistance(rig, rig.r + ${R_STEP}); touring = false; markInput(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); setResistance(rig, rig.r - ${R_STEP}); touring = false; markInput(); }
  else if (e.key === "Home") { e.preventDefault(); setResistance(rig, ${R_MIN}); touring = false; markInput(); }
  else if (e.key === "End") { e.preventDefault(); setResistance(rig, ${R_MAX}); touring = false; markInput(); }
});
draw();
`;

const readout0 = `V ${V_DEFAULT.toFixed(1)} V · R ${R_DEFAULT} Ω · I ${I0.toFixed(2)} A · P ${(I0 * I0 * R_LAMP).toFixed(2)} W`;

const body = k.plateHtml({
  fig: "Fig 2",
  title: "Circuit bench",
  hint: "Drag the knobs · Space toggles the switch",
  readout: readout0,
  keys: [
    { mark: "lit", label: "Lamp glow — brightness follows the current" },
    { mark: "raised", label: "Meter needles, switch lever and rheostat carriage — they move with the model" },
    { mark: "faint", label: "Voltmeter probe leads — they tap across the lamp" },
  ],
  caption: "One series loop: the battery's EMF drives current through the knife switch, the slide rheostat, the lamp filament (10 Ω) and the ammeter back to the battery. Ohm's law sets everything at once — I = V / (R_lamp + R) — so raising RESISTANCE dims the lamp fast: the lamp's power is P = I²·R_lamp, the square of the current. The voltmeter taps across the lamp and reads I·R_lamp; the ammeter reads the loop current. Open the switch and the loop breaks: I = 0, the lamp goes dark, both needles fall to zero.",
  body: `<style>
.iso{--anatomy-red:#fb7185;--anatomy-blue:#22d3ee;--anatomy-green:#34d399;--anatomy-hi:#e6f1ff;--anatomy-mid:#7f8db3;--anatomy-lo:#3a4668;--anatomy-page:#070b16;--anatomy-card:#0a1020}
.iso-plate{background:radial-gradient(1200px 600px at 85% -10%,rgba(109,93,246,.14),transparent 55%),radial-gradient(900px 500px at -10% 25%,rgba(34,211,238,.1),transparent 50%),#070b16!important}
.iso[data-theme="light"] .iso-plate{background:radial-gradient(1000px 460px at 28% 18%,#f3e9d2 0%,#fbfbfa 55%)!important}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-dots[data-tone="red"] circle{fill:var(--anatomy-red);opacity:.9}
.iso-dots[data-tone="green"] circle{fill:var(--anatomy-green);opacity:.9}
</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Circuit bench: arrow keys set voltage and resistance, Space toggles the switch" aria-valuemin="0" aria-valuemax="900" aria-valuenow="${Math.round(I0 * 1000)}">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "circuit-light.html" : "circuit.html"), k.pageHtml({ title: "Circuit bench", theme, body, script: kitScript() + "\n" + live }));
console.log("wrote", theme === "light" ? "circuit-light.html" : "circuit.html");
