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
  const list = $("#list"); list.innerHTML = "";
  const items = data[tab];
  if (!items.length) list.innerHTML = `<p class="muted" style="text-align:center;padding:20px 0">No ${tab} yet. Add one below.</p>`;
  items.forEach((item, i) => list.appendChild(entryCard(item, i)));
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
    const cur = item[f.k] ? IMGP + esc(item[f.k]) : "";
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
        const dataBase64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = rej; rd.readAsDataURL(fl); });
        const j = await api("/api/upload", { filename: fl.name, dataBase64 });
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
