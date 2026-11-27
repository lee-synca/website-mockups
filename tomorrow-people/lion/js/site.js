/* Tomorrow People: scroll reveals, mailing list sign-up and the enquiry form. */
(function () {
  var EMAIL = 'music@tomorrowpeople.co.nz';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  function mail(subject, body) {
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  var SENT = 'Your email app has opened with the message ready. Press send there to finish.';

  /* Mailing list. Set data-endpoint on the form to a list provider's form address
     to collect sign-ups directly; until then the request goes to the band by email. */
  var signup = document.querySelector('form.signup');
  if (signup) signup.addEventListener('submit', function (e) {
    var email = signup.querySelector('input[type=email]'), msg = signup.parentNode.querySelector('.form-msg');
    if (!email.checkValidity()) { e.preventDefault(); msg.textContent = 'Enter a full email address, like name@example.com.'; email.focus(); return; }
    var endpoint = signup.getAttribute('data-endpoint');
    if (endpoint) { signup.action = endpoint; signup.method = 'post'; return; }
    e.preventDefault();
    mail('Mailing list', 'Please add me to the Tomorrow People mailing list: ' + email.value);
    msg.textContent = SENT;
  });

  var enquiry = document.querySelector('form.enquiry');
  if (enquiry) enquiry.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = enquiry.querySelector('.form-msg'), bad = null;
    ['name', 'email', 'message'].forEach(function (n) {
      var f = enquiry.elements[n], ok = f.checkValidity();
      f.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !bad) bad = f;
    });
    if (bad) {
      msg.textContent = bad.name === 'email' ? 'Enter a full email address, like name@example.com.' : 'Add your ' + bad.name + ' so the band can reply.';
      bad.focus(); return;
    }
    var v = function (n) { return enquiry.elements[n].value.trim(); };
    mail(v('type') + ' enquiry from ' + v('name'),
      v('message') + '\n\n' + v('name') + '\n' + v('email') + (v('org') ? '\n' + v('org') : ''));
    msg.textContent = SENT;
  });
})();
