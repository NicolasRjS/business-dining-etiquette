/* Reading pages as a journey (Plan Ahead and Carreño).
   Each numbered heading and the content under it becomes a full-width
   "chapter" with its own color and a giant numeral that drifts while the
   page scrolls. Quotations are typed out letter by letter when they appear.
   This script must load before motion.js. */
(function () {
  'use strict';

  var prose = document.querySelector('.with-aside > .prose');
  if (!prose) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var layout = prose.parentNode;
  var chapters = [];
  var current = null;

  Array.prototype.slice.call(prose.children).forEach(function (node) {
    if (node.tagName === 'H2') {
      current = document.createElement('section');
      var match = node.textContent.match(/^\s*(\d+)\./);
      current.className = 'chapter t' + (chapters.length % 4);
      current.setAttribute('data-n', match ? match[1] : String(chapters.length + 1));
      prose.insertBefore(current, node);
      chapters.push(current);
    }
    if (current) { current.appendChild(node); }
  });
  if (!chapters.length) { return; }

  layout.classList.add('is-journey');

  /* ---- quotations typed letter by letter ---- */
  function type(p) {
    var text = p.textContent;
    p.setAttribute('aria-label', text);
    p.textContent = '';
    p.classList.add('is-typing');
    var i = 0;
    var timer = window.setInterval(function () {
      i += 1;
      p.textContent = text.slice(0, i);
      if (i >= text.length) { window.clearInterval(timer); p.classList.remove('is-typing'); p.classList.add('is-typed'); }
    }, 32);
  }

  if (reduce || !('IntersectionObserver' in window)) {
    chapters.forEach(function (ch) { ch.classList.add('is-in'); });
    return;
  }

  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      entry.target.classList.add('is-in');
      seen.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  chapters.forEach(function (ch) {
    if (ch.getBoundingClientRect().top < window.innerHeight * 0.85) { ch.classList.add('is-in'); } else { seen.observe(ch); }
  });

  var quotes = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      quotes.unobserve(entry.target);
      type(entry.target);
    });
  }, { threshold: 0.6 });
  Array.prototype.forEach.call(prose.querySelectorAll('.quote blockquote p'), function (p) {
    p.style.minHeight = p.offsetHeight + 'px';
    quotes.observe(p);
  });

  /* ---- giant numerals drift with the scroll ---- */
  var ticking = false;
  function drift() {
    ticking = false;
    var h = window.innerHeight;
    chapters.forEach(function (ch) {
      var r = ch.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) { return; }
      var t = (r.top + r.height / 2 - h / 2) / h;   /* -1 .. 1 around the middle of the screen */
      ch.style.setProperty('--shift', (t * -9).toFixed(2) + 'rem');
      ch.style.setProperty('--turn', (t * 10).toFixed(2) + 'deg');
    });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(drift); }
  }, { passive: true });
  drift();
}());
