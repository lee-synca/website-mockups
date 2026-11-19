/* Redeemer Visuals prototype — shared behaviour.
   Film data lives in films.js (window.FILMS). */

const CATS = {
  weddings: {
    world: "rdv", page: "weddings.html", title: "Wedding films", label: "Weddings",
    blurb: "You have captured each other's hearts. Allow me to capture your day.",
    cta: "Ask about your wedding date"
  },
  music: {
    world: "ruff", page: "music-videos.html", title: "Music videos", label: "Music videos",
    blurb: "Directed as Ruff Pops for Lisi, Nokz78, Lawd Lance, Say True God?, Victor J Sefo and more.",
    cta: "Pitch me your track"
  },
  events: {
    world: "ruff", page: "events.html", title: "Live & events", label: "Live & events",
    blurb: "Festival stages, tours and game day, from Suncorp Stadium to Tauranga.",
    cta: "Book me for your event"
  }
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const root = document.documentElement;
const page = document.body.dataset.page;

/* ---------- Header, footer, player (same on every page) ---------- */
const NAV = [["weddings.html", "Weddings", "weddings"], ["music-videos.html", "Music videos", "music"],
             ["events.html", "Live & events", "events"], ["about.html", "About Michael", "about"]];
document.body.insertAdjacentHTML("afterbegin", `
<header class="bar">
  <a class="brand" href="index.html" aria-label="Redeemer Visuals home">
    <img src="img/logo.webp" alt=""><span>Redeemer Visuals</span>
  </a>
  <nav id="nav" aria-label="Main">
    ${NAV.map(([h, t, k]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("")}
    <a class="nav-enq" href="enquire.html">Check a date</a>
  </nav>
  <span class="mono tc" aria-hidden="true"><i></i><span id="tc">00:00:00:00</span></span>
  <a class="enq" href="enquire.html">Check a date</a>
  <button class="menu mono" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
</header>`);
document.body.insertAdjacentHTML("beforeend", `
<footer>
  <div class="wrap">
    <span class="mono">© Redeemer Visuals · RDV</span>
    <div class="links">
      <a href="https://www.instagram.com/redeemervisuals/">Instagram · Redeemer Visuals</a>
      <a href="https://www.instagram.com/ruffpops/">Instagram · Ruff Pops</a>
      <a href="https://www.facebook.com/redeemervisuals">Facebook</a>
      <a href="https://www.youtube.com/@redeemervisuals">YouTube</a>
    </div>
  </div>
</footer>
<dialog id="player" aria-label="Film player">
  <button class="x mono" type="button" id="close">Close ✕</button>
  <div class="vid" id="vid"></div>
</dialog>`);

const bar = $(".bar"), menu = $(".menu");
menu.addEventListener("click", () => {
  const open = bar.classList.toggle("open");
  menu.setAttribute("aria-expanded", open);
  menu.textContent = open ? "Close" : "Menu";
});

/* Running timecode: page scroll read as a 24fps timeline */
const tcEl = $("#tc"), pad = n => String(n).padStart(2, "0");
function tick() {
  const f = Math.round(scrollY / 4);
  tcEl.textContent = `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
}
addEventListener("scroll", tick, { passive: true }); tick();

/* Film player */
const dlg = $("#player");
function play(id) {
  $("#vid").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Film" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  dlg.showModal();
}
$("#close").addEventListener("click", () => dlg.close());
dlg.addEventListener("close", () => { $("#vid").innerHTML = ""; });
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
document.addEventListener("click", e => {
  const v = e.target.closest("[data-video]");
  if (v) { e.preventDefault(); play(v.dataset.video); }
});

/* ---------- Film tiles ---------- */
function filmHTML(cat, f) {
  // Music titles read "Artist — Track": show the track big, the artist above it.
  let by = "", title = f.t;
  if (cat === "music" && f.t.includes(" — ")) { [by, title] = f.t.split(/ — (.*)/s); }
  const alt = cat === "weddings" ? `Still from the wedding film of ${f.t}` : `Still from ${f.t}`;
  const link = f.yt ? `href="https://www.youtube.com/watch?v=${f.yt}" data-video="${f.yt}"`
                    : `href="${f.src}" target="_blank" rel="noopener"`;
  return `<a class="film" ${link}>
    <div class="frame"><img src="img/${cat}/${f.s}.webp" alt="${esc(alt)}" loading="lazy">
      <span class="play mono">${f.yt ? "Play film" : "Open film page"}</span></div>
    <div class="meta"><div>${by ? `<span class="by mono">${esc(by)}</span>` : ""}<h3>${esc(title)}</h3></div>
      ${f.tc ? `<span class="mono">${f.tc}</span>` : ""}</div>
  </a>`;
}
function fill(grid, cat, limit) {
  const films = limit ? FILMS[cat].slice(0, limit) : FILMS[cat];
  grid.innerHTML = films.map(f => filmHTML(cat, f)).join("");
  grid.classList.remove("swap"); void grid.offsetWidth; grid.classList.add("swap");
}

/* ---------- Home ---------- */
if (page === "home") {
  const grid = $("#grid");
  const show = (cat, scroll) => {
    const c = CATS[cat];
    root.dataset.world = c.world;
    $("#work-title").textContent = c.title;
    $("#work-blurb").textContent = c.blurb;
    $("#count").textContent = `Showing 6 of ${FILMS[cat].length} films`;
    const all = $("#work-all");
    all.textContent = `See all ${FILMS[cat].length} ${c.title.toLowerCase()}`; all.href = c.page;
    $$(".chips button").forEach(b => b.setAttribute("aria-pressed", b.dataset.cat === cat));
    fill(grid, cat, 6);
    if (scroll) $("#work").scrollIntoView();
  };
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); show(go.dataset.go, true); return; }
    const chip = e.target.closest(".chips button");
    if (chip) show(chip.dataset.cat, false);
  });
  const track = $("#track"); track.innerHTML += track.innerHTML;   // seamless ticker loop
  show("music", false);
}

/* ---------- Category pages ---------- */
if (CATS[page]) {
  fill($("#grid"), page);
  $$("[data-count]").forEach(el => el.textContent = FILMS[page].length);
  const roster = $("#roster");
  if (roster) {
    const seen = new Set(), names = [];
    FILMS.music.forEach(f => {
      if (!f.t.includes(" — ")) return;
      const n = f.t.split(" — ")[0].trim(), k = n.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(k)) { seen.add(k); names.push(n); }
    });
    roster.innerHTML = names.map(n => `<span>${esc(n)}</span>`).join(" ");
  }
}

/* ---------- Enquire ---------- */
if (page === "enquire") {
  const Q = {
    weddings: ["Your partner's name", "Wedding date", "Venue or location", "Anything you'd love captured?"],
    music:    ["Artist and track name", "Shoot date or release date", "Where will we shoot?", "What's the idea for the video?"],
    events:   ["Event name", "Event date", "Venue or location", "What do you need filmed?"],
    other:    ["What's it about? Mentoring, merch, something else", "Date, if there is one", "Location", "Tell me more"]
  };
  const setType = t => {
    Q[t].forEach((txt, i) => $("#q" + (i + 1)).textContent = txt);
    root.dataset.world = t === "weddings" ? "rdv" : "ruff";
  };
  const want = new URLSearchParams(location.search).get("type");
  const start = Q[want] ? want : "weddings";
  document.body.style.transition = "none";            // no colour fade on first paint
  $(`input[name=path][value=${start}]`).checked = true; setType(start);
  setTimeout(() => { document.body.style.transition = ""; }, 100);
  $$("input[name=path]").forEach(r => r.addEventListener("change", () => setType(r.value)));
  $("#form").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, out = $("#out");
    if (!f.name.value.trim() || !f.email.value || !f.email.validity.valid) {
      out.textContent = "Add your name and a valid email so Michael can reply.";
      return;
    }
    out.textContent = "Prototype only: this form isn't connected yet, so nothing was sent.";
  });
}
