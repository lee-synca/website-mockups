/* Otway Tree Care — site behaviour. No dependencies. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  doc.classList.add('js');

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ---------- Mobile menu ---------- */
  var menu = document.getElementById('mobile-menu');
  var openBtn = document.querySelector('[data-menu-open]');
  var lastFocus = null;
  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea'));
  }
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    openBtn && openBtn.setAttribute('aria-expanded', 'true');
    var closeBtn = menu.querySelector('[data-menu-close]');
    (closeBtn || focusables(menu)[0]).focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    openBtn && openBtn.setAttribute('aria-expanded', 'false');
    lastFocus && lastFocus.focus();
  }
  openBtn && openBtn.addEventListener('click', openMenu);
  menu && menu.querySelector('[data-menu-close]').addEventListener('click', closeMenu);
  menu && menu.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return closeMenu();
    if (e.key !== 'Tab') return;
    var f = focusables(menu), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  menu && menu.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').indexOf('#') !== -1) closeMenu();
  });

  /* ---------- Desktop services dropdown ---------- */
  document.querySelectorAll('.has-sub').forEach(function (li) {
    var btn = li.querySelector('.sub-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = li.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!li.contains(e.target)) { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  });

  /* ---------- Transect (signature) ---------- */
  var transect = document.querySelector('[data-transect]');
  if (transect) {
    var panels = Array.prototype.slice.call(transect.querySelectorAll('.t-panel'));
    var marker = document.querySelector('[data-transect-marker]');
    var wide = window.matchMedia('(min-width: 861px)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var activate = function (i) {
      panels.forEach(function (p, j) {
        var on = i === j;
        p.classList.toggle('is-active', on);
        var t = p.querySelector('.t-toggle');
        t && t.setAttribute('aria-expanded', String(on || !wide.matches));
      });
      if (marker) marker.style.transform = 'translateX(' + i * 100 + '%)';
    };
    panels.forEach(function (p, i) {
      var t = p.querySelector('.t-toggle');
      p.addEventListener('mouseenter', function () { if (wide.matches && finePointer.matches) activate(i); });
      t && t.addEventListener('click', function () { if (wide.matches) activate(i); });
      p.addEventListener('focusin', function () { if (wide.matches) activate(i); });
    });
    var sync = function () { activate(Math.max(0, panels.findIndex(function (p) { return p.classList.contains('is-active'); }))); };
    wide.addEventListener ? wide.addEventListener('change', sync) : wide.addListener(sync);
    sync();
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Keep the action bar out of the way of the keyboard ---------- */
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input:not([type=radio]):not([type=checkbox]), textarea, select')) document.body.classList.add('keyboard-open');
  });
  document.addEventListener('focusout', function () {
    setTimeout(function () {
      var a = document.activeElement;
      if (!a || !a.matches('input:not([type=radio]):not([type=checkbox]), textarea, select')) document.body.classList.remove('keyboard-open');
    }, 50);
  });

  /* ---------- Click tracking (calls, email) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="tel:"], a[href^="mailto:"], a[href^="sms:"]');
    if (!a) return;
    var kind = a.getAttribute('href').split(':')[0];
    var where = a.getAttribute('data-track') || (a.closest('[data-area]') || {}).getAttribute && (a.closest('[data-area]').getAttribute('data-area')) || 'page';
    track(kind === 'tel' ? 'click_call' : kind === 'sms' ? 'click_sms' : 'click_email', { link_location: where, page_path: location.pathname });
  });

  /* ---------- Enquiry form ---------- */
  var form = document.querySelector('[data-enquiry]');
  if (!form) return;

  var endpoint = isLocal ? '/__mock/submit' : form.getAttribute('action');
  var alertBox = form.querySelector('[data-form-alert]');
  var submitBtn = form.querySelector('[type=submit]');
  var submitLabel = submitBtn.innerHTML;
  var started = Date.now();
  var attempted = false;

  // Preselect a service from ?service= or the form's data attribute
  var params = new URLSearchParams(location.search);
  var pre = params.get('service') || form.getAttribute('data-service');
  if (pre) {
    var match = form.querySelector('input[name="service"][value="' + pre.replace(/"/g, '') + '"]');
    if (match) match.checked = true;
  }
  var urgentRadio = form.querySelector('input[name="timing"][value="Urgent"]');
  var urgentNote = form.querySelector('[data-urgent-note]');
  form.addEventListener('change', function (e) {
    if (e.target.name === 'timing' && urgentNote) urgentNote.hidden = !(urgentRadio && urgentRadio.checked);
    if (attempted) validateField(e.target.closest('.field'));
  });

  var rules = {
    service: function (f) { return f.querySelector('input:checked') ? '' : 'Choose what you need help with (or "Not sure").'; },
    timing: function (f) { return f.querySelector('input:checked') ? '' : 'Let us know how soon you need this.'; },
    location: function (f) { return f.querySelector('input').value.trim().length >= 2 ? '' : 'Enter the town or suburb where the trees are.'; },
    name: function (f) { return f.querySelector('input').value.trim().length >= 2 ? '' : 'Enter your name.'; },
    phone: function (f) {
      var v = f.querySelector('input').value.replace(/[^\d+]/g, '');
      var digits = v.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 12 ? '' : 'Enter a phone number we can call, like 0412 345 678.';
    },
    email: function (f) {
      var v = f.querySelector('input').value.trim();
      return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Check the email address, or leave it blank.';
    },
  };

  function validateField(field) {
    if (!field || !field.dataset.rule) return true;
    var msg = rules[field.dataset.rule](field);
    var out = field.querySelector('.error-msg span');
    field.classList.toggle('has-error', !!msg);
    if (out) out.textContent = msg;
    field.querySelectorAll('input, textarea').forEach(function (inp) {
      if (inp.type === 'radio') return;
      inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
    var group = field.querySelector('[role=radiogroup]');
    if (group) group.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  form.addEventListener('focusout', function (e) {
    if (!attempted) return;
    var field = e.target.closest('.field');
    field && validateField(field);
  });
  form.addEventListener('input', function (e) {
    var field = e.target.closest('.field.has-error');
    field && validateField(field);
  });

  function showAlert(title, items) {
    alertBox.hidden = false;
    alertBox.querySelector('p').textContent = title;
    var ul = alertBox.querySelector('ul');
    ul.innerHTML = '';
    (items || []).forEach(function (it) {
      var li = document.createElement('li');
      if (it.href) {
        var a = document.createElement('a');
        a.href = it.href; a.textContent = it.text;
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var target = document.querySelector(it.href);
          target && target.focus();
        });
        li.appendChild(a);
      } else li.textContent = it.text;
      ul.appendChild(li);
    });
    alertBox.focus();
  }

  function busy(on) {
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.innerHTML = on ? '<span class="spinner" aria-hidden="true"></span> Sending your enquiry…' : submitLabel;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var fields = Array.prototype.slice.call(form.querySelectorAll('.field[data-rule]'));
    var bad = fields.filter(function (f) { return !validateField(f); });
    if (bad.length) {
      showAlert('Check ' + (bad.length === 1 ? 'this detail' : 'these ' + bad.length + ' details') + ' before sending:', bad.map(function (f) {
        var focusEl = f.querySelector('input:not([type=radio]), textarea') || f.querySelector('input');
        return { text: f.querySelector('.error-msg span').textContent, href: '#' + focusEl.id };
      }));
      track('form_validation_error', { fields: bad.map(function (f) { return f.dataset.rule; }).join(',') });
      return;
    }
    alertBox.hidden = true;

    var data = new FormData(form);
    if (data.get('botcheck')) return; // honeypot ticked: silently drop
    var payload = {};
    data.forEach(function (v, k) { payload[k] = typeof v === 'string' ? v.trim() : v; });
    payload.seconds_on_form = Math.round((Date.now() - started) / 1000);
    payload.page = location.pathname;
    delete payload.redirect; // only used by the no-JavaScript fallback
    if (payload.email) payload.replyto = payload.email;
    payload.subject = form.querySelector('[name=subject]').value + ' — ' + (payload.service || 'Enquiry') + ' (' + payload.location + ')';

    busy(true);
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().catch(function () { return { success: false, message: 'Unexpected response (' + r.status + ')' }; }); })
      .then(function (res) {
        if (!res || !res.success) throw new Error((res && res.message) || 'Not accepted');
        track('generate_lead', { form_name: 'enquiry', service: payload.service, timing: payload.timing, page_path: location.pathname });
        var ok = document.getElementById(form.getAttribute('data-success'));
        ok.querySelectorAll('[data-fill]').forEach(function (el) {
          var k = el.getAttribute('data-fill');
          el.textContent = k === 'firstname' ? (payload.name || '').split(' ')[0] : payload[k] || '';
        });
        var sms = ok.querySelector('[data-sms]');
        if (sms) sms.href = 'sms:' + sms.getAttribute('data-sms') + '?&body=' + encodeURIComponent('Photos for my tree enquiry — ' + payload.name + ', ' + payload.location);
        form.hidden = true;
        ok.hidden = false;
        ok.focus();
        ok.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        busy(false);
        var reason = err && err.name === 'TypeError' ? 'We couldn’t reach the form service — check your connection.' : (err && err.message) || 'Unknown problem';
        showAlert('Your enquiry didn’t send. Nothing was lost — try again, or call 0448 762 058.', [{ text: 'Reason: ' + reason }]);
        track('form_submit_error', { reason: String(err && err.message).slice(0, 80) });
      });
  });
})();
