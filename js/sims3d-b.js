import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
import { S3Dstage, S3Ddrag } from './sims3d-a.js';
/* PhysiX Academy — True-3D simulation B: electric field lines.
 *
 * sim-transform Phase D batch 8: the field-line tracer, charge meshes and the
 * k = 3 reduced Coulomb kernel are the original bench's, unchanged —
 * E(r) = 3q/r³ r̂ per charge, lines seeded 0.55 from the surface, hopped 0.13
 * along the local direction, ≤700 segments, killed at |p| > 15 or within 0.5
 * of a negative charge. The stage is mounted through S3Dstage so the WebGL
 * scene and the 2D field plot share the workstation viewport. */
('use strict');

Sims.register(
  'efield3d',
  'Electric Fields — 3D',
  'Field lines traced through space. Drag to look around.',
  '⚡',
  (frame) =>
    Workstation.mount(frame, {
      id: 'efield3d',
      title: 'Electric Fields — 3D',
      desc:
        'What a substation designer sees: field lines leave a positive conductor perpendicular to its surface, bend along ' +
        'the steepest-descent direction and land on negative charge — the geometry behind HV transmission-line clearances ' +
        'and corona-shaping hardware. |E| at the centre of this symmetric pair is |q₁ − q₂|/3, the same reduced-Coulomb ' +
        'number a pole-mounted test rig would log; the sweeps below record it as q₁ and q₂ are walked.',
      icon: '⚡',
      topic: 'Electrostatics',
      level: 'Grade 11–12',
      appKey: 'efield3d',
      height: 340,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Field scene' },
        { id: 'science', label: 'Field analysis' }
      ],
      presets: [
        {
          label: 'Classic dipole +2/−2',
          apply: (s) => {
            s.q1 = 2;
            s.q2 = -2;
          }
        },
        {
          label: 'HV pair +4/−4',
          apply: (s) => {
            s.q1 = 4;
            s.q2 = -4;
          }
        },
        {
          label: 'Like charges +2/+2',
          apply: (s) => {
            s.q1 = 2;
            s.q2 = 2;
          }
        },
        {
          label: 'Asymmetric pair +4/−1',
          apply: (s) => {
            s.q1 = 4;
            s.q2 = -1;
          }
        }
      ],
      graphs: [
        {
          title: 'Field at centre vs q₁ (q₂ held)',
          xLabel: 'Charge q₁',
          xUnit: '(units)',
          xKey: 'q1',
          yLabel: '|E|',
          yUnit: '(units)',
          height: 128,
          series: [{ id: 'e1', label: '|E|', unit: '(units)', color: '#22d3ee' }]
        },
        {
          title: 'Field at centre vs q₂ (q₁ held)',
          xLabel: 'Charge q₂',
          xUnit: '(units)',
          xKey: 'q2',
          yLabel: '|E|',
          yUnit: '(units)',
          height: 128,
          series: [{ id: 'e2', label: '|E|', unit: '(units)', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const { renderer, scene, camera } = S3Dstage(api, 340);
        camera.position.set(0, 3.2, 11);
        scene.add(new THREE.AmbientLight(0x8899bb, 0.7));
        const key = new THREE.PointLight(0x6d5df6, 1.8, 60);
        key.position.set(5, 6, 6);
        scene.add(key);

        const rig = new THREE.Group();
        scene.add(rig);
        const linesGrp = new THREE.Group();
        rig.add(linesGrp);
        const chGrp = new THREE.Group();
        rig.add(chGrp);

        function fieldAt(x, y, z, chs) {
          let ex = 0,
            ey = 0,
            ez = 0;
          for (const [cx, cy, cz, q] of chs) {
            const dx = x - cx,
              dy = y - cy,
              dz = z - cz;
            const r2 = dx * dx + dy * dy + dz * dz;
            if (r2 < 0.05) continue;
            const f = (q / (r2 * Math.sqrt(r2))) * 3;
            ex += f * dx;
            ey += f * dy;
            ez += f * dz;
          }
          return [ex, ey, ez];
        }

        /* fibonacci sphere directions */
        const DIRS = [];
        for (let i = 0; i < 30; i++) {
          const y = 1 - (i / 29) * 2,
            rr = Math.sqrt(1 - y * y),
            a = i * 2.399963;
          DIRS.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
        }

        function trace(chs) {
          while (linesGrp.children.length) {
            const l = linesGrp.children.pop();
            l.geometry.dispose();
            linesGrp.remove(l);
          }
          chs.forEach(([cx, cy, cz, q]) => {
            if (q <= 0) return;
            DIRS.forEach((d) => {
              let x = cx + d[0] * 0.55,
                y = cy + d[1] * 0.55,
                z = cz + d[2] * 0.55;
              const pts = [x, y, z];
              for (let s = 0; s < 700; s++) {
                const [ex, ey, ez] = fieldAt(x, y, z, chs);
                const m = Math.hypot(ex, ey, ez) || 1;
                x += (ex / m) * 0.13;
                y += (ey / m) * 0.13;
                z += (ez / m) * 0.13;
                pts.push(x, y, z);
                if (Math.hypot(x, y, z) > 15) break;
                let hit = false;
                for (const [nx, ny, nz, nq] of chs)
                  if (nq < 0 && Math.hypot(x - nx, y - ny, z - nz) < 0.5) hit = true;
                if (hit) break;
              }
              const geo = new THREE.BufferGeometry();
              geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
              linesGrp.add(
                new THREE.Line(
                  geo,
                  new THREE.LineBasicMaterial({
                    color: 0x22d3ee,
                    transparent: true,
                    opacity: 0.5
                  })
                )
              );
            });
          });
        }

        function drawCharges(chs) {
          while (chGrp.children.length) chGrp.remove(chGrp.children[0]);
          chs.forEach(([cx, cy, cz, q]) => {
            if (!q) return;
            const col = q > 0 ? 0xf87171 : 0x6d5df6;
            const m = new THREE.Mesh(
              new THREE.SphereGeometry(0.28 + Math.cbrt(Math.abs(q)) * 0.16, 24, 24),
              new THREE.MeshStandardMaterial({
                color: col,
                roughness: 0.3,
                emissive: col,
                emissiveIntensity: 0.45
              })
            );
            m.position.set(cx, cy, cz);
            chGrp.add(m);
            const qc = document.createElement('canvas');
            qc.width = qc.height = 64;
            const qg = qc.getContext('2d');
            qg.fillStyle = '#fff';
            qg.font = 'bold 44px Segoe UI';
            qg.textAlign = 'center';
            qg.fillText(q > 0 ? '+' : '−', 32, 48);
            const spr = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(qc),
                transparent: true,
                depthWrite: false
              })
            );
            spr.scale.set(0.5, 0.5, 1);
            spr.position.set(cx, cy + 0.75, cz);
            chGrp.add(spr);
          });
        }

        /* ---- controls + readouts (sidebar) ---- */
        const Q1 = api.SU.slider(api.panel, 'Left charge q₁', -4, 4, 1, 2, rebuild);
        const Q2 = api.SU.slider(api.panel, 'Right charge q₂', -4, 4, 1, -2, rebuild);
        const rE = api.SU.readout(api.readouts, 'Field at centre');

        /* static sweeps: |E|(0,0,0) = |q₁ − q₂|/3 is the bench's own closed
           form for symmetric poles at ±3 — walk q₁ with q₂ held, then q₂ with
           q₁ held. Rebuilt on reset, slider move and preset load because
           transport.reset() clears every graph first. */
        function sweep() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 16; i++) {
              const q = -4 + i * 0.5;
              G0.push({ q1: q, e1: Math.abs(q - Q2.get()) / 3 });
            }
          }
          if (G1) {
            G1.clear();
            for (let i = 0; i <= 16; i++) {
              const q = -4 + i * 0.5;
              G1.push({ q2: q, e2: Math.abs(Q1.get() - q) / 3 });
            }
          }
        }

        function rebuild() {
          const chs = [
            [-3, 0, 0, Q1.get()],
            [3, 0, 0, Q2.get()]
          ];
          drawCharges(chs);
          trace(chs);
          const [ex, ey, ez] = fieldAt(0, 0, 0, chs);
          S._E = Math.hypot(ex, ey, ez);
          rE.set(S._E.toFixed(2) + ' (units)');
          sweep();
          if (S.onParam) S.onParam();
        }

        /* ---- science layer: the axial cut the tracer enforces, as a chart ---- */
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

          const q1 = Q1.get(),
            q2 = Q2.get();
          const x0 = 30,
            sx = (W - x0 - 30) / 12,
            cy = H / 2;

          /* sampled signed E_x along the charge axis; the ±3 poles are
             blanked out (the tracer does the same at r < 0.05) */
          let mE = 0.25;
          const pts = [];
          for (let i = 0; i <= 240; i++) {
            const ax = -6 + i * 0.05;
            if (Math.abs(ax + 3) < 0.4 || Math.abs(ax - 3) < 0.4) {
              pts.push(null);
              continue;
            }
            const Ev =
              (3 * q1 * Math.sign(ax + 3)) / ((ax + 3) * (ax + 3)) +
              (3 * q2 * Math.sign(ax - 3)) / ((ax - 3) * (ax - 3));
            if (Math.abs(Ev) > mE) mE = Math.abs(Ev);
            pts.push([ax, Ev]);
          }
          const sy = (H / 2 - 44) / mE;

          /* zero line */
          g.strokeStyle = 'rgba(154,168,195,0.4)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(x0, cy);
          g.lineTo(x0 + 12 * sx, cy);
          g.stroke();
          g.setLineDash([]);

          /* the curve */
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2;
          let pen = false;
          for (const pt of pts) {
            if (!pt) {
              pen = false;
              continue;
            }
            const xx = x0 + (pt[0] + 6) * sx,
              yy = cy - pt[1] * sy;
            if (!pen) {
              g.beginPath();
              g.moveTo(xx, yy);
              pen = true;
            } else g.lineTo(xx, yy);
          }
          g.stroke();

          /* conductor posts */
          for (const [ax, q, lab] of [
            [-3, q1, 'q₁'],
            [3, q2, 'q₂']
          ]) {
            if (!q) continue;
            const xx = x0 + (ax + 6) * sx;
            g.fillStyle = q > 0 ? '#f87171' : '#6d5df6';
            g.beginPath();
            g.arc(xx, cy, 7, 0, 7);
            g.fill();
            g.fillStyle = 'rgba(232,237,247,0.9)';
            g.font = '11px "DM Mono", monospace';
            g.fillText(lab + ' = ' + (q > 0 ? '+' : '') + q, xx - 16, cy - 14);
          }

          /* centre value the readout logs */
          const Em = (q1 - q2) / 3;
          g.strokeStyle = 'rgba(251,191,36,0.6)';
          g.setLineDash([2, 4]);
          g.beginPath();
          g.moveTo(x0 + 6 * sx, cy - Em * sy);
          g.lineTo(x0 + 12 * sx, cy - Em * sy);
          g.stroke();
          g.setLineDash([]);

          api.pxLabel(g, 20, 22, 'FIELD ALONG THE CHARGE AXIS (signed E_x)', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'E(x) = 3·q₁/(x+3)²·sgn(x+3) + 3·q₂/(x−3)²·sgn(x−3)', 'rgba(34,211,238,0.95)');
          api.pxLabel(g, 20, H - 30, '|E| at the centre = |q₁ − q₂|/3 = ' + Math.abs(Em).toFixed(2) + ' (units)', 'rgba(251,191,36,0.95)');
        }

        /* ---- pump ---- */
        function update(dt) {
          /* verbatim from the source bench: a rigid scene, so the whole clock
             drives the camera orbit — no dt clamp existed there. */
          rig.rotation.y += dt * 0.1;
          drag.update();
        }

        function draw() {
          renderer.render(scene, camera);
          if (api.getLayer() === 'science') drawScience();
        }

        function reset() {
          sweep();
          S._E = Math.abs(Q1.get() - Q2.get()) / 3;
          rE.set(S._E.toFixed(2) + ' (units)');
        }

        function onPreset() {
          Q1.set(S.q1);
          Q2.set(S.q2);
          rebuild();
        }

        S.q1 = Q1.get();
        S.q2 = Q2.get();
        S._q1 = Q1;
        S._q2 = Q2;
        S._rig = rig;

        reset();
        rebuild();

        const glc = renderer.domElement;
        function showGL(on) {
          glc.style.display = on ? '' : 'none';
          api.cv.style.display = on ? 'none' : '';
        }
        showGL(true);

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
          q1: S._q1 ? S._q1.get() : null,
          q2: S._q2 ? S._q2.get() : null,
          E: S._E != null ? S._E : null,
          V: S._rig ? S._rig.rotation.y : null
        };
      },
      predict(api) {
        const Q2 = api.state._q2;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'e1',
          unit: '(units)',
          quantity: 'field strength at the centre',
          absFloor: 0.05,
          rel: 0.1,
          context() {
            const q2 = Q2 ? Q2.get() : null;
            return { q2, paramsText: 'q₂ = ' + q2 + ' (held)' };
          },
          question() {
            return 'Predict first: on the E-vs-q₁ sweep, how strong is the field at the centre when q₁ = +3.00?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('e1', 3);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Symmetric poles 3 apart contribute ∓1/3 of each unit charge at the centre, so the vector sum is ' +
              'E = (q₁ − q₂)/3 and the meter reads |q₁ − q₂|/3 = ' +
              r.observed.toFixed(2) +
              ' (units) for q₁ = +3.00 with q₂ = ' +
              (ctx.q2 != null ? ctx.q2 : '—') +
              '. Opposite signs add through the centre — the reason dipole HV geometries put the strongest gradient ' +
              'midspan, and why walk-in clearances are set by that point.'
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
