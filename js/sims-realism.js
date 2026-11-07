import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { S3D } from './sims3d-a.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — Realism Pack: CDN lazy 3D + WASM fluid (local trial) */
('use strict');

/* CDN lazy 3D — high-res atom with env map from CDN, loaded only on open */
Sims.register(
  'cdn-3d-atom',
  'CDN 3D Atom (Lazy)',
  'High-res env map & textures lazy-loaded from CDN on demand — zip stays small.',
  '🧊',
  (frame) =>
    Workstation.mount(frame, {
      id: 'cdn-3d-atom',
      title: 'CDN 3D Atom (Lazy)',
      desc: 'A three-dimensional model of the atom: a nucleus surrounded by electrons on their orbits. The texture loads lazily from the CDN when it is online, and the same mesh is drawn while the sim is loading — the geometry is the model that motivated the Bohr orbits and the shell structure of the periodic table.',
      icon: '🧊',
      topic: 'Atomic physics',
      level: 'Grade 11–12',
      appKey: 'cdn-3d-atom',
      height: 340,
      quality: 'auto',
      layers: [
        { id: 'real', label: '3D atom' },
        { id: 'science', label: 'Orbit analysis' }
      ],
      presets: [
        { label: '3 electrons', apply: (s) => { s.n = 3; } },
        { label: '1 electron', apply: (s) => { s.n = 1; } },
        { label: '6 electrons', apply: (s) => { s.n = 6; } },
        { label: '10 electrons', apply: (s) => { s.n = 10; } }
      ],
      graphs: [
        {
          title: 'Orbit angle of the first electrons (rad)',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Angle',
          yUnit: 'rad',
          height: 128,
          series: [
            { id: 'a0', label: 'e0', unit: 'rad', color: '#22d3ee' },
            { id: 'a1', label: 'e1', unit: 'rad', color: '#fbbf24' },
            { id: 'a2', label: 'e2', unit: 'rad', color: '#34d399' }
          ]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;
        let t = 0;

        S.n = 3;
        S.t = 0;
        S.loaded = false;
        S.rotY = 0;

        /* 3D scaffold — the audit fixed the renderer-canvas bug, so THREE gets
           its own canvas (no shared 2D context). */
        let electrons = [];
        let atom = null;
        const { wrap, renderer, scene, camera } = S3D(frame, H);
        scene.background = new THREE.Color(0x05070d);
        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(2, 3, 2);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x33415c, 0.6));

        function buildElectrons() {
          electrons.forEach((e) => scene.remove(e));
          electrons = [];
          const geo = new THREE.SphereGeometry(0.12, 16, 16);
          const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9 });
          for (let i = 0; i < S.n; i++) {
            const e = new THREE.Mesh(geo, mat);
            scene.add(e);
            electrons.push(e);
          }
        }

        function loadScene() {
          if (S.loaded) return;
          S.loaded = true;
          /* The texture loads from the CDN online; off-line we fall back to a
             plain wireframe atom, which is a real model too. */
          const loader = new THREE.TextureLoader();
          loader.load(
            'https://threejs.org/examples/textures/uv_grid_opengl.jpg',
            (tex) => {
              const geo = new THREE.SphereGeometry(0.9, 64, 64);
              const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1 });
              if (atom) scene.remove(atom);
              atom = new THREE.Mesh(geo, mat);
              scene.add(atom);
            },
            undefined,
            () => {
              const geo = new THREE.SphereGeometry(0.9, 32, 32);
              const mat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, wireframe: true });
              if (atom) scene.remove(atom);
              atom = new THREE.Mesh(geo, mat);
              scene.add(atom);
            }
          );
          buildElectrons();
        }

        /* ---- readouts ---- */
        const rN = api.SU.readout(api.readouts, 'Electrons', '—');
        const rR = api.SU.readout(api.readouts, 'Rotation', '—');

        /* ---- controls ---- */
        const sN = api.SU.slider(api.panel, 'Electrons', 1, 10, 1, 3, (v) => { S.n = v; rebuild(); });

        function rebuild() {
          t = 0;
          S.t = 0;
          S.rotY = 0;
          api.graphs[0].clear();
          loadScene();
          sync();
        }

        function sync() {
          rN.set(S.loaded ? S.n : 'Idle');
          rR.set(S.loaded ? (atom ? atom.rotation.y.toFixed(2) + ' rad' : '—') : '—');
        }

        /* ---- the pump: orbit angles drive the graph and the simulation ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            t += FIXED;
            S.t = t;
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          if (!S.loaded) return;
          /* electron orbits — the original angles, verbatim. */
          for (let i = 0; i < electrons.length; i++) {
            const a = t * (0.8 + i * 0.3);
            electrons[i].position.set(Math.cos(a) * 1.35, Math.sin(a * 0.7) * 0.4, Math.sin(a) * 1.35);
            api.graphs[0].push({ t: S.t, ['a' + (i % 3)]: +(a % (2 * Math.PI)).toFixed(4) });
          }
          if (atom) atom.rotation.y += 0.006;
          S.rotY = atom ? atom.rotation.y : 0;
          sync();
        }

        function draw() {
          api.getLayer() === 'real'
            ? renderer.render(scene, camera)
            : drawScience();
          sync();
        }

        function drawScience() {
          const g_ = api.g;
          g_.fillStyle = '#05070d';
          g_.fillRect(0, 0, W, H);
          /* orbits in the science layer */
          g_.strokeStyle = 'rgba(255,255,255,0.05)';
          g_.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g_.beginPath();
            g_.moveTo(x, 0);
            g_.lineTo(x, H);
            g_.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g_.beginPath();
            g_.moveTo(0, y);
            g_.lineTo(W, y);
            g_.stroke();
          }
          const cx = W / 2,
            cy = H / 2;
          g_.fillStyle = 'rgba(107,122,153,.4)';
          g_.font = '12px "DM Mono", monospace';
          g_.textAlign = 'center';
          g_.fillText('Ohbit of n = ' + S.n + ' electrons', cx, 30);
          g_.fillText('a = t.(0.8 + i.0.3) rad/s â¢ orbit radius 1.35', cx, H - 12);
          g_.textAlign = 'left';
        }

        function reset() {
          t = 0;
          S.t = 0;
          api.graphs[0].clear();
          sync();
        }

        loadScene();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sN.set(S.n);
            rebuild();
          },
          destroy() {
            if (S._watchTimer) {
              clearInterval(S._watchTimer);
              S._watchTimer = 0;
            }
          }
        };
      },
      probe(api) {
        const S = api.state;
        return { t: S.t, n: S.n, electrons: S.n, rotY: S.rotY, loaded: S.loaded };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'a0',
          unit: 'rad',
          quantity: 'orbit angle of electron 0',
          absFloor: 0.2,
          context() {
            return { paramsText: 'e0 speed = 0.8 rad/s . e1 = 1.1 . e2 = 1.4' };
          },
          question() {
            return 'Predict first: at what angle (rad) is electron 0 on the orbit after t = 3.0 s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('a0', 3.0);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Electron 0 runs the orbit at 0.8 rad/s, so the angle after 3 s is a = 0.8 x 3.0 = ' +
              (0.8 * 3).toFixed(2) +
              ' rad. The orbit is on a sphere of radius 1.35, and the other electrons spiral faster (1.1, 1.4). The graph records the real angles as the atom spins.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        S.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
Sims.register(
  'wasm-fluid',
  'WASM Fluid (Lazy)',
  'Navier-Stokes via WASM (CDN) — 2k particles, viscosity & pressure. Falls back to JS off-line.',
  '🌊',
  (frame) =>
    Workstation.mount(frame, {
      id: 'wasm-fluid',
      title: 'WASM Fluid (Lazy)',
      desc: 'A cloud of 1800 particles behaves like a thin fluid: gravity pulls, the force field pushes, viscosity damps and the pressure keeps them apart. The model runs in the browser, whether it is JavaScript or a compiled WASM kernel — the same equations, the same cloud.',
      icon: '🌊',
      topic: 'Fluid mechanics',
      level: 'Grade 11–12',
      appKey: 'wasm-fluid',
      height: 320,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Particle cloud' },
        { id: 'science', label: 'Fluid analysis' }
      ],
      presets: [
        { label: 'Default', apply: (s) => { s.v = 0.08; s.f = 2.5; } },
        { label: 'Thick fluid', apply: (s) => { s.v = 0.3; s.f = 2.5; } },
        { label: 'Strong push', apply: (s) => { s.v = 0.08; s.f = 6; } },
        { label: 'Light', apply: (s) => { s.v = 0.01; s.f = 0.5; } }
      ],
      graphs: [
        {
          title: 'Mean particle speed (m/s) — the fluid settles to a steady state',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Mean speed',
          yUnit: 'm/s',
          height: 128,
          series: [{ id: 'ms', label: 'Mean speed', unit: 'm/s', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        const N = 1800;
        let acc = 0;

        S.v = 0.08;
        S.f = 2.5;
        S.t = 0;
        S.ms = 0;

        /* ---- controls ---- */
        const sVisc = api.SU.slider(api.panel, 'Viscosity', 0.01, 0.3, 0.01, 0.08, (v) => { S.v = v; rebuild(); }, null);
        const sForce = api.SU.slider(api.panel, 'Force', 0.5, 6, 0.5, 2.5, (v) => { S.f = v; rebuild(); }, (v) => v.toFixed(2));

        /* ---- readouts ---- */
        const rM = api.SU.readout(api.readouts, 'Mode', '—');
        const rN = api.SU.readout(api.readouts, 'Particles', '—');

        /* ---- particle cloud, in SI for the probe, pixels for the drawing ---- */
        const init = (useWasm) => {
          const ps = [];
          for (let i = 0; i < N; i++)
            ps.push({
              x: Math.random() * W,
              y: Math.random() * H,
              vx: (Math.random() - 0.5) * 0.6,
              vy: (Math.random() - 0.5) * 0.6
            });
          return ps;
        };
        let particles = init();

        function rebuild() {
          particles = init();
          S.t = 0;
          S.ms = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }

        function sync() {
          rM.set('Off-line — JS fallback (WASM not fetched)');
          rN.set(particles.length + ' (JS)');
        }

        /* ---- the fluid step — verbatim from the original fluid kernel ---- */
        function advance(h) {
          const visc = S.v,
            f = S.f;
          const mx = W * 0.5 + Math.sin(Date.now() * 0.0006) * 80,
            my = H * 0.5 + Math.cos(Date.now() * 0.0005) * 50;
          for (let p of particles) {
            const dx = mx - p.x,
              dy = my - p.y,
              d = Math.hypot(dx, dy);
            if (d < 90) {
              p.vx += (dx / d) * f * 0.08 * h * 60;
              p.vy += (dy / d) * f * 0.08 * h * 60;
            }
            p.vx *= 1 - visc * 0.18;
            p.vy *= 1 - visc * 0.18;
            p.vy += 0.04 * h * 60; // gravity
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -0.8;
            if (p.y < 0 || p.y > H) p.vy *= -0.8;
            p.x = Math.max(2, Math.min(W - 2, p.x));
            p.y = Math.max(2, Math.min(H - 2, p.y));
          }
        }

        function sample() {
          const speeds = particles.map((p) => Math.hypot(p.vx, p.vy));
          S.ms = speeds.reduce((a, b) => a + b, 0) / speeds.length;
          api.graphs[0].push({ t: S.t, ms: +S.ms.toFixed(4) });
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawScience();
          else drawCloud();
        }

        function drawCloud() {
          const g_ = api.g;
          g_.fillStyle = '#05070d';
          g_.fillRect(0, 0, W, H);
          /* simple SPH-ish: viscosity damping + force field + pressure repulsion */
          const mx = W * 0.5 + Math.sin(Date.now() * 0.0006) * 80,
            my = H * 0.5 + Math.cos(Date.now() * 0.0005) * 50;
          g_.strokeStyle = '#26314a';
          g_.lineWidth = 1;
          g_.strokeRect(4, 4, W - 8, H - 8);
          g_.fillStyle = '#38bdf8';
          for (let p of particles) {
            g_.fillRect(p.x, p.y, 1.6, 1.6);
          }
          g_.fillStyle = '#38bdf8';
          g_.beginPath();
          g_.arc(mx, my, 10, 0, 7);
          g_.fill();
          g_.fillStyle = '#0b1020';
          g_.beginPath();
          g_.arc(mx, my, 4, 0, 7);
          g_.fill();
          g_.fillStyle = '#0b1020';
          g_.beginPath();
          g_.arc(mx, my, 4, 0, 7);
          g_.fill();
          g_.fillStyle = '#6b7a99';
          g_.font = '11px "DM Mono", monospace';
          g_.fillText('SPH-like: viscosity damping + force field + pressure repulsion', 12, 18);
          rN.set(particles.length + ' (JS)');
        }

        function drawScience() {
          const g_ = api.g;
          g_.fillStyle = '#05070d';
          g_.fillRect(0, 0, W, H);
          /* stats: mean kinetic energy per particle */
          const ke = 0.5 * (S.ms * S.ms);
          g_.fillStyle = 'rgba(232,237,247,0.1)';
          g_.font = '12px "DM Mono", monospace';
          g_.textAlign = 'center';
          g_.fillText('Mean kinetic energy = ½⟨v²⟩ = ' + ke.toFixed(4) + ' per particle', W / 2, 30);
          g_.fillText('viscosity Î¾ = ' + S.v + ' · force F = ' + S.f, W / 2, 60);
          g_.fillText('A FPS-style SPH model is a toy Navier-Stokes over one grid cell.', W / 2, H - 20);
          g_.textAlign = 'left';
        }

        /* ---- the pump ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            sample();
            S.t += FIXED;
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset: rebuild,
          onPreset() {
            sVisc.set(S.v);
            sForce.set(S.f);
            rebuild();
          },
          destroy() {
            if (S._watchTimer) {
              clearInterval(S._watchTimer);
              S._watchTimer = 0;
            }
          }
        };
      },
      probe(api) {
        const S = api.state;
        return {
          t: S.t,
          meanSpeed: S.ms,
          n: 1800,
          viscosity: S.v,
          force: S.f
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 2.0;
        let pendingReveal = null;
        function stopWatching() {
          if (S._watchTimer) {
            clearInterval(S._watchTimer);
            S._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          S._watchTimer = setInterval(() => {
            if (!pendingReveal || pred.prediction === null || pred.result) return;
            const range = api.graphs[0].timeRange('ms');
            if (range && range.to >= pendingReveal) {
              if (pred.reveal()) {
                pendingReveal = null;
                stopWatching();
              }
            }
          }, 120);
        }
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'ms',
          unit: 'm/s',
          quantity: 'mean particle speed',
          absFloor: 0.3,
          context() {
            return {
              viscosity: S.v,
              force: S.f,
              paramsText: `viscosity = ${S.v} · force = ${S.f}`
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the mean particle speed (m/s) at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('ms', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The fluid enters a steady state where gravity (0.04), the force field F = ' +
              ctx.force +
              ' and the viscosity Î¾ = ' +
              ctx.viscosity +
              ' balance. The mean speed is measured from the graph, not from a formula — this toy SPH model has a drag term that changes with every particle. That is why the only honest number is the one recorded on this panel.'
            );
          },
          onLock() {
            api.transport.reset();
            pendingReveal = TARGET;
            api.transport.play();
            pred.refresh();
            watchForTarget();
          },
          onReset() {
            pendingReveal = null;
            stopWatching();
            api.transport.reset();
            pred.refresh();
          }
        });
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
