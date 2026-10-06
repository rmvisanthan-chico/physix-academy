import { Sims } from './sims-a.js';
/* PhysiX Academy - catalogue for the standalone HTML5 simulation set.
These are self-contained pages under /html5-sims/, not modules registered with
   Sims.register(), so they are listed here and opened as normal documents.
   Titles and blurbs are kept in step with html5-sims/index.html. */
'use strict';

window.Sims3D = [
  { f: 'orbit3d.html', i: 'ðŸª', t: 'Gravity Orbit 3D', d: 'Real two-body integration in a lit 3D scene. Drag the cyan handle to swing the velocity vector and re-shape the orbit live.', k: '3d' },
  { f: 'efield3d.html', i: 'âš¡', t: 'Electric Fields 3D', d: 'Field grid plus integrated streamlines between draggable charges, with a probe you drop into the field.', k: '3d' },
  { f: 'bfield.html', i: 'ðŸ§­', t: 'Charge in a B Field 3D', d: 'Helical path in a magnetic field. Set the angle to 0Â° for straight, 90Â° for a flat circle, anything between for a helix.', k: '3d' },
  { f: 'wave3d.html', i: 'ðŸŒŠ', t: 'Wave Surface 3D', d: 'A real water surface you can drag ripples into. Watch them reflect off the basin and interfere with the driven wave.', k: '3d' },
  { f: 'newton.html', i: 'ðŸ›’', t: 'Newton\'s Second Law 3D', d: 'A cart on a lit 3D track with all five forces drawn. Drag the cyan sphere to change the push, or drag the cart itself.', k: '3d' },
  { f: 'html5-sims/incline.html', i: 'ðŸ“', t: 'Inclined Plane 3D', d: 'Force decomposition on a 3D ramp. Includes the tanÎ¸ > Î¼ threshold where the block breaks free on its own.', k: '3d' },
  { f: 'html5-sims/collision2d.html', i: 'ðŸŽ±', t: '2D Collision Lab 3D', d: 'Two spheres on a frictionless plane. Drag either one to change the line of centres â€” that sets the scattering angle.', k: '3d' },
  { f: 'html5-sims/energy.html', i: 'ðŸŽ¢', t: 'Energy Conservation 3D', d: 'A ball rolling a 3D track, with live PE / KE / lost bars. The total never moves when friction is zero.', k: '3d' },
  { f: 'refraction.html', i: 'ðŸ”†', t: 'Refraction 3D', d: 'Snell\'s law with two real media, angle arcs, and total internal reflection past the critical angle.', k: '3d' },
  { f: 'lens.html', i: 'ðŸ”­', t: 'Converging Lens 3D', d: 'A glass lens traced with five rays. Move the object through f and 2f and watch the image change kind.', k: '3d' },
  { f: 'ncert10-mirror.html', i: 'ðŸªž', t: 'Spherical Mirror 3D', d: 'Concave and convex with true spherical reflection. Signs follow f < 0 for concave, as in the textbook.', k: '3d' },
  { f: 'ncert10-eye.html', i: 'ðŸ‘ï¸', t: 'Human Eye Defects 3D', d: 'Focus lands on the retina when the eye is right. Too strong is myopia, too weak is hypermetropia â€” and Auto-correct finds the lens.', k: '3d' },
  { f: 'thermo-engine.html', i: 'ðŸ”¥', t: 'Heat Engine Cycle 3D', d: 'A real Carnot cycle in a real cylinder. The four legs close properly, and the shaded PV loop is literally the work you get.', k: '3d' },
  { f: 'cooling.html', i: 'â„ï¸', t: 'Newtonâ€™s Cooling 3D', d: 'Exponential decay with a live marker on the curve. Move the room temperature and watch the half-life and the colour both shift.', k: '3d' },
  { f: 'ncert11-pv.html', i: 'ðŸ“ˆ', t: 'Brayton PV Cycle 3D', d: 'Work is the enclosed area, and the sim proves it: it integrates âˆ®P dV and checks it against Q(in) âˆ’ Q(out) live.', k: '3d' },
  { f: 'ktg-gas.html', i: 'ðŸ’¨', t: 'Kinetic Gas 3D', d: 'Molecules bounce off real walls and the pressure is nothing but summed impulse. It lands on NkT/V, and all three axes agree.', k: '3d' },
  { f: 'fluid.html', i: 'ðŸŒŠ', t: 'Fluid Particles 3D', d: 'A real pool: repulsion plus neighbour drag, grid-bucketed so 900 particles cost 5% of an O(nÂ²) pass.', k: '3d' },
  { f: 'atoms-bohr.html', i: 'âš›ï¸', t: 'Bohr Atom 3D', d: 'True nÂ² shells, each in its own orbital plane. Every spectral line is computed from Î» = hc/Î”E, not looked up.', k: '3d' },
  { f: 'standing.html', i: 'ã€°ï¸', t: 'Standing Waves 3D', d: 'A real string pinned at both ends. Only whole numbers of half-wavelengths fit â€” switch on the component waves to see why.', k: '3d' },
  { f: 'interference.html', i: 'ðŸŒ', t: 'Wave Interference 3D', d: 'Two sources on a real water surface. Click to move a probe; the verdict uses the actual path difference, not a lookup.', k: '3d' },
  { f: 'doppler.html', i: 'ðŸš‘', t: 'Doppler Effect 3D', d: 'Watch the emitted wavefronts pile up ahead of a moving source. The speed of sound never changes â€” only the spacing.', k: '3d' },
  { f: 'circuit.html', i: 'ðŸ”Œ', t: 'Ohm\'s Law Circuit 3D', d: 'A closed loop with a real battery, resistor and bulb. The graph is the straight line I = V/R, and IÂ²R = VI is checked live.', k: '3d' },
  { f: 'rc.html', i: 'ðŸ”‹', t: 'RC Circuit 3D', d: 'Charge piles onto the plates as the current fades. The panel checks the energy balance: source = heat + d(Â½CVÂ²)/dt.', k: '3d' },
  { f: 'induction.html', i: 'ðŸŒ€', t: 'Faraday\'s Induction 3D', d: 'EMF is zero when the magnet rests â€” and also zero at dead centre, where the flux is maximal. Watch the sign flip as it passes.', k: '3d' },
  { f: 'efield.html', i: 'ðŸ—ºï¸', t: 'Electric Field Mapper 3D', d: 'Equipotentials on a slice, with a probe. The check compares Coulomb\'s field against the numerical gradient of the plotted map.', k: '3d' },
  { f: 'kin1d.html', i: 'ðŸš—', t: '1-D Motion Lab 3D', d: 'A car on a road with distance markers, tracing x(t) and v(t) live. The panel tests vÂ² = uÂ² + 2ax every frame.', k: '3d' },
  { f: 'buoyancy.html', i: 'ðŸ›Ÿ', t: 'Buoyancy 3D', d: 'Five fluids, and a block that floats at exactly Ïb/Ïf submerged. Drag sideways; a dense one settles at terminal velocity.', k: '3d' },
  { f: 'ncert11-rotation.html', i: 'ðŸŒ€', t: 'Spinning Skater 3D', d: 'Arms in, spin up â€” L never changes but K jumps 6.6Ã—. That difference is the work your arms actually did.', k: '3d' },
  { f: 'ncert9-echo.html', i: 'ðŸ“¡', t: 'Echo & Sonar 3D', d: 'A pulse leaves, reflects off a wall and comes back. d = 34 m and v = 344 m/s means 198 ms â€” and the faint 1/(4dÂ²) return is why you only hear a faint echo.', k: '3d' },
  { f: 'ncert10-heating.html', i: 'ðŸ”Œ', t: 'Joule Heating 3D', d: 'P = VÂ²/R, energy = P Ã— t, and the bill at 3.6 MJ per kWh. A 1500 W kettle on 230 V draws 6.5 A, which is why it needs its own socket.', k: '3d' },
  { f: 'ncert11-solids.html', i: 'ðŸ§µ', t: 'Stressâ€“Strain 3D', d: 'A real rod to its true length. Steel yields at 250 MPa and necks; glass snaps at 0.05%; rubber is J-shaped. Only the area below the elastic limit comes back.', k: '3d' },
  { f: 'ncert11-measure.html', i: 'ðŸ“', t: 'Vernier Callipers 3D', d: 'Main scale plus vernier, least count 0.1 mm, with a zero error you have to subtract. Clamp the rod, find the coinciding mark.', k: '3d' },
  { f: 'ncert11-venturi.html', i: 'ðŸŽ¯', t: 'Venturi Meter 3D', d: 'Watch the particles pack into the throat, then read the mercury. All four of continuity, Bernoulli, the manometer and the discharge formula are checked live.', k: '3d' },
  { f: 'atwood.html', i: 'âš–ï¸', t: 'Atwood Machine', d: 'Two masses, one rope. Shows that tension is not mâ‚g, plus optional bearing friction.', k: '2d' },
  { f: 'orbit.html', i: 'ðŸ›°ï¸', t: 'Orbit Simulator', d: 'Real two-body integration. Launch speed decides circular, elliptical, escape or impact.', k: '2d' },
  { f: 'collision.html', i: 'ðŸŽ±', t: 'Collision Lab', d: 'Before/after momentum and kinetic energy tables, with a restitution slider.', k: '2d' },
  { f: 'projectile.html', i: 'ðŸŽ¯', t: 'Projectile Motion', d: 'Range, apex and flight time, with an optional quadratic air-drag model.', k: '2d' },
  { f: 'wave.html', i: 'ðŸŒŠ', t: 'Travelling Wave', d: 'Amplitude, frequency, wavelength and phase. A pinned particle shows the rope is not the traveller.', k: '2d' },
  { f: 'shm.html', i: 'â±ï¸', t: 'Spring-Mass SHM', d: 'x(t) with live kinetic/potential energy swap and an optional damper.', k: '2d' },
  { f: 'atom-3d.html', i: 'ðŸ§Š', t: '3D Atom (simple)', d: 'Rotatable WebGL version using the Three.js already vendored in js/vendor. No CDN.', k: '2d' }
];
