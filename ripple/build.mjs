import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "file:///C:/Users/acer/.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "file:///C:/Users/acer/.agents/skills/anatomy/kit/lathe.mjs";
import { glCamera } from "file:///C:/Users/acer/.agents/skills/anatomy/kit/gl.mjs";
import { tubePieces, tubeSvg } from "file:///C:/Users/acer/.agents/skills/anatomy/kit/tube.mjs";
import { kitScript, glScript } from "file:///C:/Users/acer/.agents/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

const W = 660;
const H = 430;
const AZIMUTH = 50;
const ELEVATION = 44;

const BASE_H = 12;
const FOOT_H = 6;
const Z_PAPER = 0.25;
const IN = { x: -75, y: -60, w: 150, d: 120, r: 0 };
const OUT = { x: -81, y: -66, w: 162, d: 132, r: 1.2 };
const FRAME = OUT.x + OUT.w - IN.x - IN.w;
const Z = { rail: 95, bed: 99, floor: 103, water: 109, rim: 113, top: 117 };
const LAMP = [0, 0, 280];
const LAMP_R = 0.8;
const SHADOW = (LAMP[2] - Z_PAPER) / (LAMP[2] - Z.bed);
const PAPER_HALF = [Math.ceil((OUT.w / 2) * SHADOW + 3), Math.ceil((OUT.d / 2) * SHADOW + 3)];
const PAPER = { x: -PAPER_HALF[0], y: -PAPER_HALF[1], w: PAPER_HALF[0] * 2, d: PAPER_HALF[1] * 2, r: 1.2 };
const MARGIN = 22;
const BASE = { x: PAPER.x - MARGIN, y: PAPER.y - MARGIN, w: PAPER.w + MARGIN * 2, d: PAPER.d + MARGIN * 2, r: 10 };
const BEAM_SPREAD = 0.94;
const XS = -40;
const BAR = { x: XS - 2.5, y: -52, w: 5, d: 104, r: 0.8 };
const BAR_Z = Z.top + 2;
const BAR_H = 3.5;
const BEAM = { x: XS - 4, y: OUT.y - 3, w: 8, d: OUT.d + 6, r: 1 };
const BEAM_Z = Z.top + 16;
const BEAM_H = 4;
const SPRING_Y = 28;
const BALL_R = 1.6;
const BALL_Z = Z.water + BALL_R - 0.6;
const CONTACT_R = Math.sqrt(BALL_R * BALL_R - (BALL_Z - Z.water) ** 2);
const MOTOR_Z = BAR_Z + BAR_H + 1.2 + 4;
const MOTOR_X = [XS - 7, XS + 6];
const ECCENTRIC_X = XS + 11;
const LEG_AT = [IN.w / 2 + 2.5, IN.d / 2 + 2.5];
const LEGS = [
  [LEG_AT[0], LEG_AT[1]],
  [-LEG_AT[0], LEG_AT[1]],
  [LEG_AT[0], -LEG_AT[1]],
  [-LEG_AT[0], -LEG_AT[1]],
];
const LEG_R = 2.8;
const LEG_TOP = Z.rail - 4;
const POST = [BASE.x + BASE.w - 15, BASE.y + 10];
const POST_R = 3.4;
const ARM_Z = LAMP[2] + 18;
const POST_TOP = ARM_Z + 12;
const KNOB_F = [-15, -114];
const KNOB_S = [45, -114];
const KNOB_TOP = 21.5;
const RANGE = M.RANGE;
const START = { frequency: 16, spacing: 50 };
const START_PHASE = 0.9;
const BEACH = 5;
const FOAM_PASS = 0.12;

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [0, 0, ARM_Z + 8], [POST[0] - 4.5, POST[1] - 4.5, POST_TOP + 2.5], [POST[0] + 4.5, POST[1] + 4.5, POST_TOP + 2.5], ...k.boxCorners(BEAM, BEAM_Z, BEAM_Z + BEAM_H)],
  W,
  H,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.5) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const glassLines = (paths) => Ln(paths.outline + paths.crease, { tone: "faint" });

function vcoil(cx, cy, z0, z1, r, turns) {
  const count = Math.round(turns * 24);
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const angle = share * turns * Math.PI * 2;
    const point = at([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z0 + (z1 - z0) * share]);
    const facing = Math.cos(angle) * V[0] + Math.sin(angle) * V[1] > 0;
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(point);
      (near ? front : back).push(k.pathOf(run));
      run = [point];
      near = facing;
      continue;
    }
    run.push(point);
  }
  if (run.length > 1) (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

function sphere(centre, r, style) {
  const profile = [];
  for (let index = 0; index <= 12; index++) {
    const a = -Math.PI / 2 + (index / 12) * Math.PI;
    profile.push([r * Math.sin(a), r * Math.cos(a), 1]);
  }
  return S(G.lathe(profile, UP(centre), P, { steps: 28 }), style);
}

function screwX(centre, r, length, { tone = "mid", ribs = 14 } = {}) {
  const F = G.frameAlong(centre, [1, 0, 0]);
  return (
    S(G.disc(0, length * 0.4, r * 0.45, F, P), { tone }) +
    S(G.disc(length * 0.4, length, r, F, P), { tone }) +
    Ln(G.ribsOf(F, length * 0.4 + 0.3, length - 0.3, r, ribs, P), { tone: "lo" })
  );
}

function cable(points, { r = 0.9, bend = 5, maxLength = 12 } = {}) {
  return tubePieces(G.fillet(points, bend, 8), r, P, { maxLength, spacing: 1.2 });
}

// ---------- BACK LAYER: base plate, paper, fallback ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
const FEET = byDepth([...k.corners(BASE, 20), [BASE.x + BASE.w / 2, BASE.y + 20], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 20], [BASE.x + 20, 0], [BASE.x + BASE.w - 20, 0]]);
for (const [x, y] of FEET) {
  back.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.4, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.6, -BASE_H - FOOT_H + 1.4, FOOT_H - 1.4, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(BASE, 6), 0, P), { tone: "lo" }));
