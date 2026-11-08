import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — True-3D simulations A: gravity orbit + wave surface.
 *
 * sim-transform Phase D batch 8: the shared S3D bootstrap stays byte-for-byte
 * compatible because js/sims-realism.js imports it; the drag helper gains a
 * destroy() that unbinds its window listeners so a re-mounted bench never
 * double-fires drag deltas; S3Dstage mounts a WebGL scene into the workstation
 * stage's .sim-canvas-wrap alongside the 2D instrument canvas.
 *
 * The physics is the original bench's, unchanged: Kepler orbit
 * r = a(1−e²)/(1+e·cosθ) with θ̇ = 13/r² · (time warp) and the vis-viva
 * readout v = √(20(2/r − 1/a)) (a = 4.4 AU); the wave surface
 * y = A·sin(kx − ωt)·e^(−|z|/14) with k = 2π/λ and ω = 2πf. */
('use strict');

/* ---------- shared WebGL bootstrap (verbatim — sims-realism.js imports S3D) -- */
export function S3D(frame, h) {
  const wrap = SU.el('div', 'sim-canvas-wrap');
  frame.appendChild(wrap);
  const W = Math.max(300, frame.clientWidth || 640);
  const H = h || 300;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  return { wrap, renderer, scene, camera };
}

/* ---------- drag helper ----------
   Pointer handling is verbatim: horizontal drag yaws 0.007 rad/px, vertical
   drag pitches clamped to ±1.4 rad, and update() eases the rig 9% per frame
   toward the commanded pose. destroy() is new for the workstation transforms:
   the two window-level listeners must leave with the bench, or a re-mounted
   scene would keep steering a detached rig. */
export function S3Ddrag(dragTarget, dom, camRig) {
  let tx = 0.5,
    ty = 0.35,
    drag = false,
    lx = 0,
    ly = 0;
  const move = (e) => {
    if (!drag) return;
    ty += (e.clientX - lx) * 0.007;
    tx += (e.clientY - ly) * 0.007;
    tx = Math.max(-1.4, Math.min(1.4, tx));
    lx = e.clientX;
    ly = e.clientY;
  };
  const up = () => (drag = false);
  dom.addEventListener('pointerdown', (e) => {
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
  });
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  return {
    update() {
      dragTarget.rotation.y += (ty - dragTarget.rotation.y) * 0.09;
      if (camRig) dragTarget.rotation.x += (tx - dragTarget.rotation.x) * 0.09;
    },
    get dragging() {
      return drag;
    },
    destroy() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
  };
}

/* ---------- stage: mount a WebGL scene in the workstation viewport ----------
   The workstation already hosts a 2D instrument canvas inside
   .sim-canvas-wrap (api.cv). S3Dstage builds the renderer at the same box and
   appends the GL canvas as its sibling; layer switching shows exactly one of
   the pair by toggling display:none, which keeps both elements connected so
   the SU.loop pump keeps running on route-agnostic pauses. The background is
   set opaque here (the original S3D leaned on CSS behind a transparent
   canvas) so the realistic layer fully owns its wrap. */
export function S3Dstage(api, h) {
  const W = Math.max(300, api.W || 640);
  const H = h || 300;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  (api.cv.parentElement || api.cv).appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b16);
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  return { wrap: api.cv.parentElement, renderer, scene, camera };
}

