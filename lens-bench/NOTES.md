# Lens bench — concept + parts (written before any geometry)

## One-sentence object
An optical rail holding a convex lens on a stand; sliding the object arrow (DIST knob) and swapping the lens (F knob) re-solves the thin-lens equation live: 1/f = 1/do + 1/di, m = −di/do — rays drawn true through the focal points.

## Truth
- Physics: `lensModel` in `model.mjs`; di from the formula (negative = virtual, drawn dashed on the same side), magnification from −di/do. Readout shows do, di, m, and real/virtual + upright/inverted.
- Range: object do 8–50 bench units, f 10–30 units, lens centred at x=0.
- Three principal rays: parallel → through far focal point; through centre (undeviated); through near focal → parallel. All three drawn from the object tip each frame.

## Parts list (~46)
- Base: plate + halo, 4 feet (pad+bolt), top inset line, 4 corner screws, ruler strip + ticks, label plate w/ 3 rules.
- Rail: two rail bars, end stops with bolts, metre ruler strip with cm ticks + numbers.
- Lens: stand post + base, lens slab (convex highlight), brass rim rings, optical axis line (faint).
- Object: arrow plate + head (lit), carriage block on the rail.
- Screen: screen board + stand, image arrow (lit when real, dashed when virtual).
- Controls: DIST knob (object position); F knob (focal length); both knurled + pointers.
- Instrumentation: range dial showing magnification (|m| 0–4), focal tick marks F both sides.
- Rays: three thin ray lines (data-part, rebuilt per frame, tone-conserving fade).