const BASE_SCREWS = k.corners(BASE, 10);
back.push(Ln(BASE_SCREWS.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(BASE_SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
const SIDE = k.sideTicks(BASE.y + 18, BASE.y + BASE.d - 18, 8, 4, BASE.x + BASE.w, -2, [2, 4], P, "y");
back.push(Ln(SIDE.minor, { tone: "lo" }), Ln(SIDE.major, { tone: "mid" }));
const STRIP = { x: PAPER.x + 8, y: BASE.y + BASE.d - 15, w: PAPER.w - 16, d: 7, r: 0.8 };
back.push(S(k.slabOf(STRIP, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
const TICKS = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 4, STRIP.y + 0.7, 0.6, [1.8, 3.6], P);
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 2, STRIP.y + 3.5, 0.7]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.7])], { size: 0.4 }));
const LABEL = { x: BASE.x + BASE.w - 15, y: 36, w: 10, d: 74, r: 1 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.4), 0.8, P), { tone: "faint" }));
back.push(k.faceTextSvg(k.topMatrix([LABEL.x + 6.4, LABEL.y + LABEL.d - 5], 0.8, P, "y"), "RIPPLE TANK", { size: 3.4, tone: "lo" }));
back.push(Ln([0, 1].map((row) => k.onTop([[LABEL.x + 2.6 + row * 1.8, LABEL.y + 5], [LABEL.x + 2.6 + row * 1.8, LABEL.y + (row ? 15 : 20)]], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + LABEL.w / 2, LABEL.y + 2, 0.8]), at([LABEL.x + LABEL.w / 2, LABEL.y + LABEL.d - 2, 0.8])], { size: 0.4 }));
back.push(S(k.slabOf(PAPER, 0, Z_PAPER, P, 3), { tone: "lo", flat: true, crease: "none", className: "rt-sheet" }));
for (const [sx, sy] of [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
]) {
  const cx = (sx > 0 ? PAPER.x + PAPER.w : PAPER.x) - sx * 1.4;
  const cy = (sy > 0 ? PAPER.y + PAPER.d : PAPER.y) - sy * 1.4;
  const along = [sx / Math.SQRT2, -sy / Math.SQRT2];
  const across = [sx / Math.SQRT2, sy / Math.SQRT2];
  const ring = [
    [-7, -2.6],
    [7, -2.6],
    [7, 2.6],
    [-7, 2.6],
  ].map(([a, b]) => [cx + along[0] * a + across[0] * b, cy + along[1] * a + across[1] * b]);
  back.push(S(k.extrude(ring, Z_PAPER, 0.15, P), { tone: "faint", flat: true, crease: "none", className: "rt-tape" }));
}

const PATTERN_GEO = { xs: XS, inside: [IN.x, IN.y, IN.x + IN.w, IN.y + IN.d], lamp: LAMP, zWater: Z.water, zPaper: Z_PAPER };
const optics = { magnification: M.magnificationOf(LAMP[2], Z_PAPER, Z.water), caustic: M.causticOf(LAMP[2], Z_PAPER, Z.water, Z.floor, Z.bed) };
const startPattern = M.patternOf(M.stateOf(START.frequency, START.spacing, optics), PATTERN_GEO, at, START_PHASE);
const LIFT = (LAMP[2] - Z_PAPER) / (LAMP[2] - Z.water);
const SHADOW_IN = { x: IN.x * LIFT, y: IN.y * LIFT, w: IN.w * LIFT, d: IN.d * LIFT, r: 0 };
back.push(
  `<g class="rt-fallback">${Ln(k.planOutline(SHADOW_IN, Z_PAPER, P), { tone: "faint" })}<path data-part="crests" class="iso-line" data-tone="faint" d="${startPattern.crests}"/><path data-part="nodal" class="iso-line" data-tone="lo" d="${startPattern.nodal}"/></g>`,
);
// ---------- MID LAYER: post, arm, lamp, cables, knobs, legs, far rails/glass, beach, water ----------
const mid = [];
const ARM_U = G.unit3([LAMP[0] - POST[0], LAMP[1] - POST[1], 0]);
const ARM_N = [-ARM_U[1], ARM_U[0], 0];
const ARM_LENGTH = Math.hypot(LAMP[0] - POST[0], LAMP[1] - POST[1]);
const FACING = Math.sign(-(ARM_N[0] * V[0] + ARM_N[1] * V[1])) || 1;
const onArm = (a, b, z = 0) => [POST[0] + ARM_U[0] * a + ARM_N[0] * b, POST[1] + ARM_U[1] * a + ARM_N[1] * b, z];
const armRing = (a0, a1, b0, b1) =>
  [
    [a0, b0],
    [a1, b0],
    [a1, b1],
    [a0, b1],
  ].map(([a, b]) => onArm(a, b).slice(0, 2));
