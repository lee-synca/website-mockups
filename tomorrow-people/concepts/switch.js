/* Concept switcher bar, shared by every concept page. Not part of the real site. */
(function () {
  var items = [
    ['index.html', 'Lion'], ['concept-golden-hour.html', 'Golden Hour'], ['concept-paint.html', 'Paint'],
    ['concept-backyard.html', 'Backyard'], ['concept-wall.html', 'The Wall'], ['concept-story.html', 'The Story'],
    ['concept-languages.html', 'Three Languages']
  ];
  var here = location.pathname.split('/').pop() || 'index.html';
  var nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Concepts');
  nav.style.cssText = 'position:fixed;left:50%;bottom:.8rem;transform:translateX(-50%);z-index:999;display:flex;gap:.15rem;padding:.3rem;border-radius:999px;background:rgba(30,30,30,.94);font:500 12px/1 system-ui,sans-serif;white-space:nowrap;max-width:calc(100vw - 1rem);overflow-x:auto;box-shadow:0 4px 18px rgba(0,0,0,.35)';
  items.forEach(function (it) {
    var a = document.createElement('a');
    a.href = it[0]; a.textContent = it[1];
    var on = it[0] === here;
    if (on) a.setAttribute('aria-current', 'page');
    a.style.cssText = 'padding:.6rem .75rem;border-radius:999px;text-decoration:none;letter-spacing:0;text-transform:none;' + (on ? 'background:#fff;color:#000' : 'color:#fff');
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
})();
