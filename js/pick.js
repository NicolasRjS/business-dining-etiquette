/* Plan Ahead mini game: which restaurant would you book?
   Without JavaScript each card simply shows its verdict under its description.
   With JavaScript the cards flip when the visitor books one. */
(function () {
  'use strict';

  var root = document.querySelector('[data-pick]');
  if (!root) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(root.querySelectorAll('.pick-card'));
  var status = root.querySelector('.pick-status');
  var tries = 0;

  /* Noise meters: five bars, the loud ones dance. */
  Array.prototype.forEach.call(root.querySelectorAll('.meter'), function (meter) {
    var level = Number(meter.getAttribute('data-level'));
    var label = meter.textContent;
    meter.textContent = '';
    for (var i = 1; i <= 5; i++) {
      var bar = document.createElement('i');
      if (i <= level) { bar.className = 'is-on'; bar.style.animationDelay = (i * 90) + 'ms'; }
      meter.appendChild(bar);
    }
    var text = document.createElement('span');
    text.textContent = label;
    meter.appendChild(text);
  });

  function burst(card) {
    if (reduce) { return; }
    for (var i = 0; i < 26; i++) {
      var bit = document.createElement('span');
      bit.className = 'confetti c' + (i % 4);
      bit.style.left = '50%';
      bit.style.top = '40%';
      bit.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 420) + 'px');
      bit.style.setProperty('--dy', Math.round(-80 - Math.random() * 220) + 'px');
      bit.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      card.appendChild(bit);
      (function (node) { window.setTimeout(function () { node.remove(); }, 1000); }(bit));
    }
  }

  cards.forEach(function (card) {
    var ok = card.getAttribute('data-ok') === 'true';
    var name = card.querySelector('h4').textContent;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn pick-btn';
    btn.textContent = 'Book this table';
    btn.setAttribute('aria-label', 'Book a table at ' + name);
    card.querySelector('.pick-front').appendChild(btn);

    btn.addEventListener('click', function () {
      if (card.classList.contains('is-flipped')) { return; }
      tries += 1;
      card.classList.add('is-flipped', ok ? 'is-good' : 'is-bad');
      btn.disabled = true;
      var why = card.querySelector('.pick-back').textContent.replace(/\s+/g, ' ').trim();
      if (ok) {
        burst(card);
        status.textContent = (tries === 1 ? 'First try. ' : 'Found it in ' + tries + ' tries. ') + 'Flip the other cards to see why they fail.';
      } else {
        status.textContent = name + ': ' + why;
      }
    });
  });

  var again = document.createElement('button');
  again.type = 'button';
  again.className = 'btn btn-quiet pick-again';
  again.textContent = 'Reset the cards';
  again.addEventListener('click', function () {
    tries = 0;
    status.textContent = '';
    cards.forEach(function (card) {
      card.classList.remove('is-flipped', 'is-good', 'is-bad');
      card.querySelector('.pick-btn').disabled = false;
    });
  });
  root.appendChild(again);

  root.classList.add('is-live');
}());