const cableFoot = onArm(-11, 0, 0.8);
const LAMP_CABLE_LOW = cable(
  [
    onArm(-4.2, 0, ARM_Z + 1.4),
    onArm(-8, 0, ARM_Z - 0.7),
    onArm(-5.3, 0, ARM_Z - 8.4),
    onArm(-5.3, 0, 8.4),
    onArm(-9.8, 0, 3.5),
    cableFoot,
    [cableFoot[0] + 0.7, BASE.y + 2.8, 0.8],
    [cableFoot[0] + 1, BASE.y - 1.8, -1],
    [cableFoot[0] + 1.1, BASE.y - 2.1, -8.4],
  ],
  { r: 0.9, bend: 2.2, maxLength: 6 },
);
for (const piece of LAMP_CABLE_LOW) {
  if (piece.mid[1] < BASE.y - 0.2) back.splice(1, 0, tubeSvg(piece, { tone: "mid" }));
  else mid.push(tubeSvg(piece, { tone: "mid" }));
}
const postSeg = (z0, z1) => S(k.cylinder(POST[0], POST[1], POST_R, z0, z1 - z0, P, 28), { tone: "mid", crease: "none" });
mid.push(S(k.cylinder(POST[0], POST[1], 6.7, 0, 2.5, P, 40, 0.6), { tone: "mid" }));
mid.push(Dots(G.dotsOf(UP([POST[0], POST[1], 0]), 2.5, 5.3, 6, P, { all: true }), { size: 0.4 }));
mid.push(S(k.cylinder(POST[0], POST[1], 4.5, 2.5, 0.6, P, 28), { tone: "mid" }));
mid.push(postSeg(5.6, ARM_Z - 4.2));
mid.push(Ln([70, 140, 210].map((z) => k.sideArc(POST[0], POST[1], POST_R, z, P, 16)).join(""), { tone: "faint" }));
mid.push(S(k.extrude(armRing(-5.5, 5.5, -5.5, 5.5), ARM_Z - 4.2, 12, P, { bevel: 0.5 }), { tone: "mid" }));
mid.push(Dots([onArm(-3.5, -3.5, ARM_Z + 7), onArm(3.5, 3.5, ARM_Z + 7)].map(at), { size: 0.4 }));
{
  const F = G.frameAlong(onArm(0, 6 * -FACING, ARM_Z + 1.4), G.mul3(ARM_N, -FACING));
  mid.push(S(G.disc(0, 2, 1, F, P), { tone: "mid" }) + S(G.disc(2, 5, 2.1, F, P), { tone: "mid" }) + Ln(G.ribsOf(F, 2.2, 4.7, 2.1, 11, P), { tone: "lo" }));
}
mid.push(postSeg(ARM_Z + 7, POST_TOP));
mid.push(S(k.cylinder(POST[0], POST[1], 3.6, POST_TOP, 1.7, P, 28, 0.3), { tone: "mid" }));
mid.push(S(k.cylinder(0, 0, 1.8, LAMP[2] + 12, ARM_Z - LAMP[2] - 12, P, 20), { tone: "mid", crease: "none" }));
mid.push(S(k.cylinder(0, 0, 3.5, LAMP[2] + 11.4, 1.5, P, 24), { tone: "mid" }));
const SHADE = [
  [LAMP[2], 9.4],
  [LAMP[2] + 8.8, 9.4],
  [LAMP[2] + 9.5, 8.8, 1],
  [LAMP[2] + 11.5, 6.6, 1],
  [LAMP[2] + 12.9, 3.5],
];
mid.push(
  S(G.solidOf(SHADE, UP([0, 0, 0]), P, { bevel: 0.35 }), { tone: "hi", crease: "lo" }) +
    Ln(G.arcOf(UP([0, 0, 0]), LAMP[2] + 2.4, 9.4, P), { tone: "faint" }) +
    k.fadedSvg(G.ribsOf(UP([0, 0, 0]), LAMP[2] + 3.9, LAMP[2] + 7.4, 9.4, 36, P, { fade: [0.08, 0.35] }), { tone: "lo" }) +
    Dots(G.dotsOf(UP([0, 0, 0]), LAMP[2] + 1.4, 9.4, 17, P, { fade: [0.03, 0.3] }), { size: 0.35, tone: "mid" }),
);
mid.push(S(k.extrude(armRing(5.5, ARM_LENGTH + 5, -2.5, 2.5), ARM_Z, 4.5, P, { bevel: 0.4 }), { tone: "mid" }));
mid.push(Dots([14, ARM_LENGTH / 2, ARM_LENGTH - 3].map((a) => at(onArm(a, 0, ARM_Z + 4.5))), { size: 0.4 }));
const LAMP_CABLE_HIGH = cable(
  [
    onArm(ARM_LENGTH - 2.5, -1.5 * FACING, LAMP[2] + 14.4),
    onArm(ARM_LENGTH - 4.2, -3.9 * FACING, ARM_Z + 1.4),
    onArm(ARM_LENGTH - 11.2, -1.1 * FACING, ARM_Z + 5),
    onArm(15.4, -1.1 * FACING, ARM_Z + 5),
    onArm(10.5, -3.9 * FACING, ARM_Z + 2.1),
    onArm(5.8, -3.9 * FACING, ARM_Z + 2.1),
  ],
  { r: 0.9, bend: 2.8, maxLength: 17 },
);
for (const piece of LAMP_CABLE_HIGH) mid.push(tubeSvg(piece, { tone: "mid" }));
mid.push(S(G.disc(0, 1.1, 1.4, G.frameAlong(onArm(ARM_LENGTH - 2.5, -1.5 * FACING, LAMP[2] + 14.4), [0, 0, -1]), P), { tone: "mid" }));

