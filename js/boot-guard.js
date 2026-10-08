/* PhysiX Academy - boot guard and error boundary (classic script, not a module).
 *
 * Loaded as a plain <script> in <head>, before the deferred module entry point.
 * That placement is the whole point: if any of the ~50 imports in js/main.js
 * throws, or a module 404s, the module graph never evaluates and no code inside
 * those modules can run. A boundary written as a module would be part of the
 * thing that failed. This one is already loaded and listening.
 *
 * Three jobs:
 *   1. Show something readable instead of a blank page if boot never completes.
 *   2. Give the router somewhere to report a failed render.
 *   3. Record uncaught errors so they can be reported without spamming the
 *      console, and never let a reporting path throw itself.
 *
 * Every failure message reaches the DOM as textContent, never as innerHTML:
 * these strings come from exception messages, which can contain whatever the
 * failing code put there.
 */
(function () {
  'use strict';

  var BOOT_TIMEOUT_MS = 9000;
  var errors = [];

  /* Never let the reporter be the reason a page dies. */
  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function record(kind, detail) {
    errors.push({ kind: kind, detail: String(detail), t: Date.now() });
    if (errors.length > 25) errors.shift();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host() {
    return document.getElementById('main') || document.body;
  }

  /* Renders the failure panel. `opts.retry` is only supplied by the router,
     where re-running the render actually makes sense. */
  function fail(opts) {
    opts = opts || {};
    return safe(function () {
      var h = host();
      if (!h) return false;

      var box = document.createElement('div');
      box.className = 'wrap';
      box.setAttribute('role', 'alert');

      var card = document.createElement('div');
      card.className = 'card';
      card.style.maxWidth = '640px';
      card.style.margin = '3rem auto';

      var h1 = document.createElement('h1');
      h1.style.marginTop = '0';
      h1.textContent = opts.title || 'This page did not load';
      card.appendChild(h1);

      var p = document.createElement('p');
      p.className = 'muted';
      p.textContent = opts.message ||
        'Something went wrong on our side, not yours. The rest of the site still works.';
      card.appendChild(p);

      var row = document.createElement('div');
      row.className = 'btn-row';
      row.style.marginTop = '1.2rem';

      var again = document.createElement('button');
      again.className = 'btn btn-primary';
      again.type = 'button';
      again.textContent = 'Try again';
      again.addEventListener('click', function () {
        safe(function () { location.reload(); });
      });
      row.appendChild(again);

      var home = document.createElement('a');
      home.className = 'btn';
      home.href = '#/';
      home.textContent = 'Back to home';
      home.addEventListener('click', function () {
        safe(function () { location.hash = '#/'; });
      });
      row.appendChild(home);
      card.appendChild(row);

      var detail = opts.detail;
      if (detail) {
        var d = document.createElement('details');
        d.style.marginTop = '1.4rem';
        var s = document.createElement('summary');
        s.textContent = 'Technical detail';
        var pre = document.createElement('pre');
        pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:.8rem;'
          + 'background:var(--panel2);padding:.8rem;border-radius:10px;overflow:auto;max-height:14rem';
        pre.textContent = detail;
        d.appendChild(s);
        d.appendChild(pre);
        card.appendChild(d);
      }

      box.appendChild(card);
      h.replaceChildren(box);
      h.scrollTop = 0;
      return true;
    }, false);
  }

  /* ---- global listeners, installed as early as possible ---- */
  window.addEventListener('error', function (ev) {
    record('error', (ev.message || 'error') + (ev.filename ? ' @ ' + ev.filename + ':' + ev.lineno : ''));
  }, true);

  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    record('unhandledrejection', (r && (r.stack || r.message)) || r);
  });

  /* ---- boot watchdog ----
     A silent, total import failure is otherwise indistinguishable from a slow
     connection: the visitor just stares at a blank page. */
  var timer = setTimeout(function () {
    if (window.__PHYSIX_BOOTED) return;
    fail({
      title: 'The app did not start',
      message: 'A script failed to load, so the interactive parts could not start. '
             + 'Your saved progress is untouched.',
      detail: errors.map(function (e) { return e.kind + ': ' + e.detail; }).join('\n\n')
             || 'No error was reported, which usually means the script never arrived (offline, or a proxy stripped it).'
    });
  }, BOOT_TIMEOUT_MS);

  /* If boot succeeds, disarm the watchdog so it can never race a slow render. */
  Object.defineProperty(window, '__PHYSIX_BOOTED', {
    configurable: true,
    get: function () { return window.__physixBooted === true; },
    set: function (v) {
      window.__physixBooted = v === true;
      if (window.__physixBooted) clearTimeout(timer);
    }
  });

  window.physixErrors = errors;
  window.physixFail = fail;

  /* Called by the router when a view throws. Returns true so the router can
     decide whether to fall through to its own recovery. */
  window.physixRenderFailed = function (detail) {
    record('render', detail);
    return fail({
      title: 'This page hit a problem',
      message: 'One part of the page failed to draw. The rest of the site is fine.',
      detail: detail
    });
  };
})();