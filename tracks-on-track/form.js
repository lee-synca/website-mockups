// Early-access form. The only script on the page.
// Where sign-ups go is set in ONE place: the action="" of the form in index.html.
// While that is empty, nothing is sent anywhere and the visitor is told so.
(function () {
  var form = document.getElementById('early-access-form');
  var status = document.getElementById('early-access-status');
  if (!form || !status) return;

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var endpoint = (form.getAttribute('action') || '').trim();
    var fields = [form.elements.name, form.elements.email, form.elements.role];
    var firstBad = null;
    fields.forEach(function (f) {
      var bad = !f.checkValidity();
      f.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !firstBad) firstBad = f;
    });
    if (firstBad) {
      say('Please add your name, a valid email and what you do.', 'bad');
      firstBad.focus();
      return;
    }
    if (form.elements.website.value) return; // spam trap filled: quietly drop it

    if (!endpoint) {
      say('The early-access list is not open yet, so nothing was sent. Please check back soon.', 'bad');
      return;
    }

    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    say('Sending…');
    fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say("Thanks, you're on the list. We'll be in touch.", 'ok');
      })
      .catch(function () {
        say('Sorry, that did not send. Please try again in a minute.', 'bad');
      })
      .then(function () { button.disabled = false; });
  });
})();