// FREQUENCY / SPACING knobs on the plate's back band
const knobPtrAt = (frac, cx, cy) => {
  const a = (-135 + 270 * frac) * DEG;
  return k.lineOnTop([cx + Math.sin(a) * 1, cy - Math.cos(a) * 1], [cx + Math.sin(a) * 3.8, cy - Math.cos(a) * 3.8], KNOB_TOP + 0.4, P);
};
function knobAsm(cx, cy, label, frac, id) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 13, y: cy - 6.5, w: 26, d: 13, r: 2 }, BASE_H, 3, P, 4, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 6, BASE_H + 3, 2.5, P, 32, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 4.6, BASE_H + 5.5, 4, P, 32, 0.5), { tone: "hi", crease: "lo" }));
  out.push(Ln(k.knurl(cx, cy, 4.6, BASE_H + 5.5, BASE_H + 9.5, 32, P, 0.25), { tone: "lo" }));
  out.push(Dots([at([cx, cy, KNOB_TOP])], { size: 0.4, tone: "hi" }));
  out.push(`<path data-part="kptr_${id}" class="iso-line" data-tone="hi" d="${knobPtrAt(frac, cx, cy)}" style="stroke-width:1"/>`);
  out.push(k.faceTextSvg(k.topMatrix([cx, cy + 4.4], BASE_H + 3.15, P, "x"), label, { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}
mid.push(knobAsm(KNOB_F[0], KNOB_F[1], "FREQUENCY", (START.frequency - RANGE.frequency[0]) / (RANGE.frequency[1] - RANGE.frequency[0]), "FREQ"));
mid.push(knobAsm(KNOB_S[0], KNOB_S[1], "SPACING", (START.spacing - RANGE.spacing[0]) / (RANGE.spacing[1] - RANGE.spacing[0]), "SPAC"));
const PLUG = [-92, 40];
const LEFT_LEG = [-LEG_AT[0], LEG_AT[1]];
const RIM_Y = IN.y + IN.d + 2;
const MOTOR_CABLE = cable(
  [
    [MOTOR_X[0] - 1.2, 1.2, MOTOR_Z + 1.5],
    [MOTOR_X[0] - 3.2, 1.4, MOTOR_Z + 2.8],
    [XS - 5.4, 4.5, BEAM_Z + 1.5],
    [XS - 5.4, IN.y + IN.d - 3, BEAM_Z + 1.5],
    [XS - 5.2, IN.y + IN.d + 2.4, BEAM_Z - 2.8],
    [XS - 5.2, IN.y + IN.d + 2.4, Z.top + 1.6],
    [XS - 8.5, RIM_Y, Z.top + 0.8],
    [OUT.x + 4.5, RIM_Y, Z.top + 0.8],
    [OUT.x - 1.4, OUT.y + OUT.d + 1.4, Z.top - 2],
    [OUT.x - 1.4, OUT.y + OUT.d + 1.4, Z.rail - 6],
    [LEFT_LEG[0] - 3.8, LEFT_LEG[1] + 1, Z.rail - 14],
    [LEFT_LEG[0] - 3.8, LEFT_LEG[1] + 1, 13],
    [LEFT_LEG[0] - 9, LEFT_LEG[1] - 2.4, 13.2],
    [PLUG[0] + 6, PLUG[1], 13.2],
    [PLUG[0] + 2.4, PLUG[1], 13.2],
    [PLUG[0], PLUG[1], 13.2],
  ],
  { r: 0.9, bend: 4.5, maxLength: 9 },
);
const motorCableBridge = [];
const motorCableRim = [];
for (const piece of MOTOR_CABLE) {
  if (piece.mid[2] > Z.top - 1 && piece.mid[1] < IN.y + IN.d - 7) motorCableBridge.push(tubeSvg(piece, { tone: "mid" }));
  else if (piece.mid[2] > Z.top - 1) motorCableRim.push(tubeSvg(piece, { tone: "mid" }));
  else mid.push(tubeSvg(piece, { tone: "mid" }));
}
for (const z of [64, 44, 22]) {
  mid.push(S(slab({ x: LEFT_LEG[0] - 3.8, y: LEFT_LEG[1] - 0.5, w: 3.8, d: 1.8, r: 0.3 }, z + 0.2, 1.8, 2, 0.2), { tone: "mid" }));
  mid.push(S(k.cylinder(LEFT_LEG[0] - 3.8, LEFT_LEG[1] + 1, 1.5, z, 2.2, P, 14), { tone: "mid" }));
}
for (const [x, y] of byDepth(LEGS)) {
  const parts = [];
  parts.push(S(k.cylinder(x, y, 5, Z_PAPER, 3.9, P, 32), { tone: "mid" }));
  parts.push(Ln(k.knurl(x, y, 5, Z_PAPER, Z_PAPER + 3.9, 22, P), { tone: "lo" }));
  parts.push(S(k.cylinder(x, y, 1.6, 4.1, 6, P, 20), { tone: "hi", crease: "none" }));
  parts.push(Ln([4.2, 5, 5.8, 6.6, 7.4, 8.2, 9, 9.8].map((z) => k.sideArc(x, y, 1.6, z, P, 8)).join(""), { tone: "lo" }));
  parts.push(S(k.cylinder(x, y, 3.4, 10.1, 1.6, P, 6), { tone: "mid" }));
  parts.push(S(k.cylinder(x, y, LEG_R, 10.9, LEG_TOP - 10.9, P, 24), { tone: "mid", crease: "none" }));
  parts.push(Ln([15, 52].map((z) => k.sideArc(x, y, LEG_R, z, P, 10)).join(""), { tone: "faint" }));
  parts.push(S(k.cylinder(x, y, 3.5, 50, 4, P, 16, 0.3), { tone: "mid" }));
  parts.push(Ln(k.knurl(x, y, 3.5, 50.4, 53.6, 16, P), { tone: "lo" }));
  const bracket = { x: x - 3.3, y: y - 3.3, w: 6.6, d: 6.6, r: 0.7 };
  parts.push(S(slab(bracket, LEG_TOP, Z.rail - LEG_TOP, 2, 0.3), { tone: "mid" }));
  parts.push(Dots([at([bracket.x + bracket.w, y, LEG_TOP + 2.1]), at([x, bracket.y + bracket.d, LEG_TOP + 2.1])], { size: 0.35 }));
  mid.push(parts.join(""));
}
const railMinusX = { x: OUT.x, y: OUT.y, w: FRAME, d: OUT.d, r: 1 };
const railPlusX = { x: IN.x + IN.w, y: OUT.y, w: FRAME, d: OUT.d, r: 1 };
const railMinusY = { x: IN.x, y: OUT.y, w: IN.w, d: FRAME, r: 0.3 };
const railPlusY = { x: IN.x, y: IN.y + IN.d, w: IN.w, d: FRAME, r: 0.3 };
mid.push(S(slab(railMinusX, Z.rail, Z.bed - Z.rail, 2, 0.4), { tone: "mid" }));
mid.push(S(slab(railMinusY, Z.rail, Z.bed - Z.rail, 2, 0.4), { tone: "mid" }));
const POST_PLAN = (x, y) => ({ x, y, w: FRAME, d: FRAME, r: 0.6 });
const cornerPost = (plan) => S(slab(plan, Z.bed, Z.top - Z.bed, 2, 0.4), { tone: "mid" }) + Dots([at([plan.x + plan.w / 2, plan.y + plan.d / 2, Z.top])], { size: 0.4 });
mid.push(cornerPost(POST_PLAN(OUT.x, OUT.y)));
mid.push(cornerPost(POST_PLAN(IN.x + IN.w, OUT.y)));
mid.push(cornerPost(POST_PLAN(OUT.x, IN.y + IN.d)));
mid.push(glassLines(slab({ x: IN.x - 4, y: IN.y, w: 4, d: IN.d, r: 0 }, Z.floor, Z.rim - Z.floor, 1, 0)));
mid.push(glassLines(slab({ x: IN.x, y: IN.y - 4, w: IN.w, d: 4, r: 0 }, Z.floor, Z.rim - Z.floor, 1, 0)));
{
  const FOOT = k.insetPlan(IN, BEACH);
  const top = (x, y) => at([x, y, Z.water - 0.3]);
  const foot = (x, y) => at([x, y, Z.floor]);
  const [x0, y0, x1, y1] = [IN.x, IN.y, IN.x + IN.w, IN.y + IN.d];
  const [u0, v0, u1, v1] = [FOOT.x, FOOT.y, FOOT.x + FOOT.w, FOOT.y + FOOT.d];
  const faces = [
    [[top(x0, y0), top(x1, y0), foot(u1, v0), foot(u0, v0)], 3],
    [[top(x0, y0), top(x0, y1), foot(u0, v1), foot(u0, v0)], 1],
    [[top(x1, y0), top(x1, y1), foot(u1, v1), foot(u1, v0)], 2],
    [[top(x0, y1), top(x1, y1), foot(u1, v1), foot(u0, v1)], 0],
  ];
  const shell = faces.map(([ring, shade]) => `<path class="iso-fill" d="${k.pathOf(ring, true)}"/><path class="iso-shade" data-shade="${shade}" d="${k.pathOf(ring, true)}"/>`).join("");
  const seams = k.pathOf([foot(u0, v0), foot(u1, v0), foot(u1, v1), foot(u0, v1)], true) + [[x0, y0, u0, v0], [x1, y0, u1, v0], [x1, y1, u1, v1], [x0, y1, u0, v1]].map(([a, b, c, d]) => k.pathOf([top(a, b), foot(c, d)])).join("");
  mid.push(`<g class="iso-solid rt-beach">${shell}</g>` + Ln(seams, { tone: "faint" }));
}
mid.push(S(k.slabOf(IN, Z.water - 0.04, 0.04, P, 1), { tone: "faint", flat: true, crease: "none", className: "rt-water" }));
// ---------- FRONT LAYER: far rims, bridge, bar, dippers, motor, near rims ----------
const rimSvg = (plan) => S(slab(plan, Z.rim, Z.top - Z.rim, 2, 0.3), { tone: "mid" });
const front = [];
front.push(rimSvg(railMinusX));
front.push(rimSvg(railMinusY));
front.push(...motorCableBridge);
const pillar = (y0) => {
  const plan = { x: XS - 5, y: y0, w: 10, d: 6, r: 1 };
  return S(slab(plan, Z.top, BEAM_Z - Z.top, 3, 0.5), { tone: "mid" }) + screwX([XS + 5, y0 + 3, Z.top + 9], 2.4, 5.6);
};
const spring = (y) => {
  const coil = vcoil(XS, y, BAR_Z + BAR_H + 0.6, BEAM_Z - 0.6, 2.3, 8);
  return Ln(coil.back, { tone: "lo" }) + S(k.cylinder(XS, y, 1.4, BAR_Z + BAR_H, 0.8, P, 16), { tone: "mid" }) + Ln(coil.front, { tone: "hi" });
};
front.push(pillar(railMinusY.y - 0.2));
front.push(spring(-SPRING_Y));
const BAR_TICKS = k.topTicks(-36, 36, 2, 5, BAR.x + 0.8, BAR_Z + BAR_H, [1.2, 2.4], P, "y");
front.push(
  `<g data-part="bar">` +
    S(slab(BAR, BAR_Z, BAR_H, 2, 0.4), { tone: "hi", crease: "lo" }) +
    Ln(BAR_TICKS.minor, { tone: "lo" }) +
    Ln(BAR_TICKS.major, { tone: "mid" }) +
    Ln(k.lineOnTop([BAR.x + 0.8, 0], [BAR.x + 3.8, 0], BAR_Z + BAR_H, P), { tone: "hi" }) +
    Dots([at([XS, BAR.y + 2.4, BAR_Z + BAR_H]), at([XS, BAR.y + BAR.d - 2.4, BAR_Z + BAR_H])], { size: 0.4 }) +
    `</g>`,
);
function dipper() {
  const parts = [];
  parts.push(sphere([XS, 0, BALL_Z], BALL_R, { tone: "hi", lit: true }));
  parts.push(S(k.cylinder(XS, 0, 0.8, BALL_Z + BALL_R * 0.7, BAR_Z - 1.6 - BALL_Z - BALL_R * 0.7, P, 12), { tone: "hi", lit: true, crease: "none" }));
  const clamp = { x: XS - 5.6, y: -3, w: 11.2, d: 6, r: 0.8 };
  parts.push(S(slab(clamp, BAR_Z - 1.6, BAR_H + 3.6, 2, 0.4), { tone: "mid" }));
  parts.push(Ln(k.lineOnTop([clamp.x + 0.8, 0], [clamp.x + 4.2, 0], BAR_Z + BAR_H + 2, P), { tone: "lit" }));
  parts.push(screwX([clamp.x + clamp.w, 0, BAR_Z + 2.4], 1.9, 4.6));
  return parts.join("");
}
const restFar = -START.spacing / 2;
const restNear = START.spacing / 2;
front.push(`<g data-part="dipper-far" transform="${k.translateAlong(P, [0, restFar, 0])}">${dipper()}</g>`);
const MF = G.frameAlong([MOTOR_X[0], 0, MOTOR_Z], [1, 0, 0]);
const motorLength = MOTOR_X[1] - MOTOR_X[0];
const saddle = { x: XS - 4, y: -4.6, w: 8, d: 9.2, r: 0.8 };
front.push(
  `<g data-part="motor">` +
    S(slab(saddle, BAR_Z + BAR_H, 3, 2, 0.3), { tone: "mid" }) +
    S(G.lathe([[-1.6, 0], [-1.6, 3.2], [-0.4, 4.6, 1], [0, 5.2], [0, 0]], MF, P, { steps: 32 }), { tone: "mid" }) +
    S(G.disc(0, motorLength, 6, MF, P, { bevel: 0.4 }), { tone: "mid" }) +
    k.fadedSvg(G.ribsOf(MF, 3, motorLength - 4, 6, 28, P, { fade: [0.08, 0.45] }), { tone: "lo" }) +
    Ln(G.arcOf(MF, 2, 6, P) + G.arcOf(MF, motorLength - 3, 6, P), { tone: "faint" }) +
    S(G.lathe([[motorLength, 0], [motorLength, 4.6], [motorLength + 1.6, 4.2, 1], [motorLength + 2.2, 2.4], [motorLength + 2.2, 0]], MF, P, { steps: 24 }), { tone: "mid" }) +
    S(G.disc(motorLength + 2.2, ECCENTRIC_X - MOTOR_X[0], 5.2, MF, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }) +
    Dots([at([ECCENTRIC_X, 0, MOTOR_Z])], { size: 0.5, tone: "hi" }) +
    `<path data-part="eccentric" class="iso-line" data-tone="hi" d=""/>` +
    S(slab({ x: MOTOR_X[0] + 1.6, y: -1.4, w: 2.4, d: 2.8, r: 0.4 }, MOTOR_Z + 5.6, 1.6, 2), { tone: "mid" }) +
    S(slab({ x: MOTOR_X[0] + 1.6, y: 2.4, w: 2.4, d: 2.8, r: 0.4 }, MOTOR_Z + 5.2, 1.6, 2), { tone: "mid" }) +
    `</g>`,
);
front.push(`<g data-part="dipper-near" transform="${k.translateAlong(P, [0, restNear, 0])}">${dipper()}</g>`);
front.push(spring(SPRING_Y));
front.push(S(slab(railPlusY, Z.rail, Z.bed - Z.rail, 2, 0.4), { tone: "mid" }));
front.push(
  S(slab(railPlusX, Z.rail, Z.bed - Z.rail, 2, 0.4), { tone: "mid" }) +
    Dots([-40, 0, 40].map((y) => at([railPlusX.x + FRAME, y, Z.rail + 4.5])), { size: 0.42 }),
);
front.push(glassLines(slab({ x: OUT.x + 2.5, y: OUT.y + 2.5, w: OUT.w - 5, d: OUT.d - 5, r: 0 }, Z.bed, Z.floor - Z.bed, 1, 0)));
front.push(Ln(k.segment([IN.x, IN.y, Z.water], [IN.x + IN.w, IN.y, Z.water], P) + k.segment([IN.x, IN.y, Z.water], [IN.x, IN.y + IN.d, Z.water], P), { tone: "faint" }));
front.push(Ln(k.segment([IN.x + IN.w, IN.y, Z.water], [IN.x + IN.w, IN.y + IN.d, Z.water], P) + k.segment([IN.x, IN.y + IN.d, Z.water], [IN.x + IN.w, IN.y + IN.d, Z.water], P), { tone: "lo" }));
front.push(glassLines(slab({ x: IN.x + IN.w, y: IN.y, w: 4, d: IN.d, r: 0 }, Z.floor, Z.rim - Z.floor, 1, 0)));
front.push(glassLines(slab({ x: IN.x, y: IN.y + IN.d, w: IN.w, d: 4, r: 0 }, Z.floor, Z.rim - Z.floor, 1, 0)));
front.push(rimSvg(railPlusY));
front.push(rimSvg(railPlusX));
front.push(...motorCableRim);
front.push(cornerPost(POST_PLAN(IN.x + IN.w, IN.y + IN.d)));
front.push(pillar(railPlusY.y - 0.2));
front.push(
  S(slab(BEAM, BEAM_Z, BEAM_H, 3, 0.6), { tone: "mid" }) +
    Dots([BEAM.y + 5, -SPRING_Y, SPRING_Y, BEAM.y + BEAM.d - 5].map((y) => at([XS, y, BEAM_Z + BEAM_H])), { size: 0.45 }) +
    Ln(k.planOutline(k.insetPlan(BEAM, 2), BEAM_Z + BEAM_H, P, 2), { tone: "faint" }),
);
const startState = M.stateOf(START.frequency, START.spacing, optics);
const drop = Z.water - Z_PAPER;
const DATA = {
  W, H, P,
  camera: glCamera(P),
  range: RANGE,
  start: START,
  optics,
  beat: M.BEAT,
  slope: M.SLOPE,
  histDt: 0.05,
  phase: START_PHASE,
  pattern: PATTERN_GEO,
  reach: M.REACH,
  xs: XS,
  inside: [IN.x, IN.y, IN.x + IN.w, IN.y + IN.d],
  outside: [OUT.x, OUT.y, OUT.x + OUT.w, OUT.y + OUT.d],
  paper: [PAPER.x, PAPER.y, PAPER.x + PAPER.w, PAPER.y + PAPER.d],
  base: [BASE.x, BASE.y, BASE.x + BASE.w, BASE.y + BASE.d],
  round: [PAPER.r, BASE.r],
  z: [Z_PAPER, Z.rail, Z.water, Z.bed],
  top: Z.top,
  bed: Z.bed,
  floor: Z.floor,
  rim: Z.rim,
  lamp: LAMP,
  lampR: LAMP_R,
  blur: (0.5 * LAMP_R * drop) / (LAMP[2] - Z_PAPER),
  spread: BEAM_SPREAD,
  foam: [(Z.floor + Z.water) / 2, BEACH / 2, FOAM_PASS],
  beach: BEACH,
  legs: [LEG_AT[0], LEG_AT[1], LEG_R, Z.rail],
  post: [POST[0], POST[1], POST_R, POST_TOP],
  bar: [BAR.x - 1.6, BAR.y, BAR.x + BAR.w + 1.6, BAR.y + BAR.d],
  beam: [BEAM.x, BEAM.y, BEAM.x + BEAM.w, BEAM.y + BEAM.d],
  motor: [MOTOR_X[0] - 1.6, -6, ECCENTRIC_X, 6],
  high: [BAR_Z + BAR_H / 2, BEAM_Z + BEAM_H / 2, MOTOR_Z],
  box: [KNOB_F[0] - 13, -120.5, KNOB_S[0] + 13, -107.5],
  boxTop: 15,
  near: [IN.x + IN.w, IN.y + IN.d],
  contact: CONTACT_R + 0.35,
  eccentric: [ECCENTRIC_X, MOTOR_Z],
  knobF: KNOB_F,
  knobS: KNOB_S,
  knobTop: KNOB_TOP,
};

const LABEL_TEXT =
  "A ripple tank on a base plate: a shallow glass-bottomed tank of water standing on four tall legs with knurled levelling screws, high over a paper screen. A strobe lamp on an arm from a post behind the tank shines down through the water. A bridge across the tank carries a vibrating bar on two coil springs, shaken by a small motor with an eccentric; two point dippers on the bar touch the water. Two knobs on the back edge of the plate set the frequency and the dipper spacing. The two sets of circular ripples interfere; the water's surface sheen moves with them, and the lamp projects the pattern of bright crest lines and grey nodal lines onto the paper far below.";

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "rt-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg rt-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;
const stage = `<div class="rt-stage" tabindex="0" role="group" aria-roledescription="ripple tank control" aria-label="Ripple tank. Drag the FREQUENCY or SPACING knobs on the back edge of the base plate; or use the left and right arrow keys for frequency and up and down for spacing, with Shift for bigger steps."><span class="rt-said" aria-live="polite"></span>${backSvg}<canvas class="rt-layer rt-gl rt-paper-gl" aria-hidden="true"></canvas>${layerSvg("rt-mid", mid)}<canvas class="rt-layer rt-gl rt-water-gl" aria-hidden="true"></canvas>${layerSvg("rt-front", front)}</div>`;

const at16 = M.stateOf(16, 50, optics);
const at28 = M.stateOf(28, 50, optics);
const cm = (mm) => (mm / 10).toFixed(1);
const caption = `A ripple tank seen by strobe light. Two dippers on one vibrating bar touch 6 mm of water in phase; the lamp flashes ${M.BEAT} times a second slower than they dip, so each wave seems to crawl outward at ${M.BEAT} Hz, which is honest slow motion. Ripples this small are held flat by surface tension as well as gravity, ω² = (gk + σk³/ρ) tanh kh, so at 16 Hz the wavelength is ${(at16.lambdaMm / 10).toFixed(2)} cm and a crest travels ${(at16.speed * 100).toFixed(0)} cm/s. Wherever the paths from the two dippers differ by half a wavelength the waves cancel, so dippers d apart draw 2⌊d/λ + ½⌋ nodal lines: ${at16.nodal} at 5 cm. A crest one wavelength out stands only ${at16.amplitude.toFixed(3)} mm high (ka = ${M.SLOPE}), yet it is a weak lens. The lamp is ${cm(LAMP[2] - Z.water)} cm above the water and the paper ${cm(drop)} cm below it, so the shadow is ${optics.magnification.toFixed(2)} times life size and the paper sits ${at16.focus.toFixed(2)} of a crest's focal length down at 16 Hz, ${at28.focus.toFixed(2)} at 28 Hz. Near the dippers, where the two waves add, the light passes through focus and every crest draws a sharp bright line, and the plain grey bands that break them are the nodal lines. A sloped foam beach inside the walls soaks up each wave before it can reflect. The damping here is clean water's viscosity alone, so these ripples carry farther than in a real tank, where a surface film calms them sooner.`;

const body = `<div class="rt">${k.plateHtml({
  fig: "Fig 3",
  title: "Ripple tank bench",
  hint: "Drag the knobs · ←→ f · ↑↓ spacing",
  readout: M.readoutOf(startState),
  keys: [
    { mark: "lit", label: "Two dippers, in phase: the sources" },
    { mark: "raised", label: "Tank on legs, bridge and vibrating bar" },
    { mark: "flat", label: `The paper, ${cm(drop)} cm down: the pattern ${optics.magnification.toFixed(2)}× life size` },
  ],
  caption,
  body: stage,
})}</div>`;

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const CSS = readFileSync(join(HERE, "ripple.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const page = k.pageHtml({ title: "Ripple tank bench", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + glScript() + MODEL + LIVE });
const name = theme === "light" ? "bench-light.html" : "bench.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${back.length + mid.length + front.length} layers`, `M ${optics.magnification.toFixed(3)} caustic ${optics.caustic.toFixed(2)} mm x16 ${at16.focus.toFixed(3)} x28 ${at28.focus.toFixed(3)}`);

