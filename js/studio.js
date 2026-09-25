/* PhysiX Academy — Studio page: motion-site port (vanilla, no React) */
'use strict';

const STUDIES = [
  { id: '01', title: 'Field / Lines', type: 'Electric fields, drawn in space', mins: '18 MIN LESSON', cls: 'art-lime', ch: 'l3.charges' },
  { id: '02', title: 'Gravity / Well', type: 'Orbits you can tilt and warp', mins: '12 MIN LESSON', cls: 'art-coral', ch: 'l2.gravity' },
  { id: '03', title: 'Light / Matter', type: 'Where waves become particles', mins: '16 MIN LESSON', cls: 'art-mix', ch: 'l3.dual' }
];

function mountStudioScene(host) {
  if (!host || !window.THREE || host.querySelector('canvas')) return;
  const W = () => host.clientWidth || 600, H = () => host.clientHeight || 500;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, W() / H(), 0.1, 60);
  camera.position.set(0, 0, 5.8);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const l1 = new THREE.PointLight(0xd8ff62, 30, 40); l1.position.set(3, 3, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xff5b43, 16, 40); l2.position.set(-3, -2, 2); scene.add(l2);

  const core = new THREE.Group();
  scene.add(core);

  core.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 5),
    new THREE.MeshPhysicalMaterial({
      color: 0xc9ff38, transmission: 0.92, thickness: 0.65, roughness: 0.14,
      metalness: 0.05, transparent: true, opacity: 0.96, clearcoat: 0.6
    })));
  core.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xff7357, emissive: 0xd63f2d, emissiveIntensity: 3, roughness: 0.25 })));
  [0, Math.PI / 3, -Math.PI / 3].forEach((rx, i) => {
    core.add(new THREE.Mesh(
      new THREE.TorusGeometry(1.78, 0.024, 10, 128),
      new THREE.MeshStandardMaterial({ color: 0xc9ff38, emissive: 0x83ad16, emissiveIntensity: 1.3 })));
    core.children[core.children.length - 1].rotation.set(rx, i * 0.8, rx);
  });

  /* sparkle dust */
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc9ff38, size: 0.02, transparent: true, opacity: 0.85 })));

  let tx = 0.15, ty = 0, drag = false, lx = 0, ly = 0;
  host.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    ty += (e.clientX - lx) * 0.006;
    tx += (e.clientY - ly) * 0.006;
    tx = Math.max(-1.1, Math.min(1.1, tx));
    lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('pointerup', () => drag = false);

  const fit = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
  window.addEventListener('resize', fit);

  let alive = true;
  const clock = new THREE.Clock();
  (function anim() {
    if (!alive || !renderer.domElement.isConnected) {
      alive = false;
      window.removeEventListener('resize', fit);
      renderer.dispose();
      return;
    }
    requestAnimationFrame(anim);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!drag) ty += dt * 0.18;
    core.rotation.y += (ty - core.rotation.y) * 0.08;
    core.rotation.x += (tx + Math.sin(performance.now() * 0.00035) * 0.12 - core.rotation.x) * 0.08;
    renderer.render(scene, camera);
  })();
}

function viewStudio() {
  App.el.innerHTML = `
  <main class="studio">
    <section class="st-hero">
      <div class="st-hero-copy">
        <p class="eyebrow">Interactive physics academy · MMXXVI</p>
        <h1 class="st-display">Make the<br><span>invisible</span><br>visible.</h1>
        <p class="st-intro">We turn the laws of physics into living simulations, draggable worlds, and moments that finally stick.</p>
        <button class="circle-link" id="st-scroll">↓<span>See the studies</span></button>
      </div>
      <div class="st-scene" id="st-scene"><div class="scene-label">Live study / 001 <span>Drag to explore</span></div></div>
      <div class="st-hero-bottom"><span>Scroll to enter</span><i class="rule"></i><span>Learn anywhere · works offline</span></div>
    </section>

    <section class="st-statement">
      <p class="eyebrow">Our point of view</p>
      <p class="statement-copy">A formula is not decoration.<br><span>It is motion, written down.</span></p>
    </section>

    <section class="st-work" id="st-work">
      <div class="st-head">
        <div>
          <p class="eyebrow">Selected studies</p>
          <h2>Physics in<br><i>motion.</i></h2>
        </div>
        <p class="st-note">A small archive of interactive systems<br>built from first principles.<br>Click any card to open its lesson.</p>
      </div>
      <div class="st-grid">
        ${STUDIES.map(s => `
        <article class="study" data-href="${chFirstLesson(s.ch)}">
          <div class="study-art ${s.cls}">
            <span class="art-shape"></span>
            <span class="study-num">${s.id}</span>
            <span class="study-go">↗</span>
          </div>
          <div class="study-meta">
            <div><h3>${esc(s.title)}</h3><p>${esc(s.type)}</p></div>
            <time>${s.mins}</time>
          </div>
        </article>`).join('')}
      </div>
    </section>

    <section class="st-method">
      <div>
        <p class="eyebrow">The method</p>
        <h2>Curiosity<br>with a<br><span>system.</span></h2>
      </div>
      <div class="step"><span>01</span><h3>Find the question</h3><p>Every lesson starts underneath the formula — with the why that made someone ask.</p></div>
      <div class="step"><span>02</span><h3>Build the world</h3><p>Drag sliders, tilt orbits, trace fields. Intuition is engineered, not assumed.</p></div>
      <div class="step"><span>03</span><h3>Prove it</h3><p>Derivations close the loop, then quizzes make sure the idea survives contact with an exam.</p></div>
    </section>

    <section class="st-cta">
      <h2>Ready to make<br><span>something move?</span></h2>
      <div class="st-cta-row">
        <a class="pill-btn" href="#/learn">▶ Start learning</a>
        <a class="pill-btn alt" href="#/practice">🎯 Test yourself</a>
        <a class="pill-btn" href="#/tutor">🤖 Ask the AI tutor</a>
      </div>
    </section>
  </main>`;

  mountStudioScene($('#st-scene'));
  $('#st-scroll').addEventListener('click', () =>
    $('#st-work').scrollIntoView({ behavior: 'smooth' }));
  $$('.study', App.el).forEach(card =>
    card.addEventListener('click', () => location.hash = card.dataset.href));
}
