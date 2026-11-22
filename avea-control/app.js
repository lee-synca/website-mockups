(() => {
  const D = window.DEMO;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- State (kept in memory for the demo) ---------- */
  const state = {
    apps: JSON.parse(JSON.stringify(D.applications)),
    releases: JSON.parse(JSON.stringify(D.releases)),
    statement: null
  };
  const TODAY = new Date(D.today + 'T12:00:00');

  /* ---------- Formatting ---------- */
  const day = 864e5;
  const toDate = s => new Date(s + 'T12:00:00');
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => iso(new Date(toDate(s).getTime() + n * day));
  const daysFrom = s => Math.round((toDate(s) - TODAY) / day);
  const fmtDate = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => toDate(s).toLocaleDateString('en-NZ', opts);
  const ago = s => { const n = -daysFrom(s); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`; };
  const k = n => n == null ? '–' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
  const money = n => 'NZ$' + n.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const int = n => Math.round(n).toLocaleString('en-NZ');
  const COUNTRY = { NZ: 'Aotearoa NZ', AU: 'Australia', US: 'United States', WS: 'Samoa', FJ: 'Fiji', TO: 'Tonga', GB: 'United Kingdom', CK: 'Cook Islands' };

  const toast = msg => { const t = $('[data-toast]'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };

  /* ---------- Release helpers ---------- */
  const ASSETS = [
    { key: 'audio', name: 'Master audio', hint: 'WAV, 16 or 24-bit, 44.1 kHz or higher' },
    { key: 'artwork', name: 'Cover artwork', hint: 'Square JPG or PNG, at least 3000 × 3000 px' },
    { key: 'credits', name: 'Credits and song splits', hint: 'Every writer and producer named, splits adding up to 100%' },
    { key: 'lyrics', name: 'Lyrics', hint: 'For lyric display on Spotify, Apple Music and others' }
  ];
  const readyCount = r => ASSETS.filter(a => r.assets[a.key]).length;
  const splitTotal = r => r.credits.reduce((s, c) => s + (+c.split || 0), 0);
  const timelineFor = r => {
    const allReady = readyCount(r) === ASSETS.length;
    let nowSet = false;
    return D.timeline.map(step => {
      const date = addDays(r.date, step.d);
      let status = daysFrom(date) < 0 ? 'done' : 'todo';
      if (step.d >= -28 && step.d < 0 && !allReady && status === 'done') status = 'late';
      if (status === 'todo' && !nowSet) { status = 'now'; nowSet = true; }
      return { ...step, date, status };
    });
  };
  const releaseStatus = r => {
    const left = daysFrom(r.date);
    if (left < 0) return ['Released', 'tag--ok'];
    const missing = ASSETS.length - readyCount(r);
    if (missing && left <= 28) return [`${missing} asset${missing > 1 ? 's' : ''} overdue`, 'tag--bad'];
    if (missing) return [`Waiting on ${missing} asset${missing > 1 ? 's' : ''}`, 'tag--gold'];
    return ['On track', 'tag--ok'];
  };

  /* ---------- Router ---------- */
  const view = $('#view');
  const routes = {
    '': renderPulse,
    'applications': renderApplications,
    'releases': renderReleases,
    'statements': renderStatements
  };
  function route() {
    const [name, id] = location.hash.replace(/^#\/?/, '').split('/');
    $$('.nav a[data-route]').forEach(a => a.dataset.route === (name || '') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    closeDrawer(); closeModal(); $('[data-side]').classList.remove('open');
    if (name === 'releases' && id) renderRelease(id);
    else (routes[name] || renderPulse)();
    updateCounts();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  const updateCounts = () => { const n = state.apps.filter(a => a.stage === 'new').length; const el = $('[data-count-new]'); el.textContent = n || ''; el.hidden = !n; };

  /* =====================================================================
     Monday pulse
     ===================================================================== */
  function renderPulse() {
    const newApps = state.apps.filter(a => a.stage === 'new');
    const upcoming = state.releases.filter(r => daysFrom(r.date) >= 0 && daysFrom(r.date) <= 30);
    const waiting = state.releases.filter(r => daysFrom(r.date) >= 0).reduce((s, r) => s + ASSETS.length - readyCount(r), 0);
    const sample = parseCSV(window.makeSampleCSV());
    const quarter = sample.rows.reduce((s, r) => s + r.revenue, 0);

    const todo = [];
    newApps.forEach(a => todo.push({ dot: 'gold', text: `Listen to <b>${esc(a.artist)}</b>`, meta: `Applied ${ago(a.applied)}`, href: '#/applications', app: a.id }));
    state.apps.filter(a => a.stage === 'call').forEach(a => todo.push({ dot: 'ok', text: `Call with <b>${esc(a.artist)}</b>`, meta: a.call || 'Booked', href: '#/applications', app: a.id }));
    state.apps.filter(a => a.stage === 'offer').forEach(a => todo.push({ dot: '', text: `Follow up the offer to <b>${esc(a.artist)}</b>`, meta: 'Sent 5 days ago', href: '#/applications', app: a.id }));
    state.releases.forEach(r => {
      const tl = timelineFor(r);
      const missing = ASSETS.filter(a => !r.assets[a.key]).map(a => a.name.toLowerCase());
      if (tl.some(s => s.status === 'late')) todo.push({ dot: 'bad', text: `Chase ${missing.join(', ')}: <b>${esc(r.title)}</b>`, meta: 'Overdue', href: '#/releases/' + r.id });
      tl.filter(s => s.status === 'now').forEach(s => { const n = daysFrom(s.date); if (n <= 14) todo.push({ dot: 'gold', text: `${esc(s.t)}: <b>${esc(r.title)}</b>`, meta: n === 0 ? 'Today' : `In ${n} days`, href: '#/releases/' + r.id }); });
    });

    view.innerHTML = `
      <div class="head"><div>
        <p class="label">Monday pulse</p>
        <h1 class="h1">Here's your week.</h1>
        <p class="muted">Everything that needs the team's attention, in one place. This is what lands in your inbox every Monday morning.</p>
      </div></div>
      <div class="grid kpis">
        <a class="panel kpi" href="#/applications" style="text-decoration:none"><span class="caps muted">New applications</span><span class="num">${newApps.length}</span><span class="delta">Waiting for a first listen</span></a>
        <a class="panel kpi" href="#/releases" style="text-decoration:none"><span class="caps muted">Releases in 30 days</span><span class="num">${upcoming.length}</span><span class="delta">${upcoming.map(r => esc(r.title)).join(', ') || 'None'}</span></a>
        <a class="panel kpi" href="#/statements" style="text-decoration:none"><span class="caps muted">Earnings, Aug–Oct</span><span class="num">${money(quarter).replace('.00', '')}</span><span class="delta">Sample statement, Sina Mo'ui</span></a>
        <a class="panel kpi" href="#/releases" style="text-decoration:none"><span class="caps muted">Assets we're waiting on</span><span class="num">${waiting}</span><span class="delta" style="color:${waiting ? 'var(--gold)' : 'var(--ok)'}">${waiting ? 'Across upcoming releases' : 'All in'}</span></a>
      </div>
      <div class="grid two">
        <section class="panel" style="display:grid;gap:.75rem;align-content:start">
          <h2 class="h3">This week</h2>
          <ul class="list">${todo.map(t => `<li><span class="dot ${t.dot ? 'dot--' + t.dot : ''}"></span><a href="${t.href}" ${t.app ? `data-open-app="${t.app}"` : ''} style="text-decoration:none">${t.text}</a><span class="small muted">${t.meta}</span></li>`).join('')}</ul>
        </section>
        <section class="panel" style="display:grid;gap:1rem;align-content:start">
          <h2 class="h3">Coming up</h2>
          ${state.releases.slice().sort((a, b) => a.date.localeCompare(b.date)).map(r => {
            const left = daysFrom(r.date); const [st, cls] = releaseStatus(r);
            return `<a href="#/releases/${r.id}" style="text-decoration:none;display:grid;gap:.45rem">
              <span style="display:flex;justify-content:space-between;gap:1rem"><span><b>${esc(r.title)}</b> <span class="muted small">· ${esc(r.artist)}</span></span><span class="tag ${cls}">${st}</span></span>
              <span class="bar"><span style="width:${readyCount(r) / ASSETS.length * 100}%"></span></span>
              <span class="small muted">${left >= 0 ? `${left} days to go · ${fmtDate(r.date)}` : 'Out now'} · ${readyCount(r)} of ${ASSETS.length} assets in</span></a>`;
          }).join('')}
        </section>
      </div>`;
    $$('[data-open-app]', view).forEach(a => a.addEventListener('click', e => { e.preventDefault(); location.hash = '#/applications'; setTimeout(() => openApp(a.dataset.openApp), 50); }));
  }

  /* =====================================================================
     Applications
     ===================================================================== */
  function renderApplications() {
    view.innerHTML = `
      <div class="head"><div>
        <p class="label">Applications</p>
        <h1 class="h1">Every artist who applied.</h1>
        <p class="muted">Applications from the website land here with a snapshot of the artist already filled in. Click a card to see it, reply in AVEA's voice, and move it along.</p>
      </div></div>
      <div class="board">${D.stages.map(s => {
        const list = state.apps.filter(a => a.stage === s.id);
        return `<section class="col"><div class="col__head"><span class="h3">${s.name}</span><span class="tag">${list.length}</span></div>
          <div class="col__list">${list.map(card).join('') || '<p class="small muted" style="padding:.5rem">Nothing here.</p>'}</div></section>`;
      }).join('')}</div>`;
    $$('[data-app]', view).forEach(b => b.addEventListener('click', () => openApp(b.dataset.app)));
  }
  const card = a => `<button class="app-card" data-app="${a.id}">
      <span class="row"><span class="h3">${esc(a.artist)}</span><span class="small muted">${ago(a.applied)}</span></span>
      <span class="small muted">${esc(a.genre)} · ${esc(a.region.replace(' / New Zealand', ''))}</span>
      <span class="stats"><span>Spotify <b>${a.spotify ? k(a.spotify.followers) : '–'}</b></span><span>YouTube <b>${k(a.youtube && a.youtube.subs)}</b></span></span>
      <span style="display:flex;gap:.35rem;flex-wrap:wrap">${a.help.slice(0, 2).map(h => `<span class="tag">${esc(h)}</span>`).join('')}${a.help.length > 2 ? `<span class="tag">+${a.help.length - 2}</span>` : ''}</span>
    </button>`;

  function openApp(id) {
    const a = state.apps.find(x => x.id === id); if (!a) return;
    const first = a.contact.split(' ')[0];
    const stageName = D.stages.find(s => s.id === a.stage).name;
    const dr = $('[data-drawer]');
    dr.innerHTML = `
      <div class="drawer__head">
        <div style="display:grid;gap:.4rem"><p class="label">${stageName}</p><h2 class="h2" id="drawer-title">${esc(a.artist)}</h2><p class="small muted">${esc(a.contact)} · ${esc(a.email)} · applied ${fmtDate(a.applied)}</p></div>
        <button class="x" data-close aria-label="Close">×</button>
      </div>
      <div class="drawer__body">
        <section style="display:grid;gap:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem"><h3 class="h3">Artist snapshot</h3><span class="small muted" data-snap-note>Checking public profiles…</span></div>
          <div class="snap loading" data-snap>
            ${snapCell('Spotify followers', a.spotify ? int(a.spotify.followers) : 'Not on Spotify yet')}
            ${snapCell('Latest release', a.spotify ? esc(a.spotify.latest.title) : '–', a.spotify ? fmtDate(a.spotify.latest.date, { day: 'numeric', month: 'short', year: 'numeric' }) : '')}
            ${snapCell('Releases on Spotify', a.spotify ? a.spotify.releases : '0')}
            ${snapCell('YouTube subscribers', a.youtube ? int(a.youtube.subs) : '–')}
            ${snapCell('YouTube views, 30 days', a.youtube ? int(a.youtube.views30) : '–')}
            ${snapCell('Instagram', a.instagram ? k(a.instagram.followers) : '–', a.instagram ? esc(a.instagram.handle) : '')}
          </div>
        </section>
        <section style="display:grid;gap:1rem">
          <h3 class="h3">Their application</h3>
          <p class="quote">"${esc(a.goals)}"</p>
          <dl class="facts small">
            ${fact('Based', a.region)}${fact('Genre', a.genre)}${fact('Journey', a.journey)}${fact('Released tracks', a.tracks)}
            ${fact('Distributor', a.distributor)}${fact('Owns masters and rights', a.rights)}${fact('Wants help with', a.help.join(', '))}${fact('Hoping to start', a.start)}
            ${fact('Heard about AVEA', a.heard)}${fact('Music link', `<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.link.replace('https://', ''))}</a>`, true)}
          </dl>
        </section>
        <section style="display:grid;gap:.75rem">
          <h3 class="h3">Move to</h3>
          <div class="stage-btns">${D.stages.map(s => `<button class="btn btn--ghost btn--sm" data-stage="${s.id}" aria-pressed="${s.id === a.stage}">${s.name}</button>`).join('')}</div>
        </section>
        <section style="display:grid;gap:.75rem">
          <h3 class="h3">Reply in AVEA's voice</h3>
          <div class="replies">${D.replies.map(r => {
            const text = r.text.replace(/\{first\}/g, first).replace(/\{artist\}/g, a.artist);
            return `<div class="reply" data-reply><div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem"><button class="link" data-toggle>${esc(r.name)}</button><button class="btn btn--sm" data-copy>Copy</button></div><pre>${esc(text)}</pre></div>`;
          }).join('')}</div>
        </section>
        <section class="notes" style="display:grid;gap:.6rem">
          <h3 class="h3">Team notes</h3>
          <ul class="list small" data-notes>${a.notes.map(n => `<li style="grid-template-columns:auto 1fr"><span class="dot dot--gold"></span><span>${esc(n)}</span></li>`).join('') || '<li style="grid-template-columns:1fr" class="muted">No notes yet.</li>'}</ul>
          <label class="sr" for="note">Add a note</label>
          <textarea id="note" placeholder="Add a note for the team…" data-note></textarea>
          <div><button class="btn btn--ghost btn--sm" data-add-note>Add note</button></div>
        </section>
      </div>`;
    openDrawer();
    setTimeout(() => { $('[data-snap]', dr)?.classList.remove('loading'); const n = $('[data-snap-note]', dr); if (n) n.textContent = 'From public Spotify, YouTube and Instagram profiles'; }, 900);
    $('[data-close]', dr).addEventListener('click', closeDrawer);
    $$('[data-stage]', dr).forEach(b => b.addEventListener('click', () => {
      a.stage = b.dataset.stage; toast(`${a.artist} moved to ${b.textContent}`);
      if (location.hash.includes('applications')) renderApplications(); else renderPulse();
      updateCounts(); openApp(a.id);
    }));
    $$('[data-reply]', dr).forEach(r => {
      $('[data-toggle]', r).addEventListener('click', () => r.classList.toggle('open'));
      $('[data-copy]', r).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($('pre', r).textContent); toast('Reply copied'); } catch { r.classList.add('open'); toast('Select the text to copy it'); }
      });
    });
    $('[data-add-note]', dr).addEventListener('click', () => {
      const t = $('[data-note]', dr).value.trim(); if (!t) return;
      a.notes.push(t); openApp(a.id); toast('Note added');
    });
  }
  const snapCell = (label, value, sub = '') => `<div class="panel"><span class="caps muted">${label}</span><span class="num">${value}</span>${sub ? `<span class="small muted">${sub}</span>` : ''}</div>`;
  const fact = (dt, dd, raw) => `<div><dt>${dt}</dt><dd>${raw ? dd : esc(dd)}</dd></div>`;

  /* Drawer and modal */
  const openDrawer = () => { $('[data-drawer]').classList.add('open'); $('[data-scrim]').classList.add('open'); $('[data-drawer] [data-close]')?.focus({ preventScroll: true }); };
  function closeDrawer() { $('[data-drawer]').classList.remove('open'); $('[data-scrim]').classList.remove('open'); }
  function closeModal() { const m = $('[data-modal]'); m.hidden = true; m.innerHTML = ''; }
  $('[data-scrim]').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });

  /* =====================================================================
     Releases
     ===================================================================== */
  function renderReleases() {
    const list = state.releases.slice().sort((a, b) => a.date.localeCompare(b.date));
    view.innerHTML = `
      <div class="head"><div>
        <p class="label">Releases</p>
        <h1 class="h1">Every release, counting down.</h1>
        <p class="muted">Set a release date and the plan builds itself backwards from it: what's due, who it's waiting on, and what the artist sees on their phone.</p>
      </div></div>
      <div class="rel-list">${list.map(r => {
        const left = daysFrom(r.date); const [st, cls] = releaseStatus(r);
        return `<a class="rel" href="#/releases/${r.id}" style="text-decoration:none">
          <span style="display:grid;gap:.25rem"><span class="h3">${esc(r.title)}</span><span class="small muted">${esc(r.artist)} · ${esc(r.type)}</span></span>
          <span style="display:grid;gap:.4rem"><span class="small"><b>${left >= 0 ? left + ' days' : 'Out now'}</b> <span class="muted">· ${fmtDate(r.date)}</span></span><span class="bar"><span style="width:${readyCount(r) / ASSETS.length * 100}%"></span></span></span>
          <span class="tag ${cls}">${st}</span></a>`;
      }).join('')}</div>`;
  }

  function renderRelease(id) {
    const r = state.releases.find(x => x.id === id); if (!r) return renderReleases();
    const tl = timelineFor(r); const left = daysFrom(r.date);
    view.innerHTML = `
      <div class="head">
        <div>
          <a class="link" href="#/releases">← All releases</a>
          <p class="label" style="margin-top:.6rem">${esc(r.artist)} · ${esc(r.type)}</p>
          <h1 class="h1">${esc(r.title)}</h1>
          <p class="muted">${left >= 0 ? `<b style="color:var(--foam)">${left} days to go.</b> ` : 'Out now. '}${readyCount(r)} of ${ASSETS.length} assets in. Change the date and watch the plan move.</p>
        </div>
        <div style="display:flex;gap:.75rem;align-items:end;flex-wrap:wrap">
          <label style="display:grid;gap:.3rem"><span class="caps muted">Release date</span><input type="date" value="${r.date}" data-date-input style="background:var(--ocean);border:1px solid var(--rule-strong);padding:.6rem .7rem;color-scheme:dark"></label>
          <button class="btn" data-artist-view>Artist's view</button>
        </div>
      </div>
      <div class="grid two">
        <section class="panel" style="display:grid;gap:.75rem;align-content:start">
          <h2 class="h3">Countdown plan</h2>
          <ol class="tl">${tl.map(s => `<li class="${s.status}">
            <span class="when">${fmtDate(s.date)}<br>${s.d === 0 ? 'Release day' : s.d < 0 ? `${-s.d} days before` : `${s.d} days after`}</span>
            <span class="mark"></span>
            <span><b>${esc(s.t)}</b>${s.tip ? `<span class="tip">${esc(s.tip)}</span>` : ''}${s.status === 'late' ? '<span class="tip" style="color:var(--bad)">Overdue: assets still missing</span>' : ''}</span>
            <span class="tag ${s.who === 'Artist' ? 'tag--gold' : ''}">${esc(s.who)}</span></li>`).join('')}</ol>
        </section>
        <section class="panel" style="display:grid;gap:.75rem;align-content:start">
          <h2 class="h3">What we need</h2>
          <div class="checks">${ASSETS.map(as => assetBlock(r, as)).join('')}</div>
        </section>
      </div>`;

    $('[data-date-input]').addEventListener('change', e => { if (e.target.value) { r.date = e.target.value; renderRelease(r.id); toast('Plan rebuilt from the new date'); } });
    $('[data-artist-view]').addEventListener('click', () => openArtistView(r));
    $$('[data-toggle-asset]').forEach(b => b.addEventListener('click', () => { r.assets[b.dataset.toggleAsset] = !r.assets[b.dataset.toggleAsset]; renderRelease(r.id); }));
    const art = $('[data-artwork]');
    if (art) art.addEventListener('change', () => checkArtwork(r, art.files[0]));
    $$('[data-split]').forEach(inp => inp.addEventListener('input', () => {
      r.credits[+inp.dataset.split].split = inp.value;
      const t = splitTotal(r); r.assets.credits = t === 100;
      const out = $('[data-split-total]'); out.innerHTML = splitTotalHTML(t);
      const blk = inp.closest('.check'); blk.classList.toggle('ok', t === 100); blk.classList.toggle('err', t !== 100); $('.st', blk).textContent = t === 100 ? '✓' : '!';
    }));
    $('[data-split-save]')?.addEventListener('click', () => renderRelease(r.id));
  }

  function assetBlock(r, as) {
    const ok = r.assets[as.key];
    if (as.key === 'artwork') {
      return `<div class="check ${ok ? 'ok' : ''}" data-art-block><span class="st">${ok ? '✓' : ''}</span><div class="body">
        <b>${as.name}</b><span class="small muted">${as.hint}</span>
        <label class="drop"><input type="file" accept="image/png,image/jpeg" data-artwork>${r.artThumb ? `<img src="${r.artThumb}" alt="">` : ''}<span class="small" data-art-msg>${r.artMsg || (ok ? 'Artwork checked and ready.' : 'Drop the cover here, or click to choose. We\'ll check it straight away.')}</span></label>
      </div></div>`;
    }
    if (as.key === 'credits') {
      const t = splitTotal(r);
      return `<div class="check ${t === 100 ? 'ok' : 'err'}"><span class="st">${t === 100 ? '✓' : '!'}</span><div class="body">
        <b>${as.name}</b><span class="small muted">${as.hint}</span>
        <div class="splits small">${r.credits.map((c, i) => `<div class="r"><span>${esc(c.name)}</span><span class="muted">${esc(c.role)}</span><label class="sr" for="sp${i}">${esc(c.name)} split</label><input id="sp${i}" type="number" min="0" max="100" value="${c.split}" data-split="${i}"></div>`).join('')}
          <div class="total" data-split-total>${splitTotalHTML(t)}</div></div>
      </div></div>`;
    }
    return `<div class="check ${ok ? 'ok' : ''}"><span class="st">${ok ? '✓' : ''}</span><div class="body">
      <b>${as.name}</b><span class="small muted">${as.hint}</span>
      <div><button class="btn btn--ghost btn--sm" data-toggle-asset="${as.key}">${ok ? 'Mark as missing' : 'Mark as received'}</button></div></div></div>`;
  }
  const splitTotalHTML = t => `<span>Total</span><b style="color:${t === 100 ? 'var(--ok)' : 'var(--bad)'}">${t}%${t === 100 ? '' : ` · needs to be 100%`}</b>`;

  function checkArtwork(r, file) {
    if (!file) return;
    const msg = $('[data-art-msg]');
    if (!/^image\/(png|jpe?g)$/.test(file.type)) { r.assets.artwork = false; r.artMsg = 'That isn\'t a JPG or PNG. Platforms only accept those two.'; return renderRelease(r.id); }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img; const problems = [];
      if (w !== h) problems.push(`it isn't square (${w} × ${h} px)`);
      if (Math.min(w, h) < 3000) problems.push(`it's too small (${w} × ${h} px, needs at least 3000 × 3000)`);
      if (file.size > 20 * 1024 * 1024) problems.push('the file is over 20 MB');
      r.artThumb = url; r.assets.artwork = !problems.length;
      r.artMsg = problems.length ? `Not ready: ${problems.join(' and ')}. We'll ask the artist for a new file.` : `Looks good: ${w} × ${h} px, ${file.type.split('/')[1].toUpperCase()}. Ready to deliver.`;
      renderRelease(r.id); toast(problems.length ? 'Artwork needs fixing' : 'Artwork ready');
    };
    img.onerror = () => { msg.textContent = 'We couldn\'t read that image.'; };
    img.src = url;
  }

  function openArtistView(r) {
    let first = true;
    const tl = timelineFor(r).filter(s => s.d >= -28).map(s => {
      if (s.status === 'done') return s;
      const st = first ? 'now' : 'todo'; first = false; return { ...s, status: st };
    });
    const left = daysFrom(r.date);
    const missing = ASSETS.filter(a => !r.assets[a.key]);
    const m = $('[data-modal]');
    m.innerHTML = `<div class="modal__inner">
      <div class="phone" role="img" aria-label="What the artist sees on their phone"><div class="phone__screen">
        <div class="phone__top">
          <img src="assets/logo-wordmark.png" alt="AVEA">
          <span class="caps gold">Your release</span>
          <span class="h2">${esc(r.title)}</span>
          <span class="small muted">${esc(r.artist)} · out ${fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span><span class="count-big">${Math.max(left, 0)}</span> <span class="caps muted">${left === 1 ? 'day' : 'days'} to go</span></span>
        </div>
        ${missing.length ? `<div class="needs" style="margin-top:1rem"><b>What we need from you</b>${missing.map(a => `<span>· ${a.name}</span>`).join('')}</div>` : `<div class="needs" style="margin-top:1rem;border-color:var(--ok);background:rgba(127,209,168,.1)"><b>We've got everything. Thank you!</b></div>`}
        <ol class="ptl">${tl.map(s => `<li class="${s.status}"><span class="mark"></span><span class="small"><b>${esc(s.t)}</b><br><span class="muted">${fmtDate(s.date)}${s.status === 'now' ? ' · up next' : ''}</span></span></li>`).join('')}</ol>
      </div></div>
      <p class="small muted">This is the link the artist gets. No login, works on any phone.</p>
      <button class="btn btn--ghost" data-close-modal>Close</button>
    </div>`;
    m.hidden = false;
    $('[data-close-modal]', m).addEventListener('click', closeModal);
    m.addEventListener('click', e => { if (e.target === m) closeModal(); }, { once: true });
  }

  /* =====================================================================
     Statements
     ===================================================================== */
  function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
    const split = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
    const head = split(lines[0]).map(h => h.toLowerCase());
    const find = (...keys) => head.findIndex(h => keys.some(k2 => h.includes(k2)));
    const col = {
      month: find('month', 'period', 'date'), platform: find('platform', 'store', 'dsp', 'service', 'retailer'),
      country: find('country', 'territory'), track: find('track', 'title', 'song'),
      streams: find('stream', 'units', 'quantity', 'plays'), revenue: find('net', 'revenue', 'earning', 'amount', 'royalt')
    };
    const missing = ['platform', 'track', 'revenue'].filter(c => col[c] < 0);
    if (missing.length) return { error: `We couldn't find a ${missing.join(', ')} column in that file.` };
    const rows = lines.slice(1).map(split).map(c => ({
      month: c[col.month] || '', platform: c[col.platform] || 'Unknown', country: (c[col.country] || '').toUpperCase(),
      track: c[col.track] || 'Unknown', streams: +(c[col.streams] || 0) || 0, revenue: parseFloat(String(c[col.revenue] || '0').replace(/[^0-9.\-]/g, '')) || 0
    })).filter(r => r.track);
    return { rows };
  }
  const sumBy = (rows, key) => Object.entries(rows.reduce((m, r) => { m[r[key]] = m[r[key]] || { revenue: 0, streams: 0 }; m[r[key]].revenue += r.revenue; m[r[key]].streams += r.streams; return m; }, {})).sort((a, b) => b[1].revenue - a[1].revenue);

  function renderStatements() {
    view.innerHTML = `
      <div class="head no-print"><div>
        <p class="label">Statements</p>
        <h1 class="h1">Royalties, made readable.</h1>
        <p class="muted">Drop in the earnings export from the distribution service. We break it down by song, platform and country, apply each song's splits, and make a statement every artist can understand.</p>
      </div></div>
      <div class="upload no-print" data-upload>
        <span class="h3">Drop an earnings export (CSV) here</span>
        <span class="small muted">Or try it with the sample export: three months for Sina Mo'ui, three songs.</span>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center">
          <button class="btn" data-sample>Use the sample export</button>
          <label class="btn btn--ghost" style="position:relative">Choose a file<input type="file" accept=".csv,text/csv" data-csv style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
          <button class="link" data-dl-sample>Download the sample CSV</button>
        </div>
        <span class="small" style="color:var(--bad)" data-csv-error></span>
      </div>
      <div data-stmt-out></div>`;
    const up = $('[data-upload]');
    const load = (text, name) => { const res = parseCSV(text); if (res.error) { $('[data-csv-error]').textContent = res.error; return; } state.statement = { rows: res.rows, name }; showStatement(); };
    $('[data-sample]').addEventListener('click', () => load(window.makeSampleCSV(), 'Sample export'));
    $('[data-csv]').addEventListener('change', e => { const f = e.target.files[0]; if (f) f.text().then(t => load(t, f.name)); });
    $('[data-dl-sample]').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([window.makeSampleCSV()], { type: 'text/csv' })); a.download = 'avea-sample-earnings.csv'; a.click(); });
    ['dragenter', 'dragover'].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => up.addEventListener(ev, e => { e.preventDefault(); up.classList.remove('drag'); }));
    up.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) f.text().then(t => load(t, f.name)); });
    if (state.statement) showStatement();
  }

  function payeesFor(rows) {
    const tracks = sumBy(rows, 'track');
    const pay = {};
    const lines = [];
    tracks.forEach(([t, v]) => {
      const splits = (window.SAMPLE_SPLITS[t] || [['Artist', 100]]);
      splits.forEach(([who, pct]) => { pay[who] = (pay[who] || 0) + v.revenue * pct / 100; lines.push({ who, track: t, pct, amount: v.revenue * pct / 100, gross: v.revenue, streams: v.streams }); });
    });
    return { pay: Object.entries(pay).sort((a, b) => b[1] - a[1]), lines };
  }

  function showStatement() {
    const rows = state.statement.rows;
    const total = rows.reduce((s, r) => s + r.revenue, 0), streams = rows.reduce((s, r) => s + r.streams, 0);
    const months = [...new Set(rows.map(r => r.month))].sort();
    const period = months.length ? `${monthName(months[0])} – ${monthName(months[months.length - 1])}` : '';
    const plats = sumBy(rows, 'platform'), countries = sumBy(rows, 'country'), tracks = sumBy(rows, 'track');
    const { pay } = payeesFor(rows);
    const bars = (list, label = x => x) => `<ul class="hbars">${list.slice(0, 7).map(([n, v]) => `<li><span>${esc(label(n))}</span><span class="bar"><span style="width:${v.revenue / list[0][1].revenue * 100}%"></span></span><span class="v">${money(v.revenue)}</span></li>`).join('')}</ul>`;
    $('[data-stmt-out]').innerHTML = `
      <div class="grid no-print" style="gap:1rem">
        <div class="grid kpis">
          <div class="panel kpi"><span class="caps muted">Total earned</span><span class="num">${money(total)}</span><span class="delta">${esc(period)}</span></div>
          <div class="panel kpi"><span class="caps muted">Streams</span><span class="num">${int(streams)}</span><span class="delta">${rows.length} rows read from ${esc(state.statement.name)}</span></div>
          <div class="panel kpi"><span class="caps muted">Top platform</span><span class="num" style="font-size:1.5rem">${esc(plats[0][0])}</span><span class="delta">${Math.round(plats[0][1].revenue / total * 100)}% of earnings</span></div>
          <div class="panel kpi"><span class="caps muted">Top country</span><span class="num" style="font-size:1.5rem">${esc(COUNTRY[countries[0][0]] || countries[0][0])}</span><span class="delta">${Math.round(countries[0][1].revenue / total * 100)}% of earnings</span></div>
        </div>
        <div class="grid two">
          <section class="panel" style="display:grid;gap:1rem"><h2 class="h3">By platform</h2>${bars(plats)}</section>
          <section class="panel" style="display:grid;gap:1rem"><h2 class="h3">By country</h2>${bars(countries, c => COUNTRY[c] || c)}</section>
        </div>
        <div class="grid two">
          <section class="panel" style="display:grid;gap:.75rem;align-content:start"><h2 class="h3">By song</h2>
            <table><thead><tr><th>Song</th><th class="r">Streams</th><th class="r">Earned</th><th>Splits</th></tr></thead><tbody>
            ${tracks.map(([t, v]) => `<tr><td><b>${esc(t)}</b></td><td class="r">${int(v.streams)}</td><td class="r">${money(v.revenue)}</td><td class="small muted">${(window.SAMPLE_SPLITS[t] || [['Artist', 100]]).map(([w, p]) => `${esc(w)} ${p}%`).join(' · ')}</td></tr>`).join('')}
            </tbody></table></section>
          <section class="panel" style="display:grid;gap:.75rem;align-content:start"><h2 class="h3">Who gets paid</h2>
            <table><tbody>${pay.map(([w, v]) => `<tr><td><b>${esc(w)}</b></td><td class="r">${money(v)}</td><td class="r"><button class="btn btn--sm" data-make="${esc(w)}">Make statement</button></td></tr>`).join('')}</tbody></table>
            <p class="small muted">Splits come from each release's credits in the Releases section.</p></section>
        </div>
      </div>
      <div data-artist-statement style="margin-top:1.5rem"></div>`;
    $$('[data-make]').forEach(b => b.addEventListener('click', () => makeStatement(b.dataset.make, period)));
  }
  const monthName = m => new Date(m + '-01T12:00:00').toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' });

  function makeStatement(who, period) {
    const rows = state.statement.rows;
    const { lines } = payeesFor(rows);
    const mine = lines.filter(l => l.who === who);
    const total = mine.reduce((s, l) => s + l.amount, 0);
    const myTracks = new Set(mine.map(l => l.track));
    const pct = Object.fromEntries(mine.map(l => [l.track, l.pct]));
    const myRows = rows.filter(r => myTracks.has(r.track)).map(r => ({ ...r, revenue: r.revenue * pct[r.track] / 100 }));
    const plats = sumBy(myRows, 'platform'), countries = sumBy(myRows, 'country');
    const out = $('[data-artist-statement]');
    out.innerHTML = `
      <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap"><h2 class="h3">Statement for ${esc(who)}</h2><button class="btn" data-print>Print or save as PDF</button></div>
      <article class="statement">
        <div class="statement__top">
          <div style="display:grid;gap:.4rem"><img src="assets/logo-wordmark-navy.png" alt="AVEA"><span class="small muted">Royalty statement</span></div>
          <div style="text-align:right;display:grid;gap:.2rem"><b>${esc(who)}</b><span class="small muted">${esc(period)}</span><span class="small muted">Issued ${fmtDate(D.today, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap">
          <div style="display:grid;gap:.4rem"><p class="label">Your share this period</p><span class="big-total">${money(total)}</span></div>
          <p class="small muted" style="max-width:24rem">This is what your music earned after platform fees, split the way it's set out in your agreement. Questions about anything here? Reply to the email this came with.</p>
        </div>
        <table><thead><tr><th>Song</th><th class="r">Streams</th><th class="r">Song earned</th><th class="r">Your split</th><th class="r">Your share</th></tr></thead><tbody>
          ${mine.map(l => `<tr><td><b>${esc(l.track)}</b></td><td class="r">${int(l.streams)}</td><td class="r">${money(l.gross)}</td><td class="r">${l.pct}%</td><td class="r"><b>${money(l.amount)}</b></td></tr>`).join('')}
          <tr><td colspan="4"><b>Total</b></td><td class="r"><b>${money(total)}</b></td></tr>
        </tbody></table>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem">
          <div style="display:grid;gap:.5rem"><p class="label">Where it came from</p><table><tbody>${plats.map(([p, v]) => `<tr><td>${esc(p)}</td><td class="r">${money(v.revenue)}</td></tr>`).join('')}</tbody></table></div>
          <div style="display:grid;gap:.5rem"><p class="label">Where people listened</p><table><tbody>${countries.slice(0, 6).map(([c, v]) => `<tr><td>${esc(COUNTRY[c] || c)}</td><td class="r">${money(v.revenue)}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <p class="small muted" style="border-top:1px solid rgba(6,32,46,.15);padding-top:1rem">AVEA · Wellington, Aotearoa New Zealand · hello@avea.co.nz · Demo statement with sample data</p>
      </article>`;
    $('[data-print]').addEventListener('click', () => window.print());
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Boot ---------- */
  $('[data-date]').textContent = TODAY.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('[data-menu]').addEventListener('click', () => $('[data-side]').classList.toggle('open'));
  route();

  /* Deep links for walkthroughs: ?open=a2 opens an application, ?artist shows the
     artist's phone view on a release page, ?sample=1 loads the sample statement. */
  const q = new URLSearchParams(location.search);
  if (q.get('open')) setTimeout(() => openApp(q.get('open')), 50);
  if (q.has('artist')) { const id = location.hash.split('/')[2]; const r = state.releases.find(x => x.id === id); if (r) openArtistView(r); }
  if (q.has('sample') && location.hash.includes('statements')) { $('[data-sample]').click(); if (q.get('sample') === 'statement') $('[data-make]').click(); }
})();
