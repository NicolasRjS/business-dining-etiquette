/* Home page scene: a business dinner told with the scroll.
   Act 1: the pieces start scattered and glide into a correct place setting.
   Act 2: the dinner happens. The napkin goes to the lap, the soup arrives,
   the wine is poured, a phone shows up and is thrown out, and the fork and
   knife end together on the plate. Every step shows its rule in large type.
   Pieces also drift with the pointer.
   Without JavaScript, or with reduced motion, the finished table is shown. */
(function () {
  'use strict';

  var scene = document.querySelector('[data-scene]');
  if (!scene) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var caption = scene.querySelector('[data-scene-caption]');
  var shout = scene.querySelector('[data-scene-shout]');
  var meter = scene.querySelector('[data-scene-meter]');
  var copy = scene.querySelector('.scene-copy');
  var table = scene.querySelector('.scene-table');
  var mat = scene.querySelector('.sc-mat');
  var labels = scene.querySelector('.sc-labels');
  var soup = scene.querySelector('.sc-soup');
  var phone = scene.querySelector('.sc-phone');
  var wine = scene.querySelector('[data-key="wine-glass"] .sc-liquid');

  var pieces = Array.prototype.map.call(scene.querySelectorAll('.pc'), function (el) {
    var from = el.getAttribute('data-from').split(',').map(Number);
    return {
      el: el, key: el.getAttribute('data-key'),
      dx: from[0], dy: from[1], rot: from[2],
      depth: Number(el.getAttribute('data-depth')),
      seq: Number(el.getAttribute('data-seq'))
    };
  });

  var SET = 0.38;   /* share of the scroll used to set the table */

  /* [start, small caption, big rule] */
  var steps = [
    [0.00, 'Scroll down to set the table', ''],
    [0.04, 'The dinner plate marks the center of your place', ''],
    [0.11, 'Napkin and forks go on the left', ''],
    [0.19, 'Knife and spoon go on the right', ''],
    [0.25, 'Bread plate at the upper left, dessert pieces above', ''],
    [0.31, 'Glasses at the upper right', ''],
    [0.36, 'Solids on the left, liquids on the right. The table is set.', ''],
    [0.42, 'Unfold it once everyone is seated.', 'Napkin on your lap.'],
    [0.54, 'The host signals when it is time to start eating.', 'Wait for your host.'],
    [0.66, 'And only if your host orders alcohol first.', 'One or two drinks. No more.'],
    [0.77, 'Silent, out of sight, never ringing.', 'Phone off the table.'],
    [0.90, 'Side by side on the plate means: I have finished.', 'Fork and knife together.']
  ];

  if (reduce) {
    if (caption) { caption.textContent = steps[6][1]; }
    if (meter) { meter.style.transform = 'scaleX(1)'; }
    return;
  }

  scene.classList.add('is-live');

  var progress = 0;
  var pointerX = 0, pointerY = 0, driftX = 0, driftY = 0;
  var visible = true, frame = null, lastStep = -1;

  function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(a, b) { return ease(clamp((progress - a) / (b - a))); }

  function readScroll() {
    var rect = scene.getBoundingClientRect();
    var room = rect.height - window.innerHeight;
    progress = room > 0 ? clamp(-rect.top / room) : 1;
  }

  function draw() {
    frame = null;
    driftX += (pointerX - driftX) * 0.08;
    driftY += (pointerY - driftY) * 0.08;

    var setP = clamp(progress / SET);
    var lap = seg(0.43, 0.52);      /* napkin leaves for the lap */
    var done = seg(0.91, 0.98);     /* fork and knife end on the plate */

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      var t = ease(clamp((setP - p.seq * 0.085) / 0.22));
      var left = 1 - t;
      var x = p.dx * left + driftX * p.depth * 16;
      var y = p.dy * left + driftY * p.depth * 12;
      var r = p.rot * left + driftX * p.depth * 1.5;
      var alpha = 0.3 + 0.7 * t;

      if (p.key === 'napkin') { y += lap * 380; r += lap * 24; alpha *= 1 - lap; }
      if (p.key === 'dinner-fork') { x += done * 128; y += done * 10; r += done * 24; }
      if (p.key === 'knife') { x -= done * 150; y += done * 10; r += done * 24; }

      p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg)';
      p.el.style.opacity = alpha.toFixed(2);
    }

    /* The headline steps aside so the table can take the whole stage. */
    if (copy) {
      var gone = clamp((progress - 0.015) / 0.06);
      copy.style.opacity = (1 - gone).toFixed(2);
      copy.style.transform = 'translateY(' + (-60 * gone).toFixed(1) + 'px) scale(' + (1 - 0.06 * gone).toFixed(3) + ')';
      copy.style.pointerEvents = gone > 0.9 ? 'none' : '';
    }
    if (mat) { mat.style.opacity = (0.25 + 0.75 * clamp(progress / 0.08)).toFixed(2); }
    if (labels) { labels.style.opacity = (seg(0.35, 0.38) * (1 - seg(0.41, 0.44))).toFixed(2); }

    /* Act 2: the table moves down a little to make room for the big rule. */
    if (table) {
      var act2 = seg(0.40, 0.46);
      /* Shrink only as much as the big rule needs, so the table stays large on short screens. */
      var need = shout ? parseFloat(window.getComputedStyle(shout).fontSize) * 1.2 : 0;
      var shrink = Math.max(0.08, Math.min(0.2, need / (table.offsetHeight || 1)));
      table.style.transform = 'translateY(' + (act2 * -3).toFixed(2) + '%) scale(' + (1 - shrink * act2).toFixed(3) + ')';
    }
    if (soup) {
      var s = seg(0.55, 0.62) * (1 - seg(0.87, 0.91));
      soup.style.opacity = s.toFixed(2);
      soup.style.transform = 'scale(' + (0.3 + 0.7 * s).toFixed(3) + ') rotate(' + ((1 - s) * -90).toFixed(1) + 'deg)';
    }
    if (wine) { wine.style.transform = 'scale(' + (0.3 + 0.7 * seg(0.67, 0.75)).toFixed(3) + ')'; }
    if (phone) {
      var inP = seg(0.775, 0.81), out = seg(0.84, 0.895);
      phone.style.opacity = (inP * (1 - out)).toFixed(2);
      phone.style.transform = 'translate(' + ((1 - inP) * 260 + out * 620).toFixed(1) + 'px,' + (out * -520).toFixed(1) + 'px) rotate(' + ((1 - inP) * 20 + out * 760).toFixed(1) + 'deg)';
      phone.classList.toggle('is-ringing', inP > 0.9 && out < 0.05);
    }

    var step = 0;
    for (var k = 0; k < steps.length; k++) { if (progress >= steps[k][0]) { step = k; } }
    if (step !== lastStep) {
      lastStep = step;
      swap(caption, steps[step][1]);
      swap(shout, steps[step][2]);
    }
    if (meter) { meter.style.transform = 'scaleX(' + progress.toFixed(3) + ')'; }

    /* Candlelight follows the pointer. */
    scene.style.setProperty('--mx', (50 + driftX * 50).toFixed(1) + '%');
    scene.style.setProperty('--my', (50 + driftY * 50).toFixed(1) + '%');

    if (visible && (Math.abs(pointerX - driftX) > 0.002 || Math.abs(pointerY - driftY) > 0.002)) { request(); }
  }

  function swap(node, text) {
    if (!node) { return; }
    node.textContent = text;
    node.classList.remove('is-swap');
    void node.offsetWidth;
    node.classList.add('is-swap');
  }

  function request() {
    if (frame === null) { frame = window.requestAnimationFrame(draw); }
  }

  window.addEventListener('scroll', function () { readScroll(); request(); }, { passive: true });
  window.addEventListener('resize', function () { readScroll(); request(); });

  scene.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') { return; }
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    request();
  });
  scene.addEventListener('pointerleave', function () { pointerX = 0; pointerY = 0; request(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { request(); }
    }).observe(scene);
  }

  readScroll();
  draw();
}());
