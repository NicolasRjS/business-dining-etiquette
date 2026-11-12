/* Dinner Service: the quiz as a game.
   Reads the ten questions from the plain HTML form, then serves them one at a
   time as the courses of a dinner, with a timer, three glasses (lives), a
   streak bonus and a final rank. The plain list stays available at any time. */
(function () {
  'use strict';

  var form = document.querySelector('[data-quiz]');
  if (!form) { return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COURSES = ['Welcome drink', 'Bread', 'Soup', 'Salad', 'Fish', 'Main course', 'Cheese', 'Dessert', 'Coffee', 'The bill'];
  var LETTERS = ['A', 'B', 'C', 'D'];
  var TIME = 25000;
  var LIVES = 3;

  var questions = Array.prototype.map.call(form.querySelectorAll('.q'), function (q) {
    var inputs = q.querySelectorAll('input');
    var answer = q.getAttribute('data-answer');
    var options = [], correct = 0;
    Array.prototype.forEach.call(inputs, function (input, i) {
      options.push(input.closest('.q-option').querySelector('span').textContent);
      if (input.value === answer) { correct = i; }
    });
    var feedback = q.querySelector('.q-feedback').cloneNode(true);
    var result = feedback.querySelector('.q-result');
    if (result) { result.remove(); }
    return { text: q.querySelector('legend').textContent, options: options, correct: correct, why: feedback.innerHTML };
  });

  var state = { index: 0, score: 0, streak: 0, best: 0, lives: LIVES, right: 0, relaxed: false, locked: true, start: 0, raf: null };

  /* ---------- small helpers ---------- */
  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (html !== undefined) { node.innerHTML = html; }
    return node;
  }
  function glass(broken) {
    return '<svg viewBox="0 0 24 32" aria-hidden="true" class="hud-glass' + (broken ? ' is-broken' : '') + '">' +
      '<path d="M5 2h14l-1.5 11a5.5 5.5 0 0 1-11 0z"/><path d="M12 18v9M7 29h10"/></svg>';
  }
  function readBest() { try { return Number(window.localStorage.getItem('bde-best')) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { window.localStorage.setItem('bde-best', String(v)); } catch (e) { /* storage not available */ } }

  /* ---------- build the stage ---------- */
  var game = el('div', 'game');
  game.setAttribute('data-state', 'start');
  var live = el('p', 'visually-hidden');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');

  var startScreen = el('div', 'game-screen game-start',
    '<p class="game-kicker">The quiz, served as a game</p>' +
    '<h2 class="game-title">Dinner Service</h2>' +
    '<p class="game-lede">Ten questions arrive as the ten courses of a business dinner. Answer fast for bonus points and keep your streak alive. Every wrong answer breaks one of your three glasses.</p>' +
    '<ul class="game-how">' +
      '<li><strong>+100</strong> per correct answer</li>' +
      '<li><strong>+50</strong> speed bonus</li>' +
      '<li><strong>+20</strong> per answer in a streak</li>' +
    '</ul>' +
    '<label class="game-relaxed"><input type="checkbox" data-relaxed> <span>Relaxed mode: no timer</span></label>' +
    '<div class="game-buttons"><button type="button" class="btn btn-gold" data-start>Start the dinner</button></div>' +
    '<p class="game-hint">Keyboard: press A, B, C or D to answer and Enter for the next course.</p>');

  var playScreen = el('div', 'game-screen game-play',
    '<div class="hud">' +
      '<div class="hud-block"><span class="hud-label">Course</span><span class="hud-value" data-course></span></div>' +
      '<div class="hud-block"><span class="hud-label">Score</span><span class="hud-value" data-score>0</span></div>' +
      '<div class="hud-block"><span class="hud-label">Streak</span><span class="hud-value" data-streak>0</span></div>' +
      '<div class="hud-block"><span class="hud-label">Glasses</span><span class="hud-lives" data-lives></span></div>' +
    '</div>' +
    '<ol class="hud-plates" data-plates aria-hidden="true"></ol>' +
    '<div class="timer" aria-hidden="true"><span data-timer></span></div>' +
    '<div class="card" data-card>' +
      '<p class="card-course" data-course-name></p>' +
      '<h2 class="card-question" tabindex="-1" data-question></h2>' +
      '<div class="card-options" data-options></div>' +
      '<div class="card-why" data-why hidden></div>' +
      '<div class="game-buttons"><button type="button" class="btn btn-gold" data-next hidden>Next course</button></div>' +
    '</div>');

  var endScreen = el('div', 'game-screen game-end',
    '<p class="game-kicker" data-end-kicker></p>' +
    '<h2 class="game-title" tabindex="-1" data-rank></h2>' +
    '<p class="game-lede" data-end-text></p>' +
    '<dl class="game-stats">' +
      '<div><dt>Score</dt><dd data-end-score></dd></div>' +
      '<div><dt>Correct</dt><dd data-end-right></dd></div>' +
      '<div><dt>Best streak</dt><dd data-end-streak></dd></div>' +
      '<div><dt>Your record</dt><dd data-end-best></dd></div>' +
    '</dl>' +
    '<div class="game-buttons"><button type="button" class="btn btn-gold" data-again>Play again</button>' +
    '<button type="button" class="btn btn-ghost" data-list>Review the plain list</button></div>');

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
    course: q('[data-course]'), score: q('[data-score]'), streak: q('[data-streak]'), lives: q('[data-lives]'),
    plates: q('[data-plates]'), timer: q('[data-timer]'), card: q('[data-card]'), courseName: q('[data-course-name]'),
    question: q('[data-question]'), options: q('[data-options]'), why: q('[data-why]'), next: q('[data-next]')
  };

  /* ---------- rendering ---------- */
  function show(name) {
    game.setAttribute('data-state', name);
    startScreen.hidden = name !== 'start';
    playScreen.hidden = name !== 'play';
    endScreen.hidden = name !== 'end';
  }

  function hud() {
    ui.course.textContent = (state.index + 1) + ' / ' + questions.length;
    ui.score.textContent = state.score;
    ui.streak.textContent = state.streak > 1 ? 'x' + state.streak : String(state.streak);
    var html = '';
    for (var i = 0; i < LIVES; i++) { html += glass(i >= state.lives); }
    ui.lives.innerHTML = html + '<span class="visually-hidden">' + state.lives + ' of ' + LIVES + ' glasses left</span>';
  }

  function plates() {
    ui.plates.innerHTML = '';
    questions.forEach(function (item, i) {
      var li = el('li');
      if (item.result) { li.className = 'is-' + item.result; }
      if (i === state.index) { li.className += ' is-now'; }
      ui.plates.appendChild(li);
    });
  }

  function serve() {
    var item = questions[state.index];
    state.locked = false;
    ui.courseName.textContent = 'Course ' + (state.index + 1) + ': ' + COURSES[state.index % COURSES.length];
    ui.question.textContent = item.text;
    ui.options.innerHTML = '';
    item.options.forEach(function (text, i) {
      var btn = el('button', 'option', '<span class="option-key" aria-hidden="true">' + LETTERS[i] + '</span><span class="option-text"></span>');
      btn.type = 'button';
      btn.querySelector('.option-text').textContent = text;
      btn.setAttribute('aria-label', LETTERS[i] + ': ' + text);
      btn.addEventListener('click', function () { answer(i); });
      ui.options.appendChild(btn);
    });
    ui.why.hidden = true;
    ui.why.innerHTML = '';
    ui.next.hidden = true;
    ui.next.textContent = state.index === questions.length - 1 ? 'See my result' : 'Next course';
    hud();
    plates();

    ui.card.classList.remove('is-serving', 'is-right', 'is-wrong');
    void ui.card.offsetWidth;
    ui.card.classList.add('is-serving');
    ui.question.focus({ preventScroll: true });
    startTimer();
  }

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    ui.timer.style.transform = 'scaleX(1)';
    ui.timer.parentNode.hidden = state.relaxed;
    if (state.relaxed) { return; }
    state.start = performance.now();
    (function tick() {
      var left = 1 - (performance.now() - state.start) / TIME;
      if (left <= 0) { ui.timer.style.transform = 'scaleX(0)'; answer(-1); return; }
      ui.timer.style.transform = 'scaleX(' + left.toFixed(4) + ')';
      ui.timer.classList.toggle('is-low', left < 0.3);
      state.raf = window.requestAnimationFrame(tick);
    }());
  }
  function stopTimer() {
    if (state.raf !== null) { window.cancelAnimationFrame(state.raf); state.raf = null; }
  }
  function timeLeft() {
    if (state.relaxed) { return 0; }
    var left = 1 - (performance.now() - state.start) / TIME;
    return left < 0 ? 0 : left;
  }

  /* ---------- answering ---------- */
  function answer(choice) {
    if (state.locked) { return; }
    state.locked = true;
    var left = timeLeft();
    stopTimer();

    var item = questions[state.index];
    var buttons = ui.options.querySelectorAll('.option');
    var good = choice === item.correct;
    var gained = 0;

    Array.prototype.forEach.call(buttons, function (btn, i) {
      btn.disabled = true;
      if (i === item.correct) { btn.classList.add('is-correct'); }
      if (i === choice && !good) { btn.classList.add('is-chosen-wrong'); }
    });

    if (good) {
      state.streak += 1;
      state.right += 1;
      state.best = Math.max(state.best, state.streak);
      gained = 100 + Math.round(left * 50) + Math.min((state.streak - 1) * 20, 100);
      state.score += gained;
      item.result = 'right';
      ui.card.classList.add('is-right');
      burst(buttons[item.correct], 14 + state.streak * 8);
      float('+' + gained);
      flash('flash-good');
      if (state.streak >= 2) { call(state.streak >= 5 ? 'ON FIRE x' + state.streak : 'STREAK x' + state.streak); }
    } else {
      flash('flash-bad');
      state.streak = 0;
      state.lives -= 1;
      item.result = 'wrong';
      ui.card.classList.add('is-wrong');
    }

    var lead = good ? 'Correct. +' + gained + ' points.' : (choice === -1 ? 'Time is up. A glass breaks.' : 'Not quite. A glass breaks.');
    ui.why.innerHTML = '<strong class="why-lead ' + (good ? 'is-good' : 'is-bad') + '">' + lead + '</strong> ' + item.why;
    ui.why.hidden = false;
    live.textContent = lead + ' The answer is ' + LETTERS[item.correct] + ': ' + item.options[item.correct];

    hud();
    plates();
    if (state.lives <= 0) { ui.next.textContent = 'See my result'; }
    ui.next.hidden = false;
    ui.next.focus({ preventScroll: true });
  }

  function next() {
    if (state.lives <= 0 || state.index >= questions.length - 1) { finish(); return; }
    state.index += 1;
    serve();
  }

  function finish() {
    stopTimer();
    var total = questions.length;
    var out = state.lives <= 0;
    var rank, text;
    if (state.right === total) { rank = 'Guest of Honor'; text = 'A flawless dinner. You could host the next one.'; }
    else if (state.right >= 7) { rank = 'Trusted Colleague'; text = 'You handled the table well. Review the courses you missed and try for a perfect service.'; }
    else if (state.right >= 4) { rank = 'Promising Intern'; text = 'A decent first dinner. Read the guide again and play another round.'; }
    else { rank = 'Still Reading the Menu'; text = 'Everyone starts here. The answers are all on this site, so read and return.'; }

    var record = readBest();
    var isRecord = state.score > record;
    if (isRecord) { saveBest(state.score); record = state.score; }

    q('[data-end-kicker]').textContent = out ? 'All three glasses broke at course ' + (state.index + 1) : 'Dinner is over';
    q('[data-rank]').textContent = rank;
    q('[data-end-text]').textContent = text;
    q('[data-end-score]').textContent = state.score;
    q('[data-end-right]').textContent = state.right + ' of ' + total;
    q('[data-end-streak]').textContent = state.best;
    q('[data-end-best]').textContent = record + (isRecord && state.score > 0 ? ' (new)' : '');
    show('end');
    q('[data-rank]').focus({ preventScroll: true });
    if (state.right >= 7) { burst(q('[data-rank]'), 40); }
  }

  function begin() {
    state.index = 0; state.score = 0; state.streak = 0; state.best = 0; state.lives = LIVES; state.right = 0;
    state.relaxed = q('[data-relaxed]').checked;
    questions.forEach(function (item) { item.result = null; });
    show('play');
    serve();
  }

  /* ---------- effects ---------- */
  function burst(target, count) {
    if (reduce || !target) { return; }
    var box = target.getBoundingClientRect();
    var host = game.getBoundingClientRect();
    var n = count || 18;
    for (var i = 0; i < n; i++) {
      var bit = el('span', 'confetti c' + (i % 4));
      bit.style.left = (box.left - host.left + box.width / 2) + 'px';
      bit.style.top = (box.top - host.top + box.height / 2) + 'px';
      bit.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 360) + 'px');
      bit.style.setProperty('--dy', Math.round(-60 - Math.random() * 200) + 'px');
      bit.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      game.appendChild(bit);
      (function (node) { window.setTimeout(function () { node.remove(); }, 1000); }(bit));
    }
  }
  function flash(name) {
    if (reduce) { return; }
    game.classList.remove('flash-good', 'flash-bad');
    void game.offsetWidth;
    game.classList.add(name);
  }
  function call(text) {
    if (reduce) { return; }
    var tag = el('span', 'streak-call', text);
    tag.setAttribute('aria-hidden', 'true');
    game.appendChild(tag);
    window.setTimeout(function () { tag.remove(); }, 1100);
  }
  function float(text) {
    if (reduce) { return; }
    var tag = el('span', 'float-score', text);
    ui.score.parentNode.appendChild(tag);
    window.setTimeout(function () { tag.remove(); }, 900);
  }

  /* ---------- events ---------- */
  q('[data-start]').addEventListener('click', begin);
  q('[data-again]').addEventListener('click', function () { show('start'); q('[data-start]').focus(); });
  ui.next.addEventListener('click', next);

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

  document.addEventListener('keydown', function (event) {
    if (game.getAttribute('data-state') !== 'play' || state.locked) { return; }
    if (event.ctrlKey || event.metaKey || event.altKey) { return; }
    var key = event.key.toLowerCase();
    var index = 'abcd'.indexOf(key);
    if (index === -1) { index = '1234'.indexOf(key); }
    if (key.length === 1 && index > -1 && index < questions[state.index].options.length) {
      event.preventDefault();
      answer(index);
    }
  });

  show('start');
}());
