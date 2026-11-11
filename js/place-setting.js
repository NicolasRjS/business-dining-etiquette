/* Interactive place setting.
   Without JavaScript the page shows the full list of ten items.
   With JavaScript the numbered buttons on the drawing show one item at a time. */
(function () {
  'use strict';

  var root = document.querySelector('[data-place-setting]');
  if (!root) { return; }

  var hotspotBox = root.querySelector('.ps-hotspots');
  var hotspots = Array.prototype.slice.call(root.querySelectorAll('.hotspot'));
  var items = Array.prototype.slice.call(root.querySelectorAll('.ps-list > li'));
  var artParts = Array.prototype.slice.call(root.querySelectorAll('[data-art]'));
  var controls = root.querySelector('.ps-controls');
  var hint = root.querySelector('.ps-hint');
  var count = root.querySelector('[data-ps-count]');
  var prev = root.querySelector('[data-ps-prev]');
  var next = root.querySelector('[data-ps-next]');
  var current = -1;

  function show(index) {
    current = (index + items.length) % items.length;
    var name = items[current].getAttribute('data-item');

    items.forEach(function (li, i) { li.hidden = i !== current; });
    hotspots.forEach(function (btn) {
      var on = btn.getAttribute('data-item') === name;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    artParts.forEach(function (g) {
      g.classList.toggle('is-active', g.getAttribute('data-art') === name);
    });
    if (hint) { hint.hidden = true; }
    if (count) { count.textContent = (current + 1) + ' of ' + items.length; }
  }

  hotspots.forEach(function (btn) {
    btn.setAttribute('aria-controls', 'ps-panel');
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-item');
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-item') === name) { show(i); break; }
      }
    });
  });

  if (prev) { prev.addEventListener('click', function () { show(current - 1); }); }
  if (next) { next.addEventListener('click', function () { show(current + 1); }); }

  /* Switch from the plain list to the interactive view. */
  root.classList.add('is-interactive');
  hotspotBox.hidden = false;
  if (controls) { controls.hidden = false; }
  if (hint) { hint.hidden = false; }
  items.forEach(function (li) { li.hidden = true; });
  if (count) { count.textContent = items.length + ' items'; }
}());
