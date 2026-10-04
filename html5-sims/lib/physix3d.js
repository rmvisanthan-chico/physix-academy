/* PhysiX 3D — shared scaffold for the HTML5 simulation set.
   Requires three.min.js (r149) to be loaded first. */
(function (global) {
  'use strict';

  const T = global.THREE;

  function createEnvironment(renderer, tint) {
    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const s = new T.Scene();
    const box = new T.BoxGeometry(1, 1, 1);
    const add = (hex, x, y, z, sx, sy, sz) => {
      const m = new T.Mesh(box, new T.MeshBasicMaterial({ color: hex, side: T.BackSide }));
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      s.add(m); return m;
    };
    const room = new T.Mesh(box, new T.MeshBasicMaterial({ color: 0x1a2033, side: T.BackSide }));
    room.scale.set(22, 14, 22); s.add(room);
    const lights = [
      [0xfff2e0, 0, 6.2, 0, 9, 0.4, 9],
      [tint || 0x9fd8ff, -7, 1.2, -4, 0.4, 5, 7],
      [0xffd0a8, 7, 0.6, 3, 0.4, 4, 6],
      [tint || 0x6f8dff, 0, -6.4, 0, 8, 0.4, 8]
    ];
    lights.forEach(a => { const m = add(a[0], a[1], a[2], a[3], a[4], a[5], a[6]); m.material.side = T.FrontSide; });
    const tex = pmrem.fromScene(s, 0.035).texture;
    pmrem.dispose();
    box.dispose();
    return tex;
  }

  function Orbit(camera, dom, opts) {
    const o = Object.assign({ minD: 4, maxD: 900, dmp: 0.12, pan: 1, target: new T.Vector3() }, opts || {});
    let theta = 0.72, phi = 1.05, dist = o.dist || 22;
    let tTheta = theta, tPhi = phi, tDist = dist;
    const tTarget = o.target.clone();
    let drag = null, pinch = 0, nudge = 0, enabled = true;

    const clamp = () => {
      tPhi = Math.max(0.06, Math.min(Math.PI - 0.06, tPhi));
      tDist = Math.max(o.minD, Math.min(o.maxD, tDist));
    };

    function down(e) {
      if (!enabled) return;
      if (e.target.closest && e.target.closest('.no-orbit')) return;
      dom.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey, tTheta, tPhi, tTarget: tTarget.clone() };
    }
    function move(e) {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.pan) {
        const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
        const k = 2 * tDist * o.pan / dom.clientHeight;
        tTarget.copy(drag.tTarget).addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      } else {
        tTheta = (drag ? drag.tTheta : theta + nudge) - dx * 0.006;
        tPhi = drag.tPhi - dy * 0.006;
        clamp();
      }
    }
    function up() { drag = null; }
    function wheel(e) { if (!enabled) return; e.preventDefault(); tDist *= 1 + Math.sign(e.deltaY) * 0.11; clamp(); }
    function touch(e) {
      if (e.touches.length !== 2) return;
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) { tDist *= pinch / d; clamp(); }
      pinch = d;
    }

    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', wheel, { passive: false });
    dom.addEventListener('touchmove', touch, { passive: true });
    dom.addEventListener('contextmenu', e => e.preventDefault());

    return {
      update() {
        theta += (tTheta - theta) * o.dmp;
        phi += (tPhi - phi) * o.dmp;
        dist += (tDist - dist) * o.dmp;
        camera.position.set(
          tTarget.x + dist * Math.sin(phi) * Math.sin(theta),
          tTarget.y + dist * Math.cos(phi),
          tTarget.z + dist * Math.sin(phi) * Math.cos(theta));
        camera.lookAt(tTarget);
        return camera;
      },
      nudgeTheta(v) { nudge = v; },
      set enabled(v) { enabled = v; if (!v) drag = null; },
      get enabled() { return enabled; },
      setView(th, ph, d) {
        if (typeof th === 'number') tTheta = th;
        if (typeof ph === 'number') tPhi = ph;
        if (typeof d === 'number') tDist = d;
        theta = tTheta; phi = tPhi; dist = tDist;
        clamp();
      },
      frame(dist_, target) {
        if (typeof dist_ === 'number') { tDist = dist_; clamp(); }
        if (target) tTarget.copy(target);
      },
      get dragging() { return !!drag; },
      dispose() {
        dom.removeEventListener('pointerdown', down);
        dom.removeEventListener('pointermove', move);
        dom.removeEventListener('pointerup', up);
        dom.removeEventListener('wheel', wheel);
      }
    };
  }

  function stage(canvas, opts) {
    const o = Object.assign({
      fov: 48, near: 0.1, far: 4000, dist: 22, minD: 3, maxD: 900,
      shadows: true, env: true, exposure: 1.05, bg: 0x05070f,
      // ssaa = supersampling floor. The backing store is rendered at
      // max(devicePixelRatio, ssaa) x the CSS box, so a 1920px-wide window
      // gets a true 3840px (4K) buffer even on an ordinary 1x monitor.
      ssaa: 2, dprCap: 3,
      shadowSize: 4096,
      autoRotate: 0, preserve: false,
      hemi: 0.16, key: 2.7, fill: 0.16, rim: 0.3,
      accent: 0
    }, opts || {});

    const renderer = new T.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance',
      preserveDrawingBuffer: !!o.preserve
    });
    renderer.setPixelRatio(Math.min(Math.max(global.devicePixelRatio || 1, o.ssaa), o.dprCap));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposure;
    renderer.physicallyCorrectLights = true;
    /* Hand the canvas to the screen-reader bridge. Doing it here means all 33
       simulations get accessible announcements without each one opting in. */
    if (global.PhysixA11y) global.PhysixA11y.install({ canvas, label: o.a11yLabel });
    if (o.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
    }
    renderer.setClearColor(o.bg, 1);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(o.fov, 1, o.near, o.far);
    if (o.env) scene.environment = createEnvironment(renderer, o.accent || 0);

    const hemi = new T.HemisphereLight(0xbcd4ff, 0x1a1f2e, o.hemi);
    scene.add(hemi);

    const key = new T.DirectionalLight(0xfff3e2, o.key);
    key.position.set(14, 22, 12);
    if (o.shadows) {
      key.castShadow = true;
      const sm = o.shadowSize || 4096;
      key.shadow.mapSize.set(sm, sm);
      const c = key.shadow.camera;
      c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 90;
      key.shadow.bias = -0.0012;
      key.shadow.normalBias = 0.02;
    }
    scene.add(key);

    const fill = new T.DirectionalLight(0x86b4ff, o.fill);
    fill.position.set(-16, 8, -14);
    scene.add(fill);

    const rim = new T.DirectionalLight(o.accent || 0xffb27a, o.rim);
    rim.position.set(-6, -12, 18);
    scene.add(rim);

    const controls = Orbit(camera, canvas, {
      minD: o.minD, maxD: o.maxD, dist: o.dist,
      target: o.target instanceof T.Vector3 ? o.target : new T.Vector3()
    });
    if (typeof o.theta === 'number' || typeof o.phi === 'number') {
      controls.setView(
        typeof o.theta === 'number' ? o.theta : 0.72,
        typeof o.phi === 'number' ? o.phi : 1.05,
        o.dist);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(320, r.width), h = Math.max(240, r.height);
      renderer.setSize(w, h, false);
      canvas.style.height = h + 'px';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener('resize', resize);

    const subs = [];
    const rot = o.autoRotate || 0;
    let last = performance.now(), t = 0;
    let spinTheta = 0;

    /* Adaptive resolution.
       The renderer starts at the requested supersample floor and walks the
       scale up or down to whatever the machine can actually sustain. On a
       capable GPU it settles at 2x, so a 1920px window gets a true 3840px
       (4K) buffer. On weak hardware or a software rasteriser it falls back
       to 1x and stays responsive instead of grinding to a halt. */
    const STEPS = [1, 1.5, 2, 2.5, 3];
    let qi = 0;
    for (let i = 0; i < STEPS.length; i++) {
      if (STEPS[i] >= Math.min(Math.max(global.devicePixelRatio || 1, o.ssaa), o.dprCap)) { qi = i; break; }
      qi = i;
    }
    let frames = 0, acc = 0, fast = 0, slow = 0, warm = 0, adaptPrev = performance.now();

    function applyQuality() {
      const pr = Math.min(STEPS[qi], o.dprCap);
      if (Math.abs(renderer.getPixelRatio() - pr) > 0.001) renderer.setPixelRatio(pr);
      if (o.shadows) {
        const want = qi >= 2 ? (o.shadowSize || 4096) : 2048;
        if (key.shadow.mapSize.x !== want) {
          key.shadow.mapSize.set(want, want);
          if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
        }
      }
      resize();
    }
    applyQuality();

    function adapt(now) {
      const dtms = now - adaptPrev; adaptPrev = now;
      if (warm < 12) { warm++; return; }        // ignore shader-compile spikes
      acc += dtms; frames++;
      // A single catastrophic frame steps down at once, so a very slow
      // renderer converges in a couple of frames instead of after a window.
      if (dtms > 120 && qi > 0) {
        qi--; fast = 0; slow = 0; acc = 0; frames = 0; applyQuality(); return;
      }
      if (acc < 600 || frames < 3) return;     // ~0.6s windows
      const ms = acc / frames; acc = 0; frames = 0;
      if (ms > 34) { slow++; fast = 0; } else if (ms < 15) { fast++; slow = 0; } else { slow = 0; fast = 0; }
      if (slow >= 2 && qi > 0) { qi--; slow = 0; applyQuality(); }
      else if (fast >= 3 && qi < STEPS.length - 1) { qi++; fast = 0; applyQuality(); }
    }

    function loop(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now; t += dt;
      adapt(now);
      if (rot) { spinTheta -= rot * dt; controls.nudgeTheta(spinTheta); }
      controls.update();
      for (let i = 0; i < subs.length; i++) subs[i](dt, t);
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    return {
      renderer, scene, camera, controls, key,
      hemi, fill, rim,
      onFrame(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
      start() { requestAnimationFrame(loop); },
      resize,
      /* current supersample factor, e.g. 2 means a 4K buffer at 1080p */
      get quality() { return Math.min(STEPS[qi], o.dprCap); },
      /* pin the scale: 0 = 1x (fastest) .. 4 = 3x. Pass null to go adaptive. */
      setQuality(i) {
        if (i === null || i === undefined) { qi = 0; for (let k = 0; k < STEPS.length; k++) { if (STEPS[k] >= Math.min(Math.max(global.devicePixelRatio || 1, o.ssaa), o.dprCap)) { qi = k; break; } } }
        else qi = Math.max(0, Math.min(STEPS.length - 1, i | 0));
        fast = 0; slow = 0; frames = 0;
        applyQuality();
      },

      floor(size, color, rough, envI) {
        size = size || 60;
        const m = new T.Mesh(
          new T.PlaneGeometry(size, size),
          new T.MeshStandardMaterial({ color: color || 0x080c14, roughness: rough === undefined ? 0.95 : rough, metalness: 0.02 }));
        m.material.envMapIntensity = envI === undefined ? 0.18 : envI;
        m.rotation.x = -Math.PI / 2;
        m.receiveShadow = true;
        return m;
      },

      grid(size, div, c1, c2) {
        const g = new T.GridHelper(size || 60, div || 30, c1 || 0x2b3550, c2 || 0x161c2b);
        g.material.transparent = true;
        g.material.opacity = 0.55;
        return g;
      },

      glow(color, size, opacity) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const c = cv.getContext('2d');
        const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        const tex = new T.CanvasTexture(cv);
        tex.encoding = T.sRGBEncoding;
        const s = new T.Sprite(new T.SpriteMaterial({
          map: tex, color: color || 0xffffff, transparent: true,
          blending: T.AdditiveBlending, depthWrite: false, opacity: opacity === undefined ? 0.85 : opacity
        }));
        s.scale.set(size || 2, size || 2, 1);
        return s;
      },

      label(text, color, scale) {
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        ctx.font = '600 44px ui-monospace,Menlo,Consolas,monospace';
        const w = Math.ceil(ctx.measureText(text).width) + 24;
        cv.width = w; cv.height = 72;
        const c2 = cv.getContext('2d');
        c2.font = '600 44px ui-monospace,Menlo,Consolas,monospace';
        c2.fillStyle = 'rgba(6,10,20,0.72)';
        c2.fillRect(0, 0, w, 72);
        c2.strokeStyle = 'rgba(255,255,255,0.18)';
        c2.lineWidth = 3;
        c2.strokeRect(1.5, 1.5, w - 3, 69);
        c2.fillStyle = color || '#e8edf7';
        c2.textBaseline = 'middle';
        c2.fillText(text, 12, 38);
        const tex = new T.CanvasTexture(cv);
        tex.encoding = T.sRGBEncoding;
        const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        const k = scale || 0.011;
        s.scale.set(w * k, 72 * k, 1);
        s.renderOrder = 999;
        return s;
      },

      arrow(color, from, dir, len, headLen) {
        const g = new T.Group();
        const hl = headLen || Math.min(0.9, len * 0.22);
        const shaft = new T.Mesh(
          new T.CylinderGeometry(0.055, 0.055, Math.max(0.001, len - hl), 10),
          new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.35 }));
        shaft.position.y = (len - hl) / 2;
        const head = new T.Mesh(
          new T.ConeGeometry(0.17, hl, 14),
          new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 }));
        head.position.y = len - hl / 2;
        g.add(shaft); g.add(head);
        const d = dir.clone().normalize();
        g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d);
        g.position.copy(from);
        return g;
      },

      setArrowColor(g, color) {
        g.traverse(o => { if (o.material && o.material.color) { o.material.color.set(color); o.material.emissive.set(color); } });
      }
    };
  }

  global.Physix3D = { stage, createEnvironment, T };
})(window);
