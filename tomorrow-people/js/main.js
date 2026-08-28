/* Tomorrow People — interactions */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Sticky header ─────────────────────────────────────── */
  var header = document.querySelector('.site-header');
  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Overlay menu ──────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var overlay = document.getElementById('overlay-menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = overlay.querySelector('a');
      if (first) first.focus();
    }
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  overlay.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) {
      setMenu(false);
      burger.focus();
    }
  });

  /* ── Nav highlight follows the section in view ─────────── */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ── Scroll reveals ────────────────────────────────────── */
  var targets = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ── Newsletter ────────────────────────────────────────── */
  var form = document.getElementById('newsletter');
  var note = document.getElementById('form-note');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('email');
    if (!email.value || !email.checkValidity()) {
      note.textContent = 'Enter a valid email address.';
      email.focus();
      return;
    }
    // No mailing-list backend is connected yet — wire this up before launch.
    note.textContent = 'Sign-up isn’t connected yet — no address was sent.';
  });
})();