/* ---------------- Gravity orbit (Kepler) in 3D ---------------- */
Sims.register(
  'orbit3d',
  'Gravity Orbit — 3D',
  'Drag to tilt. Faster at perihelion — Kepler in action.',
  '🪐',
  (frame) =>
    Workstation.mount(frame, {
      id: 'orbit3d',
      title: 'Gravity Orbit — 3D',
      desc:
        'Transfer-orbit operations at real mission desks: a spacecraft lowering its apoapsis trades altitude for speed, ' +
        'and the same trade is why an elliptical approach window is small and sharp. Kepler I puts the focus at the barycentre; ' +
        'Kepler II is visible as the planet sweeping its fastest through perihelion. The speed-vs-radius curve below is real ' +
        'bench data from the vis-viva law, the same closing calculation flown in orbit-insertion checkouts.',
      icon: '🪐',
      topic: 'Gravity & orbits',
      level: 'Grade 11–12',
      appKey: 'orbit3d',
      height: 320,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Orbit theatre' },
        { id: 'science', label: 'Orbital analysis' }
      ],
      presets: [
        {
          label: 'Circular patrol',
          apply: (s) => {
            s.e = 0;
            s.warp = 1;
          }
        },
        {
          label: 'Mercury ellipse',
          apply: (s) => {
            s.e = 0.2;
            s.warp = 1;
          }
        },
        {
          label: 'Comet flyby',
          apply: (s) => {
            s.e = 0.7;
            s.warp = 1;
          }
        },
        {
          label: 'Fast survey',
          apply: (s) => {
            s.e = 0.45;
            s.warp = 3;
          }
        }
      ],
      graphs: [
        {
          title: 'Orbit radius vs sim time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'r',
          yUnit: 'AU',
          height: 128,
          capacity: 900,
          series: [{ id: 'r', label: 'r', unit: 'AU', color: '#22d3ee' }]
        },
        {
          title: 'Vis-viva law — v = √(20(2/r − 1/a)), a = 4.4 AU',
          xLabel: 'Distance r',
          xUnit: 'AU',
          xKey: 'r',
          yLabel: 'v',
          yUnit: 'u/s',
          height: 128,
          series: [{ id: 'v', label: 'v', unit: 'u/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const { renderer, scene, camera } = S3Dstage(api, 320);
        camera.position.set(0, 4.5, 10);
        scene.add(new THREE.AmbientLight(0x8899bb, 0.5));
        const sunL = new THREE.PointLight(0xfbbf24, 2.4, 80);
        scene.add(sunL);

        const rig = new THREE.Group();
        rig.rotation.x = 0.45;
        scene.add(rig);
        const sys = new THREE.Group();
        rig.add(sys);

        const sun = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 32, 32),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        sys.add(sun);

        const gc = document.createElement('canvas');
        gc.width = gc.height = 128;
        const gg = gc.getContext('2d');
        const grd = gg.createRadialGradient(64, 64, 4, 64, 64, 64);
        grd.addColorStop(0, 'rgba(251,191,36,.8)');
        grd.addColorStop(1, 'rgba(251,191,36,0)');
        gg.fillStyle = grd;
        gg.fillRect(0, 0, 128, 128);
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(gc),
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        glow.scale.set(3.6, 3.6, 1);
        sys.add(glow);

        const planet = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 24, 24),
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            roughness: 0.3,
            metalness: 0.4,
            emissive: 0x22d3ee,
            emissiveIntensity: 0.25
          })
        );
        sys.add(planet);

        const starGeo = new THREE.BufferGeometry();
        const NP = 350,
          pp = new Float32Array(NP * 3);
        for (let i = 0; i < NP; i++) {
          const rr = 16 + Math.random() * 16,
            th = Math.random() * 6.283,
            ph = Math.acos(2 * Math.random() - 1);
          pp[i * 3] = rr * Math.sin(ph) * Math.cos(th);
          pp[i * 3 + 1] = rr * Math.cos(ph);
          pp[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
        sys.add(
          new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({ color: 0x9aa8c3, size: 0.06, transparent: true, opacity: 0.7 })
          )
        );

        const TRAIL = 500,
          tp = new Float32Array(TRAIL * 3);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3));
        trailGeo.setDrawRange(0, 0);
        sys.add(
          new THREE.Line(
            trailGeo,
            new THREE.LineBasicMaterial({ color: 0x6d5df6, transparent: true, opacity: 0.85 })
          )
        );

        /* ---- controls + readouts (sidebar) ---- */
        const EC = api.SU.slider(api.panel, 'Eccentricity e', 0, 0.75, 0.01, 0.45, () => {
          n = 0;
          trailGeo.setDrawRange(0, 0);
        });
        const SP = api.SU.slider(
          api.panel,
          'Time warp',
          0.1,
          3,
          0.05,
          1,
          () => {},
          (v) => v.toFixed(2) + '×'
        );
        /* Read back what the snapped range inputs actually carry so presets
           and the probe never disagree with the control row. */
        S.e = EC.get();
        S.warp = SP.get();
        S._ec = EC;
        S._sp = SP;
        const rR = api.SU.readout(api.readouts, 'Distance r');
        const vV = api.SU.readout(api.readouts, 'Speed v');

        let th = 0,
          n = 0;
        const P = { r: 0, v: 0, th: 0 };
        S._P = P;

        const cv2 = api.cv;
        const glc = renderer.domElement;
        function showGL(on) {
          glc.style.display = on ? '' : 'none';
          cv2.style.display = on ? 'none' : '';
        }
        showGL(true); /* the realistic apparatus is the opening layer */

        /* ---- static sweep: the vis-viva curve is a pure function of r for
           the fixed a = 4.4 AU, so it is data the bench itself publishes —
           the POR panel reads the r = 3.00 AU sample. Rebuilt on reset
           because transport.reset() clears every graph first. */
        function sweep() {
          const G1 = api.graphs[1];
          if (!G1) return;
          G1.clear();
          for (let i = 0; i <= 140; i++) {
            const r = +(1 + i * 0.05).toFixed(2);
            G1.push({ r, v: Math.sqrt(20 * (2 / r - 1 / 4.4)) });
          }
        }

        /* ---- science layer: the same ellipse as an analytical chart ---- */
        function drawScience() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }

          const e = EC.get(),
            a = 4.4;
          const peri = a * (1 - e),
            apo = a * (1 + e);
          const cx = W / 2,
            cy = H / 2,
            sc = Math.min(W / 2 - 56, H / 2 - 42) / (apo * 1.02);

          /* the conic: r(θ) plotted as an ellipse about the focus */
          g.strokeStyle = 'rgba(109,93,246,0.85)';
          g.lineWidth = 2;
          g.beginPath();
          for (let s2 = 0; s2 <= 128; s2++) {
            const ta = (s2 / 128) * Math.PI * 2;
            const rr = (a * (1 - e * e)) / (1 + e * Math.cos(ta));
            const xx = cx + rr * Math.cos(ta) * sc,
              yy = cy - rr * Math.sin(ta) * sc;
            if (s2 === 0) g.moveTo(xx, yy);
            else g.lineTo(xx, yy);
          }
          g.closePath();
          g.stroke();

          /* focus + apsides */
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(cx, cy, 7, 0, 7);
          g.fill();
          api.pxLabel(g, cx + 12, cy + 18, 'focus (barycentre)', 'rgba(251,191,36,0.95)');
          g.strokeStyle = 'rgba(34,211,238,0.9)';
          g.beginPath();
          g.moveTo(cx + peri * sc, cy - 8);
          g.lineTo(cx + peri * sc, cy + 8);
          g.stroke();
          api.pxLabel(g, cx + peri * sc - 26, cy - 18, 'perihelion ' + peri.toFixed(2) + ' AU', 'rgba(34,211,238,0.95)');
          g.strokeStyle = 'rgba(154,168,195,0.6)';
          g.beginPath();
          g.moveTo(cx - apo * sc, cy - 8);
          g.lineTo(cx - apo * sc, cy + 8);
          g.stroke();
          api.pxLabel(g, cx - apo * sc - 20, cy + 32, 'aphelion ' + apo.toFixed(2) + ' AU', 'rgba(154,168,195,0.95)');

          /* current true anomaly */
          const rr2 = (a * (1 - e * e)) / (1 + e * Math.cos(P.th));
          const px = cx + rr2 * Math.cos(P.th) * sc,
            py = cy - rr2 * Math.sin(P.th) * sc;
          g.strokeStyle = 'rgba(34,211,238,0.35)';
          g.setLineDash([3, 4]);
          g.beginPath();
          g.moveTo(cx, cy);
          g.lineTo(px, py);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(px, py, 5, 0, 7);
          g.fill();

          api.pxLabel(g, 20, 22, 'KEPLER TRANSFER GEOMETRY', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, H - 52, 'e = ' + e.toFixed(2) + ' · a = ' + a.toFixed(1) + ' AU · θ = ' + P.th.toFixed(2) + ' rad', 'rgba(154,168,195,0.95)');
          api.pxLabel(g, 20, H - 30, 'r = ' + P.r.toFixed(2) + ' AU · v = √(20(2/r − 1/a)) = ' + P.v.toFixed(2) + ' u/s', 'rgba(34,211,238,0.95)');
        }

        /* ---- pump ---- */
        function update(dt, tS) {
          /* the original bench clamped dt to 0.05 s before integrating, so
             the workspace keeps the clamp — same clause, new clock. */
          const d = Math.min(dt, 0.05);
          const a = 4.4,
            e = EC.get();
          const r = (a * (1 - e * e)) / (1 + e * Math.cos(th));
          th += (13 / (r * r)) * d * SP.get();
          const nr = (a * (1 - e * e)) / (1 + e * Math.cos(th));
          planet.position.set(nr * Math.cos(th), 0, nr * Math.sin(th));
          if (n < TRAIL) {
            tp[n * 3] = planet.position.x;
            tp[n * 3 + 1] = 0;
            tp[n * 3 + 2] = planet.position.z;
            n++;
            trailGeo.setDrawRange(0, n);
          }
          trailGeo.attributes.position.needsUpdate = true;
          P.r = nr;
          P.v = Math.sqrt(20 * (2 / nr - 1 / a));
          P.th = th;
          if (api.graphs[0]) api.graphs[0].push({ t: tS, r: nr });
          rR.set(nr.toFixed(2) + ' AU');
          vV.set(P.v.toFixed(2) + ' u/s');
          drag.update();
        }

        function draw() {
          renderer.render(scene, camera);
          if (api.getLayer() === 'science') drawScience();
        }

        function reset() {
          th = 0;
          n = 0;
          trailGeo.setDrawRange(0, 0);
          const e = EC.get();
          const r0 = (4.4 * (1 - e * e)) / (1 + e);
          planet.position.set(r0, 0, 0);
          P.r = r0;
          P.v = Math.sqrt(20 * (2 / r0 - 1 / 4.4));
          P.th = 0;
          sweep();
          if (api.graphs[0]) api.graphs[0].clear();
          rR.set(r0.toFixed(2) + ' AU');
          vV.set(P.v.toFixed(2) + ' u/s');
        }

        /* re-sync the sliders from a preset's state object; set() does not
           fire oninput, so the trail reset is replayed here too */
        function onPreset() {
          EC.set(S.e);
          SP.set(S.warp);
          n = 0;
          trailGeo.setDrawRange(0, 0);
          reset();
        }

        reset();

        const drag = S3Ddrag(rig, glc, true);

        return {
          update,
          draw,
          reset,
          onLayer(id) {
            showGL(id === 'real');
          },
          onPreset,
          destroy() {
            drag.destroy();
            renderer.dispose();
          }
        };
      },
      probe(api) {
        const S = api.state;
        return {
          t: api.transport.time(),
          e: S._ec ? S._ec.get() : null,
          r: S._P ? S._P.r : null,
          v: S._P ? S._P.v : null,
          th: S._P ? S._P.th : null,
          state: {
            x: S._P ? S._P.r * Math.cos(S._P.th) : null,
            z: S._P ? S._P.r * Math.sin(S._P.th) : null
          }
        };
      },
      predict(api) {
        const EC = api.state._ec;
        const pred = createPrediction(api.por, {
          graph: api.graphs[1],
          series: 'v',
          unit: 'u/s',
          quantity: 'orbital speed at r = 3.00 AU',
          absFloor: 0.3,
          rel: 0.08,
          context() {
            const e = EC ? EC.get() : null;
            return { e, paramsText: 'e = ' + (e != null ? e.toFixed(2) : '—') + ' · a = 4.4 AU' };
          },
          question() {
            return 'Predict first: on the vis-viva sweep, how fast is the satellite moving at r = 3.00 AU?';
          },
          observe() {
            const hit = api.graphs[1].valueAt('v', 3);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Energy conservation on the orbit gives the vis-viva law v = √(20(2/r − 1/a)); with a = 4.4 AU it reads ' +
              'v = √(20(2/3 − 1/4.4)) = ' +
              r.observed.toFixed(2) +
              ' u/s at r = 3.00 AU (e = ' +
              (ctx.e != null ? ctx.e.toFixed(2) : '—') +
              '). A spacecraft on this conic has no engine burning: gravity does the trade, fastening through ' +
              'perihelion and easing toward aphelion exactly as the sweep shows.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);

/* ---------------- Wave surface (y = A sin(kx−ωt)) in 3D ---------------- */
Sims.register(
  'wave3d',
  'Wave Surface — 3D',
  'A travelling wave you can orbit around.',
  '🌊',
  (frame) =>
    Workstation.mount(frame, {
      id: 'wave3d',
      title: 'Wave Surface — 3D',
      desc:
        'Coastal and offshore engineers tow model hulls in exactly this: a wave basin. The surface is the travelling ' +
        'profile y = A·sin(kx − ωt), damped toward the far shore with the same e-fold the basin walls impose. Its crests ' +
        'advance at the phase speed v = f·λ — the shakedown number read off the sweep below, and the number that decides ' +
        'how far open water moves a warning time after a storm.',
      icon: '🌊',
      topic: 'Waves',
      level: 'Grade 9–12',
      appKey: 'wave3d',
      height: 320,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Wave basin' },
        { id: 'science', label: 'Waveform analysis' }
      ],
      presets: [
        {
          label: 'Harbour swell',
          apply: (s) => {
            s.A = 0.8;
            s.f = 0.4;
            s.wl = 8;
          }
        },
        {
          label: 'Lab ripple tank',
          apply: (s) => {
            s.A = 0.4;
            s.f = 1.5;
            s.wl = 2.5;
          }
        },
        {
          label: 'Storm chop',
          apply: (s) => {
            s.A = 1.6;
            s.f = 2;
            s.wl = 1.5;
          }
        },
        {
          label: 'Tidal slow mode',
          apply: (s) => {
            s.A = 1;
            s.f = 0.2;
            s.wl = 6;
          }
        }
      ],
      graphs: [
        {
          title: 'Surface elevation at the gauge (x≈0, z=0) vs sim time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'y',
          yUnit: 'm',
          height: 128,
          series: [{ id: 'y', label: 'elevation', unit: 'm', color: '#22d3ee' }]
        },
        {
          title: 'Phase speed — v = f·λ',
          xLabel: 'Frequency f',
          xUnit: 'Hz',
          xKey: 'f',
          yLabel: 'v',
          yUnit: 'm/s',
          height: 128,
          series: [{ id: 'v', label: 'v', unit: 'm/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const { renderer, scene, camera } = S3Dstage(api, 320);
        camera.position.set(0, 6.5, 11);
        camera.lookAt(0, 0, 0);

        const rig = new THREE.Group();
        rig.rotation.x = 0;
        scene.add(rig);
        const SEGX = 72,
          SEGZ = 44;
        const geo = new THREE.PlaneGeometry(16, 10, SEGX, SEGZ);
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            wireframe: true,
            transparent: true,
            opacity: 0.75
          })
        );
        mesh.rotation.x = -Math.PI / 2;
        rig.add(mesh);

        /* ---- controls + readouts (sidebar) ---- */
        const AM = api.SU.slider(
          api.panel,
          'Amplitude A',
          0.1,
          1.6,
          0.05,
          0.8,
          () => {},
          (v) => v.toFixed(2)
        );
        const FR = api.SU.slider(api.panel, 'Frequency f (Hz)', 0.2, 2.5, 0.05, 0.8, () => {});
        const WL = api.SU.slider(
          api.panel,
          'Wavelength λ',
          1.5,
          8,
          0.1,
          4,
          () => {
            sweep();
            if (S.onParam) S.onParam();
          },
          (v) => v.toFixed(1)
        );
        S.A = AM.get();
        S.f = FR.get();
        S.wl = WL.get();
        S._am = AM;
        S._fr = FR;
        S._wl = WL;
        const rV = api.SU.readout(api.readouts, 'Wave speed v = fλ');

        const posA = geo.attributes.position;
        /* the vertex nearest (0,0) is the fixed gauge the live series records */
        let idx = 0,
          best = Infinity;
        for (let i = 0; i < posA.count; i++) {
          const dd = posA.getX(i) * posA.getX(i) + posA.getY(i) * posA.getY(i);
          if (dd < best) {
            best = dd;
            idx = i;
          }
        }
        S._y = () => posA.getZ(idx);

        const cv2 = api.cv;
        const glc = renderer.domElement;
        function showGL(on) {
          glc.style.display = on ? '' : 'none';
          cv2.style.display = on ? 'none' : '';
        }
        showGL(true);

        /* ---- static sweep: phase speed against generator frequency at the
           live wavelength; rebuilt on reset, λ change and preset load ---- */
        function sweep() {
          const G1 = api.graphs[1];
          if (!G1) return;
          const wl = WL.get();
          G1.clear();
          for (let i = 0; i <= 46; i++) {
            const f = +(0.2 + i * 0.05).toFixed(2);
            G1.push({ f, v: f * wl });
          }
        }

        /* ---- science layer: the cross-section the gauge sits in ---- */
        function drawScience() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }

          const A = AM.get(),
            f = FR.get(),
            wl = WL.get();
          const k = (2 * Math.PI) / wl,
            om = 2 * Math.PI * f;
          const x0 = 46,
            sx = (W - x0 - 26) / 16,
            cy = H / 2,
            sy = (H / 2 - 40) / 1.9;

          /* still-water line + ±A envelope */
          g.strokeStyle = 'rgba(154,168,195,0.4)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(x0, cy);
          g.lineTo(x0 + 16 * sx, cy);
          g.stroke();
          for (const sgn of [-1, 1]) {
            g.strokeStyle = 'rgba(251,191,36,0.55)';
            g.beginPath();
            g.moveTo(x0, cy - sgn * A * sy);
            g.lineTo(x0 + 16 * sx, cy - sgn * A * sy);
            g.stroke();
          }
          g.setLineDash([]);

          /* the travelling profile y(x, t) at the gauge plane z = 0 */
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2;
          g.beginPath();
          for (let i = 0; i <= 200; i++) {
            const x = -8 + i * 0.08;
            const y = A * Math.sin(k * x - om * tt);
            const xx = x0 + (x + 8) * sx,
              yy = cy - y * sy;
            if (i === 0) g.moveTo(xx, yy);
            else g.lineTo(xx, yy);
          }
          g.stroke();
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(x0 + 8 * sx, cy - A * Math.sin(-om * tt) * sy, 4, 0, 7);
          g.fill();

          api.pxLabel(g, 20, 22, 'WAVE PROFILE AT THE GAUGE (z = 0)', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'y = A·sin(kx − ωt) · k = 2π/λ = ' + k.toFixed(2) + ' · ω = 2πf = ' + om.toFixed(2) + ' rad/s', 'rgba(34,211,238,0.95)');
          api.pxLabel(g, 20, H - 30, 'A = ' + A.toFixed(2) + ' m · λ = ' + wl.toFixed(1) + ' m · f = ' + f.toFixed(2) + ' Hz → v = f·λ = ' + (f * wl).toFixed(2) + ' m/s', 'rgba(251,191,36,0.95)');
        }

        /* ---- pump ---- */
        let tt = 0;
        function update(dt, tS) {
          /* original clamp kept: the basin never integrates a frame larger
             than 0.05 s of sim time, exactly as the source bench did. */
          const d = Math.min(dt, 0.05);
          tt += d;
          const A = AM.get(),
            f = FR.get(),
            wl = WL.get();
          const k = (2 * Math.PI) / wl,
            om = 2 * Math.PI * f;
          for (let i = 0; i < posA.count; i++) {
            const x = posA.getX(i),
              z = posA.getY(i);
            posA.setZ(i, A * Math.sin(k * x - om * tt) * Math.exp(-Math.abs(z) / 14));
          }
          posA.needsUpdate = true;
          if (api.graphs[0]) api.graphs[0].push({ t: tS, y: posA.getZ(idx) });
          /* BUG FIX (pre-existing): the readout's own label says v = fλ, but
             the value it printed was (f·λ)/2 — the round-trip SONAR ratio
             applied to a one-way wave. Phase speed here is f·λ. */
          rV.set((f * wl).toFixed(2) + ' m/s');
          if (!drag.dragging) rig.rotation.y += d * 0.12;
          drag.update();
        }

        function draw() {
          renderer.render(scene, camera);
          if (api.getLayer() === 'science') drawScience();
        }

        function reset() {
          tt = 0;
          const A = AM.get(),
            f = FR.get(),
            wl = WL.get();
          const k = (2 * Math.PI) / wl,
            om = 2 * Math.PI * f;
          for (let i = 0; i < posA.count; i++) {
            const x = posA.getX(i),
              z = posA.getY(i);
            posA.setZ(i, A * Math.sin(k * x - om * tt) * Math.exp(-Math.abs(z) / 14));
          }
          posA.needsUpdate = true;
          sweep();
          if (api.graphs[0]) api.graphs[0].clear();
          rV.set((f * wl).toFixed(2) + ' m/s');
        }

        function onPreset() {
          AM.set(S.A);
          FR.set(S.f);
          WL.set(S.wl);
          reset();
        }

        reset();

        const drag = S3Ddrag(rig, glc, true);

        return {
          update,
          draw,
          reset,
          onLayer(id) {
            showGL(id === 'real');
          },
          onPreset,
          destroy() {
            drag.destroy();
            renderer.dispose();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const A = S._am ? S._am.get() : null,
          f = S._fr ? S._fr.get() : null,
          wl = S._wl ? S._wl.get() : null;
        return {
          t: api.transport.time(),
          A,
          f,
          wl,
          v: f != null && wl != null ? f * wl : null,
          y: S._y ? S._y() : null
        };
      },
      predict(api) {
        const WL = api.state._wl;
        const pred = createPrediction(api.por, {
          graph: api.graphs[1],
          series: 'v',
          unit: 'm/s',
          quantity: 'wave phase speed',
          absFloor: 0.3,
          rel: 0.08,
          context() {
            return {
              wl: WL ? WL.get() : null,
              paramsText: 'λ = ' + (WL ? WL.get().toFixed(1) : '—') + ' m'
            };
          },
          question() {
            return 'Predict first: on the v = f·λ sweep (λ = ' + (WL ? WL.get().toFixed(1) : '—') + ' m), how fast does the surface travel at f = 1.50 Hz?';
          },
          observe() {
            const hit = api.graphs[1].valueAt('v', 1.5);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Each crest advances one wavelength λ = ' +
              (ctx.wl != null ? ctx.wl.toFixed(1) : '—') +
              ' m every period T = 1/f, so the phase speed is v = λ/T = f·λ = ' +
              r.observed.toFixed(2) +
              ' m/s at f = 1.50 Hz. The gauge trace above oscillates at the same f; the sweep just turns that ' +
              'period into a travel speed — the number a harbour master reads before deciding when tugs stand off.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
