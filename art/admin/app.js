/* A.R.T Site Editor — front-end app.
   Talks to the Cloudflare Worker backend (login, save, image upload).
   The Worker holds the GitHub key; this app only ever sends a password. */

const API = "https://art-site-editor.flat-union-a317.workers.dev";
const DATA = "../../data";     // public JSON, relative to /art/admin/
const IMGP = "../";            // image preview prefix (site imgs are under /art/)

const FIELDS = {
  events: [
    { k: "name", label: "Event name" },
    { k: "eyebrow", label: "Tag above the name (e.g. Upcoming · Friday)" },
    { k: "date_display", label: "Date, as shown (e.g. 19–20 February 2027)" },
    { k: "venue", label: "Venue & city" },
    { k: "lineup", label: "Lineup / description", type: "textarea" },
    { k: "poster", label: "Poster image", type: "image", alt: "poster_alt" },
    { k: "poster_alt", label: "Poster description (for screen readers)" },
    { k: "tickets_url", label: "Ticket link (leave blank = ‘Tickets on sale soon’)" },
  ],
  news: [
    { k: "label", label: "Tag (e.g. 2026 · Awards)" },
    { k: "headline", label: "Headline" },
    { k: "summary", label: "One-line summary", type: "textarea" },
    { k: "source", label: "Source name (e.g. RNZ, Rolling Stone)" },
    { k: "link", label: "Article link (https://…)" },
    { k: "image", label: "Image", type: "image", alt: "image_alt" },
    { k: "image_alt", label: "Image description (for screen readers)" },
  ],
};

let token = localStorage.getItem("art_token") || "";
const data = { events: [], news: [] };
let tab = "events";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function setStatus(msg, kind) {
  const st = $("#status");
  st.className = "status " + (kind === "ok" ? "status--ok" : kind === "err" ? "status--err" : kind === "busy" ? "status--busy" : "muted");
  st.textContent = msg;
}

// Shrink + re-encode an image in the browser so uploads stay small and fast.
function downscale(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject; img.src = rd.result;
    };
    rd.onerror = reject; rd.readAsDataURL(file);
  });
}

async function api(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== "/api/login") { doLogout(); throw new Error("Session expired — please log in again."); }
  if (!r.ok) throw new Error(j.error || "Error " + r.status);
  return j;
}

// ---------- auth ----------
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#loginErr"); err.textContent = "";
  try {
    const j = await api("/api/login", { password: $("#pw").value });
    token = j.token; localStorage.setItem("art_token", token);
    $("#pw").value = "";
    await start();
  } catch (ex) { err.textContent = ex.message; }
});
$("#logout").addEventListener("click", doLogout);
function doLogout() {
  token = ""; localStorage.removeItem("art_token");
  $("#editor").classList.add("hide"); $("#login").classList.remove("hide");
}

// ---------- data ----------
async function loadData() {
  const [ev, nw] = await Promise.all([
    fetch(`${DATA}/art-events.json`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`${DATA}/art-news.json`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  data.events = ev.events || [];
  data.news = nw.news || [];
}

// ---------- rendering ----------
function render() {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("tab--on", t.dataset.tab === tab));
  renderAssist();
  const list = $("#list"); list.innerHTML = "";
  const items = data[tab];
  if (!items.length) list.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0">No ${tab} yet. Use the box above, or add a blank entry below.</p>`;
  items.forEach((item, i) => list.appendChild(entryCard(item, i)));
}

// ✨ Auto-fill: pre-fills a new draft entry the editor then reviews before saving.
function renderAssist() {
  const a = $("#assist");
  if (tab === "events") {
    a.innerHTML = `
      <div class="assist">
        <div class="assist__t">✨ Add an event from its poster</div>
        <label class="assist__file"><input type="file" accept="image/*"><span class="btn btn--ink btn--sm">Choose poster…</span></label>
        <div class="assist__hint">Uploads the poster and fills in the details automatically. You can edit everything before saving.</div>
      </div>`;
    const f = $("input", a);
    f.onchange = async () => {
      const fl = f.files[0]; if (!fl) return;
      setStatus("Reading poster…", "busy");
      try {
        const dataBase64 = await downscale(fl, 1400);
        const j = await api("/api/parse-poster", { filename: fl.name, dataBase64 });
        const ai = j._ai; delete j._ai;
        data.events.unshift(j); render(); window.scrollTo({ top: 0, behavior: "smooth" });
        setStatus(ai ? "Poster added — check the details, then Save." : "Poster added — AI is off, fill the fields, then Save.", ai ? "ok" : "busy");
      } catch (ex) { setStatus(ex.message, "err"); }
    };
  } else {
    a.innerHTML = `
      <div class="assist">
        <div class="assist__t">✨ Add news from a link</div>
        <div class="assist__row">
          <input type="url" placeholder="Paste the article URL…">
          <button class="btn btn--ink btn--sm">Auto-fill</button>
        </div>
        <div class="assist__hint">Grabs the headline, summary, source and image from the page. You can edit everything before saving.</div>
      </div>`;
    const inp = $("input", a), btn = $("button", a);
    const go = async () => {
      if (!inp.value.trim()) return;
      setStatus("Reading link…", "busy"); btn.disabled = true;
      try {
        const j = await api("/api/parse-url", { url: inp.value });
        data.news.unshift({ label: j.label || "", headline: j.headline || "", summary: j.summary || "", source: j.source || "", link: j.link || "", image: j.image || "", image_alt: j.image_alt || "" });
        render(); window.scrollTo({ top: 0, behavior: "smooth" });
        setStatus("News added — check the details, then Save.", "ok");
      } catch (ex) { setStatus(ex.message, "err"); } finally { btn.disabled = false; }
    };
    btn.onclick = go;
    inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } };
  }
}

