/* PhysiX Academy — PhET integrations: official sims embedded via iframe (requires internet).
 * Simulations created by PhET Interactive Simulations, University of Colorado Boulder.
 * https://phet.colorado.edu — used under the PhET license (educational use, attribution). */
'use strict';

(function () {

  function phetRun(url, title, icon) {
    return function (frame) {
      const launch = SU.el('div', 'phet-launch');
      launch.innerHTML =
        '<div class="phet-launch-inner">' +
          '<div class="phet-launch-icon">' + icon + '</div>' +
          '<div class="phet-launch-title">' + title + '</div>' +
          '<div class="phet-launch-sub">Official simulation by <a href="https://phet.colorado.edu" target="_blank" rel="noopener">PhET Interactive Simulations, University of Colorado Boulder</a></div>' +
          '<button class="btn btn-primary btn-launch">Launch simulation ▸</button>' +
        '</div>';
      frame.appendChild(launch);
      launch.querySelector('.btn-launch').addEventListener('click', () => {
        frame.removeChild(launch);
        const wrap = SU.el('div', 'phet-embed');
        const iframe = document.createElement('iframe');
        iframe.className = 'phet-frame';
        iframe.src = url;
        iframe.setAttribute('allow', 'fullscreen; autoplay; clipboard-write');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation allow-pointer-lock');
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allowfullscreen', '');
        const loader = SU.el('div', 'phet-loader', '🚀 Starting simulation — by PhET Interactive Simulations…');
        wrap.appendChild(loader);
        wrap.appendChild(iframe);
        frame.appendChild(wrap);
        let shown = false;
        function show() { if (shown) return; shown = true; loader.classList.add('hide'); if (iframe.focus) try { iframe.focus(); } catch (e) {} }
        iframe.addEventListener('load', () => setTimeout(show, 1200));
        setTimeout(show, 8000);
      });
    };
  }

  const PHET = [
    ['phet-energy-skate-park', 'Energy Skate Park', 'Drag the skater and watch PE ↔ KE trade off. Conservation of energy at its best.', '🛹', 'energy-skate-park'],
    ['phet-forces-motion', 'Forces and Motion: Basics', 'Push objects on ice, balance forces, feel the difference between net force and acceleration.', '🚀', 'forces-and-motion-basics'],
    ['phet-projectile', 'Projectile Motion', 'Launch cannons, adjust speed and angle, air resistance toggle, hit the target.', '🎯', 'projectile-motion'],
    ['phet-circuit', 'Circuit Construction Kit: DC', 'Build series and parallel circuits with real voltmeter and ammeter.', '💡', 'circuit-construction-kit-dc'],
    ['phet-balancing', 'Balancing Act', 'Place objects on a plank, find the fulcrum sweet spot. Torque and equilibrium.', '⚖️', 'balancing-act'],
    ['phet-pendulum', 'Pendulum Lab', 'Length, mass, gravity: watch the period respond. SHM playground.', '🕰️', 'pendulum-lab'],
    ['phet-charges-fields', 'Charges and Fields', 'Place charges, trace field lines and equipotentials with a sensor.', '⚡', 'charges-and-fields'],
    ['phet-coulombs-law', "Coulomb's Law", 'Two charges, drag distances, force reads out live.', '🔋', 'coulombs-law'],
    ['phet-ohms-law', "Ohm's Law", 'Voltage and resistance sliders drive a real current meter.', '📏', 'ohms-law'],
    ['phet-springs', 'Masses and Springs', 'Hang masses, feel the spring stretch, read period and energy bars.', '🌀', 'masses-and-springs']
  ];

  PHET.forEach(p => {
    const url = 'https://phet.colorado.edu/sims/html/' + p[4] + '/latest/' + p[4] + '_en.html';
    Sims.register(p[0], p[1] + ' (PhET)', p[2] + ' Official PhET sim — works with an internet connection.', '🚀', phetRun(url, p[1], p[3]));
    Sims.reg[p[0]].phet = true;
  });

})();