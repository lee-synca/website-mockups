/* AVEA Control Centre: website admin, agreements, funding calendar and wording check.
   Builds on the helpers app.js shares as window.CC. All data is demo data. */
(() => {
  const CC = window.CC;
  const { state, routes, view, $, $$, esc, toast, fmtDate, daysFrom, addDays } = CC;

  /* =====================================================================
     Wording rules (from the AVEA brand guide, section 04)
     ===================================================================== */
  const RULES = [
    { re: /\b(?:every|all)(?: the)? (?:major )?(?:platforms?|stores?|DSPs?|services)(?: (?:and|&) stores?)?(?: (?:worldwide|in the world))?/gi, level: 'fix', why: 'Claims total coverage. AVEA delivers to major platforms, not every one.', fix: 'major streaming and download platforms' },
    { re: /\b(?:worldwide|everywhere that matters|everywhere)\b/gi, level: 'check', why: 'Sounds like a promise of total reach. Fine as a feeling, risky as a claim.' },
    { re: /\bguarantee(?:d|s)?\b/gi, level: 'fix', why: 'AVEA never guarantees streams, playlists, income or results.', fix: 'aim for' },
    { re: /\b(?:get|put|land|place)(?:ting)? (?:you|your (?:music|song|track|single)s?) (?:on|onto|in|into) (?:editorial |big |major )?playlists?\b/gi, level: 'fix', why: 'Promises a playlist placement. AVEA can pitch, not place.', fix: 'pitch your music to playlist editors' },
    { re: /\bplaylisting\b/gi, level: 'fix', why: 'Implies placements. Use "pitching".', fix: 'pitching' },
    { re: /\b(?:go|going|gone) viral\b|\bblow up\b/gi, level: 'fix', why: 'Promises a result nobody controls.', fix: 'reach new listeners' },
    { re: /\bchase every stream\b|\bevery stream (?:you're|you are) owed\b|\bnothing (?:is |you've earned is )?left on the table\b|\bevery view earns\b/gi, level: 'fix', why: 'Overstates collection. Content ID and royalties only cover eligible uses.', fix: 'help collect eligible revenue where the rights allow' },
    { re: /\b(?:completely |totally |100% )?free\b(?! to apply)/gi, level: 'fix', why: 'Applying is free; the services use a revenue share. Say exactly that.', fix: 'no fee to apply' },
    { re: /\bno (?:upfront )?fees?\b(?! to apply)/gi, level: 'fix', why: 'There is a revenue share. Be clear about cost.', fix: 'no fee to apply' },
    { re: /\b(?:you keep|keep) (?:everything|all of it|100%|all your rights)\b/gi, level: 'fix', why: 'Ownership depends on the agreement. Qualify it.', fix: 'under our standard distribution arrangement, you keep ownership of your masters' },
    { re: /(?<!standard distribution arrangement, )(?<!standard distribution terms, )\byou keep (?:your|ownership of your) masters\b/gi, level: 'check', why: 'True under the standard arrangement. Add "under our standard distribution arrangement" nearby.' },
    { re: /\bsign up\b|\bget started\b|\bjoin now\b/gi, level: 'style', why: 'The call to action is always "Apply to Join AVEA".', fix: 'Apply to Join AVEA' },
    { re: /\bAvea\b|\bavea\b(?= is| are| helps| will| can| team)/g, level: 'style', why: 'Write the name in capitals: AVEA.', fix: 'AVEA' },
    { re: /\b(optimiz\w*|catalog\b|color\w*|organiz\w*|favorite\w*)/gi, level: 'style', why: 'Use New Zealand English spelling.', fixFn: m => m.replace(/iz/gi, 'is').replace(/^catalog$/i, 'catalogue').replace(/olor/i, 'olour').replace(/avorite/i, 'avourite') },
    { re: / - /g, level: 'style', why: 'Use a spaced en dash ( – ), not a hyphen.', fix: ' – ' }
  ];
  const LEVEL = { fix: ['Must fix', 'tag--bad'], check: ['Check', 'tag--gold'], style: ['Style', 'tag'] };

  function checkText(text) {
    const hits = [];
    RULES.forEach((r, ri) => {
      r.re.lastIndex = 0; let m;
      while ((m = r.re.exec(text))) {
        if (!m[0]) { r.re.lastIndex++; continue; }
        const overlap = hits.some(h => m.index < h.end && m.index + m[0].length > h.start);
        if (!overlap) hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], rule: r, ri, fix: r.fixFn ? r.fixFn(m[0]) : r.fix });
      }
    });
    return hits.sort((a, b) => a.start - b.start);
  }
  function highlight(text, hits) {
    let out = '', i = 0;
    hits.forEach((h, n) => { out += esc(text.slice(i, h.start)) + `<mark class="hit hit--${h.rule.level}" data-hit="${n}">${esc(h.text)}</mark>`; i = h.end; });
    return (out + esc(text.slice(i))).replace(/\n/g, '<br>');
  }
  function applyFixes(text, hits) {
    let out = text;
    hits.filter(h => h.fix && h.rule.level !== 'check').slice().reverse().forEach(h => {
      let f = h.fix;
      if (/^[A-Z]/.test(h.text) && /^[a-z]/.test(f)) f = f[0].toUpperCase() + f.slice(1);
      out = out.slice(0, h.start) + f + out.slice(h.end);
    });
    return out;
  }
  function hitList(hits) {
    if (!hits.length) return '<p class="ok-line">Nothing to fix. This reads like AVEA.</p>';
    return `<ul class="hits">${hits.map((h, n) => { const [lab, cls] = LEVEL[h.rule.level];
      return `<li data-hit-row="${n}"><span class="tag ${cls}">${lab}</span><div><b>"${esc(h.text.trim())}"</b><span class="small muted">${esc(h.rule.why)}</span>${h.fix ? `<span class="small">Try: <span class="gold">${esc(h.fix.trim())}</span></span>` : ''}</div></li>`; }).join('')}</ul>`;
  }
  const summary = hits => { const f = hits.filter(h => h.rule.level === 'fix').length, c = hits.filter(h => h.rule.level !== 'fix').length;
    return f ? `<span class="tag tag--bad">${f} must fix</span>${c ? ` <span class="tag tag--gold">${c} to check</span>` : ''}` : c ? `<span class="tag tag--gold">${c} to check</span>` : '<span class="tag tag--ok">On brand</span>'; };
  CC.checkText = checkText;

  /* A text box with the wording check running live underneath it */
  function wire(box, { onChange } = {}) {
    const ta = $('textarea, input', box), out = $('[data-check-out]', box), sum = $('[data-check-sum]', box);
    const run = () => { const hits = checkText(ta.value); if (out) out.innerHTML = hitList(hits); if (sum) sum.innerHTML = summary(hits); onChange && onChange(ta.value, hits); return hits; };
    ta.addEventListener('input', run);
    $('[data-fix-all]', box)?.addEventListener('click', () => { ta.value = applyFixes(ta.value, checkText(ta.value)); run(); toast('Wording fixed'); });
    run();
    return run;
  }

  /* =====================================================================
     Demo content for the website admin
     ===================================================================== */
  const site = state.site = {
    blocks: [
      { id: 'hero', page: 'Home', name: 'Hero', fields: { Eyebrow: 'Your Sound. Your Story. Your Future', Heading: 'Where Artists Become', Body: 'AVEA is a Pacific-owned music distribution and artist services company. We help artists get their music out, understand their rights and build careers without losing what makes them who they are.' } },
      { id: 'founding', page: 'Home', name: 'Founding artists note', fields: { Body: 'AVEA is new. We\'re taking on our first artists now, and they get our full attention.' } },
      { id: 'closing', page: 'Home', name: 'Closing call to action', fields: { Eyebrow: 'Ready to take the next step?', Heading: 'Ready to become?', Body: 'Tell us what you\'re working on and where you\'d like to take it. We\'d love to hear from you.' } },
      { id: 'faq-cost', page: 'FAQ', name: 'What does it cost to join AVEA?', fields: { Question: 'What does it cost to join AVEA?', Answer: 'There\'s no fee to apply. Our standard services use a revenue-share model, and we\'ll explain the relevant fees and splits before you agree to anything.' } },
      { id: 'faq-masters', page: 'FAQ', name: 'Do I keep my rights and my masters?', fields: { Question: 'Do I keep my rights and my masters?', Answer: 'Under our standard distribution arrangement, you keep ownership of your masters. We\'ll explain the rights we need to work with your music before you sign.' } },
      { id: 'faq-where', page: 'FAQ', name: 'Where will my music be available?', fields: { Question: 'Where will my music be available?', Answer: 'We help deliver your releases to major streaming and download platforms, including Spotify, Apple Music, TikTok and YouTube, and we\'ll work with you to get the artwork, credits and release details right.' } },
      { id: 'svc-dist', page: 'Services', name: 'Distribution', fields: { Tagline: 'Your music, everywhere it matters', Body: 'We help deliver your releases to major streaming and download platforms, including Spotify, Apple Music and YouTube Music. We\'ll work with you to get the artwork, credits and release details right.' } },
      { id: 'svc-yt', page: 'Services', name: 'YouTube Services', fields: { Tagline: 'Grow your channel. Make more of your content.', Body: 'Your YouTube channel can do more than you think. We help you improve how your videos are found, reach more people through our network and collect eligible revenue from uses of your content across YouTube.' } }
    ],
    history: [
      { when: '2026-11-21', who: 'Lee (Synca)', what: 'Published the FAQ page' },
      { when: '2026-11-19', who: 'Lee (Synca)', what: 'Launched the preview site' }
    ],
    team: [
      { name: '', role: 'Co-founder', town: '', quote: '', photo: null },
      { name: '', role: 'Co-founder', town: '', quote: '', photo: null }
    ],
    photos: [
      { src: 'assets/photos/dir-stage.jpg', name: 'Live vocal', used: 'Home hero' },
      { src: 'assets/photos/backstage.jpg', name: 'Backstage', used: 'Home quote' },
      { src: 'assets/photos/svc-distribution.jpg', name: 'Studio mic', used: 'Distribution' },
      { src: 'assets/photos/svc-youtube.jpg', name: 'Filming a show', used: 'YouTube Services' },
      { src: 'assets/photos/svc-strategy.jpg', name: 'Mixing desk', used: 'Release Strategy' },
      { src: 'assets/photos/svc-rights.jpg', name: 'Notebook', used: 'Rights & Royalties' },
      { src: 'assets/photos/artist-growth.jpg', name: 'Crowd', used: 'Artist Growth' },
      { src: 'assets/photos/dir-portrait.jpg', name: 'Portrait', used: 'YouTube page' },
      { src: 'assets/photos/dir-guitar.jpg', name: 'Guitar', used: 'YouTube page' }
    ],
    form: {
      open: true,
      closedMsg: 'We\'re not taking new applications right now while we look after our first artists. Leave your email and we\'ll let you know when we reopen.',
      notify: 'hello@avea.co.nz',
      spam: true,
      autoReply: 'Kia ora {first},\n\nThanks for applying to AVEA. Your application is with us and we\'ll listen to your music properly before we get back to you. Timing depends on how many applications we have and what you need help with.\n\nNgā mihi,\nThe AVEA team'
    },
    legal: [
      { id: 'privacy', name: 'Privacy Policy', reviewed: false, reviewer: '', updated: '2026-07-07' },
      { id: 'terms', name: 'Terms of Use', reviewed: false, reviewer: '', updated: '2026-07-07' }
    ],
    seo: {
      hidden: true,
      shareImage: 'assets/photos/dir-stage.jpg',
      pages: [
        { page: 'Home', path: '/', title: 'AVEA | Where Artists Become', desc: 'AVEA is a Pacific-owned music distribution and artist services company. We help artists get their music out, understand their rights and build careers.' },
        { page: 'Services', path: '/services', title: 'Services | AVEA', desc: 'AVEA services: distribution, YouTube services, release strategy, rights and royalties, and artist growth for Pacific artists.' },
        { page: 'How It Works', path: '/how-it-works', title: 'How It Works | AVEA', desc: 'How working with AVEA goes: apply and onboard, plan and release, then grow together.' },
        { page: 'Join', path: '/join', title: 'Apply to join | AVEA', desc: 'Apply to join AVEA. Share a few details about yourself, your music and what you\'re hoping to do next. There\'s no fee to apply.' }
      ]
    }
  };

  /* =====================================================================
     Agreements (sample terms, not AVEA's real agreement)
     ===================================================================== */
  state.agreements = [
    { id: 'g1', artist: 'Koru Lane', contact: 'Hemi Paora', status: 'Signed', version: 'Standard distribution 1.0', sent: '2026-11-10', signed: '2026-11-14', start: '2026-11-14', years: 2,
      services: ['Distribution', 'Release strategy'], share: 80, notice: 90, rights: 'A licence to distribute and collect revenue for the recordings. Koru Lane keeps ownership of the masters.', summarySent: true },
    { id: 'g2', artist: 'Sina Mo\'ui', contact: 'Sina Mo\'ui', status: 'Waiting for signature', version: 'Standard distribution 1.0', sent: '2026-11-18', signed: null, start: null, years: 2,
      services: ['Distribution', 'Rights & royalties', 'Artist growth'], share: 80, notice: 90, rights: 'A licence to distribute and collect revenue for the recordings. Sina keeps ownership of the masters.', summarySent: true },
    { id: 'g3', artist: 'Tavita & The Reef', contact: 'Tavita Leaupepe', status: 'Draft', version: 'Standard distribution 1.0', sent: null, signed: null, start: null, years: 2,
      services: ['Distribution', 'YouTube monetisation', 'Release strategy'], share: 80, notice: 90, rights: 'A licence to distribute and collect revenue for the recordings, plus YouTube Content ID management. The band keeps ownership of the masters.', summarySent: false },
    { id: 'g4', artist: 'Ula Tavake', contact: 'Ula Tavake', status: 'Signed', version: 'Release-only 1.0', sent: '2025-11-20', signed: '2025-12-01', start: '2025-12-01', years: 1,
      services: ['Release strategy'], share: 85, notice: 30, rights: 'Release planning only. No distribution licence.', summarySent: true }
  ];

  /* =====================================================================
     Funding and opportunities (sample dates: check each organisation's website)
     ===================================================================== */
  state.funding = [
    { id: 'f1', type: 'Funding', org: 'NZ On Air', name: 'New Music Single round', date: '2026-12-04', for: ['Koru Lane', 'Selu Grace'], remind: true, note: 'Needs the finished track and a release plan.' },
    { id: 'f2', type: 'Funding', org: 'NZ Music Commission', name: 'Going Global Music Fund', date: '2026-12-10', for: ['Tavita & The Reef'], remind: true, note: 'For touring and promotion overseas.' },
    { id: 'f3', type: 'Festival', org: 'Pasifika Festival', name: 'Performer applications', date: '2027-01-15', for: ['Kalo Kings', 'Sina Mo\'ui'], remind: false, note: '' },
    { id: 'f4', type: 'Funding', org: 'Creative New Zealand', name: 'Arts Grants round', date: '2027-01-29', for: ['Selu Grace'], remind: false, note: 'Good fit for the Tide Line EP.' },
    { id: 'f5', type: 'Awards', org: 'Pacific Music Awards', name: 'Entries close', date: '2027-02-26', for: ['Sina Mo\'ui', 'Koru Lane'], remind: true, note: 'Releases from the eligibility year only.' },
    { id: 'f6', type: 'Awards', org: 'APRA AMCOS', name: 'Professional Development Awards', date: '2027-03-12', for: [], remind: false, note: '' }
  ];
  const fundingAll = () => {
    // Spotify pitch deadlines come straight from the release plans
    const pitches = state.releases.filter(r => daysFrom(r.date) > 7).map(r => ({ id: 'p-' + r.id, type: 'Pitching', org: 'Spotify for Artists', name: `Editorial pitch: ${r.title}`, date: addDays(r.date, -14), for: [r.artist], remind: true, auto: true, note: 'From the release plan. Spotify needs at least 7 days.' }));
    return [...state.funding, ...pitches].sort((a, b) => a.date.localeCompare(b.date));
  };

  /* Add to the Monday pulse */
  CC.pulseExtras = [
    () => fundingAll().filter(f => !f.auto && daysFrom(f.date) >= 0 && daysFrom(f.date) <= 21).map(f => ({ dot: 'gold', text: `${esc(f.org)}: <b>${esc(f.name)}</b>`, meta: `Closes in ${daysFrom(f.date)} days`, href: '#/funding' })),
    () => state.agreements.filter(g => g.status === 'Waiting for signature').map(g => ({ dot: '', text: `Agreement waiting on <b>${esc(g.artist)}</b>`, meta: `Sent ${fmtDate(g.sent, { day: 'numeric', month: 'short' })}`, href: '#/agreements' })),
    () => site.form.open ? [] : [{ dot: 'bad', text: '<b>Applications are closed</b> on the website', meta: 'Join form', href: '#/website/form' }]
  ];

  /* ---------- Shared bits ---------- */
  const head = (label, title, intro, extra = '') => `<div class="head"><div><p class="label">${label}</p><h1 class="h1">${title}</h1>${intro ? `<p class="muted">${intro}</p>` : ''}</div>${extra}</div>`;
  const WEB_TABS = [['text', 'Page text'], ['team', 'Team'], ['photos', 'Photos'], ['form', 'Join form'], ['legal', 'Legal pages'], ['seo', 'Search & sharing']];
  const tabs = cur => `<nav class="tabs" aria-label="Website sections">${WEB_TABS.map(([id, n]) => `<a href="#/website/${id}" ${id === cur ? 'aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;
  const publish = what => { site.history.unshift({ when: CC.iso(CC.TODAY), who: 'You', what }); toast('Published to the website'); };
  const switchHTML = (attr, on, label) => `<label class="switch"><input type="checkbox" ${attr} ${on ? 'checked' : ''}><span class="switch__track"></span><span>${label}</span></label>`;

  /* =====================================================================
     Wording check page
     ===================================================================== */
  const EXAMPLES = {
    'Instagram caption': 'Big news! Avea is now open. Sign up today and we\'ll get your music on every platform worldwide - and get you on playlists. Completely free!',
    'Email to an artist': 'Kia ora Mele,\n\nGreat to chat. With AVEA you keep everything, and we chase every stream so nothing is left on the table. We guarantee your next single will go viral.',
    'Approved copy': 'We help deliver your releases to major streaming and download platforms. There\'s no fee to apply, and we\'ll explain the fees and splits before you agree to anything.'
  };
  routes['wording'] = () => {
    view.innerHTML = head('Wording check', 'Does it sound like AVEA?', 'Paste a caption, an email or a page of copy. It flags promises AVEA can\'t make, unclear cost or ownership claims, and style slips, and suggests the approved wording. The same check runs inside the website editor.') + `
      <div class="grid two">
        <section class="panel" style="display:grid;gap:.9rem;align-content:start" data-wc>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap"><span class="caps muted" style="align-self:center">Try</span>${Object.keys(EXAMPLES).map(k => `<button class="btn btn--ghost btn--sm" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}</div>
          <label class="sr" for="wc">Text to check</label>
          <textarea id="wc" class="field-ta" rows="9" placeholder="Paste your words here…">${esc(EXAMPLES['Instagram caption'])}</textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><span data-check-sum></span><button class="btn" data-fix-all>Fix what can be fixed</button></div>
          <div class="hl" data-hl aria-live="polite"></div>
        </section>
        <section class="panel" style="display:grid;gap:.75rem;align-content:start">
          <h2 class="h3">What to change</h2>
          <div data-check-out></div>
        </section>
      </div>`;
    const box = $('[data-wc]'), hl = $('[data-hl]');
    const out = $('[data-check-out]');
    const ta = $('#wc');
    const run = () => { const hits = checkText(ta.value); out.innerHTML = hitList(hits); $('[data-check-sum]').innerHTML = summary(hits); hl.innerHTML = highlight(ta.value, hits); };
    ta.addEventListener('input', run);
    $('[data-fix-all]').addEventListener('click', () => { ta.value = applyFixes(ta.value, checkText(ta.value)); run(); toast('Wording fixed'); });
    $$('[data-ex]').forEach(b => b.addEventListener('click', () => { ta.value = EXAMPLES[b.dataset.ex]; run(); }));
    run();
  };

  /* =====================================================================
     Website: page text
     ===================================================================== */
  let curBlock = 'hero';
  routes['website'] = sub => (WEB[sub] || WEB.text)();
  const WEB = {};
  WEB.text = () => {
    const b = site.blocks.find(x => x.id === curBlock);
    const pages = [...new Set(site.blocks.map(x => x.page))];
    view.innerHTML = head('Website', 'Change the words, safely.', 'Edit the parts of the site that change, see them as they\'ll look, and publish. Every edit goes through the wording check first.') + tabs('text') + `
      <div class="editor">
        <aside class="panel blocks">${pages.map(p => `<p class="caps muted">${p}</p>${site.blocks.filter(x => x.page === p).map(x => `<button data-block="${x.id}" ${x.id === curBlock ? 'aria-current="true"' : ''}>${esc(x.name)}</button>`).join('')}`).join('')}</aside>
        <section class="panel" style="display:grid;gap:1rem;align-content:start">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><h2 class="h3">${esc(b.page)} · ${esc(b.name)}</h2><span data-block-sum></span></div>
          ${Object.entries(b.fields).map(([k2, v]) => `<div class="fieldbox" data-fieldbox="${esc(k2)}">
            <label class="caps muted" for="f-${esc(k2)}">${esc(k2)}</label>
            ${v.length > 70 ? `<textarea id="f-${esc(k2)}" class="field-ta" rows="4">${esc(v)}</textarea>` : `<input id="f-${esc(k2)}" class="field-in" value="${esc(v)}">`}
            <div data-check-out></div></div>`).join('')}
          <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center"><button class="btn" data-publish>Publish</button><button class="btn btn--ghost" data-revert>Undo changes</button><span class="small muted" data-publish-note></span></div>
        </section>
        <section style="display:grid;gap:1rem;align-content:start">
          <div class="panel" style="display:grid;gap:.6rem"><span class="caps muted">Preview</span><div class="sitepv" data-preview></div></div>
          <div class="panel" style="display:grid;gap:.6rem"><h2 class="h3">Recent changes</h2><ul class="list small">${site.history.slice(0, 5).map(h => `<li style="grid-template-columns:1fr auto"><span>${esc(h.what)} <span class="muted">· ${esc(h.who)}</span></span><span class="muted">${fmtDate(h.when, { day: 'numeric', month: 'short' })}</span></li>`).join('')}</ul></div>
        </section>
      </div>`;
    const draft = { ...b.fields };
    const renderPreview = () => {
      const f = draft; const pv = $('[data-preview]');
      if (b.page === 'FAQ') pv.innerHTML = `<p class="pv-label">Questions</p><p class="pv-h3">${esc(f.Question)}</p><p class="pv-body">${esc(f.Answer)}</p>`;
      else if (b.page === 'Services') pv.innerHTML = `<p class="pv-label">${esc(f.Tagline)}</p><p class="pv-h2">${esc(b.name)}</p><p class="pv-body">${esc(f.Body)}</p>`;
      else pv.innerHTML = `${f.Eyebrow ? `<p class="pv-label">${esc(f.Eyebrow)}</p>` : ''}${f.Heading ? `<p class="pv-h1">${esc(f.Heading)}</p>` : ''}<p class="pv-body">${esc(f.Body)}</p>`;
    };
    const total = () => { const all = Object.values(draft).flatMap(v => checkText(v)); $('[data-block-sum]').innerHTML = summary(all); return all; };
    $$('[data-fieldbox]').forEach(fb => wire(fb, { onChange: v => { draft[fb.dataset.fieldbox] = v; renderPreview(); total(); } }));
    $$('[data-block]').forEach(x => x.addEventListener('click', () => { curBlock = x.dataset.block; WEB.text(); }));
    $('[data-revert]').addEventListener('click', () => { WEB.text(); toast('Changes undone'); });
    $('[data-publish]').addEventListener('click', () => {
      const must = total().filter(h => h.rule.level === 'fix');
      if (must.length) { $('[data-publish-note]').innerHTML = `<span style="color:var(--bad)">Fix ${must.length} wording problem${must.length > 1 ? 's' : ''} first. AVEA can't publish promises it can't keep.</span>`; return; }
      Object.assign(b.fields, draft); publish(`Updated "${b.name}" on ${b.page}`); WEB.text();
    });
    renderPreview(); total();
  };

  /* =====================================================================
     Website: photos (gold duotone made in the browser)
     ===================================================================== */
  function duotone(img, { fade = true, max = 1600 } = {}) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      let g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2];
      g = Math.max(0, Math.min(255, (g - 128) * 1.15 + 128)) / 255;
      p[i] = 240 * g; p[i + 1] = 181 * g; p[i + 2] = 101 * g;
    }
    x.putImageData(d, 0, 0);
    if (fade) { const gr = x.createLinearGradient(0, h * .35, 0, h); gr.addColorStop(0, 'rgba(2,24,36,0)'); gr.addColorStop(1, 'rgba(2,24,36,.7)'); x.fillStyle = gr; x.fillRect(0, h * .35, w, h * .65); }
    return c.toDataURL('image/jpeg', .9);
  }
  const loadFile = file => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });

  WEB.photos = () => {
    view.innerHTML = head('Website', 'Photos, always on-brand.', 'Upload any photo and it gets AVEA\'s gold treatment automatically, the same recipe as the brand guide. No designer needed.') + tabs('photos') + `
      <div class="upload" data-ph-up>
        <span class="h3">Drop a photo here</span>
        <span class="small muted">JPG or PNG. Try a phone photo from a gig: it comes out matching the rest of the site.</span>
        <label class="btn" style="position:relative">Choose a photo<input type="file" accept="image/*" data-ph-file style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      </div>
      <div data-ph-result></div>
      <section style="display:grid;gap:.9rem"><h2 class="h3">On the website now</h2>
        <div class="photo-grid">${site.photos.map(p => `<figure class="photo"><div class="duo-c">${p.dataUrl ? `<img src="${p.dataUrl}" alt="">` : `<div class="duo-css"><img src="${p.src}" alt=""></div>`}</div><figcaption class="small"><b>${esc(p.name)}</b><span class="muted">${esc(p.used)}</span></figcaption></figure>`).join('')}</div>
        <p class="small muted">These are the AI placeholder images from the preview site. Swap each one for a real photo before launch.</p>
      </section>`;
    const up = $('[data-ph-up]');
    const handle = async file => {
      if (!file || !/^image\//.test(file.type)) return toast('That isn\'t an image');
      const img = await loadFile(file); const fade = true;
      const url = duotone(img, { fade });
      const orig = URL.createObjectURL(file);
      $('[data-ph-result]').innerHTML = `<section class="panel" style="display:grid;gap:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><h2 class="h3">${esc(file.name)}</h2><span class="tag tag--ok">Treatment applied</span></div>
        <div class="compare"><figure><img src="${orig}" alt=""><figcaption class="caps muted">Original</figcaption></figure><figure><img src="${url}" alt="" data-out><figcaption class="caps gold">AVEA gold</figcaption></figure></div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
          ${switchHTML('data-fade checked', true, 'Navy fade at the bottom (for text)')}
          <label class="small" style="display:flex;gap:.5rem;align-items:center">Use it for <select class="field-in" style="width:auto" data-use>${site.photos.map((p, i) => `<option value="${i}">${esc(p.used)}</option>`).join('')}</select></label>
          <button class="btn" data-use-btn>Replace and publish</button>
          <a class="btn btn--ghost" href="${url}" download="${esc(file.name.replace(/\.\w+$/, ''))}-avea.jpg" data-dl>Download</a>
        </div></section>`;
      $('[data-fade]').addEventListener('change', e => { const u = duotone(img, { fade: e.target.checked }); $('[data-out]').src = u; $('[data-dl]').href = u; });
      $('[data-use-btn]').addEventListener('click', () => { const p = site.photos[+$('[data-use]').value]; p.dataUrl = $('[data-out]').src; p.name = file.name.replace(/\.\w+$/, ''); publish(`Replaced the ${p.used} photo`); WEB.photos(); });
    };
    $('[data-ph-file]').addEventListener('change', e => handle(e.target.files[0]));
    ['dragenter', 'dragover'].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.remove('drag'); }));
    up.addEventListener('drop', e => handle(e.dataTransfer.files[0]));
  };

  /* =====================================================================
     Website: team
     ===================================================================== */
  WEB.team = () => {
    view.innerHTML = head('Website', 'The people behind AVEA.', 'Fill in the founders and their photos. Until a card is complete, the website keeps showing the placeholder, so nothing half-finished goes live.') + tabs('team') + `
      <div class="grid two">${site.team.map((m, i) => `
        <section class="panel team-ed" data-member="${i}" style="display:grid;gap:.9rem;align-content:start">
          <h2 class="h3">Founder ${i + 1}</h2>
          <div class="team-row">
            <label class="person-ph" title="Upload a photo">${m.photo ? `<img src="${m.photo}" alt="">` : '<span class="caps muted">Add photo</span>'}<input type="file" accept="image/*" data-photo></label>
            <div style="display:grid;gap:.6rem;flex:1">
              <label class="lbl"><span class="caps muted">Name</span><input class="field-in" data-k="name" value="${esc(m.name)}" placeholder="Full name"></label>
              <label class="lbl"><span class="caps muted">Role</span><input class="field-in" data-k="role" value="${esc(m.role)}"></label>
              <label class="lbl"><span class="caps muted">Village or home town</span><input class="field-in" data-k="town" value="${esc(m.town)}" placeholder="e.g. Apia, or Porirua"></label>
            </div>
          </div>
          <label class="lbl"><span class="caps muted">A line in their own words</span><textarea class="field-ta" rows="3" data-k="quote" placeholder="Why I started AVEA…">${esc(m.quote)}</textarea></label>
          <div class="pv-person" data-pv></div>
        </section>`).join('')}</div>
      <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap"><button class="btn" data-team-pub>Publish team</button><span class="small muted" data-team-note></span></div>`;
    const pv = (i) => { const m = site.team[i]; const ok = m.name && m.town && m.photo;
      $(`[data-member="${i}"] [data-pv]`).innerHTML = `<div class="pv-photo">${m.photo ? `<img src="${m.photo}" alt="">` : '<span class="caps muted" style="font-size:.5625rem">No photo</span>'}</div><div><p class="pv-h3">${esc(m.name || 'Founder name')}</p><p class="small muted">${esc(m.role || 'Role')} · ${esc(m.town || 'Village or home town')}</p>${m.quote ? `<p class="small" style="margin-top:.4rem">"${esc(m.quote)}"</p>` : ''}<span class="tag ${ok ? 'tag--ok' : 'tag--gold'}" style="margin-top:.5rem">${ok ? 'Ready to publish' : 'Needs name, town and photo'}</span></div>`; };
    $$('[data-member]').forEach(sec => {
      const i = +sec.dataset.member;
      $$('[data-k]', sec).forEach(inp => inp.addEventListener('input', () => { site.team[i][inp.dataset.k] = inp.value; pv(i); }));
      $('[data-photo]', sec).addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const img = await loadFile(f); site.team[i].photo = duotone(img, { fade: false, max: 900 }); WEB.team(); toast('Photo added with the gold treatment'); });
      pv(i);
    });
    $('[data-team-pub]').addEventListener('click', () => {
      const ready = site.team.filter(m => m.name && m.town && m.photo).length;
      if (!ready) { $('[data-team-note]').textContent = 'Complete at least one card (name, town and photo) first.'; return; }
      publish(`Updated the team section (${ready} of ${site.team.length} founders live)`);
    });
  };

  /* =====================================================================
     Website: join form
     ===================================================================== */
  WEB.form = () => {
    const f = site.form;
    view.innerHTML = head('Website', 'The Join form.', 'Open or close applications, choose who hears about new ones, and set the reply artists get straight away. Applications land on the Applications board.') + tabs('form') + `
      <div class="grid two">
        <section class="panel" style="display:grid;gap:1.1rem;align-content:start">
          <div class="bigswitch ${f.open ? 'on' : ''}">
            ${switchHTML('data-open', f.open, `<b>${f.open ? 'Applications are open' : 'Applications are closed'}</b>`)}
            <span class="small muted">${f.open ? 'Artists can apply from every page.' : 'The Join page shows the message below instead of the form.'}</span>
          </div>
          <label class="lbl" data-msgbox><span class="caps muted">Message when closed</span><textarea class="field-ta" rows="3" data-closed>${esc(f.closedMsg)}</textarea><div data-check-out></div></label>
          <label class="lbl"><span class="caps muted">Tell these people about new applications</span><input class="field-in" data-notify value="${esc(f.notify)}"><span class="small muted">Separate several emails with commas.</span></label>
          ${switchHTML('data-spam', f.spam, 'Spam protection (hidden check, no puzzles for artists)')}
          <div style="display:flex;gap:.75rem;flex-wrap:wrap"><button class="btn" data-form-save>Save settings</button><button class="btn btn--ghost" data-test>Send a test application</button></div>
        </section>
        <section style="display:grid;gap:1rem;align-content:start">
          <div class="panel" style="display:grid;gap:.75rem" data-arbox>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem"><h2 class="h3">Automatic reply</h2><span data-check-sum></span></div>
            <span class="small muted">Sent the moment an artist applies. {first} becomes their first name.</span>
            <textarea class="field-ta" rows="9" data-auto>${esc(f.autoReply)}</textarea>
            <div data-check-out></div>
          </div>
          <div class="panel" style="display:grid;gap:.6rem"><span class="caps muted">What visitors see on the Join page</span>
            <div class="sitepv">${f.open ? '<p class="pv-label">Apply to join AVEA</p><p class="pv-h1">Let\'s take your music further.</p><p class="pv-body">The application form, five short sections.</p>' : `<p class="pv-label">Applications paused</p><p class="pv-h1">We'll be back soon.</p><p class="pv-body">${esc(f.closedMsg)}</p><p class="pv-btn">Notify me</p>`}</div></div>
        </section>
      </div>`;
    wire($('[data-msgbox]')); wire($('[data-arbox]'));
    $('[data-open]').addEventListener('change', e => { f.open = e.target.checked; publish(f.open ? 'Reopened applications' : 'Closed applications'); WEB.form(); CC.updateCounts(); });
    $('[data-form-save]').addEventListener('click', () => { f.closedMsg = $('[data-closed]').value; f.notify = $('[data-notify]').value; f.spam = $('[data-spam]').checked; f.autoReply = $('[data-auto]').value; toast('Settings saved'); });
    $('[data-test]').addEventListener('click', () => {
      const n = state.apps.filter(a => a.id.startsWith('t')).length + 1;
      state.apps.unshift({ id: 't' + n, artist: `Test Artist ${n}`, contact: 'Test Person', email: 'test@example.com', region: 'Aotearoa / New Zealand', genre: 'Pop', applied: CC.iso(CC.TODAY), stage: 'new', journey: 'Preparing my first release', tracks: 'None yet', distributor: 'No, not yet', rights: 'Not sure', help: ['Not sure yet'], start: 'Just exploring for now', heard: 'Search', link: 'https://example.com', goals: 'This is a test application sent from the Join form settings.', spotify: null, youtube: { subs: 0, views30: 0 }, instagram: null, notes: [] });
      CC.updateCounts(); toast('Test application sent. Check Applications.');
    });
  };

  /* =====================================================================
     Website: legal pages
     ===================================================================== */
  WEB.legal = () => {
    view.innerHTML = head('Website', 'Legal pages.', 'Once a lawyer has reviewed a page, tick it off here. The "Not legal advice" note disappears from that page and the date updates.') + tabs('legal') + `
      <div class="grid two">${site.legal.map((l, i) => `
        <section class="panel" style="display:grid;gap:1rem;align-content:start" data-legal="${i}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem"><h2 class="h3">${l.name}</h2><span class="tag ${l.reviewed ? 'tag--ok' : 'tag--gold'}">${l.reviewed ? 'Reviewed' : 'Not reviewed yet'}</span></div>
          ${switchHTML('data-rev', l.reviewed, 'Reviewed by a qualified lawyer')}
          <label class="lbl"><span class="caps muted">Reviewed by</span><input class="field-in" data-who value="${esc(l.reviewer)}" placeholder="Name and firm"></label>
          <div class="sitepv sitepv--light"><p class="pv-label">Legal</p><p class="pv-h1">${l.name}.</p><p class="small" style="opacity:.7">Last updated: ${fmtDate(l.updated, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            ${l.reviewed ? `<p class="small" style="opacity:.75">Reviewed by ${esc(l.reviewer || 'a qualified legal advisor')}.</p>` : '<p class="pv-note"><b>Not legal advice.</b> This page should be reviewed by a qualified legal advisor before you rely on it.</p>'}</div>
        </section>`).join('')}</div>`;
    $$('[data-legal]').forEach(sec => {
      const l = site.legal[+sec.dataset.legal];
      $('[data-who]', sec).addEventListener('input', e => { l.reviewer = e.target.value; });
      $('[data-rev]', sec).addEventListener('change', e => {
        l.reviewed = e.target.checked; if (l.reviewed) l.updated = CC.iso(CC.TODAY);
        publish(l.reviewed ? `Marked the ${l.name} as reviewed` : `Marked the ${l.name} as not reviewed`); WEB.legal();
      });
    });
  };

  /* =====================================================================
     Website: search and sharing
     ===================================================================== */
  let seoPage = 0;
  WEB.seo = () => {
    const s = site.seo, p = s.pages[seoPage];
    view.innerHTML = head('Website', 'Search and sharing.', 'How AVEA shows up on Google and when someone shares a link. Keep the site hidden from Google until launch day.') + tabs('seo') + `
      <div class="bigswitch ${s.hidden ? '' : 'on'}">${switchHTML('data-hidden', !s.hidden, `<b>${s.hidden ? 'Hidden from Google (preview mode)' : 'Visible on Google'}</b>`)}<span class="small muted">${s.hidden ? 'Search engines are asked not to list the site. Turn this on at launch.' : 'Search engines can list every page.'}</span></div>
      <div class="grid two">
        <section class="panel" style="display:grid;gap:1rem;align-content:start">
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">${s.pages.map((x, i) => `<button class="btn btn--ghost btn--sm" data-seo-page="${i}" aria-pressed="${i === seoPage}">${x.page}</button>`).join('')}</div>
          <label class="lbl" data-tbox><span class="caps muted">Page title <span data-tcount></span></span><input class="field-in" data-title value="${esc(p.title)}"><div data-check-out></div></label>
          <label class="lbl" data-dbox><span class="caps muted">Description <span data-dcount></span></span><textarea class="field-ta" rows="3" data-desc>${esc(p.desc)}</textarea><div data-check-out></div></label>
          <div><button class="btn" data-seo-save>Publish</button></div>
        </section>
        <section style="display:grid;gap:1rem;align-content:start">
          <div class="panel" style="display:grid;gap:.6rem"><span class="caps muted">On Google</span><div class="serp" data-serp></div></div>
          <div class="panel" style="display:grid;gap:.6rem"><span class="caps muted">When shared on social media</span>
            <div class="share" data-share></div>
            <label class="small" style="display:flex;gap:.5rem;align-items:center">Share image <select class="field-in" style="width:auto" data-share-img>${site.photos.map(ph => `<option value="${ph.dataUrl || ph.src}" ${(ph.dataUrl || ph.src) === s.shareImage ? 'selected' : ''}>${esc(ph.name)}</option>`).join('')}</select></label></div>
        </section>
      </div>`;
    const draw = () => {
      const t = $('[data-title]').value, d = $('[data-desc]').value;
      const cnt = (n, max) => `<span style="color:${n > max ? 'var(--bad)' : 'var(--mist)'}">· ${n}/${max}</span>`;
      $('[data-tcount]').innerHTML = cnt(t.length, 60); $('[data-dcount]').innerHTML = cnt(d.length, 155);
      $('[data-serp]').innerHTML = `<span class="serp__url">avea.co.nz${esc(p.path === '/' ? '' : ' › ' + p.path.slice(1))}</span><span class="serp__t">${esc(t.length > 60 ? t.slice(0, 57) + '…' : t)}</span><span class="serp__d">${esc(d.length > 155 ? d.slice(0, 152) + '…' : d)}</span>`;
      $('[data-share]').innerHTML = `<div class="share__img duo-css"><img src="${esc(s.shareImage)}" alt=""></div><div class="share__body"><span class="small muted">AVEA.CO.NZ</span><b>${esc(t)}</b><span class="small muted">${esc(d.slice(0, 90))}${d.length > 90 ? '…' : ''}</span></div>`;
    };
    wire($('[data-tbox]'), { onChange: draw }); wire($('[data-dbox]'), { onChange: draw });
    $$('[data-seo-page]').forEach(b => b.addEventListener('click', () => { seoPage = +b.dataset.seoPage; WEB.seo(); }));
    $('[data-share-img]').addEventListener('change', e => { s.shareImage = e.target.value; draw(); });
    $('[data-hidden]').addEventListener('change', e => { s.hidden = !e.target.checked; publish(s.hidden ? 'Hid the site from Google' : 'Made the site visible on Google'); WEB.seo(); });
    $('[data-seo-save]').addEventListener('click', () => {
      const bad = [...checkText($('[data-title]').value), ...checkText($('[data-desc]').value)].filter(h => h.rule.level === 'fix');
      if (bad.length) return toast('Fix the wording first');
      p.title = $('[data-title]').value; p.desc = $('[data-desc]').value; publish(`Updated search details for ${p.page}`);
    });
    draw();
  };

  /* =====================================================================
     Agreements
     ===================================================================== */
  const agEnd = g => g.start ? CC.iso(new Date(new Date(g.start + 'T12:00:00').setFullYear(new Date(g.start + 'T12:00:00').getFullYear() + g.years))) : null;
  const agTag = g => g.status === 'Signed' ? (daysFrom(agEnd(g)) <= 60 ? ['Renewal due', 'tag--gold'] : ['Signed', 'tag--ok']) : g.status === 'Draft' ? ['Draft', 'tag'] : ['Waiting for signature', 'tag--gold'];
  CC.pulseExtras.push(() => state.agreements.filter(g => g.status === 'Signed' && daysFrom(agEnd(g)) <= 60).map(g => ({ dot: 'gold', text: `Renewal talk with <b>${esc(g.artist)}</b>`, meta: `Ends ${fmtDate(agEnd(g), { day: 'numeric', month: 'short' })}`, href: '#/agreements' })));

  routes['agreements'] = () => {
    view.innerHTML = head('Agreements', 'Who\'s signed what.', 'Every artist agreement, its version and dates, what AVEA can and can\'t do with the music, and when it\'s up for renewal. Each one comes with a plain-language summary for the artist.') + `
      <p class="demo-note">Example terms for the demo. The real version uses AVEA's actual agreement.</p>
      <div class="grid kpis">
        <div class="panel kpi"><span class="caps muted">Signed</span><span class="num">${state.agreements.filter(g => g.status === 'Signed').length}</span></div>
        <div class="panel kpi"><span class="caps muted">Waiting for signature</span><span class="num">${state.agreements.filter(g => g.status === 'Waiting for signature').length}</span></div>
        <div class="panel kpi"><span class="caps muted">Drafts</span><span class="num">${state.agreements.filter(g => g.status === 'Draft').length}</span></div>
        <div class="panel kpi"><span class="caps muted">Renewals in 60 days</span><span class="num">${state.agreements.filter(g => g.status === 'Signed' && daysFrom(agEnd(g)) <= 60).length}</span></div>
      </div>
      <div class="panel" style="padding:0"><table class="ag-table"><thead><tr><th>Artist</th><th>Agreement</th><th>Services</th><th>Started</th><th>Ends</th><th>Status</th><th></th></tr></thead><tbody>
        ${state.agreements.map(g => { const [t, c] = agTag(g); const end = agEnd(g);
          return `<tr><td><b>${esc(g.artist)}</b></td><td class="muted">${esc(g.version)}</td><td class="muted">${g.services.map(esc).join(', ')}</td><td>${g.start ? fmtDate(g.start, { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</td><td>${end ? `${fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}<br><span class="small muted">${daysFrom(end)} days</span>` : '–'}</td><td><span class="tag ${c}">${t}</span></td><td class="r"><button class="btn btn--sm" data-ag="${g.id}">Open</button></td></tr>`; }).join('')}
      </tbody></table></div>`;
    $$('[data-ag]').forEach(b => b.addEventListener('click', () => openAgreement(b.dataset.ag)));
  };

  function openAgreement(id) {
    const g = state.agreements.find(x => x.id === id); const end = agEnd(g); const first = g.contact.split(' ')[0];
    const dr = $('[data-drawer]');
    dr.innerHTML = `
      <div class="drawer__head"><div style="display:grid;gap:.4rem"><p class="label">${esc(g.status)}</p><h2 class="h2" id="drawer-title">${esc(g.artist)}</h2><p class="small muted">${esc(g.version)}</p></div><button class="x" data-close aria-label="Close">×</button></div>
      <div class="drawer__body">
        <dl class="facts small">
          <div><dt>Services</dt><dd>${g.services.map(esc).join(', ')}</dd></div>
          <div><dt>Artist's share</dt><dd>${g.share}% to the artist, ${100 - g.share}% to AVEA</dd></div>
          <div><dt>Sent</dt><dd>${g.sent ? fmtDate(g.sent) : 'Not yet'}</dd></div>
          <div><dt>Signed</dt><dd>${g.signed ? fmtDate(g.signed) : 'Not yet'}</dd></div>
          <div><dt>Term</dt><dd>${g.years} year${g.years > 1 ? 's' : ''}${end ? `, ends ${fmtDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}` : ' from signing'}</dd></div>
          <div><dt>Notice to leave</dt><dd>${g.notice} days</dd></div>
          <div style="grid-column:1/-1"><dt>What AVEA can do with the music</dt><dd>${esc(g.rights)}</dd></div>
        </dl>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          ${g.status === 'Draft' ? '<button class="btn" data-ag-send>Send for signature</button>' : ''}
          ${g.status === 'Waiting for signature' ? '<button class="btn" data-ag-sign>Mark as signed</button><button class="btn btn--ghost" data-ag-remind>Send a reminder</button>' : ''}
          <button class="btn btn--ghost" data-ag-summary>Plain-language summary</button>
        </div>
        <div data-ag-out></div>
      </div>`;
    CC.openDrawer();
    $('[data-close]', dr).addEventListener('click', CC.closeDrawer);
    $('[data-ag-send]', dr)?.addEventListener('click', () => { g.status = 'Waiting for signature'; g.sent = CC.iso(CC.TODAY); toast('Sent with the plain-language summary'); routes.agreements(); openAgreement(id); });
    $('[data-ag-sign]', dr)?.addEventListener('click', () => { g.status = 'Signed'; g.signed = g.start = CC.iso(CC.TODAY); toast(`${g.artist} signed`); routes.agreements(); openAgreement(id); });
    $('[data-ag-remind]', dr)?.addEventListener('click', () => toast(`Reminder sent to ${first}`));
    $('[data-ag-summary]', dr).addEventListener('click', () => {
      $('[data-ag-out]', dr).innerHTML = `<article class="statement summary">
        <div class="statement__top"><div style="display:grid;gap:.4rem"><img src="assets/logo-wordmark-navy.png" alt="AVEA"><span class="small muted">Your agreement, in plain words</span></div><div style="text-align:right"><b>${esc(g.artist)}</b><br><span class="small muted">${esc(g.version)}</span></div></div>
        <p>Kia ora ${esc(first)}. This page explains your agreement with AVEA without the legal language. The agreement itself is what counts, so read both, and bring anyone you like to talk it through.</p>
        <div class="sum-grid">
          <div><p class="label">What AVEA does</p><p>${g.services.map(esc).join(', ')}.</p></div>
          <div><p class="label">What you keep</p><p>${esc(g.rights)}</p></div>
          <div><p class="label">How money is split</p><p>You get ${g.share}% of what your music earns after platform fees. AVEA keeps ${100 - g.share}%. You'll get a statement showing exactly where it came from.</p></div>
          <div><p class="label">How long it lasts</p><p>${g.years} year${g.years > 1 ? 's' : ''}${end ? `, until ${fmtDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}` : ' from when you sign'}. We'll talk about renewing before it ends.</p></div>
          <div><p class="label">If you want to leave</p><p>Give us ${g.notice} days' notice in writing. Your music stays yours, and we'll help move it without taking anything down unexpectedly.</p></div>
          <div><p class="label">What we won't promise</p><p>Streams, playlists or particular results. We'll be clear about what we can do.</p></div>
        </div>
        <p class="small muted">Example terms for the demo · AVEA · Wellington, Aotearoa New Zealand · hello@avea.co.nz</p>
      </article><div style="margin-top:.8rem"><button class="btn" data-print-sum>Print or save as PDF</button></div>`;
      $('[data-print-sum]', dr).addEventListener('click', () => { document.body.classList.add('print-drawer'); window.print(); setTimeout(() => document.body.classList.remove('print-drawer'), 500); });
      $('[data-ag-out]', dr).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* =====================================================================
     Funding calendar
     ===================================================================== */
  let fFilter = 'All';
  routes['funding'] = () => {
    const all = fundingAll().filter(f => daysFrom(f.date) >= -1);
    const types = ['All', ...new Set(all.map(f => f.type))];
    const list = all.filter(f => fFilter === 'All' || f.type === fFilter);
    const months = [...new Set(list.map(f => f.date.slice(0, 7)))];
    view.innerHTML = head('Funding calendar', 'Never miss a deadline.', 'Funding rounds, awards, festival callouts and pitch deadlines in one place, matched to the artists they suit, with reminders before each one closes. Pitch deadlines come straight from the release plans.', `<button class="btn" data-f-add>Add an opportunity</button>`) + `
      <p class="demo-note">Sample dates for the demo. The real calendar uses each organisation's published dates.</p>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">${types.map(t => `<button class="btn btn--ghost btn--sm" data-ft="${t}" aria-pressed="${t === fFilter}">${t}</button>`).join('')}</div>
      <div data-f-form></div>
      ${months.map(m => `<section style="display:grid;gap:.6rem"><h2 class="h3">${new Date(m + '-01T12:00:00').toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}</h2>
        <div class="opps">${list.filter(f => f.date.startsWith(m)).map(f => { const n = daysFrom(f.date);
          return `<article class="opp ${n <= 14 ? 'opp--soon' : ''}">
            <div class="opp__date"><span class="num">${new Date(f.date + 'T12:00:00').getDate()}</span><span class="caps muted">${fmtDate(f.date, { weekday: 'short' })}</span></div>
            <div style="display:grid;gap:.35rem"><span class="small muted">${esc(f.org)} · <span class="tag ${f.type === 'Pitching' ? 'tag--gold' : ''}">${esc(f.type)}</span></span><b>${esc(f.name)}</b>${f.note ? `<span class="small muted">${esc(f.note)}</span>` : ''}
              <span style="display:flex;gap:.35rem;flex-wrap:wrap">${f.for.map(a => `<span class="tag tag--ok">${esc(a)}</span>`).join('') || '<span class="small muted">No artists matched yet</span>'}</span></div>
            <div class="opp__side"><span class="small"><b>${n === 0 ? 'Today' : n < 0 ? 'Closed' : `${n} days`}</b></span>${f.auto ? '<span class="small muted">From release plan</span>' : switchHTML(`data-remind="${f.id}"`, f.remind, 'Remind')}</div>
          </article>`; }).join('')}</div></section>`).join('')}`;
    $$('[data-ft]').forEach(b => b.addEventListener('click', () => { fFilter = b.dataset.ft; routes.funding(); }));
    $$('[data-remind]').forEach(i => i.addEventListener('change', () => { const f = state.funding.find(x => x.id === i.dataset.remind); f.remind = i.checked; toast(f.remind ? 'We\'ll remind the team 7 days before' : 'Reminder off'); }));
    $('[data-f-add]').addEventListener('click', () => {
      $('[data-f-form]').innerHTML = `<form class="panel addf" data-add-form>
        <label class="lbl"><span class="caps muted">Organisation</span><input class="field-in" name="org" required placeholder="e.g. Creative New Zealand"></label>
        <label class="lbl"><span class="caps muted">Opportunity</span><input class="field-in" name="name" required placeholder="e.g. Arts Grants round"></label>
        <label class="lbl"><span class="caps muted">Type</span><select class="field-in" name="type"><option>Funding</option><option>Awards</option><option>Festival</option><option>Pitching</option></select></label>
        <label class="lbl"><span class="caps muted">Closes</span><input class="field-in" type="date" name="date" required value="${addDays(CC.iso(CC.TODAY), 30)}" style="color-scheme:dark"></label>
        <label class="lbl" style="grid-column:1/-1"><span class="caps muted">Good for</span><span class="chips-row">${[...new Set(state.apps.filter(a => ['signed', 'offer', 'call'].includes(a.stage) || state.releases.some(r => r.artist === a.artist)).map(a => a.artist))].map(a => `<label class="chipx"><input type="checkbox" name="for" value="${esc(a)}"><span>${esc(a)}</span></label>`).join('')}</span></label>
        <div style="grid-column:1/-1;display:flex;gap:.6rem"><button class="btn">Add to calendar</button><button type="button" class="btn btn--ghost" data-cancel>Cancel</button></div></form>`;
      const fm = $('[data-add-form]');
      $('[data-cancel]', fm).addEventListener('click', () => { $('[data-f-form]').innerHTML = ''; });
      fm.addEventListener('submit', e => { e.preventDefault(); const d = new FormData(fm);
        state.funding.push({ id: 'f' + Date.now(), org: d.get('org'), name: d.get('name'), type: d.get('type'), date: d.get('date'), for: d.getAll('for'), remind: true, note: '' });
        fFilter = 'All'; routes.funding(); toast('Added, with a reminder 7 days before'); });
      $('input', fm).focus();
    });
  };

  /* Sub-routes like #/website/photos */
  const baseRoute = CC.route;
  window.removeEventListener('hashchange', baseRoute);
  const route2 = () => {
    const [name, sub] = location.hash.replace(/^#\/?/, '').split('/');
    if (name === 'website') {
      $$('.nav a[data-route]').forEach(a => a.dataset.route === 'website' ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
      CC.closeDrawer(); CC.closeModal(); $('[data-side]').classList.remove('open');
      routes.website(sub); CC.updateCounts(); window.scrollTo(0, 0); return;
    }
    baseRoute();
  };
  window.addEventListener('hashchange', route2);
  CC.route = route2;
  document.addEventListener('DOMContentLoaded', () => { if (location.hash.startsWith('#/website')) route2(); });
})();
