/* PhysiX Academy — True-3D simulations A: gravity orbit + wave surface */
'use strict';

function S3D(frame, h) {
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

function S3Ddrag(dragTarget, dom, camRig) {
  let tx = 0.5, ty = 0.35, drag = false, lx = 0, ly = 0;
  dom.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    ty += (e.clientX - lx) * 0.007; tx += (e.clientY - ly) * 0.007;
    tx = Math.max(-1.4, Math.min(1.4, tx));
    lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('pointerup', () => drag = false);
  return { update() {
    dragTarget.rotation.y += (ty - dragTarget.rotation.y) * 0.09;
    if (camRig) dragTarget.rotation.x += (tx - dragTarget.rotation.x) * 0.09;
  }, get dragging() { return drag; } };
}

/* ---------------- Gravity orbit (Kepler) in 3D ---------------- */
Sims.register('orbit3d', 'Gravity Orbit — 3D', 'Drag to tilt. Faster at perihelion — Kepler in action.', '🪐', frame => {
  const { renderer, scene, camera } = S3D(frame, 320);
  camera.position.set(0, 4.5, 10);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.5));
  const sunL = new THREE.PointLight(0xfbbf24, 2.4, 80); scene.add(sunL);

  const rig = new THREE.Group(); rig.rotation.x = 0.45; scene.add(rig);
  const sys = new THREE.Group(); rig.add(sys);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  sys.add(sun);

  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gg = gc.getContext('2d');
  const grd = gg.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(251,191,36,.8)'); grd.addColorStop(1, 'rgba(251,191,36,0)');
  gg.fillStyle = grd; gg.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(3.6, 3.6, 1); sys.add(glow);

  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.3, metalness: 0.4,
      emissive: 0x22d3ee, emissiveIntensity: 0.25 }));
  sys.add(planet);

  const starGeo = new THREE.BufferGeometry();
  const NP = 350, pp = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    const rr = 16 + Math.random() * 16, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    pp[i * 3] = rr * Math.sin(ph) * Math.cos(th); pp[i * 3 + 1] = rr * Math.cos(ph); pp[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  sys.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9aa8c3, size: 0.06, transparent: true, opacity: 0.7 })));

  const TRAIL = 500, tp = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3));
  trailGeo.setDrawRange(0, 0);
  sys.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x6d5df6, transparent: true, opacity: 0.85 })));

  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  let th = 0, n = 0;
  const EC = SU.slider(ctr, 'Eccentricity e', 0, 0.75, 0.01, 0.45, () => { n = 0; trailGeo.setDrawRange(0, 0); });
  const SP = SU.slider(ctr, 'Time warp', 0.1, 3, 0.05, 1, () => {}, v => v.toFixed(2) + '×');
  const rR = SU.readout(ro, 'Distance r'), vV = SU.readout(ro, 'Speed v');

  const drag = S3Ddrag(rig, renderer.domElement, true);
  let alive = true;
  const clock = new THREE.Clock();
  (function anim() {
    if (!alive || !renderer.domElement.isConnected) { alive = false; renderer.dispose(); return; }
    requestAnimationFrame(anim);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const a = 4.4, e = EC.get();
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    th += (13 / (r * r)) * dt * SP.get();
    const nr = a * (1 - e * e) / (1 + e * Math.cos(th));
    planet.position.set(nr * Math.cos(th), 0, nr * Math.sin(th));
    if (n < TRAIL) {
      tp[n * 3] = planet.position.x; tp[n * 3 + 1] = 0; tp[n * 3 + 2] = planet.position.z;
      n++; trailGeo.setDrawRange(0, n);
    }
    trailGeo.attributes.position.needsUpdate = true;
    rR.set(nr.toFixed(2) + ' AU');
    vV.set(Math.sqrt(20 * (2 / nr - 1 / a)).toFixed(2) + ' u/s');
    drag.update();
    renderer.render(scene, camera);
  })();
});

/* ---------------- Wave surface (y = A sin(kx−ωt)) in 3D ---------------- */
Sims.register('wave3d', 'Wave Surface — 3D', 'A travelling wave you can orbit around.', '🌊', frame => {
  const { renderer, scene, camera } = S3D(frame, 320);
  camera.position.set(0, 6.5, 11);
  camera.lookAt(0, 0, 0);

  const rig = new THREE.Group(); rig.rotation.x = 0; scene.add(rig);
  const SEGX = 72, SEGZ = 44;
  const geo = new THREE.PlaneGeometry(16, 10, SEGX, SEGZ);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.75 }));
  mesh.rotation.x = -Math.PI / 2;
  rig.add(mesh);

  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const AM = SU.slider(ctr, 'Amplitude A', 0.1, 1.6, 0.05, 0.8, () => {}, v => v.toFixed(2));
  const FR = SU.slider(ctr, 'Frequency f (Hz)', 0.2, 2.5, 0.05, 0.8, () => {});
  const WL = SU.slider(ctr, 'Wavelength λ', 1.5, 8, 0.1, 4, () => {}, v => v.toFixed(1));
  const rV = SU.readout(ro, 'Wave speed v = fλ');

  const posA = geo.attributes.position;
  const drag = S3Ddrag(rig, renderer.domElement, true);
  let t = 0, alive = true;
  const clock = new THREE.Clock();
  (function anim() {
    if (!alive || !renderer.domElement.isConnected) { alive = false; renderer.dispose(); return; }
    requestAnimationFrame(anim);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const A = AM.get(), f = FR.get(), wl = WL.get();
    const k = 2 * Math.PI / wl, om = 2 * Math.PI * f;
    for (let i = 0; i < posA.count; i++) {
      const x = posA.getX(i), z = posA.getY(i);
      posA.setZ(i, A * Math.sin(k * x - om * t) * Math.exp(-Math.abs(z) / 14));
    }
    posA.needsUpdate = true;
    rV.set((f * wl / 2).toFixed(2) + ' m/s');
    if (!drag.dragging) rig.rotation.y += dt * 0.12;
    drag.update();
    renderer.render(scene, camera);
  })();
});
