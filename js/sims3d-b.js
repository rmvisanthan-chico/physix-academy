/* PhysiX Academy — True-3D simulation B: electric field lines */
'use strict';

Sims.register('efield3d', 'Electric Fields — 3D', 'Field lines traced through space. Drag to look around.', '⚡', frame => {
  const { renderer, scene, camera } = S3D(frame, 340);
  camera.position.set(0, 3.2, 11);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.7));
  const key = new THREE.PointLight(0x6d5df6, 1.8, 60); key.position.set(5, 6, 6); scene.add(key);

  const rig = new THREE.Group(); scene.add(rig);
  const linesGrp = new THREE.Group(); rig.add(linesGrp);
  const chGrp = new THREE.Group(); rig.add(chGrp);

  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);

  function fieldAt(x, y, z, chs) {
    let ex = 0, ey = 0, ez = 0;
    for (const [cx, cy, cz, q] of chs) {
      const dx = x - cx, dy = y - cy, dz = z - cz;
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 < 0.05) continue;
      const f = q / (r2 * Math.sqrt(r2)) * 3;
      ex += f * dx; ey += f * dy; ez += f * dz;
    }
    return [ex, ey, ez];
  }

  /* fibonacci sphere directions */
  const DIRS = [];
  for (let i = 0; i < 30; i++) {
    const y = 1 - (i / 29) * 2, rr = Math.sqrt(1 - y * y), a = i * 2.399963;
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
      DIRS.forEach(d => {
        let x = cx + d[0] * 0.55, y = cy + d[1] * 0.55, z = cz + d[2] * 0.55;
        const pts = [x, y, z];
        for (let s = 0; s < 700; s++) {
          const [ex, ey, ez] = fieldAt(x, y, z, chs);
          const m = Math.hypot(ex, ey, ez) || 1;
          x += ex / m * 0.13; y += ey / m * 0.13; z += ez / m * 0.13;
          pts.push(x, y, z);
          if (Math.hypot(x, y, z) > 15) break;
          let hit = false;
          for (const [nx, ny, nz, nq] of chs)
            if (nq < 0 && Math.hypot(x - nx, y - ny, z - nz) < 0.5) hit = true;
          if (hit) break;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        linesGrp.add(new THREE.Line(g, new THREE.LineBasicMaterial({
          color: 0x22d3ee, transparent: true, opacity: 0.5 })));
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
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.3,
          emissive: col, emissiveIntensity: 0.45 }));
      m.position.set(cx, cy, cz);
      chGrp.add(m);
      const gc = document.createElement('canvas'); gc.width = gc.height = 64;
      const gg = gc.getContext('2d');
      gg.fillStyle = '#fff'; gg.font = 'bold 44px Segoe UI'; gg.textAlign = 'center';
      gg.fillText(q > 0 ? '+' : '−', 32, 48);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
      spr.scale.set(0.5, 0.5, 1);
      spr.position.set(cx, cy + 0.75, cz);
      chGrp.add(spr);
    });
  }

  const Q1 = SU.slider(ctr, 'Left charge q₁', -4, 4, 1, 2, rebuild);
  const Q2 = SU.slider(ctr, 'Right charge q₂', -4, 4, 1, -2, rebuild);
  const rE = SU.readout(ro, 'Field at centre');

  function rebuild() {
    const chs = [[-3, 0, 0, Q1.get()], [3, 0, 0, Q2.get()]];
    drawCharges(chs);
    trace(chs);
    const [ex, ey, ez] = fieldAt(0, 0, 0, chs);
    rE.set(Math.hypot(ex, ey, ez).toFixed(2) + ' (units)');
  }
  rebuild();

  const drag = S3Ddrag(rig, renderer.domElement, true);
  let alive = true;
  const clock = new THREE.Clock();
  (function anim() {
    if (!alive || !renderer.domElement.isConnected) { alive = false; renderer.dispose(); return; }
    requestAnimationFrame(anim);
    if (document.hidden) return;
    rig.rotation.y += clock.getDelta() * 0.1;
    drag.update();
    renderer.render(scene, camera);
  })();
});
