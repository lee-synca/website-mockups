(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Phone menu ---------- */
  const toggle = $('[data-menu-toggle]'), menu = $('[data-menu]');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', open);
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Nav: solid once you scroll, tucks away on the way down ---------- */
  const nav = $('[data-nav]');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 80);
    nav.classList.toggle('is-hidden', y > lastY && y > 600 && !menu.classList.contains('is-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Plain page when: ?static is in the address, the library failed to load, or motion is turned off.
  const animated = root.classList.contains('js');
  if (!animated) return;
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { duration: 1.4 });
    }));
  }

  /* ---------- Hero: the peak draws itself, then the words arrive ---------- */
  // (Inner pages use the same entrance without the drawn peak.)
  if ($('.hero')) {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15 });
    if ($('.hero__lines')) tl
      .to('.hero__lines .draw', { strokeDashoffset: 0, duration: 1.8, stagger: .09, ease: 'power3.inOut' }, 0)
      .to('.hero__lines .dash', { opacity: 1, duration: .8, ease: 'power2.out' }, .9)
      .to('.hero__photo', { opacity: 1, duration: 1.4, ease: 'power2.out' }, .9);
    tl.to('.hero .line > span', { y: 0, duration: 1.2, stagger: .1 }, .35)
      .to('[data-hero]', { opacity: 1, duration: 1, stagger: .1, ease: 'power2.out' }, 1);
  }

  /* ---------- Sections fade up once ---------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08, overwrite: true })
  });

  /* ---------- Name story: words light up as you read ---------- */
  $$('[data-words]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(t => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = t;
      el.appendChild(s);
    });
    gsap.to($$('.w', el), {
      opacity: 1, ease: 'none', stagger: .1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: true }
    });
  });

  /* ---------- Statement: photo drifts, peak rises ---------- */
  if ($('.statement')) gsap.fromTo('[data-parallax]', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } });
  if ($('.statement')) gsap.fromTo('.statement__peak', { yPercent: 14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'center center', scrub: true } });
  if ($('.join')) gsap.fromTo('.join__peak', { yPercent: 12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.join', start: 'top bottom', end: 'center center', scrub: true } });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
