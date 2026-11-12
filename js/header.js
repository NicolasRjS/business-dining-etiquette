/* Keeps the navigation within reach.
   On wide screens the header stays at the top of the window all the time.
   On small screens it slides away while scrolling down, to save space, and
   comes back as soon as the visitor scrolls up. */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  if (!header) { return; }

  var root = document.documentElement;
  function measure() { root.style.setProperty('--header-h', header.offsetHeight + 'px'); }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (y > lastY + 6 && y > header.offsetHeight * 2) { header.classList.add('is-away'); }
    if (y < lastY - 6 || y < header.offsetHeight) { header.classList.remove('is-away'); }
    lastY = y;
  }, { passive: true });

  /* Keyboard users always get the header back when they tab into it. */
  header.addEventListener('focusin', function () { header.classList.remove('is-away'); });
}());
