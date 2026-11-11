/* Home page scene: the table sets itself.
   The pieces start scattered. As the visitor scrolls, each one glides into its
   correct position, and every piece drifts slightly with the pointer.
   Without JavaScript, or with reduced motion, the finished table is shown. */
(function () {
  'use strict';

  var scene = document.querySelector('[data-scene]');
  if (!scene) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var caption = scene.querySelector('[data-scene-caption]');
  var meter = scene.querySelector('[data-scene-meter]');
  var copy = scene.querySelector('.scene-copy');
  var mat = scene.querySelector('.sc-mat');
  var labels = scene.querySelector('.sc-labels');
  var pieces = Array.prototype.map.call(scene.querySelectorAll('.pc'), function (el) {
    var from = el.getAttribute('data-from').split(',').map(Number);
    return {
      el: el,
      dx: from[0], dy: from[1], rot: from[2],
      depth: Number(el.getAttribute('data-depth')),
      seq: Number(el.getAttribute('data-seq'))
    };
  });

  var steps = [
    [0.00, 'Scroll down to set the table'],
    [0.10, 'The dinner plate marks the center of your place'],
    [0.30, 'Napkin and forks go on the left'],
    [0.50, 'Knife and spoon go on the right'],
    [0.66, 'Bread plate at the upper left, dessert pieces above'],
    [0.82, 'Glasses at the upper right'],
    [0.97, 'Solids on the left, liquids on the right. The table is set.']
  ];

  if (reduce) {
    if (caption) { caption.textContent = steps[steps.length - 1][1]; }
    if (meter) { meter.style.transform = 'scaleX(1)'; }
    return;
  }

  scene.classList.add('is-live');

  var progress = 0;      // 0 = scattered, 1 = table set
  var pointerX = 0, pointerY = 0;   // target, from -1 to 1
  var driftX = 0, driftY = 0;       // smoothed
  var visible = true;
  var frame = null;
  var lastCaption = '';

  function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function readScroll() {
    var rect = scene.getBoundingClientRect();
    var room = rect.height - window.innerHeight;
    progress = room > 0 ? clamp(-rect.top / room) : 1;
  }

  function draw() {
    frame = null;
    driftX += (pointerX - driftX) * 0.08;
    driftY += (pointerY - driftY) * 0.08;

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      var start = p.seq * 0.085;
      var t = ease(clamp((progress - start) / 0.22));
      var left = 1 - t;
      var x = p.dx * left + driftX * p.depth * 16;
      var y = p.dy * left + driftY * p.depth * 12;
      var r = p.rot * left + driftX * p.depth * 1.5;
      p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg)';
      p.el.style.opacity = (0.3 + 0.7 * t).toFixed(2);
    }

    /* The headline steps aside so the table can take the whole stage. */
    if (copy) {
      var gone = clamp((progress - 0.04) / 0.16);
      copy.style.opacity = (1 - gone).toFixed(2);
      copy.style.transform = 'translateY(' + (-60 * gone).toFixed(1) + 'px) scale(' + (1 - 0.06 * gone).toFixed(3) + ')';
      copy.style.pointerEvents = gone > 0.9 ? 'none' : '';
    }
    if (mat) { mat.style.opacity = (0.25 + 0.75 * clamp(progress / 0.2)).toFixed(2); }
    if (labels) { labels.style.opacity = clamp((progress - 0.93) / 0.06).toFixed(2); }

    /* Candlelight follows the pointer. */
    scene.style.setProperty('--mx', (50 + driftX * 50).toFixed(1) + '%');
    scene.style.setProperty('--my', (50 + driftY * 50).toFixed(1) + '%');

    var text = steps[0][1];
    for (var s = 0; s < steps.length; s++) {
      if (progress >= steps[s][0]) { text = steps[s][1]; }
    }
    if (caption && text !== lastCaption) {
      lastCaption = text;
      caption.textContent = text;
      caption.classList.remove('is-swap');
      void caption.offsetWidth;
      caption.classList.add('is-swap');
    }
    if (meter) { meter.style.transform = 'scaleX(' + progress.toFixed(3) + ')'; }

    if (visible && (Math.abs(pointerX - driftX) > 0.002 || Math.abs(pointerY - driftY) > 0.002)) {
      request();
    }
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
