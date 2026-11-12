/* Site-wide effects: scroll progress, pointer ring with a trail of crumbs,
   click sparks, tilting cards, jumping headline letters, a spinning stamp,
   and marquees that lean with the scroll speed.
   Everything here is decoration: it is skipped for reduced motion, and the
   pointer effects only run on devices with a mouse. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  var doc = document.documentElement;
  var body = document.body;
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function el(tag, cls) { var n = document.createElement(tag); n.className = cls; n.setAttribute('aria-hidden', 'true'); return n; }

  /* ---- scroll progress bar ---- */
  var bar = el('div', 'fx-progress');
  body.appendChild(bar);

  /* ---- marquee before the footer on inner pages ---- */
  var footer = document.querySelector('.site-footer');
  if (footer && !document.querySelector('.marquee')) {
    var words = ['Bread on your left', 'Drinks on your right', 'Work from the outside in', 'Napkin on your lap', 'Phone off the table', 'Thank your server'];
    var band = el('div', 'marquee');
    for (var c = 0; c < 2; c++) {
      var ul = document.createElement('ul');
      ul.className = 'marquee-track';
      words.forEach(function (w) { var li = document.createElement('li'); li.textContent = w; ul.appendChild(li); });
      band.appendChild(ul);
    }
    footer.parentNode.insertBefore(band, footer);
  }

  /* ---- spinning stamp on the dark stages ---- */
  var stage = document.querySelector('.page-intro, .scene-pin');
  if (stage) {
    var stamp = el('div', 'fx-stamp');
    stamp.innerHTML = '<svg viewBox="0 0 200 200"><defs><path id="fx-circle" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs>' +
      '<text><textPath href="#fx-circle">BUSINESS DINING ETIQUETTE ✦ SIE 415/515 ✦ MIND YOUR MANNERS ✦ </textPath></text>' +
      '<circle cx="100" cy="100" r="34"/><circle class="fx-stamp-ring" cx="100" cy="100" r="22"/></svg>';
    stage.appendChild(stamp);
  }

  /* ---- headline letters ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.page-intro h1'), function (h) {
    var text = h.textContent;
    h.setAttribute('aria-label', text);
    h.textContent = '';
    var i = 0;
    text.split(' ').forEach(function (word, w, all) {
      var wrap = document.createElement('span');
      wrap.className = 'fx-word';
      wrap.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'fx-ch';
        s.textContent = ch;
        s.style.animationDelay = (i++ * 45) + 'ms';
        wrap.appendChild(s);
      });
      h.appendChild(wrap);
      if (w < all.length - 1) { h.appendChild(document.createTextNode(' ')); }
    });
  });

  /* ---- scroll: progress + speed-based lean ---- */
  var lastY = window.scrollY, lean = 0, ticking = false;
  function onFrame() {
    ticking = false;
    var y = window.scrollY;
    var room = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (room > 0 ? y / room : 0).toFixed(4) + ')';
    var target = Math.max(-14, Math.min(14, (y - lastY) * 0.35));
    lastY = y;
    lean += (target - lean) * 0.3;
    if (Math.abs(lean) < 0.05) { lean = 0; }
    doc.style.setProperty('--lean', lean.toFixed(2) + 'deg');
    if (lean !== 0) { queue(); }
  }
  function queue() { if (!ticking) { ticking = true; window.requestAnimationFrame(onFrame); } }
  window.addEventListener('scroll', queue, { passive: true });
  onFrame();

  if (!mouse) { return; }

  /* ---- pointer ring ---- */
  var ring = el('div', 'fx-ring is-out');
  body.appendChild(ring);
  var px = -100, py = -100, rx = -100, ry = -100, moving = false;
  function follow() {
    rx += (px - rx) * 0.2;
    ry += (py - ry) * 0.2;
    ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
    if (Math.abs(px - rx) > 0.3 || Math.abs(py - ry) > 0.3) { window.requestAnimationFrame(follow); } else { moving = false; }
  }

  /* ---- crumbs behind the pointer ---- */
  var lastCrumb = 0, crumbs = 0;
  function crumb(x, y) {
    var now = Date.now();
    if (now - lastCrumb < 45 || crumbs > 30) { return; }
    lastCrumb = now;
    crumbs += 1;
    var bit = el('span', 'fx-crumb c' + Math.floor(Math.random() * 4));
    bit.style.left = x + 'px';
    bit.style.top = y + 'px';
    bit.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 40) + 'px');
    bit.style.setProperty('--rot', Math.round(Math.random() * 360) + 'deg');
    body.appendChild(bit);
    window.setTimeout(function () { bit.remove(); crumbs -= 1; }, 800);
  }

  window.addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY;
    ring.classList.remove('is-out');
    if (!moving) { moving = true; window.requestAnimationFrame(follow); }
    ring.classList.toggle('is-link', !!e.target.closest('a, button, label, summary, input'));
    crumb(e.clientX, e.clientY);
  }, { passive: true });
  doc.addEventListener('pointerleave', function () { ring.classList.add('is-out'); });
  doc.addEventListener('pointerenter', function () { ring.classList.remove('is-out'); });

  /* ---- sparks on click ---- */
  window.addEventListener('pointerdown', function (e) {
    for (var i = 0; i < 10; i++) {
      var s = el('span', 'fx-spark c' + (i % 4));
      var angle = (Math.PI * 2 * i) / 10;
      var reach = 40 + Math.random() * 40;
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', Math.round(Math.cos(angle) * reach) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(angle) * reach) + 'px');
      body.appendChild(s);
      (function (node) { window.setTimeout(function () { node.remove(); }, 600); }(s));
    }
  }, { passive: true });

  /* ---- cards lean toward the pointer ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.side-box, .quote, .ps-stage, .game-stats div, .rules li'), function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(60rem) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateZ(0)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  /* ---- buttons pull toward the pointer ---- */
  body.addEventListener('pointermove', function (e) {
    var btn = e.target.closest('.btn, .nav-list a');
    if (!btn) { return; }
    var r = btn.getBoundingClientRect();
    btn.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px';
    if (!btn.fxBound) {
      btn.fxBound = true;
      btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
    }
  }, { passive: true });
}());
