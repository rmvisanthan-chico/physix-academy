# Circuit bench — concept + parts

## One-sentence object
A lab plate carrying one series DC loop — battery, knife switch, slide rheostat, lamp, ammeter — with a voltmeter tapped across the lamp; the VOLTAGE and RESISTANCE knobs rebuild the loop, the switch (or Space) closes and opens it, and both meters plus the readout follow Ohm's law live.

## Truth
- Physics: I = V / (R_lamp + R) when the switch is closed, else 0, solved live from `model.mjs` (single source of truth; same numbers drive the coil glow, needles, lamp and readout).
- Readout: V in volts, R in ohms, I in amperes, lamp power P = I²·R_lamp in watts.
- Ranges: V 1.5–9.0 V (step 0.5), R 0–90 Ω (step 5), lamp filament R_lamp = 10 Ω, full-scale I_MAX = 0.9 A.
- The voltmeter reads across the lamp: V_L = I·R_lamp. Its leads tap the lamp terminals — not the battery.
- Open the switch and everything falls to zero: I = 0, lamp dark, both needles rest.

## Parts list (~48)
- Base: plate + halo, 4 feet (pad+bolt), top inset line, 4 corner screws, ruler strip + ticks.
- Battery: slab cell with + / − posts (dots at wire landings) and polarity marks.
- Switch: base, two clip posts, knife lever + tip dot (the one lit part when closed).
- Rheostat: ceramic core, 13-turn wire-wound helix (hand-rolled, back/front split on facing), end dots, carriage knob riding the winding (the moving part).
- Lamp: base disc, socket with brass knurl, two terminal nubs, glass bulb with warm glow halo + filament ring.
- Meters: ammeter (0–0.9 A) and voltmeter (0–9 V) — post, dial, knurl, radial ticks, labels, needle = live value; terminal nubs each.
- Controls: VOLTAGE / RESIST knobs (knurled + pointer).
- Wiring: red loop + battery → switch → rheostat → lamp → ammeter; blue return → − battery; faint voltmeter probe leads across the lamp.

## Craft decisions
- Wire endpoints == terminal dot coordinates exactly; the blue return wire is drawn BEFORE the meters because it passes behind the ammeter dial (painter's order beats depth testing).
- Voltmeter sits front-left of the lamp so its probe leads are short, low and outside the socket wall — no lead crosses the bulb face.
- The bulb is `lathe.sphereOf` (sphereOf lives in kit/lathe.mjs, not iso-kit); the coil is a horizontal helix with runs split where facing flips.
- The glow is a translucent warm ellipse + filament ring whose opacity follows the current — no shader needed for a lamp this size.
- Standalone dots (switch tip) carry an inline `style="fill:var(--anatomy-hi)"`; the singular `.iso-dot` class has no CSS of its own.

## Live behaviour
- Tour loops 5 presets ([6 V/20 Ω] → [9 V/0 Ω] → [4.5 V/40 Ω] → [3 V/80 Ω] → [6 V/20 Ω open]) every 2.4 s after a 1.6 s lead-in; any input stops it, 3.6 s idle restarts it.
- Pointer: click the switch (34 px) to toggle; drag a knob (44 px) to set it; click anywhere else toggles.
- Keys: Space/Enter toggle · ↑↓ voltage · ←→ resistance · Home R = 0 · End R = 90.
- Needles, lever, glow and carriage all ease toward their targets (dt-scaled exponentials).
- Reduced motion: physics still steps, tour disabled. Stops offscreen (IntersectionObserver).

## Verify
`line ends: 0` both themes · console clean · desktop + phone 390 both themes + 4× zooms of switch, lamp/voltmeter and battery junctions read as a real bench · open-switch state driven by a synthetic pointerdown shows lever up, needles at zero, glow off · `node circuit/build.mjs [--light]` rebuilds.
