# Spring-damper bench — concept + parts

## One-sentence object
A lab bench where a brass mass block hangs on a coil spring with an oil dashpot in parallel; the MASS / STIFFNESS / DAMPING knobs rebuild the system, RELEASE pulls the mass down and lets go, and the dial reads the live displacement while the readout shows ζ and the damped period.

## Truth
- Physics: x'' = -(k·x + c·x')/m, solved live from `model.mjs` (single source of truth; same numbers drive spring, rod, plunger, dial and readout). x is displacement from equilibrium, positive downward.
- Readout: m in kg, k in N/m, damping ratio ζ = c / 2√(km), damped period Td = 2π/ωd with ωd = √(k/m − (c/2m)²) (0 = no longer oscillates), live x in mm.
- Ranges: m 0.2–1.0 kg, k 20–100 N/m, c 0–4 N·s/m; RELEASE always pulls x = 60 mm.
- ζ from the formula, never from counting overshoots. At ζ = 1 (critical, e.g. m 0.5 / k 40 / c 4) the overshoot disappears and the mass creeps back to rest.

## Parts list (~52)
- Base: plate + halo, 4 feet (pad+bolt), top inset line, 4 corner screws, ruler strip + ticks.
- Structure: two posts + caps, crossbar, hook stem + ring.
- Mechanism (live): hand-rolled vertical coil spring (r 7, 6.5 turns, back/front runs split on facing), brass mass block (the one lit part) with glow ring, rod down into the dashpot, plunger disc.
- Dashpot: base pad, C-shell wall (front 80° section cutaway so rod/oil/plunger stay visible), translucent oil disc whose surface is the oil level.
- Controls: RELEASE pedestal + lit button cap; MASS / STIFFNESS / DAMPING knobs (knurled + pointer).
- Instrumentation: dial gauge with −100…+100 mm scale, needle = live x; label text.
- Wiring: cable RELEASE → crossbar left end.

## Craft decisions
- The kit has no glass/alpha solid and no vertical coil — the spring is a hand-rolled helix split into back/front runs where the wire's facing flips; the dashpot wall is an `k.extrude` of a C-shaped annulus ring (arbitrary rings allowed), centred on the viewer-facing angle so the cutaway window faces bottom-left.
- Oil = translucent blue disc via className CSS overrides (`.iso-solid.oil`).
- Every line ends on a face/dot: rod terminates in dots at block bottom and plunger; spring leads rise through the hook ring; cable lands on the crossbar end.
- Painter's order: rod and plunger before the mass block; front spring coils after it.

## Live behaviour
- Tour loops 5 presets (underdamped → critically damped) every 2.4 s; any input stops the tour, 60 s idle restarts it.
- Pointer: drag a knob (44 px radius) to set its value, click anywhere else = RELEASE.
- Keys: Space/Enter release · ↑↓ stiffness · ←→ damping · Home c = 0 · End c = max.
- Reduced motion: physics still steps, tour disabled. Stops offscreen (IntersectionObserver).

## Verify
`line ends: 0` both themes · console clean · desktop + phone 390 both themes + 4× zooms of the dashpot and hook read as a real bench · `node spring-damper/build.mjs [--light]` rebuilds.
