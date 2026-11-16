# Pendulum bench — concept + parts (written before any geometry)

## One-sentence object
A lab A-frame stand holding a rod-and-bob pendulum; turning the LENGTH knob rebuilds the rod, the ANGLE knob (or a click) re-releases it, and the dial reads the true period T = 2π√(l/g) with g = 9.81 m/s².

## Truth
- Physics: theta'' = -(g/Lw)·sin(theta), solved live in the page from `model.mjs` (single source of truth; same numbers drive rod, bob, dial and readout).
- Readout: L in metres, release angle, T from the formula (not from tracking swings), energy fraction E/E0 (conserved while swinging).
- Range: L 0.30–1.20 m (T 1.10–2.20 s), angle 10–80°.
- The period does NOT depend on the release angle (small-angle truth) — a slow drop and a wide drop time the same.

## Parts list (~44)
- Base: plate + halo, 4 feet (pad+bolt), top inset line, 4 corner screws, ruler strip + ticks, label plate w/ 3 rules.
- Structure: two A-legs, crossbar, pivot bearing housing + axle dot, counterweight block.
- Mechanism (live): rod (thick line, lit at release), bob — brass drum with centre dot + lit ring.
- Controls: RELEASE pedestal + lit button cap; LENGTH knob (knurled + pointer); ANGLE knob (knurled + pointer).
- Instrumentation: dial gauge (0.5–2.5 s range, needle = T), small brass protractor fan at the pivot with tick every 10°.
- Wiring: cable pedestal → pivot bearing (connector shells both ends).
