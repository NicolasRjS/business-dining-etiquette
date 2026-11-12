/* Quiz scoring.
   Without JavaScript the page still shows the ten questions and an answer key.
   With JavaScript the form is scored and each question shows an explanation. */
(function () {
  'use strict';

  var form = document.querySelector('[data-quiz]');
  if (!form) { return; }

  var questions = Array.prototype.slice.call(form.querySelectorAll('.q'));
  var actions = form.querySelector('.quiz-actions');
  var score = form.querySelector('.quiz-score');
  var key = document.querySelector('.answer-key');

  function clear() {
    questions.forEach(function (q) {
      q.classList.remove('is-correct', 'is-wrong', 'is-empty');
      q.querySelector('.q-feedback').hidden = true;
      Array.prototype.forEach.call(q.querySelectorAll('.q-option'), function (label) {
        label.classList.remove('is-right-answer', 'is-wrong-choice');
      });
    });
    score.hidden = true;
    score.textContent = '';
  }

  function message(right, total) {
    if (right === total) { return 'A perfect table. You are ready for your first business meal.'; }
    if (right >= total * 0.7) { return 'Well done. Review the explanations above for the ones you missed.'; }
    return 'A good start. Read the explanations above and try again.';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clear();
    var right = 0;

    questions.forEach(function (q) {
      var answer = q.getAttribute('data-answer');
      var chosen = q.querySelector('input:checked');
      var result = q.querySelector('.q-result');
      var correctInput = q.querySelector('input[value="' + answer + '"]');

      correctInput.closest('.q-option').classList.add('is-right-answer');

      if (!chosen) {
        q.classList.add('is-empty');
        result.textContent = 'Not answered.';
      } else if (chosen.value === answer) {
        right += 1;
        q.classList.add('is-correct');
        result.textContent = 'Correct.';
      } else {
        q.classList.add('is-wrong');
        chosen.closest('.q-option').classList.add('is-wrong-choice');
        result.textContent = 'Not quite. The correct answer is highlighted.';
      }
      q.querySelector('.q-feedback').hidden = false;
    });

    score.textContent = 'You scored ' + right + ' out of ' + questions.length + '. ' + message(right, questions.length);
    score.hidden = false;
    score.focus();
  });

  form.addEventListener('reset', function () {
    clear();
    form.querySelector('input').focus();
  });

  /* Switch to the interactive version. */
  actions.hidden = false;
  if (key) { key.hidden = true; }
}());

/* Survey: three opinion questions. Nothing is sent anywhere; the summary is built on the page. */
(function () {
  'use strict';

  var form = document.querySelector('[data-survey]');
  if (!form) { return; }
  var out = form.querySelector('.quiz-score');
  form.querySelector('.quiz-actions').hidden = false;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var before = form.querySelector('input[name="s1"]:checked');
    var after = form.querySelector('input[name="s2"]:checked');
    var part = form.querySelector('input[name="s3"]:checked');
    if (!before || !after || !part) {
      out.textContent = 'Please answer all three questions.';
    } else {
      var change = Number(after.value) - Number(before.value);
      var trend = 'unchanged';
      if (change > 0) { trend = 'up ' + change + (change === 1 ? ' point' : ' points'); }
      if (change < 0) { trend = 'down ' + (-change) + (change === -1 ? ' point' : ' points'); }
      out.textContent = 'Thank you. Your confidence went from ' + before.value + ' to ' + after.value + ' out of 5 (' + trend + '). Most useful part: ' + part.value + '.';
    }
    out.hidden = false;
    out.focus();
  });
}());
