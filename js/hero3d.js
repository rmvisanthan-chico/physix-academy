/* PhysiX Academy — Homepage hero: AtomicCore (port of motion-site design) */
'use strict';

const Hero3D = {
  mountedOn: null,

  mount() {
    const hero = $('.hero');
    if (!hero || hero === this.mountedOn) return;
    if (!window.THREE) {
      console.warn('[Hero3D] THREE missing — vendor/three.min.js did not load');
      toast('3D engine failed to load (three.min.js)', 'bad');
      return;
    }
    this.mountedOn = hero;
    try {
    this._build(hero);
    } catch (e) {
      console.error('[Hero3D]', e);
      toast(/webgl/i.test(e.message)
        ? '3D needs WebGL — enable hardware acceleration in browser settings'
        : 'Atom error: ' + e.message, 'bad');
    }
  },

  _build(hero) {

    const wrap = document.createElement('div');
    wrap.className = 'hero3d-wrap';
    hero.prepend(wrap);

    const W0 = () => hero.clientWidth || 800;
    const H0 = () => hero.clientHeight || 420;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W0(), H0());
    wrap.appendChild(renderer.domElement);

    /* palette-aware colours */
    const _css = getComputedStyle(document.documentElement);
    const cAcc = new THREE.Color((_css.getPropertyValue('--acc') || '#f97316').trim() || '#f97316');
    const cAcc2 = new THREE.Color((_css.getPropertyValue('--acc2') || '#fb7185').trim() || '#fb7185');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W0() / H0(), 0.1, 100);
    camera.position.set(0, 0, 5.8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const l1 = new THREE.PointLight(0xffffff, 26, 40); l1.position.set(4, 4, 5); scene.add(l1);
    const l2 = new THREE.PointLight(cAcc.getHex(), 20, 40); l2.position.set(-4, -2, 3); scene.add(l2);
    const l3 = new THREE.PointLight(0xff7357, 14, 40); l3.position.set(-3, 3, -3); scene.add(l3);

    const core = new THREE.Group();
    scene.add(core);

    /* --- Spline-grade glass shell + bloom --- */
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: cAcc, transmission: 1, thickness: 1.2, roughness: 0.08,
      ior: 1.5, dispersion: 0.4,
      clearcoat: 1, clearcoatRoughness: 0.1,
      envMapIntensity: 1.4
    });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 5), shellMat);
    core.add(shell);
    // bloom shell (additive, backside) — fake bloom without postprocessing
    const bloomShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.22, 3),
      new THREE.MeshBasicMaterial({ color: cAcc.getHex(), transparent: true, opacity: 0.07, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.add(bloomShell);
    const bloomShell2 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.30, 2),
      new THREE.MeshBasicMaterial({ color: cAcc2.getHex(), transparent: true, opacity: 0.04, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.add(bloomShell2);

    /* --- fiery nucleus + inner glow --- */
    const nuc = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xff7357, emissive: 0xd63f2d, emissiveIntensity: 3.2,
        metalness: 0.22, roughness: 0.20
      }));
    nuc.scale.setScalar(0.36);
    core.add(nuc);
    const nucGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xFF7357, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.add(nucGlow);

    /* --- three orbit rings + glow copies --- */
    [0, Math.PI / 3, -Math.PI / 3].forEach((rx, i) => {
      const col = i === 1 ? cAcc2.getHex() : cAcc.getHex();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.78, 0.028, 12, 128),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.22, transparent: true, opacity: 0.98 })
      );
      ring.rotation.set(rx, i * 0.8, rx);
      core.add(ring);
      // glow copy (thicker, additive)
      const glow = new THREE.Mesh(
        new THREE.TorusGeometry(1.78, 0.075, 10, 96),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      glow.rotation.copy(ring.rotation);
      core.add(glow);
    });

    /* --- sparkle dust --- */
    const N = 320, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: cAcc.getHex(), size: 0.02, transparent: true, opacity: 0.85
    }));
    scene.add(dust);

    /* --- drag-to-rotate with inertia + burst on click (AnimMasterLib) --- */
    let tgtX = 0.12, tgtY = 0, dragging = false, lx = 0, ly = 0, moved = 0;
    const down = e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; hero.classList.add('dragging'); };
    const move = e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      moved += Math.hypot(dx, dy);
      tgtY += dx * 0.006;
      tgtX += dy * 0.006;
      tgtX = Math.max(-1.1, Math.min(1.1, tgtX));
      lx = e.clientX; ly = e.clientY;
    };
    const up = (e) => {
      const wasClick = dragging && moved < 8;
      dragging = false; hero.classList.remove('dragging');
      if (wasClick) burstAt(core.position.clone());
    };
    wrap.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    console.info('[Hero3D] atom mounted ✓');

    /* — burst system — */
    const bursts = [];
    function burstAt(origin) {
      const n = 56;
      const g = new THREE.BufferGeometry();
      const posB = new Float32Array(n*3);
      const vel = new Float32Array(n*3);
      for (let i=0;i<n;i++){
        posB[i*3]=origin.x; posB[i*3+1]=origin.y; posB[i*3+2]=origin.z;
        const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
        const sp = 1.2 + Math.random()*2.2;
        vel[i*3]=Math.sin(ph)*Math.cos(th)*sp;
        vel[i*3+1]=Math.sin(ph)*Math.sin(th)*sp;
        vel[i*3+2]=Math.cos(ph)*sp;
      }
      g.setAttribute('position', new THREE.BufferAttribute(posB, 3));
      const m = new THREE.PointsMaterial({ color: 0xFDE68A, size: 0.055, transparent:true, opacity:0.95, blending: THREE.AdditiveBlending, depthWrite:false });
      const pts = new THREE.Points(g, m);
      scene.add(pts);
      bursts.push({ g, m, pts, vel, t:0 });
      // soft haptic
      if (navigator.vibrate) try{ navigator.vibrate(12); }catch(_){}
    }

    const fit = () => { renderer.setSize(W0(), H0()); camera.aspect = W0() / H0(); camera.updateProjectionMatrix(); };
    window.addEventListener('resize', fit);

    let visible = true;
    const io2 = ('IntersectionObserver' in window)
      ? new IntersectionObserver(es => es.forEach(x => visible = x.isIntersecting))
      : { observe() {}, disconnect() {} };
    io2.observe(wrap);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let alive = true;

    function frame() {
      if (!alive || !wrap.isConnected) {
        alive = false;
        window.removeEventListener('resize', fit);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        io2.disconnect && io2.disconnect();
        renderer.dispose();
        return;
      }
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);

      if (!dragging && !reduce) tgtY += dt * 0.16;
      core.rotation.y += (tgtY - core.rotation.y) * 0.07;
      core.rotation.x += (tgtX + Math.sin(performance.now() * 0.00035) * 0.12 - core.rotation.x) * 0.07;
      /* float bob — no scroll movement */
      core.position.y = Math.sin(performance.now() * 0.0011) * 0.09;
      if (typeof bloomShell !== 'undefined') bloomShell.scale.setScalar(1 + Math.sin(performance.now()*0.0014)*0.04);
      dust.rotation.y += dt * 0.018;

      // bursts tick
      for (let bi=bursts.length-1; bi>=0; bi--){
        const b = bursts[bi]; b.t += dt;
        const posA = b.g.getAttribute('position');
        const arr = posA.array, v = b.vel;
        for (let i=0;i<v.length/3;i++){
          arr[i*3] += v[i*3]*dt;
          arr[i*3+1] += v[i*3+1]*dt;
          arr[i*3+2] += v[i*3+2]*dt;
          v[i*3+1] -= dt*0.9; // gravity
          v[i*3]   *= 0.998; v[i*3+1]*=0.998; v[i*3+2]*=0.998;
        }
        posA.needsUpdate = true;
        b.m.opacity = Math.max(0, 0.95 - b.t*0.85);
        b.m.size = 0.055 + b.t*0.04;
        if (b.t > 1.2){ scene.remove(b.pts); b.g.dispose(); b.m.dispose(); bursts.splice(bi,1); }
      }

      renderer.render(scene, camera);
    }
    frame();
  }
};

(function hookHero() {
  if (typeof afterRender !== 'function') return;
  const orig = afterRender;
  window.afterRender = function (root) { orig(root); Hero3D.mount(); };
})();
