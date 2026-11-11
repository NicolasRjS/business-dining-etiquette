/* Shared motion: content blocks rise into view once as the page scrolls.
   Skipped entirely when the visitor prefers reduced motion. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  if (!('IntersectionObserver' in window)) { return; }

  var selector = [
    '.section-head', '.rules li', '.paths li', '.play-cta',
    '.prose > h2', '.prose > h3', '.prose > p', '.prose > ul', '.prose > .note', '.prose > .quote', '.prose > .table-scroll',
    '.side-box', '.ps', '.section > .table-scroll', '.section > .note',
    '.refs li', '.link-list li', '.next-step'
  ].join(',');

  var blocks = Array.prototype.slice.call(document.querySelectorAll(selector));
  var limit = window.innerHeight * 0.92;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  blocks.forEach(function (el, i) {
    /* Blocks already on screen stay as they are; only the ones below animate. */
    if (el.getBoundingClientRect().top < limit) { return; }
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', ((i % 5) * 60) + 'ms');
    observer.observe(el);
  });
}());
