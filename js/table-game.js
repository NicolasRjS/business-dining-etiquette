/* Set the Table: a game mode for the place setting.
   The pieces disappear, and the visitor puts each one back in its spot by
   dragging its name onto the table, or by selecting a name and then a spot. */
(function () {
  'use strict';

  var root = document.querySelector('[data-place-setting]');
  if (!root || !root.classList.contains('is-interactive')) { return; }

  var panel = root.querySelector('.ps-panel');
  var slots = Array.prototype.slice.call(root.querySelectorAll('.hotspot'));
  var HINTS = {
    'napkin': 'it sits at the far left, beside the forks.',
    'salad-fork': 'forks go on the left, and the first one you use is the outer one.',
    'dinner-fork': 'forks go on the left, and this one is closest to the plate.',
    'dinner-plate': 'it marks the center of your place.',
    'knife': 'knives go on the right, next to the plate.',
    'spoon': 'spoons go on the right, outside the knife.',
    'bread-plate': 'solids on the left: look at the upper left.',
    'dessert': 'dessert pieces lie above the plate.',
    'water-glass': 'liquids on the right: it is the glass closest to the plate.',
    'wine-glass': 'liquids on the right: it is the glass farthest out.'
  };
  var pieces = slots.map(function (slot) {
    return { key: slot.getAttribute('data-item'), name: slot.querySelector('.visually-hidden').textContent, number: slot.querySelector('[aria-hidden]').textContent };
  });
  var state = { selected: null, placed: 0, mistakes: 0, start: 0, on: false };

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (html !== undefined) { n.innerHTML = html; } return n; }

  /* ---- interface ---- */
  var modes = el('div', 'ps-modes',
    '<button type="button" class="btn" data-mode="explore" aria-pressed="true">Explore</button>' +
    '<button type="button" class="btn btn-quiet" data-mode="play" aria-pressed="false">Play: set the table</button>');
  root.parentNode.insertBefore(modes, root);

  var game = el('div', 'ps-game',
    '<h3>Set the table</h3>' +
    '<p class="ps-game-how">The table is empty. Drag each piece onto its spot, or select a piece and then a spot.</p>' +
    '<div class="chips" data-chips></div>' +
    '<p class="ps-game-status" role="status" aria-live="polite" data-status></p>' +
    '<p class="ps-game-score"><span data-placed>0</span> of 10 placed &middot; <span data-mistakes>0</span> mistakes</p>' +
    '<button type="button" class="btn btn-quiet" data-restart>Start again</button>');
  game.hidden = true;
  panel.appendChild(game);

  var chipBox = game.querySelector('[data-chips]');
  var status = game.querySelector('[data-status]');

  function art(key) { return root.querySelector('[data-art="' + key + '"]'); }

  function select(key) {
    state.selected = key;
    Array.prototype.forEach.call(chipBox.children, function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-key') === key ? 'true' : 'false');
    });
  }

  function start() {
    state.selected = null; state.placed = 0; state.mistakes = 0; state.start = Date.now();
    chipBox.innerHTML = '';
    pieces.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (p) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.textContent = p.name;
      chip.draggable = true;
      chip.setAttribute('data-key', p.key);
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () { select(state.selected === p.key ? null : p.key); status.textContent = state.selected ? p.name + ' selected. Now choose its spot on the table.' : ''; });
      chip.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', p.key); e.dataTransfer.effectAllowed = 'move'; select(p.key); });
      chipBox.appendChild(chip);
    });
    slots.forEach(function (slot, i) {
      slot.classList.remove('is-done', 'is-no', 'is-drop');
      slot.disabled = false;
      slot.querySelector('[aria-hidden]').textContent = '?';
      slot.querySelector('.visually-hidden').textContent = 'Empty spot ' + (i + 1);
      slot.setAttribute('aria-pressed', 'false');
    });
    pieces.forEach(function (p) { var g = art(p.key); g.classList.remove('is-placed', 'is-active'); });
    status.textContent = '';
    score();
  }

  function score() {
    game.querySelector('[data-placed]').textContent = state.placed;
    game.querySelector('[data-mistakes]').textContent = state.mistakes;
  }

  function drop(slot, key) {
    if (!state.on || !key || slot.disabled) { return; }
    var piece = pieces.filter(function (p) { return p.key === key; })[0];
    if (!piece) { return; }
    if (slot.getAttribute('data-item') === key) {
      state.placed += 1;
      art(key).classList.add('is-placed');
      slot.classList.add('is-done');
      slot.disabled = true;
      slot.querySelector('[aria-hidden]').textContent = piece.number;
      slot.querySelector('.visually-hidden').textContent = piece.name + ', placed';
      var chip = chipBox.querySelector('[data-key="' + key + '"]');
      if (chip) { chip.remove(); }
      select(null);
      status.textContent = piece.name + ': correct.';
      if (state.placed === pieces.length) {
        var secs = Math.round((Date.now() - state.start) / 1000);
        status.textContent = 'The table is set. ' + secs + ' seconds, ' + state.mistakes + (state.mistakes === 1 ? ' mistake.' : ' mistakes.') + (state.mistakes === 0 ? ' A perfect service.' : ' Try again for a clean run.');
        game.querySelector('[data-restart]').focus();
      }
    } else {
      state.mistakes += 1;
      slot.classList.remove('is-no');
      void slot.offsetWidth;
      slot.classList.add('is-no');
      status.textContent = 'Not there. Hint for the ' + piece.name.toLowerCase() + ': ' + HINTS[key];
    }
    score();
  }

  slots.forEach(function (slot) {
    /* In game mode this runs before the explore handler and replaces it. */
    slot.addEventListener('click', function (e) {
      if (!state.on) { return; }
      e.stopImmediatePropagation();
      if (!state.selected) { status.textContent = 'Select a piece first.'; return; }
      drop(slot, state.selected);
    }, true);
    slot.addEventListener('dragover', function (e) { if (state.on) { e.preventDefault(); slot.classList.add('is-drop'); } });
    slot.addEventListener('dragleave', function () { slot.classList.remove('is-drop'); });
    slot.addEventListener('drop', function (e) {
      if (!state.on) { return; }
      e.preventDefault();
      slot.classList.remove('is-drop');
      drop(slot, e.dataTransfer.getData('text/plain') || state.selected);
    });
  });

  function setMode(play) {
    state.on = play;
    root.classList.toggle('is-game', play);
    game.hidden = !play;
    Array.prototype.forEach.call(modes.children, function (b) {
      var on = (b.getAttribute('data-mode') === 'play') === play;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('btn-quiet', !on);
    });
    if (play) { start(); return; }
    slots.forEach(function (slot, i) {
      slot.disabled = false;
      slot.classList.remove('is-done', 'is-no', 'is-drop');
      slot.querySelector('[aria-hidden]').textContent = pieces[i].number;
      slot.querySelector('.visually-hidden').textContent = pieces[i].name;
    });
    pieces.forEach(function (p) { art(p.key).classList.remove('is-placed'); });
  }

  modes.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (b) { setMode(b.getAttribute('data-mode') === 'play'); }
  });
  game.querySelector('[data-restart]').addEventListener('click', start);
}());
