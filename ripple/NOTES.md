# Ripple tank bench — concept + parts

## One-sentence object
A lab ripple tank: a glass-bottomed tank of water on four tall levelling legs above a paper screen, a strobe lamp on an arm from a post behind, a bridge carrying a vibrating bar on two coil springs shaken by a small motor with an eccentric, two point dippers touching the water; the FREQUENCY and SPACING knobs rebuild the two-source interference, and the paper shows the bright crest lines and grey nodal lines live.

## Truth
- Full water-wave dispersion ω² = (gk + σk³/ρ)·tanh(kh), from `model.mjs` (adapted verbatim from the anatomy example): 6 mm deep water, gravity + surface tension + finite depth.
- f 8–28 Hz, dipper spacing 20–80 mm; λ from a 60-step wavenumber bisection; group velocity numeric dω/dk; damping from clean water's viscosity alone.
- Nodal lines N = 2·⌊d/λ + ½⌋; the strobe beats 0.75 Hz slower than the dippers, so each wave seems to crawl outward — honest slow motion.
- Optics (ours): lamp 280 mm above the water, paper 108.75 mm below it → shadow 1.636× life size, caustic 21.55 mm, paper sits 0.281 (16 Hz) to 0.447 (28 Hz) of a crest's focal length down.
- Single source of truth: `model.mjs` drives the readout, aria words, the SVG fallback pattern, the dipper bob, and the shader uniforms.

## Parts (~190 marks; 188 layer entries)
- Base: plate + halo, 6 feet, inset line, 4 corner screws, side ticks, ruler strip + ticks, RIPPLE TANK label plate, paper screen + 4 tape corners.
- Tank: 4 rails, 4 corner posts, 4 glass walls (far pair mid-layer, near pair front-layer), foam beach shell, water slab.
- Bridge: 2 pillars + screws, 2 coil springs (runs split by facing), vibrating bar with ticks + centre mark, motor (lathe stator, rotor, eccentric cam), 2 point dippers (sphere + stem + clamp + screw).
- Lamp: post + foot + collar, arm, stem, shade (solid + ribs + dots), two cables (fillet tubes split back/mid/front by depth).
- Controls: FREQUENCY + SPACING knobs (pedestal, knurled cap, live pointer path `kptr_FREQ`/`kptr_SPAC`) on the back band right of the tank; plug + cable clips down to the left leg.

## Craft decisions
- Five-layer stack: back SVG → paper GL canvas → mid SVG → water GL canvas → front SVG; the GL canvases sit mid-stack so the SVG parts occlude the shader exactly as the geometry demands.
- The shaders are adapted unchanged from `examples/ripple-tank` (16-bit packed wave history, per-sample group speed, caustic map); only the uniforms and geometry are ours.
- The knobs sit on the plate's back band RIGHT of the bridge: at x −115 the FREQUENCY knob hid behind the tank's far-left corner-post cluster (verified at 6× with the front layer hidden); moved to x −15 / +45 both stay clear, poking above the far rim's silhouette.
- The motor's eccentric is a single disc: with motorLength 13 mm the example's two-disc spacer arithmetic no longer fit, so the 0.9 mm spacer was dropped.
- Far glass walls are 4 mm thick like the example (first written 2.8, fixed during the build).
- `touch-action: none` on the stage so knob drags work on touch; live.js uses bare kit globals (kitScript inlines exports stripped).
- Painter's order beats depth: mid-layer pieces paint after the knobs where they truly stand in front; the knobs' screen region clears the water canvas (their projection sits above the water's top edge).

## Live behaviour
- Tour sweeps f = 17 + 8.5·sin(2πt/28 − 0.3), d = 50 + 25·sin(2πt/16 + 0.2) after a 1.4 s lead-in; any drag or key stops it; 3.6 s idle restarts it.
- Pointer: drag a knob (34 px hit, nearest wins) — vertical drag, full sweep over 150 px, tour-safe.
- Keys: ← → frequency ±0.5 (Shift ±2) · ↑ ↓ spacing ±2 (Shift ±10) · Home/End frequency extremes.
- Wave phase advances at the strobe beat; the lamp fades in over 0.9 s after 0.15 s (reduced motion → on at once); the settled state stops rAF; offscreen stops; the eccentric cam marker rides the phase.
- Announce (`.rt-said`): frequency, wavelength, dipper spacing, nodal-line count.

## Verify
- `line ends: 0` of 792 both themes · console clean in every run.
- GL probe: data-gl present, canvas 602×392, rt-water SVG opacity 0 once lit · `--rt-lamp` reaches exactly 1.000 under 20× slow motion (smooth ramp, no pops).
- Reduced motion: readout frozen at start values, tour off, still frame read.
- `--no-webgl` both themes: data-gl absent, nodal + crest SVG fallback paths drawn, shots read.
- Desktop + phone 390 both themes + 4× zooms (water sheen, paper glow with leg shadows, both knobs, rim/label/leg corner) read.
- Drag + keys re-verified at final knob positions (f 21.9 → 24.8, spacing 6.2 → 6.4, tour held).
- `node ripple/build.mjs [--light]` rebuilds both themes (405 KB each).