function entryCard(item, i) {
  const card = document.createElement("div");
  card.className = "entry";
  const title = esc(item.name || item.headline || "(untitled)");
  card.innerHTML = `
    <div class="entry__head">
      <span class="entry__num">${tab === "events" ? "Event" : "Article"} ${i + 1} · ${title}</span>
      <span class="entry__tools">
        <button class="iconbtn" data-act="up" title="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="iconbtn" data-act="down" title="Move down" ${i === data[tab].length - 1 ? "disabled" : ""}>↓</button>
        <button class="iconbtn iconbtn--del" data-act="del" title="Delete">✕</button>
      </span>
    </div>
    <div class="fields"></div>`;
  const fields = $(".fields", card);
  FIELDS[tab].forEach((f) => fields.appendChild(fieldRow(item, f)));

  card.querySelector('[data-act="up"]').onclick = () => { if (i > 0) { [data[tab][i - 1], data[tab][i]] = [data[tab][i], data[tab][i - 1]]; render(); } };
  card.querySelector('[data-act="down"]').onclick = () => { if (i < data[tab].length - 1) { [data[tab][i + 1], data[tab][i]] = [data[tab][i], data[tab][i + 1]]; render(); } };
  card.querySelector('[data-act="del"]').onclick = () => { if (confirm("Delete this " + (tab === "events" ? "event" : "article") + "?")) { data[tab].splice(i, 1); render(); } };
  return card;
}

function fieldRow(item, f) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  if (f.type === "image") {
    const v = item[f.k] || "";
    const cur = v ? (/^https?:\/\//.test(v) ? esc(v) : IMGP + esc(v)) : "";
    wrap.innerHTML = `
      <label>${f.label}</label>
      <div class="imgrow">
        <img alt="" src="${cur}" ${cur ? "" : 'style="opacity:.4"'}>
        <div>
          <input type="file" accept="image/*" style="border:0;padding:0;font-size:13px">
          <div class="muted upstat" style="margin-top:4px"></div>
        </div>
      </div>`;
    const img = $("img", wrap), file = $('input[type=file]', wrap), st = $(".upstat", wrap);
    file.onchange = async () => {
      const fl = file.files[0]; if (!fl) return;
      st.textContent = "Uploading…";
      try {
        const dataBase64 = await downscale(fl, 1400);
        const j = await api("/api/upload", { filename: (fl.name.replace(/\.[^.]+$/, "") || "image") + ".jpg", dataBase64 });
        item[f.k] = j.path;
        img.src = IMGP + j.path; img.style.opacity = "1";
        st.textContent = "Uploaded ✓";
      } catch (ex) { st.textContent = ex.message; }
    };
    return wrap;
  }
  const multiline = f.type === "textarea";
  wrap.innerHTML = `<label>${f.label}</label>${multiline ? `<textarea></textarea>` : `<input type="text">`}`;
  const inp = $(multiline ? "textarea" : "input", wrap);
  inp.value = item[f.k] || "";
  inp.oninput = () => { item[f.k] = inp.value; };
  return wrap;
}

// ---------- tabs / add / save ----------
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => { tab = t.dataset.tab; render(); }));
$("#add").onclick = () => { data[tab].unshift({}); render(); window.scrollTo({ top: 0, behavior: "smooth" }); };

$("#save").onclick = async () => {
  const st = $("#status"), btn = $("#save");
  st.className = "status status--busy"; st.textContent = "Saving…"; btn.disabled = true;
  try {
    await api("/api/save", { type: tab, data: { [tab]: data[tab] } });
    st.className = "status status--ok"; st.textContent = "Saved ✓ — live on the site in about a minute.";
  } catch (ex) {
    st.className = "status status--err"; st.textContent = ex.message;
  } finally { btn.disabled = false; }
};

// ---------- boot ----------
async function start() {
  $("#login").classList.add("hide"); $("#editor").classList.remove("hide");
  const st = $("#status"); st.className = "status muted"; st.textContent = "Loading…";
  try { await loadData(); render(); st.textContent = "Loaded."; }
  catch (ex) { st.className = "status status--err"; st.textContent = "Couldn’t load content: " + ex.message; }
}

if (token) start(); else { $("#login").classList.remove("hide"); }
