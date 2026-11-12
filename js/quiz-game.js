/* Table Invaders: the quiz as a retro arcade game.
   Reads the ten questions from the plain HTML form. Each question is a wave:
   four pieces of tableware, numbered 1 to 4, carry the four answers. The
   player is a fork. There is no aiming: the player only chooses a target
   (an answer in the list, a key from 1 to 4, or the piece itself on the
   field) and the fork slides under it and throws a knife or a spoon. The
   right target scores; a wrong one, or letting them reach the table, breaks
   one of three glasses. Everything is drawn on a low-resolution canvas with
   colors taken from tokens.css. The plain list of questions stays available
   at any time. */
(function () {
  'use strict';

  var form = document.querySelector('[data-quiz]');
  if (!form || !document.createElement('canvas').getContext) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 256, H = 200;            /* logical pixels of the playfield */
  var LIVES = 3;
  var FLOOR = 184;                 /* top of the tablecloth */
  var LINE = 146;                  /* the tableware must not cross this line */
  var START_Y = 36;
  var LANES = [34, 97, 159, 222];
  var NAMES = ['Plate', 'Glass', 'Cup', 'Cloche'];

  /* ---------- questions, read from the form ---------- */
  var questions = Array.prototype.map.call(form.querySelectorAll('.q'), function (q) {
    var answer = q.getAttribute('data-answer');
    var options = [], correct = 0;
    Array.prototype.forEach.call(q.querySelectorAll('input'), function (input, i) {
      options.push(input.closest('.q-option').querySelector('span').textContent);
      if (input.value === answer) { correct = i; }
    });
    var feedback = q.querySelector('.q-feedback').cloneNode(true);
    var result = feedback.querySelector('.q-result');
    if (result) { result.remove(); }
    return { text: q.querySelector('legend').textContent, options: options, correct: correct, why: feedback.innerHTML };
  });

  /* ---------- colors from the design tokens ---------- */
  var css = window.getComputedStyle(document.documentElement);
  function token(name) { return css.getPropertyValue(name).trim(); }
  var PAL = {
    W: token('--surface'), P: token('--rule'), S: token('--steel'), N: token('--stage-line'),
    K: token('--stage-deep'), G: token('--gold'), R: token('--accent-bright'), B: token('--water'),
    E: token('--good-bright')
  };

  /* ---------- pixel art ---------- */
  var ART = {
    fork: [
      'S...S...S',
      'S...S...S',
      'S...S...S',
      'S...S...S',
      'S...S...S',
      'SSSSSSSSS',
      'SSKSSSKSS',
      '.SSSSSSS.',
      '..SSSSS..',
      '...SSS...',
      '...SNS...',
      '...SNS...',
      '...SNS...',
      '...SNS...',
      '...SNS...',
      '...SSS...'
    ],
    plate: [
      '....WWWWWWWW....',
      '..WWWWWWWWWWWW..',
      '.WWWPPPPPPPPWWW.',
      'WWWPWWWWWWWWPWWW',
      'WWPWKKWWWWKKWPWW',
      'WWPWWKWWWWKWWPWW',
      'WWPWWWWWWWWWWPWW',
      'WWWPWWKKKKWWPWWW',
      '.WWWPPPPPPPPWWW.',
      '..WWWWWWWWWWWW..',
      '....WWWWWWWW....'
    ],
    glass: [
      '..BBBBBBBBBBBB..',
      '..BWWWWWWWWWWB..',
      '..BRRRRRRRRRRB..',
      '..BRKKRRRRKKRB..',
      '..BRRKRRRRKRRB..',
      '..BRRRRRRRRRRB..',
      '...BRRRRRRRRB...',
      '....BRRRRRRB....',
      '.....BBBBBB.....',
      '.......BB.......',
      '.......BB.......',
      '.......BB.......',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...'
    ],
    cup: [
      '..WWWWWWWWWW....',
      '..WGGGGGGGGW....',
      '..WWWWWWWWWWWW..',
      '..WKKWWWWKKW.WW.',
      '..WWKWWWWKWW..W.',
      '..WWWWWWWWWW.WW.',
      '...WWWWWWWWWWW..',
      '...WWWWWWWW.....',
      '....WWWWWW......',
      '.PPPPPPPPPPPP...',
      '..PPPPPPPPPP....'
    ],
    cloche: [
      '.......GG.......',
      '......SSSS......',
      '....SSSSSSSS....',
      '...SSWSSSSSSS...',
      '..SSWSSSSSSSSS..',
      '..SWKKSSSSKKSS..',
      '.SSSSKSSSSKSSSS.',
      '.SSSSSSSSSSSSSS.',
      '.SSSSSSSSSSSSSS.',
      'NNNNNNNNNNNNNNNN',
      '.WWWWWWWWWWWWWW.'
    ],
    knife: [
      '.S.',
      'SS.',
      'SS.',
      'SS.',
      'SS.',
      'SS.',
      'NNN',
      '.G.',
      '.G.',
      '.G.'
    ],
    spoon: [
      '.S.',
      'SSS',
      'SSS',
      'SSS',
      '.S.',
      '.N.',
      '.N.',
      '.N.',
      '.N.',
      '.N.'
    ],
    life: [
      'BBBBBBBB',
      'BWWWWWWB',
      'BRRRRRRB',
      'BRRRRRRB',
      '.BRRRRB.',
      '..BBBB..',
      '...BB...',
      '...BB...',
      '...BB...',
      '.BBBBBB.'
    ]
  };
  var DIGITS = [
    ['010', '110', '010', '010', '111'],
    ['111', '001', '111', '100', '111'],
    ['111', '001', '111', '001', '111'],
    ['101', '101', '111', '001', '001']
  ];
  var TYPES = ['plate', 'glass', 'cup', 'cloche'];

  function sprite(rows, tint) {
    var c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    var g = c.getContext('2d');
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var ch = row.charAt(x);
        if (ch === '.') { continue; }
        g.fillStyle = tint || PAL[ch];
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }
  var IMG = {}, FLASH = {};
  Object.keys(ART).forEach(function (name) { IMG[name] = sprite(ART[name]); FLASH[name] = sprite(ART[name], PAL.R); });

  /* a sprite as a crisp, scalable element for the HUD and the answer list */
  function icon(name, cls) {
    var c = document.createElement('canvas');
    c.width = IMG[name].width;
    c.height = IMG[name].height;
    c.getContext('2d').drawImage(IMG[name], 0, 0);
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  /* ---------- small helpers ---------- */
  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (html !== undefined) { node.innerHTML = html; }
    return node;
  }
  function pad(n, size) { var s = String(n); while (s.length < size) { s = '0' + s; } return s; }
  function readBest() { try { return Number(window.localStorage.getItem('bde-arcade-best')) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { window.localStorage.setItem('bde-arcade-best', String(v)); } catch (e) { /* storage not available */ } }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  /* ---------- sound (off until the player turns it on) ---------- */
  var audio = null, soundOn = false;
  function beep(freq, dur, slide, type) {
    if (!soundOn) { return; }
    try {
      if (!audio) { audio = new (window.AudioContext || window.webkitAudioContext)(); }
      var osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, now);
      if (slide) { osc.frequency.exponentialRampToValueAtTime(slide, now + dur); }
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(now); osc.stop(now + dur);
    } catch (e) { /* no audio available */ }
  }
  var SFX = {
    shoot: function () { beep(880, 0.09, 440); },
    right: function () { beep(523, 0.08); window.setTimeout(function () { beep(659, 0.08); }, 80); window.setTimeout(function () { beep(784, 0.16); }, 160); },
    wrong: function () { beep(196, 0.3, 82, 'sawtooth'); },
    wave: function () { beep(330, 0.07); window.setTimeout(function () { beep(440, 0.1); }, 90); }
  };

  /* ---------- build the cabinet ---------- */
  var game = el('div', 'game arcade');
  var live = el('p', 'visually-hidden');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');

  var startScreen = el('div', 'game-screen arc-start',
    '<p class="arc-kicker">The quiz, as a 90s arcade game</p>' +
    '<h2 class="arc-title">Table Invaders</h2>' +
    '<p class="arc-lede">Ten questions, ten waves. Four pieces of rogue tableware carry the four answers. You are the fork: pick the one that carries the right answer, and the fork throws its cutlery at it before they reach the table.</p>' +
    '<ul class="arc-cast" data-cast></ul>' +
    '<ul class="arc-rules">' +
      '<li><strong>Right dish:</strong> +100, plus a speed bonus and a streak bonus</li>' +
      '<li><strong>Wrong dish, or too slow:</strong> one of your three glasses breaks</li>' +
      '<li><strong>How to play:</strong> choose your target and the fork does the rest. Select an answer, select the piece on the field, or press 1, 2, 3 or 4</li>' +
    '</ul>' +
    '<label class="arc-check"><input type="checkbox" data-relaxed> <span>Practice mode: the tableware does not advance</span></label>' +
    '<div class="game-buttons"><button type="button" class="arc-btn" data-start>Insert coin</button></div>');

  var playScreen = el('div', 'game-screen arc-play',
    '<div class="arc-hud">' +
      '<p class="arc-stat"><span class="arc-label">Score</span> <span class="arc-value" data-score>000000</span></p>' +
      '<p class="arc-stat"><span class="arc-label">Wave</span> <span class="arc-value" data-wave></span></p>' +
      '<p class="arc-stat"><span class="arc-label">Streak</span> <span class="arc-value" data-streak>x0</span></p>' +
      '<p class="arc-stat arc-lives"><span class="arc-label">Glasses</span> <span class="arc-glasses" data-lives></span></p>' +
      '<button type="button" class="arc-sound" data-sound aria-pressed="false">Sound off</button>' +
    '</div>' +
    '<div class="arc-body">' +
      '<div class="arc-q">' +
        '<p class="arc-label" data-wave-name></p>' +
        '<h2 class="arc-question" tabindex="-1" data-question></h2>' +
      '</div>' +
      '<div class="arc-stage" data-stage>' +
        '<canvas class="arc-canvas" width="' + W + '" height="' + H + '" role="img" aria-label="Playfield. Four pieces of tableware, numbered 1 to 4, each carry one answer. Select a piece, press 1 to 4, or choose an answer from the list."></canvas>' +
        '<p class="arc-banner" aria-hidden="true" data-banner hidden></p>' +
      '</div>' +
      '<ol class="arc-options" data-options aria-label="Answers"></ol>' +
      '<div class="arc-why" data-why hidden>' +
        '<p class="arc-why-text" data-why-text></p>' +
        '<button type="button" class="arc-btn" data-next>Next wave</button>' +
      '</div>' +
    '</div>' +
    '<p class="arc-keys"><span>Keys 1-4: choose a target</span> <span>Mouse or touch: select a piece or an answer</span></p>');

  var endScreen = el('div', 'game-screen arc-end',
    '<p class="arc-kicker" data-end-kicker></p>' +
    '<h2 class="arc-title" tabindex="-1" data-rank></h2>' +
    '<p class="arc-lede" data-end-text></p>' +
    '<dl class="arc-stats">' +
      '<div><dt>Score</dt><dd data-end-score></dd></div>' +
      '<div><dt>Correct</dt><dd data-end-right></dd></div>' +
      '<div><dt>Best streak</dt><dd data-end-streak></dd></div>' +
      '<div><dt>High score</dt><dd data-end-best></dd></div>' +
    '</dl>' +
    '<div class="game-buttons"><button type="button" class="arc-btn" data-again>Play again</button>' +
    '<button type="button" class="arc-btn arc-btn-quiet" data-list>Review the plain list</button></div>');

  game.appendChild(startScreen);
  game.appendChild(playScreen);
  game.appendChild(endScreen);
  game.appendChild(live);

  var toggle = el('button', 'btn btn-quiet game-toggle', 'Show the plain list of questions');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');

  var heading = document.getElementById('quiz-title');
  form.parentNode.insertBefore(game, heading || form);
  form.parentNode.insertBefore(toggle, heading || form);
  if (heading) { heading.hidden = true; }
  form.hidden = true;

  function q(sel) { return game.querySelector(sel); }
  var ui = {
    score: q('[data-score]'), wave: q('[data-wave]'), streak: q('[data-streak]'), lives: q('[data-lives]'),
    waveName: q('[data-wave-name]'), question: q('[data-question]'), options: q('[data-options]'),
    why: q('[data-why]'), whyText: q('[data-why-text]'), next: q('[data-next]'), banner: q('[data-banner]'),
    stage: q('[data-stage]'), canvas: q('.arc-canvas'), sound: q('[data-sound]')
  };
  var ctx = ui.canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* the cast on the start screen */
  TYPES.forEach(function (type, i) {
    var li = el('li');
    li.appendChild(icon(type, 'arc-cast-art'));
    li.appendChild(el('span', 'arc-cast-name', (i + 1) + ' ' + NAMES[i]));
    q('[data-cast]').appendChild(li);
  });

  /* ---------- state ---------- */
  var state = {
    screen: 'start', phase: 'idle', index: 0, score: 0, streak: 0, best: 0, lives: LIVES, right: 0, relaxed: false,
    t: 0, phaseT: 0, last: 0, raf: null,
    player: { x: W / 2, recoil: 0, hurt: 0 },
    auto: -1, shots: 0, hover: -1,
    pea: null, enemies: [], bits: [], descent: 30, sway: 1.2, shake: 0
  };
  var stars = [];
  for (var s = 0; s < 34; s++) { stars.push({ x: (s * 73 + 11) % W, y: (s * 41 + 7) % (LINE - 6), p: s * 1.7 }); }

  /* bring a node to the top of the window, just below the sticky header */
  var siteHeader = document.querySelector('.site-header');
  function scrollBelowHeader(node) {
    var offset = siteHeader && window.getComputedStyle(siteHeader).position === 'sticky' ? siteHeader.offsetHeight : 0;
    var top = node.getBoundingClientRect().top + window.pageYOffset - offset - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }
  /* show the whole play screen when it fits; on small screens start at the question */
  function frameField() {
    var offset = siteHeader && window.getComputedStyle(siteHeader).position === 'sticky' ? siteHeader.offsetHeight : 0;
    var room = window.innerHeight - offset;
    var target = playScreen.offsetHeight + 16 <= room ? playScreen : q('.arc-body');
    var box = target.getBoundingClientRect();
    if (box.top < offset || box.top + Math.min(target.offsetHeight, room) > window.innerHeight) { scrollBelowHeader(target); }
  }

  function show(name) {
    state.screen = name;
    game.setAttribute('data-state', name);
    startScreen.hidden = name !== 'start';
    playScreen.hidden = name !== 'play';
    endScreen.hidden = name !== 'end';
  }

  /* ---------- HUD and panel ---------- */
  function hud() {
    ui.score.textContent = pad(state.score, 6);
    ui.wave.textContent = pad(state.index + 1, 2) + '/' + questions.length;
    ui.streak.textContent = 'x' + state.streak;
    ui.lives.innerHTML = '';
    for (var i = 0; i < LIVES; i++) {
      ui.lives.appendChild(icon('life', 'arc-glass' + (i >= state.lives ? ' is-broken' : '')));
    }
    ui.lives.appendChild(el('span', 'visually-hidden', state.lives + ' of ' + LIVES + ' glasses left'));
  }

  function banner(text, ms) {
    ui.banner.textContent = text;
    ui.banner.hidden = false;
    ui.banner.classList.remove('is-in');
    void ui.banner.offsetWidth;
    ui.banner.classList.add('is-in');
    window.clearTimeout(banner.timer);
    if (ms) { banner.timer = window.setTimeout(function () { ui.banner.hidden = true; }, ms); }
  }

  function buildOptions(item) {
    ui.options.innerHTML = '';
    item.options.forEach(function (text, i) {
      var li = el('li');
      var btn = el('button', 'arc-opt');
      btn.type = 'button';
      var id = el('span', 'arc-opt-id');
      id.setAttribute('aria-hidden', 'true');
      id.appendChild(el('span', 'arc-opt-num', String(i + 1)));
      id.appendChild(icon(TYPES[i], 'arc-opt-art'));
      btn.appendChild(id);
      var label = el('span', 'arc-opt-text');
      label.textContent = text;
      btn.appendChild(label);
      btn.setAttribute('aria-label', (i + 1) + ', ' + NAMES[i] + ': ' + text);
      btn.addEventListener('click', function () { aim(i); });
      li.appendChild(btn);
      ui.options.appendChild(li);
    });
  }

  /* ---------- waves ---------- */
  function startWave() {
    var item = questions[state.index];
    var lanes = shuffle([0, 1, 2, 3]);
    state.phase = 'intro';
    state.phaseT = 0;
    state.pea = null;
    state.auto = -1;
    state.hover = -1;
    state.bits = [];
    state.descent = Math.max(22, 34 - state.index * 1.2);
    state.sway = 1.1 + state.index * 0.14;
    state.enemies = item.options.map(function (text, i) {
      return { i: i, type: TYPES[i], baseX: LANES[lanes[i]], x: LANES[lanes[i]], y: -40, phase: lanes[i] * 1.3, alive: true, flee: false, flash: 0, mark: false };
    });

    ui.waveName.textContent = 'Wave ' + (state.index + 1) + ' of ' + questions.length;
    ui.question.textContent = item.text;
    buildOptions(item);
    ui.why.hidden = true;
    ui.next.textContent = state.index === questions.length - 1 ? 'See my result' : 'Next wave';
    hud();
    banner('Wave ' + (state.index + 1), 1100);
    SFX.wave();
    live.textContent = 'Wave ' + (state.index + 1) + '. ' + item.text;
    ui.question.focus({ preventScroll: true });
  }

  /* the only decision of the player: which piece carries the right answer */
  function aim(index) {
    if (state.screen !== 'play' || (state.phase !== 'play' && state.phase !== 'intro')) { return; }
    if (state.auto > -1 || state.pea) { return; }
    state.auto = index;
    Array.prototype.forEach.call(ui.options.querySelectorAll('.arc-opt'), function (btn, i) {
      btn.classList.toggle('is-picked', i === index);
    });
  }

  function fire(target) {
    state.shots += 1;
    state.pea = { x: state.player.x, y: FLOOR - 40, target: target, kind: state.shots % 2 ? 'knife' : 'spoon' };
    state.player.recoil = 0.12;
    SFX.shoot();
  }

  function explode(e, colors, count) {
    var n = reduce ? 6 : count;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 90;
      state.bits.push({ x: e.x, y: e.y + 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.5, c: colors[i % colors.length], s: 2 + (i % 2) * 2 });
    }
  }

  /* choice: the index that was hit, or -1 when the tableware reached the table */
  function resolve(choice) {
    if (state.phase !== 'play') { return; }
    var item = questions[state.index];
    var good = choice === item.correct;
    var left = state.relaxed ? 0 : Math.max(0, 1 - state.phaseT / state.descent);
    var gained = 0, lead;
    state.phase = 'resolve';
    state.phaseT = 0;
    state.pea = null;
    state.auto = -1;
    state.hover = -1;

    state.enemies.forEach(function (e) {
      if (good) {
        if (e.i === choice) { e.alive = false; explode(e, [PAL.G, PAL.W, PAL.E, PAL.B], 30); } else { e.flee = true; }
      } else {
        if (e.i === item.correct) { e.mark = true; }
        if (e.i === choice) { e.flash = 0.7; }
      }
    });

    if (good) {
      state.streak += 1;
      state.right += 1;
      state.best = Math.max(state.best, state.streak);
      gained = 100 + Math.round(left * 50) + Math.min((state.streak - 1) * 20, 100);
      state.score += gained;
      item.result = 'right';
      lead = 'Correct! +' + gained + ' points.';
      banner('+' + gained, 1200);
      SFX.right();
    } else {
      state.streak = 0;
      state.lives -= 1;
      state.player.hurt = 0.9;
      if (!reduce) { state.shake = 0.35; }
      item.result = 'wrong';
      lead = choice === -1 ? 'Too slow! They reached the table and a glass breaks.' : 'Wrong dish! A glass breaks.';
      banner(choice === -1 ? 'Too slow!' : 'Wrong dish!', 1200);
      SFX.wrong();
    }

    Array.prototype.forEach.call(ui.options.querySelectorAll('.arc-opt'), function (btn, i) {
      btn.disabled = true;
      if (i === item.correct) { btn.classList.add('is-correct'); }
      if (i === choice && !good) { btn.classList.add('is-wrong'); }
    });

    ui.whyText.innerHTML = '<strong class="arc-why-lead ' + (good ? 'is-good' : 'is-bad') + '">' + lead + '</strong> ' + item.why;
    if (state.lives <= 0) { ui.next.textContent = 'See my result'; }
    ui.why.hidden = false;
    live.textContent = lead + ' The answer is ' + (item.correct + 1) + ': ' + item.options[item.correct];
    hud();
    ui.next.focus({ preventScroll: true });
    if (ui.why.getBoundingClientRect().bottom > window.innerHeight) {
      ui.why.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  function next() {
    if (state.phase !== 'resolve') { return; }
    if (state.lives <= 0 || state.index >= questions.length - 1) { finish(); return; }
    state.index += 1;
    startWave();
    frameField();
  }

  /* ---------- game loop ---------- */
  function update(dt) {
    var p = state.player, speed = 170;
    state.t += dt;
    state.phaseT += dt;
    if (p.recoil > 0) { p.recoil -= dt; }
    if (p.hurt > 0) { p.hurt -= dt; }
    if (state.shake > 0) { state.shake -= dt; }

    if (state.phase === 'intro' && state.phaseT > 0.9) { state.phase = 'play'; state.phaseT = 0; }

    /* the fork slides under the chosen piece and throws */
    if ((state.phase === 'play' || state.phase === 'intro') && state.auto > -1 && !state.pea) {
      var goal = state.enemies[state.auto].x;
      var dx = goal - p.x, step = speed * 1.6 * dt;
      p.x += Math.abs(dx) <= step ? dx : (dx > 0 ? step : -step);
      p.x = Math.max(12, Math.min(W - 12, p.x));
      if (Math.abs(goal - p.x) < 2 && state.phase === 'play') { fire(state.auto); }
    }

    /* the tableware */
    state.enemies.forEach(function (e) {
      if (e.flash > 0) { e.flash -= dt; }
      if (!e.alive) { return; }
      if (e.flee) { e.y -= 170 * dt; return; }
      if (state.phase === 'intro') {
        var k = Math.min(1, state.phaseT / 0.9);
        e.y = -40 + (START_Y + 40) * (1 - Math.pow(1 - k, 3));
      } else if (state.phase === 'play') {
        if (!state.relaxed) { e.y = START_Y + (LINE - 28 - START_Y) * Math.min(1, state.phaseT / state.descent); }
        e.x = e.baseX + Math.sin(state.t * state.sway + e.phase) * (reduce ? 4 : 11);
      }
    });
    if (state.phase === 'play' && !state.relaxed && state.phaseT >= state.descent) { resolve(-1); }

    /* the flying knife or spoon follows its target, so it always lands */
    if (state.pea && state.phase === 'play') {
      var hit = state.enemies[state.pea.target];
      state.pea.y -= 230 * dt;
      state.pea.x += (hit.x - state.pea.x) * Math.min(1, dt * 12);
      if (state.pea.y < hit.y + 24) { resolve(hit.i); }
    }

    /* debris */
    state.bits = state.bits.filter(function (b) {
      b.life -= dt;
      b.vy += 220 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.life > 0;
    });
  }

  function drawBadge(e) {
    var x = Math.round(e.x) - 6, y = Math.round(e.y) - 21;
    ctx.fillStyle = PAL.K;
    ctx.fillRect(x - 1, y - 1, 15, 21);
    ctx.fillStyle = e.mark && Math.floor(state.t * 6) % 2 ? PAL.E : PAL.G;
    ctx.fillRect(x, y, 13, 19);
    ctx.fillStyle = PAL.K;
    DIGITS[e.i].forEach(function (row, r) {
      for (var c = 0; c < 3; c++) {
        if (row.charAt(c) === '1') { ctx.fillRect(x + 2 + c * 3, y + 2 + r * 3, 3, 3); }
      }
    });
  }

  function draw() {
    var ox = 0, oy = 0, i;
    if (state.shake > 0) { ox = Math.round(Math.sin(state.t * 90) * 3); oy = Math.round(Math.cos(state.t * 70) * 2); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAL.K;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(ox, oy);

    /* candlelight specks */
    for (i = 0; i < stars.length; i++) {
      var st = stars[i];
      var on = reduce || Math.sin(state.t * 1.5 + st.p) > -0.4;
      if (on) { ctx.fillStyle = i % 5 === 0 ? PAL.G : PAL.N; ctx.fillRect(st.x, st.y, 1, 1); }
    }

    /* the line the tableware must not cross */
    ctx.fillStyle = PAL.N;
    for (i = 0; i < W; i += 8) { ctx.fillRect(i, LINE, 4, 1); }

    /* tablecloth */
    for (var cy = 0; cy < 2; cy++) {
      for (var cx = 0; cx < W / 8; cx++) {
        ctx.fillStyle = (cx + cy) % 2 ? PAL.R : PAL.W;
        ctx.fillRect(cx * 8, FLOOR + cy * 8, 8, 8);
      }
    }
    ctx.fillStyle = PAL.G;
    ctx.fillRect(0, FLOOR - 1, W, 1);

    /* tableware */
    state.enemies.forEach(function (e) {
      if (!e.alive || e.y < -30) { return; }
      var img = (e.flash > 0 && Math.floor(state.t * 16) % 2) ? FLASH[e.type] : IMG[e.type];
      var bob = e.flee || reduce ? 0 : Math.round(Math.sin(state.t * 5 + e.phase));
      var w = img.width * 2, h = img.height * 2;
      ctx.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y + bob), w, h);
      if (!e.mark && state.phase !== 'resolve' && (state.auto === e.i || (state.auto === -1 && state.hover === e.i))) {
        ctx.strokeStyle = PAL.G;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(e.x - w / 2) - 2.5, Math.round(e.y) - 24.5, w + 5, h + 28);
      }
      if (e.mark) {
        ctx.strokeStyle = Math.floor(state.t * 6) % 2 ? PAL.E : PAL.G;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(e.x - w / 2) - 2.5, Math.round(e.y) - 24.5, w + 5, h + 28);
      }
      drawBadge(e);
    });

    /* the flying knife or spoon */
    if (state.pea) {
      var shot = IMG[state.pea.kind];
      ctx.drawImage(shot, Math.round(state.pea.x) - 3, Math.round(state.pea.y), 6, 20);
    }

    /* the fork */
    var p = state.player;
    if (!(p.hurt > 0 && Math.floor(state.t * 14) % 2)) {
      ctx.drawImage(IMG.fork, Math.round(p.x) - 9, FLOOR - 34 + (p.recoil > 0 ? 2 : 0), 18, 32);
    }

    /* debris */
    state.bits.forEach(function (b) {
      ctx.fillStyle = b.c;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
    });
  }

  function frame(now) {
    var dt = Math.max(0, Math.min(0.05, (now - state.last) / 1000));
    state.last = now;
    if (state.screen === 'play') {
      update(dt);
      draw();
      state.raf = window.requestAnimationFrame(frame);
    } else {
      state.raf = null;
    }
  }

  function begin() {
    state.index = 0; state.score = 0; state.streak = 0; state.best = 0; state.lives = LIVES; state.right = 0;
    state.relaxed = q('[data-relaxed]').checked;
    state.player.x = W / 2;
    state.player.hurt = 0;
    state.shake = 0;
    questions.forEach(function (item) { item.result = null; });
    show('play');
    startWave();
    state.last = performance.now();
    if (state.raf === null) { state.raf = window.requestAnimationFrame(frame); }
    frameField();
  }

  function finish() {
    var total = questions.length;
    var out = state.lives <= 0;
    var rank, text;
    if (state.right === total) { rank = 'Guest of Honor'; text = 'A flawless service. Not a single glass broken on your watch.'; }
    else if (state.right >= 7) { rank = 'Trusted Colleague'; text = 'You kept the table safe. Review the waves you missed and go for a perfect run.'; }
    else if (state.right >= 4) { rank = 'Promising Intern'; text = 'A decent first shift. Read the guide again and insert another coin.'; }
    else { rank = 'Still Reading the Menu'; text = 'Everyone starts here. The answers are all on this site, so read and return.'; }

    var record = readBest();
    var isRecord = state.score > record;
    if (isRecord) { saveBest(state.score); record = state.score; }

    q('[data-end-kicker]').textContent = out ? 'Game over: all three glasses broke at wave ' + (state.index + 1) : 'All ten waves played';
    q('[data-rank]').textContent = rank;
    q('[data-end-text]').textContent = text;
    q('[data-end-score]').textContent = pad(state.score, 6);
    q('[data-end-right]').textContent = state.right + ' of ' + total;
    q('[data-end-streak]').textContent = 'x' + state.best;
    q('[data-end-best]').textContent = pad(record, 6) + (isRecord && state.score > 0 ? ' new!' : '');
    state.phase = 'idle';
    show('end');
    q('[data-rank]').focus({ preventScroll: true });
    live.textContent = (out ? 'Game over. ' : 'Game complete. ') + 'Score ' + state.score + '. ' + state.right + ' of ' + total + ' correct. Rank: ' + rank + '.';
    scrollBelowHeader(game);
  }

  /* ---------- events ---------- */
  q('[data-start]').addEventListener('click', begin);
  q('[data-again]').addEventListener('click', function () { show('start'); q('[data-start]').focus(); });
  ui.next.addEventListener('click', next);

  ui.sound.addEventListener('click', function () {
    soundOn = !soundOn;
    ui.sound.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    ui.sound.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) { SFX.wave(); }
  });

  function setList(open) {
    form.hidden = !open;
    if (heading) { heading.hidden = !open; }
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Hide the plain list of questions' : 'Show the plain list of questions';
  }
  toggle.addEventListener('click', function () { setList(form.hidden); });
  q('[data-list]').addEventListener('click', function () {
    setList(true);
    (heading || form).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* keyboard: 1 to 4 choose a target while the focus is inside the game */
  game.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) { return; }
    var index = '1234'.indexOf(event.key);
    if (index > -1 && state.screen === 'play') { aim(index); event.preventDefault(); }
  });

  /* pointer: select a piece on the field */
  function pieceAt(event) {
    var box = ui.canvas.getBoundingClientRect();
    var x = (event.clientX - box.left) * W / box.width;
    var y = (event.clientY - box.top) * H / box.height;
    var found = -1;
    state.enemies.forEach(function (e) {
      if (e.alive && Math.abs(x - e.x) < 24 && y > e.y - 28 && y < e.y + 36) { found = e.i; }
    });
    return found;
  }
  ui.canvas.addEventListener('pointerdown', function (event) {
    var index = pieceAt(event);
    if (index > -1) { aim(index); event.preventDefault(); }
  });
  ui.canvas.addEventListener('pointermove', function (event) {
    state.hover = (state.phase === 'play' || state.phase === 'intro') ? pieceAt(event) : -1;
    ui.canvas.classList.toggle('is-target', state.hover > -1);
  });
  ui.canvas.addEventListener('pointerleave', function () { state.hover = -1; ui.canvas.classList.remove('is-target'); });

  document.addEventListener('visibilitychange', function () { state.last = performance.now(); });

  /* test hook: lets an automated check read the state of the wave */
  game.__arcade = { state: state, questions: questions };

  show('start');
}());
